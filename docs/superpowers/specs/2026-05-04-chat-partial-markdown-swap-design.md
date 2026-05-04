# Chat 0.0.20 — `<chat-streaming-md>` swap to `@cacheplane/partial-markdown` — Design Specification

**Date:** 2026-05-04
**Status:** Draft, pending user review
**Sub-project:** 2 of 4 in the post-0.0.19 streaming-AST roadmap (consumer of partial-markdown v0.1).
**Target packages:** `@ngaf/chat` 0.0.19 → `0.0.20`
**Hard dependency:** `@cacheplane/partial-markdown@0.1.0` (just published).

---

## 1. Goals

Replace `<chat-streaming-md>`'s current rendering pipeline (`marked.parse(content)` → `el.innerHTML = sanitized`) with an Angular template walking a `@cacheplane/partial-markdown` AST through the existing `@ngaf/render` view registry.

Concrete deliverables:

- `<chat-streaming-md>` consumes `createPartialMarkdownParser()` instead of `marked`. The component still accepts `[content]: string` and `[streaming]?: boolean` as inputs (no public API change beyond what's stated below).
- A default `cacheplaneMarkdownViews: ViewRegistry` exported from `@ngaf/chat`, mapping each MarkdownNode type to a focused per-type Angular component (12 components under `libs/chat/src/lib/markdown/views/`).
- New `[viewRegistry]?: ViewRegistry` input on `<chat-streaming-md>` for per-instance overrides. Defaults to `cacheplaneMarkdownViews`.
- Identity-preserving render: Angular's `track` walks the parser's stable node ids → unchanged subtrees never re-render. Long messages no longer thrash the DOM the way `innerHTML` wipe-and-replace does today.
- The existing `CHAT_MARKDOWN_STYLES` styles continue to apply, scoped to the `chat-streaming-md` element selector via `ViewEncapsulation.None` (unchanged from today).

---

## 2. Non-goals (this sub-project)

- **Tables and task lists.** `@cacheplane/partial-markdown` v0.1 doesn't ship them; they regress in chat 0.0.20. Documented in the changelog. Restored when partial-markdown v0.3 lands and chat consumes it.
- **Citations / footnotes.** Sub-project 4 (chat 0.0.21) on top of partial-markdown v0.2.
- **Markdown extensions beyond the v0.1 surface.** Math, mentions, custom syntax — all out of scope.
- **`marked` dependency removal.** It's still pulled in by `messageContent` shared util (used outside `<chat-streaming-md>`). Removal is a follow-up if no other consumers materialize. For 0.0.20, we just stop using it inside `<chat-streaming-md>`.
- **A2UI text component swap.** Future use noted in the partial-markdown v0.1 spec; lives in a later phase.

---

## 3. Architecture

### 3.1 Data flow

```
[content]: string  ─┐                                    ┌─ <md-document>
                    │                                    │   └─ <md-paragraph>
chat-streaming-md ──┤                                    │      └─ <md-text>
                    │                                    ├─ <md-heading>
                    └→ createPartialMarkdownParser() ────┤   └─ <md-text>
                       (kept across signal changes;      ├─ <md-list>
                        stable identity guarantees)      │   └─ <md-list-item>
                                                         │      └─ <md-paragraph>
                                                         └─ …
```

When the `[content]` signal changes:

1. The parser's internal state advances via `parser.push(delta)` if the new content extends the prior content (common streaming case), or via re-creation if it shrinks/diverges (uncommon edge case — full re-parse).
2. The parser's `root: MarkdownDocumentNode` reference is stable (per partial-markdown's identity contract).
3. The Angular template re-runs change detection against the new root. Because individual `MarkdownNode` references are preserved across pushes for unchanged subtrees, `track $any($node)` short-circuits re-render for those subtrees.

### 3.2 Render dispatch through the view registry

The default registry is exported from `@ngaf/chat` as `cacheplaneMarkdownViews`:

