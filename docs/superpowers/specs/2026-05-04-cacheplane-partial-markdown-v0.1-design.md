# `@cacheplane/partial-markdown` v0.1 — Design Specification

**Date:** 2026-05-04
**Status:** Draft, pending user review
**Sub-project:** 1 of 4 in the post-0.0.19 streaming-AST roadmap (sibling to `@cacheplane/partial-json`).
**Target package:** `@cacheplane/partial-markdown@0.1.0`
**Target repo:** new repo `cacheplane/cacheplane-partial-markdown` (sibling layout to `cacheplane/cacheplane-partial-json`)
**License:** MIT (matching `@cacheplane/partial-json`)

---

## 1. Goals

Ship a streaming, identity-preserving markdown AST parser that mirrors the architectural shape of `@cacheplane/partial-json`. The package is framework-agnostic (no Angular, no React, no DOM), pure TypeScript, runs in browser and Node, and is suitable as the foundation for any consumer that needs to render markdown chunked from a streaming source (LLM output, an editor's input event stream, file streams).

The first consumer is `@ngaf/chat` 0.0.20, which will swap `<chat-streaming-md>`'s `marked` + `innerHTML` rendering pipeline for a partial-markdown AST walked in Angular templates with stable `track`-by-id identity. Future consumers include `@ngaf/a2ui` for rich text in agent-driven surface specs, and any independent project that needs incremental markdown parsing.

Concretely, v0.1 delivers:

- A streaming parser with identical API shape to `@cacheplane/partial-json` (pull-style + push-style + materialize + JSON Pointer addressing).
- A node graph covering paragraph-level markdown plus the most common inline syntax — minus tables, task lists, and citations (those land in v0.3 and v0.2 respectively).
- Stable node identity across chunks: a node created on chunk N keeps the same `id` and JS reference through every subsequent chunk that doesn't structurally change it.
- Best-effort parsing with warnings instead of thrown errors, since streaming chunk boundaries inevitably land mid-construct.

---

## 2. Non-goals (v0.1)

- **Citations** (`[^id]` references and `[^id]: text url` definitions) — sub-project 3 / v0.2.
- **Tables** (`|---|---|`) — v0.3.
- **Task lists** (`- [ ]`, `- [x]`) — v0.3.
- **Footnotes other than citations** (Pandoc footnote syntax for general use) — v0.3+.
- **Link reference definitions** (`[label]: url` for `[text][label]` style links) — v0.3+.
- **HTML inline / block** — treated as raw text in v0.1.
- **Math** (`$inline$`, `$$block$$`) — out of scope indefinitely; consumer concern.
- **Mentions / custom syntax extensions** — out of scope; can be added via a parser-extension API in a future version (not v0.1).
- **`Intl.Segmenter` parse-time text segmentation** — future enhancement; not v0.1.
- **Performance SLAs / telemetry** — not v0.1.
- **Sanitization of links or HTML** — render-time consumer concern, not parser concern.

---

## 3. Architectural alignment with `@cacheplane/partial-json`

`@cacheplane/partial-json` already establishes the architectural shape. v0.1 of partial-markdown adopts it 1-for-1 so consumers learn one mental model and apply it to both formats.

| Surface | partial-json | partial-markdown |
|---|---|---|
| Pull-style functions | `create / push / finish / resolve` | identical names, identical semantics |
| Push-style factory | `createPartialJsonParser()` | `createPartialMarkdownParser()` |
| Status tristate | `'pending' \| 'streaming' \| 'complete'` | identical |
| Identity model | stable `id: number`, in-place mutation, refs stable across pushes | identical |
| Address by path | JSON Pointer (`/items/1/id`) | JSON Pointer over the node tree |
| Snapshot helper | `materialize()` with `WeakMap<Node, CacheEntry>` + version fingerprint | identical pattern |
| Events | `node-created / value-updated / node-completed` | identical |
| Public boundary | a single `index.ts` re-exporting types + functions | identical |
| Tooling | tsup, vitest, MIT, ESM-first w/ CJS for require() | identical |

This is intentional — picking up partial-markdown after using partial-json should feel automatic.

---

## 4. Public API

### 4.1 Pull-style (immutable state)

```ts
import { create, push, finish, resolve } from '@cacheplane/partial-markdown';

let state = create();
state = push(state, '# Hello\n\nThis is **bold**.');
state = push(state, ' And `code`.');
state = finish(state);

const tree = resolve(state); // immutable snapshot of root node
```

Signatures:

```ts
export function create(): StreamState;
export function push(state: StreamState, chunk: string): StreamState;
export function finish(state: StreamState): StreamState;
export function resolve(state: StreamState): MarkdownNode | null;
```

`StreamState` is opaque; consumers don't construct it directly. The internal shape carries a flat array of nodes, the active mode stack, the parse cursor, and warnings.

### 4.2 Push-style (parser instance + events)

```ts
import { createPartialMarkdownParser, materialize } from '@cacheplane/partial-markdown';

const parser = createPartialMarkdownParser();
const events1 = parser.push('# Hello\n\nThis is ');  // emits node-created + value-updated events
const events2 = parser.push('**bold**.\n');
const events3 = parser.finish();

parser.root;                              // MarkdownDocumentNode | null
parser.getByPath('/children/0/children/0'); // navigate by JSON Pointer
const snapshot = materialize(parser.root);  // structural-shared snapshot
```

Signatures:

```ts
export interface PartialMarkdownParser {
  push(chunk: string): ParseEvent[];
  finish(): ParseEvent[];
  readonly root: MarkdownNode | null;
  getByPath(path: string): MarkdownNode | null;
}

export function createPartialMarkdownParser(): PartialMarkdownParser;

export function materialize(node: MarkdownNode | null): MaterializedMarkdown | null;
```

### 4.3 Events

```ts
export type ParseEventType = 'node-created' | 'value-updated' | 'node-completed';

export interface ParseEvent {
  type: ParseEventType;
  node: MarkdownNode;
  /** For value-updated on text/inline-code/code-block: characters appended this push. */
  delta?: string;
}
```

`node-created` fires once per node when its opening token is recognized. `value-updated` fires whenever a node's mutable content changes (text appended, child added). `node-completed` fires when a node's status flips from `'pending' | 'streaming'` to `'complete'`.

### 4.4 Identity guarantees

A node assigned `id: 7` on chunk N continues to be the same JS reference, with the same `id`, on every subsequent push that doesn't remove it from the tree. Consumers can hold long-lived references; the parser mutates fields (`status`, `value`, `children`, `text`) in place.

`materialize()` returns a structurally-shared plain-object snapshot. Subtrees that haven't changed since the last `materialize()` call return the same reference. Implemented via `WeakMap<MarkdownNode, CacheEntry>` keyed on a per-node version fingerprint (matches `@cacheplane/partial-json`'s strategy).

### 4.5 JSON Pointer addressing

Paths use RFC 6901 JSON Pointer syntax against the materialized tree shape:

```
""                          → root
"/children/0"               → first block child of root
"/children/0/children/2"    → third inline child of first block
```

`/` separators are escaped per RFC 6901: `~1` → `/`, `~0` → `~`. Same as partial-json's lookup.

---

## 5. Data model — node graph

### 5.1 Common base

```ts
export type MarkdownNodeStatus = 'pending' | 'streaming' | 'complete';

export interface MarkdownNodeBase {
  /** Stable identity — assigned on creation, never changes. */
  readonly id: number;
  /** Discriminant. */
  readonly type: MarkdownNodeType;
  /** Parsing state. */
  status: MarkdownNodeStatus;
  /** Parent node; null for the document root. */
  parent: MarkdownNode | null;
  /** Index in parent.children when present; null for root. */
  index: number | null;
}
```

`status` semantics:
- **`'pending'`** — node opening token recognized, no content yet (e.g. an empty heading after `# ` is consumed but before any character of the heading text).
- **`'streaming'`** — node has content and is still accepting input.
- **`'complete'`** — closing token recognized OR `finish()` called and the parser concluded the node.

### 5.2 Block-level nodes (v0.1)

```ts
export interface MarkdownDocumentNode extends MarkdownNodeBase {
  readonly type: 'document';
  children: MarkdownBlockNode[];
}

export interface MarkdownParagraphNode extends MarkdownNodeBase {
  readonly type: 'paragraph';
  children: MarkdownInlineNode[];
}

export interface MarkdownHeadingNode extends MarkdownNodeBase {
  readonly type: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: MarkdownInlineNode[];
}

export interface MarkdownBlockquoteNode extends MarkdownNodeBase {
  readonly type: 'blockquote';
  children: MarkdownBlockNode[];
}

export interface MarkdownListNode extends MarkdownNodeBase {
  readonly type: 'list';
  ordered: boolean;
  /** For ordered lists, the start index (default 1). null for unordered. */
  start: number | null;
  /** Tight lists render items inline; loose lists wrap each item in <p>. */
  tight: boolean;
  children: MarkdownListItemNode[];
}

export interface MarkdownListItemNode extends MarkdownNodeBase {
  readonly type: 'list-item';
  children: MarkdownBlockNode[];
}

export interface MarkdownCodeBlockNode extends MarkdownNodeBase {
  readonly type: 'code-block';
  /** 'fenced' for ``` / ~~~; 'indented' for 4-space indent. */
  variant: 'fenced' | 'indented';
  /** Language hint after the fence (e.g. "ts" in ```ts). Empty string when absent. */
  language: string;
  /** Raw text content. Newlines preserved. */
  text: string;
}