```typescript
import { views } from '@ngaf/render';

export const cacheplaneMarkdownViews = views({
  'document':       MarkdownDocumentComponent,
  'paragraph':      MarkdownParagraphComponent,
  'heading':        MarkdownHeadingComponent,
  'blockquote':     MarkdownBlockquoteComponent,
  'list':           MarkdownListComponent,
  'list-item':      MarkdownListItemComponent,
  'code-block':     MarkdownCodeBlockComponent,
  'thematic-break': MarkdownThematicBreakComponent,
  'text':           MarkdownTextComponent,
  'emphasis':       MarkdownEmphasisComponent,
  'strong':         MarkdownStrongComponent,
  'strikethrough':  MarkdownStrikethroughComponent,
  'inline-code':    MarkdownInlineCodeComponent,
  'link':           MarkdownLinkComponent,
  'autolink':       MarkdownAutolinkComponent,
  'image':          MarkdownImageComponent,
  'soft-break':     MarkdownSoftBreakComponent,
  'hard-break':     MarkdownHardBreakComponent,
});
```

`<chat-streaming-md>` accepts an optional `[viewRegistry]: ViewRegistry` input that, when omitted, falls back to `cacheplaneMarkdownViews`. Consumers override individual nodes via:

```typescript
import { withViews } from '@ngaf/render';
import { cacheplaneMarkdownViews } from '@ngaf/chat';
import { MyCustomHeading } from './my-custom-heading.component';

const registry = withViews(cacheplaneMarkdownViews, {
  heading: MyCustomHeading,
});
```

Then:

```html
<chat-streaming-md [content]="md" [viewRegistry]="registry" />
```

### 3.3 Per-node-type component contract

Every component in the registry takes a single input:

```typescript
interface MarkdownViewProps {
  readonly node: MarkdownNode;
}
```

Angular components implement this as:

```typescript
@Component({
  selector: 'md-paragraph',
  standalone: true,
  imports: [MarkdownChildrenComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p><md-children [parent]="node()" /></p>`,
})
export class MarkdownParagraphComponent {
  readonly node = input.required<MarkdownParagraphNode>();
}
```

A small `<md-children>` shared component handles the recursive dispatch:

```typescript
@Component({
  selector: 'md-children',
  standalone: true,
  imports: [NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (child of children(); track $any(child)) {
      <ng-container
        *ngComponentOutlet="resolve(child); inputs: { node: child }"
      />
    }
  `,
})
export class MarkdownChildrenComponent {
  readonly parent = input.required<MarkdownNode>();
  readonly viewRegistry = inject(MARKDOWN_VIEW_REGISTRY);

  protected children = computed(() => {
    const p = this.parent();
    return 'children' in p ? p.children : [];
  });

  protected resolve(node: MarkdownNode): Type<unknown> | null {
    return this.viewRegistry[node.type] ?? null;
  }
}
```

The registry is provided via DI. `<chat-streaming-md>` provides the runtime registry (resolved from its `[viewRegistry]` input or the default) at the component level so descendant `<md-children>` instances pick it up:

```typescript
providers: [
  {
    provide: MARKDOWN_VIEW_REGISTRY,
    useFactory: (host: ChatStreamingMdComponent) => host.resolvedRegistry(),
    deps: [forwardRef(() => ChatStreamingMdComponent)],
  },
],
```

### 3.4 `<chat-streaming-md>` shape

```typescript
@Component({
  selector: 'chat-streaming-md',
  standalone: true,
  imports: [MarkdownChildrenComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: CHAT_MARKDOWN_STYLES,
  template: `
    @if (root(); as r) {
      <md-children [parent]="r" />
    }
  `,
  providers: [
    {
      provide: MARKDOWN_VIEW_REGISTRY,
      useFactory: (host: ChatStreamingMdComponent) => host.resolvedRegistry(),
      deps: [forwardRef(() => ChatStreamingMdComponent)],
    },
  ],
})
export class ChatStreamingMdComponent {
  readonly content = input<string>('');
  readonly streaming = input<boolean>(false);
  readonly viewRegistry = input<ViewRegistry | undefined>(undefined);

  protected readonly resolvedRegistry = computed(
    () => this.viewRegistry() ?? cacheplaneMarkdownViews,
  );

  private parser = createPartialMarkdownParser();
  private prior = '';

  protected readonly root = computed<MarkdownDocumentNode | null>(() => {
    const c = this.content();
    if (c === this.prior) return this.parser.root;
    if (c.startsWith(this.prior)) {
      this.parser.push(c.slice(this.prior.length));
    } else {
      // Content shrank or diverged — reset the parser.
      this.parser = createPartialMarkdownParser();
      this.parser.push(c);
    }
    if (!this.streaming()) {
      this.parser.finish();
    }
    this.prior = c;
    return this.parser.root;
  });
}
```

The `root` computed is the rendered tree. Angular's signal change detection propagates updates only where node references actually changed.

### 3.5 Streaming integration with `[streaming]` input

Today `<chat-streaming-md>` accepts a `[streaming]: boolean` input that's passed down for caret/cursor rendering. We preserve that input. While `streaming === true`, we hold off calling `parser.finish()` so trailing partial constructs stay in `'streaming'` status (visible caret position can be derived from the deepest open node — future enhancement). When `streaming === false`, we call `parser.finish()` to commit any trailing partial.

For the v0.0.20 swap, we don't need to ship caret-anchored-on-deepest-open-node behavior. Existing caret rendering (in `<chat-message>`) continues to work as today. Future enhancement.

---

## 4. Per-component table

| Selector | Renders | Inputs | Notes |
|---|---|---|---|
| `md-document` | `<ng-container>` (transparent — children render in place) | `[node]: MarkdownDocumentNode` | Just dispatches children |
| `md-paragraph` | `<p>` | `[node]: MarkdownParagraphNode` | Children = inline nodes |
| `md-heading` | `<h{level}>` (1–6) | `[node]: MarkdownHeadingNode` | `<h1>` through `<h6>` switched on `node.level` |
| `md-blockquote` | `<blockquote>` | `[node]: MarkdownBlockquoteNode` | |
| `md-list` | `<ul>` or `<ol start="N">` | `[node]: MarkdownListNode` | `start` honored; tight/loose differs in CSS |
| `md-list-item` | `<li>` | `[node]: MarkdownListItemNode` | |
| `md-code-block` | `<pre><code class="language-{lang}">` | `[node]: MarkdownCodeBlockNode` | Text content rendered as plain text (no syntax highlighting in v0.0.20) |
| `md-thematic-break` | `<hr>` | `[node]: MarkdownThematicBreakNode` | |
| `md-text` | `{{ node().text }}` | `[node]: MarkdownTextNode` | Just the text — no extra element |
| `md-emphasis` | `<em>` | `[node]: MarkdownEmphasisNode` | |
| `md-strong` | `<strong>` | `[node]: MarkdownStrongNode` | |
| `md-strikethrough` | `<del>` | `[node]: MarkdownStrikethroughNode` | |
| `md-inline-code` | `<code>{{ node().text }}</code>` | `[node]: MarkdownInlineCodeNode` | |
| `md-link` | `<a [href]>` | `[node]: MarkdownLinkNode` | `[title]` set when present; rel/target left for consumer override |
| `md-autolink` | `<a [href]>{{ node().url }}</a>` | `[node]: MarkdownAutolinkNode` | |
| `md-image` | `<img [src] [alt] [title]>` | `[node]: MarkdownImageNode` | |
| `md-soft-break` | `<br>` | `[node]: MarkdownSoftBreakNode` | Matches current behavior — soft breaks render as `<br>` for parity with the prior `marked` output |
| `md-hard-break` | `<br>` | `[node]: MarkdownHardBreakNode` | |

`<md-children>` is a shared utility component — not exposed in the registry; it's a helper for the per-type components.

---

## 5. Sanitization & security

`@cacheplane/partial-markdown` v0.1 explicitly defers sanitization to render time. In Angular, links and image URLs land directly in `[href]`/`[src]` bindings, which Angular sanitizes via its built-in security context (e.g., `SafeUrl` for hrefs, `SafeResourceUrl` for `<iframe src>`).

For chat 0.0.20 we rely on Angular's default URL sanitization. Anti-XSS hardening:
- `[href]="node().url"` — Angular sanitizes; `javascript:` URLs become safe (`unsafe:javascript:`).
- `[src]="node().url"` — same treatment.
- `{{ node().text }}` — interpolated, never `innerHTML` — always safe.
- Code block content uses `{{ node().text }}` interpolation, never bypassed.

No `bypassSecurityTrustHtml` calls. No `innerHTML` bindings anywhere in the new components.

---

## 6. Migration plan

The current `<chat-streaming-md>` lives at `libs/chat/src/lib/streaming/streaming-markdown.component.ts`. The associated render helpers at `libs/chat/src/lib/streaming/markdown-render.ts` (uses `marked` + sanitizer) become obsolete for `<chat-streaming-md>`.

**Inputs:** `[content]: string`, `[streaming]?: boolean` — preserved.
**New input:** `[viewRegistry]?: ViewRegistry` — additive; defaults to the cacheplane default.
**Internal change:** `marked` → `@cacheplane/partial-markdown` parser. The component's template + providers now wire through `<md-children>` and the DI-provided registry.

**Public API breakage:** none beyond the documented table/task-list rendering regression.

`markdown-render.ts` (old `renderMarkdown` / `renderMarkdownToString` helpers using `marked`) stays in the source for now — it's used by `messageContent` in the chat composition for non-streaming markdown rendering paths. We don't yank it for 0.0.20; that's a follow-up cleanup once we've swept all callers.

`marked` stays in `@ngaf/chat`'s dependencies for the remaining caller. Removal is a follow-up.

---

## 7. Regressions documented

The chat 0.0.20 changelog entry calls out:

- **Tables regress.** Markdown like `| h |\n|---|\n| 1 |` was rendered as a `<table>` in 0.0.19; in 0.0.20 it renders as paragraphs containing literal pipe characters. **Restored when partial-markdown v0.3 lands tables (planned for chat 0.0.22-ish).**
- **GFM task lists regress.** `- [ ]` / `- [x]` was rendered with checkboxes; now renders as a bulleted list with literal `[x]` in the text. Restored at the same time as tables.
- No other rendered surface should visibly change. Citations weren't supported in 0.0.19 either.

---

## 8. Tests

Three test surfaces:

1. **Per-component unit specs** (one `*.spec.ts` per markdown view component) — assert each component renders the right element, dispatches children correctly, applies the right HTML attributes (`href`, `start`, `level`).
2. **Integration spec for `<chat-streaming-md>`** — write a corpus of canonical inputs, assert the resulting DOM. Tests both `[streaming]="true"` (parser open) and `[streaming]="false"` (parser finished) modes.
3. **Identity / re-render minimization spec** — push two chunks of content; verify Angular doesn't tear down components corresponding to unchanged subtrees. Implementation: spy on `ngOnDestroy` for paragraph components across pushes. Acceptable bar: a node's component is destroyed only when the node's identity changes (e.g., a paragraph reorders or is removed).

Existing chat tests that interact with `<chat-streaming-md>` need a sweep — the rendered DOM shape may differ slightly (e.g., `<ng-container>` placeholders vs no-wrapper for document, exact whitespace handling around soft breaks). Update tests minimally to match the new rendering; the **canonical contract is the corpus**.

---

## 9. Smoke test

In `~/tmp/ngaf` (or any local consumer):

```bash
npm i --no-save @ngaf/chat@0.0.20-rc.0  # via tarball
```

Run the smoke harness, click a suggestion, verify the response renders. Specifically:

- Heading → `<h2>` styling visible
- Bullet list → bullets visible
- Inline code → monospace + background
- Bold + italic → bold + italic styling
- A markdown table in a response → renders as raw paragraph (regressed, expected)

If everything except the documented regressions matches the 0.0.19 output, ship it.

---

## 10. Versioning + release

- `@ngaf/chat` 0.0.19 → **0.0.20**
- `@ngaf/chat` adds `@cacheplane/partial-markdown` to its `dependencies` (not peer — partial-markdown is an implementation detail of `<chat-streaming-md>`).
- `@cacheplane/partial-markdown@0.1.0` is the pinned version.
- Single PR. Single tag: `chat-v0.0.20`.

`@ngaf/langgraph` and `@ngaf/ag-ui` are unaffected.

---

## 11. Out-of-scope acknowledgments

- The architecture is independently arrived at. The render-registry pattern is the same one `@ngaf/render` already uses for a2ui surface dispatch. Where this work shares shape with any other public streaming-markdown rendering work, that's coincidental — no code, comment, commit, or documentation reference shall name any inspiration source.
- Per-node-type render component overrides via the `[viewRegistry]` input is the v0.0.20 extension surface. A future `<ng-template>`-based override directive (mirroring `chatToolCallTemplate` from B2) is possible but not in scope for 0.0.20.
- Performance characteristics are not formally measured in 0.0.20. The architectural expectation is faster CD via stable identity, but no SLA is asserted.