export interface MarkdownThematicBreakNode extends MarkdownNodeBase {
  readonly type: 'thematic-break';
}

export type MarkdownBlockNode =
  | MarkdownParagraphNode
  | MarkdownHeadingNode
  | MarkdownBlockquoteNode
  | MarkdownListNode
  | MarkdownCodeBlockNode
  | MarkdownThematicBreakNode;
```

### 5.3 Inline nodes (v0.1)

```ts
export interface MarkdownTextNode extends MarkdownNodeBase {
  readonly type: 'text';
  text: string;
}

export interface MarkdownEmphasisNode extends MarkdownNodeBase {
  readonly type: 'emphasis';
  children: MarkdownInlineNode[];
}

export interface MarkdownStrongNode extends MarkdownNodeBase {
  readonly type: 'strong';
  children: MarkdownInlineNode[];
}

export interface MarkdownStrikethroughNode extends MarkdownNodeBase {
  readonly type: 'strikethrough';
  children: MarkdownInlineNode[];
}

export interface MarkdownInlineCodeNode extends MarkdownNodeBase {
  readonly type: 'inline-code';
  text: string;
}

export interface MarkdownLinkNode extends MarkdownNodeBase {
  readonly type: 'link';
  url: string;
  title: string;
  children: MarkdownInlineNode[];
}

export interface MarkdownAutolinkNode extends MarkdownNodeBase {
  readonly type: 'autolink';
  url: string;
  text: string;
}

export interface MarkdownImageNode extends MarkdownNodeBase {
  readonly type: 'image';
  url: string;
  title: string;
  alt: string;
}

export interface MarkdownSoftBreakNode extends MarkdownNodeBase {
  readonly type: 'soft-break';
}

export interface MarkdownHardBreakNode extends MarkdownNodeBase {
  readonly type: 'hard-break';
}

export type MarkdownInlineNode =
  | MarkdownTextNode
  | MarkdownEmphasisNode
  | MarkdownStrongNode
  | MarkdownStrikethroughNode
  | MarkdownInlineCodeNode
  | MarkdownLinkNode
  | MarkdownAutolinkNode
  | MarkdownImageNode
  | MarkdownSoftBreakNode
  | MarkdownHardBreakNode;
```

### 5.4 Node union

```ts
export type MarkdownNode =
  | MarkdownDocumentNode
  | MarkdownBlockNode
  | MarkdownInlineNode
  | MarkdownListItemNode;
```

### 5.5 Materialized snapshot shape

`materialize()` returns plain JS objects (no class instances). The snapshot mirrors the live node graph 1-for-1 with one transformation: `parent` references become `null` (snapshots are tree-walks, not graph-walks).

```ts
export type MaterializedMarkdown =
  | (Omit<MarkdownDocumentNode, 'parent'> & { children: MaterializedMarkdown[] })
  | // …per-type variants…
```

Structural sharing means a `<chat-streaming-md>` template using `track $any($node)` for stable Angular reference checks gets exactly the right cache-hit behavior.

---

## 6. Parsing strategy

### 6.1 High-level shape

The parser is a finite-state machine plus a node tree. Each `push(chunk)` walks the chunk character-by-character (or token-by-token) and applies state transitions:

```
ParseMode = 'block' | 'paragraph' | 'heading' | 'blockquote' | 'list-item'
          | 'code-fence' | 'code-indented' | 'inline'
```

A mode stack tracks nested constructs (e.g. a list-item containing a paragraph containing emphasis is a stack of `[block, list-item, paragraph, inline]`).

Block-level transitions consume newlines; inline-level transitions consume non-newline characters within a paragraph/heading/etc.

### 6.2 Streaming semantics

**Mid-token boundaries.** A chunk may end with `**bo` — partial strong emphasis. The parser consumes `**` as a strong-emphasis open token, then begins a `streaming` text node holding `'bo'`. When the next chunk arrives starting `ld**`, the text node grows to `'bold'` and the strong emphasis closes.

**Open nodes never block downstream rendering.** A `streaming` text node renders as the partial text it has. A `streaming` paragraph renders as a `<p>` with whatever children exist. Consumers do not need to wait for `complete`.

**Idempotent state.** Each chunk pushes new content; nothing rewinds. There is no "unparse a token" operation — once a strong-emphasis `**` is seen, it's committed. If the stream ends without the closing `**`, the parser emits a warning and finalizes the node with `status: 'complete'` and whatever content accumulated.

### 6.3 Best-effort parsing + warnings

Malformed constructs become warnings, not exceptions:

```ts
export type MarkdownWarning =
  | { code: 'unterminated_construct'; kind: string; index: number }
  | { code: 'unmatched_closer'; token: string; index: number }
  | { code: 'invalid_link'; index: number }
  | { code: 'unknown_construct'; index: number };
```

Warnings live on `StreamState.warnings` and can be inspected after each `push()` or `finish()`. The parser never throws.

### 6.4 Whitespace fidelity

- A single newline inside a paragraph emits a `MarkdownSoftBreakNode`.
- A line ending with two-or-more trailing spaces, OR a `\` followed by `\n`, emits a `MarkdownHardBreakNode`.
- Blank lines between blocks are paragraph boundaries; they produce no node, but the parser's mode transitions accordingly.

### 6.5 Identity preservation

When `push()` receives a chunk that extends an existing `streaming` node (e.g. a text node growing), the node's `id` and JS reference stay constant. The mutable field (`text`, `children`) is updated in place. Sibling nodes — even those entirely unaffected by the chunk — retain their references.

When a chunk introduces a new sibling (e.g. closing a paragraph and opening another), the existing siblings retain their references; only the parent's `children` array is replaced with a new array that includes the new sibling at the end. The previously-existing children remain `===` to their pre-chunk references.

---

## 7. Implementation plan (file structure)

The repo and source mirror `cacheplane/cacheplane-partial-json`'s layout one-for-one:

```
cacheplane-partial-markdown/
├── README.md
├── LICENSE                    (MIT, copied from partial-json)
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── tsup.config.ts
├── vitest.config.ts
├── eslint.config.js
└── src/
    ├── index.ts               re-exports public API
    ├── types.ts               StreamState + InternalState + MarkdownNode + ParseEvent + …
    ├── create.ts              createInternal()
    ├── push.ts                pushInternal(state, chunk) — the state machine
    ├── finish.ts              finishInternal(state)
    ├── resolve.ts             resolve(state) → MarkdownNode | null
    ├── parser.ts              createPartialMarkdownParser() (push-style layer)
    ├── materialize.ts         structural-shared snapshot helper
    ├── handlers/              one file per parse mode
    │   ├── block.ts
    │   ├── paragraph.ts
    │   ├── heading.ts
    │   ├── blockquote.ts
    │   ├── list.ts
    │   ├── code-fence.ts
    │   └── inline.ts
    ├── guards.ts              isXNode type guards (isParagraphNode, isTextNode, …)
    ├── internals.ts           shared low-level helpers
    └── __tests__/             one spec per source file + integration suites
        ├── parser.spec.ts
        ├── materialize.spec.ts
        ├── handlers/*.spec.ts
        └── integration/
            ├── streaming.spec.ts
            └── identity.spec.ts
```

Source is TypeScript, ESM-first with CJS available via tsup.

---

## 8. Testing strategy

### 8.1 Unit specs (per handler)

Each parse mode handler has a unit spec asserting:
- The transitions in/out of the mode (e.g. `paragraph` → `inline` on first non-newline character).
- The node types and statuses produced for canonical inputs.
- Warning emission for malformed inputs.

### 8.2 Integration specs

- **Streaming integration**: a corpus of canonical markdown samples (paragraphs, headings, lists, blockquotes, code blocks, inline emphasis, links). For each sample, push it in 1-char chunks and assert the final tree matches the expected snapshot.
- **Identity preservation**: push sample 1, capture node references at each level, push sample 2 (extending sample 1), assert pre-existing references are unchanged where structurally applicable.
- **JSON Pointer**: assert `getByPath('/children/0/children/2')` returns the expected node for a known sample.
- **Materialize structural sharing**: materialize the same root twice with no intervening pushes; assert reference equality on the result. Then mutate one subtree via a push; assert other subtrees retain the prior materialized references.

### 8.3 Coverage target

≥ 90% statement coverage on the parser handlers. Materialize helper at 100%.

---

## 9. Build, publish, dependencies

- **Build:** `tsup` produces ESM (`dist/index.mjs`) + CJS (`dist/index.cjs`) + types (`dist/index.d.ts`, `dist/index.d.cts`). Identical to partial-json's tsup config.
- **Test:** `vitest run` for CI; `vitest` watch mode for dev.
- **Lint:** `eslint.config.js` matching partial-json's flat config.
- **Runtime dependencies:** **none**. The parser is pure TypeScript with no third-party dependencies.
- **Dev dependencies:** TypeScript, tsup, vitest, eslint, typescript-eslint. Mirror partial-json.
- **Publish:** `npm publish` from CI on tag push (tags `v0.1.0`, `v0.1.1`, etc). MIT license. Public registry.

---

## 10. Roadmap context (the 4 sub-projects)

This spec covers Sub-project 1. The others are tracked here for context but each will get its own spec when reached:

| Sub-project | Package | Version | Scope summary |
|---|---|---|---|
| **1 (this spec)** | `@cacheplane/partial-markdown` | `0.1.0` | Streaming AST, basic markdown surface (no tables, no task lists, no citations) |
| 2 | `@ngaf/chat` | `0.0.20` | Swap `<chat-streaming-md>` to consume partial-markdown v0.1; tables and task lists regress until v0.3 |
| 3 | `@cacheplane/partial-markdown` | `0.2.0` | Pandoc footnote citations: `[^id]` references + `[^id]: text url` definitions, first-reference numbering, definitions registry |
| 4 | `@ngaf/chat` | `0.0.21` | New `<chat-citations>` primitive + `@ngaf/langgraph` bridge translation (LangChain `Citation` blocks → inline `[^id]` + definitions) |
| 5+ | `@cacheplane/partial-markdown` | `0.3.0+` | Tables, task lists, full Pandoc footnote spec, link reference definitions |

Future consumers (no spec yet, noted as architectural alignment):
- `@ngaf/a2ui` text components consume partial-markdown for rich text in agent-driven UI surfaces.
- `<chat-reasoning>` body consumes partial-markdown the same way `<chat-streaming-md>` does.

---

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| **Parser correctness** — markdown has many edge cases; rolling our own means owning them. | Start with a small surface (v0.1 scope deliberately tight) and a strong canonical-fixture corpus. Add fixtures aggressively as bugs surface. Don't chase CommonMark spec compliance; we ship what real LLM output emits. |
| **API churn** — first version of a new package; consumers (chat, a2ui) will exercise edge cases that force changes. | Pre-1.0 patch versions explicitly free to break. Document this in README. Major version stability is a v1.0 concern. |
| **Identity preservation regressions** — easy to break when adding new node types. | Dedicated identity-preservation spec suite that runs across the full canonical fixture corpus. CI guard. |
| **Bundle size** — packages with no runtime deps shouldn't be a concern, but a sloppy implementation could blow up. | Track bundle size in CI (target: gzipped ESM < 15 KB for v0.1). |

---

## 12. Out-of-scope acknowledgments

- This package does not render markdown to HTML, DOM, JSX, or Angular templates. Rendering is consumer-specific and lives in `<chat-streaming-md>` (or any future renderer).
- This package does not sanitize URLs, HTML, or any other content. Sanitization is the consumer's responsibility at render time.
- This package does not extend the markdown surface beyond the v0.1 scope listed in §5. Citations, tables, and task lists are explicitly out of scope and land in subsequent versions.
- The architecture is independently arrived at. Where it shares shape with `@cacheplane/partial-json`, that's deliberate consistency within the cacheplane streaming-AST family. Where it shares shape with any other public streaming-markdown work, that's coincidental — no code, comment, commit, or documentation reference shall name any inspiration source.
