# GenUI Streaming Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace PR #245's broken chat-message-level GenUI suppression with a clean separation: the classifier stays content-only (rename + patience fix), and the chat composition owns GenUI turn orchestration (skeleton + tool-call filter). Single PR.

**Architecture:** The classifier's `'undetermined'` state is renamed to `'pending'`, and gains patience so it doesn't commit to `'markdown'` while `-` could still be the start of `---a2ui_JSON---`. The chat composition gains `isGenuiTurn(message, prevMessage)` which reads message structure to decide whether to show `<chat-genui-skeleton>` during the pending state and whether to filter `<chat-tool-calls>` for known GenUI tool names. The `chat-genui-skeleton` primitive (from PR #245) is lifted into this PR. PR #245's chat-message changes are reverted.

**Tech Stack:** Angular 21 standalone components + signals + OnPush; Vitest. No backend changes.

**Spec:** `docs/superpowers/specs/2026-05-11-genui-streaming-architecture-design.md` (commit `9c053223` on `claude/spec-genui-architecture`).

**Hard constraint:** Never reference hashbrown / copilotkit / chatgpt / chatbot-kit / claude in code, comments, commits, PR bodies, or docs.

---

## File Structure

**Create**
- `libs/chat/src/lib/primitives/chat-genui-skeleton/chat-genui-skeleton.component.ts` (~70 LOC, lifted from PR #245)
- `libs/chat/src/lib/primitives/chat-genui-skeleton/chat-genui-skeleton.component.spec.ts` (~30 LOC, lifted from PR #245)

**Modify**
- `libs/chat/src/lib/streaming/content-classifier.ts` — rename + patience fix (~20 LOC delta)
- `libs/chat/src/lib/streaming/content-classifier.spec.ts` — update existing tests + add 6 new patience tests (~40 LOC delta)
- `libs/chat/src/lib/primitives/chat-tool-calls/chat-tool-calls.component.ts` — new `excludeToolNames` input + filter (~10 LOC delta)
- `libs/chat/src/lib/primitives/chat-tool-calls/chat-tool-calls.component.spec.ts` — add 3 filter tests (~50 LOC delta)
- `libs/chat/src/lib/primitives/chat-message/chat-message.component.ts` — REVERT to pre-PR-#245 state (~-45 LOC)
- `libs/chat/src/lib/primitives/chat-message/chat-message.component.spec.ts` — DROP the 9 GenUI tests from PR #245 + follow-up (~-120 LOC)
- `libs/chat/src/lib/compositions/chat/chat.component.ts` — import skeleton, new `genuiToolNames` input, new `isGenuiTurn` + `prevMessage` methods, template skeleton branch + `[excludeToolNames]` binding (~35 LOC delta)
- `libs/chat/src/lib/compositions/chat/chat.component.spec.ts` — 7 new composition tests (~120 LOC delta — file may need to be created if it doesn't exist; check first)
- `libs/chat/src/public-api.ts` — export `ChatGenuiSkeletonComponent` (1 line)

---

## Phase 0 — Branch creation

### Task 0.1: Fork branch

- [ ] **Step 1: Fork from origin/main**

```bash
git fetch origin
git checkout -b claude/genui-architecture-fix origin/main
git log --oneline -1
```

Expected: latest origin/main HEAD (should be the PR #244 palette-v2 merge commit).

---

## Phase 1 — Lift `chat-genui-skeleton` primitive

The skeleton is the same as PR #245's. Lift it cleanly so the new PR is self-contained.

### Task 1.1: Create the skeleton component + tests

**Files:**
- Create: `libs/chat/src/lib/primitives/chat-genui-skeleton/chat-genui-skeleton.component.ts`
- Create: `libs/chat/src/lib/primitives/chat-genui-skeleton/chat-genui-skeleton.component.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// libs/chat/src/lib/primitives/chat-genui-skeleton/chat-genui-skeleton.component.spec.ts
// SPDX-License-Identifier: MIT
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ChatGenuiSkeletonComponent } from './chat-genui-skeleton.component';

describe('ChatGenuiSkeletonComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [ChatGenuiSkeletonComponent] }));

  it('renders a region role with the Building UI status text', () => {
    const fx = TestBed.createComponent(ChatGenuiSkeletonComponent);
    fx.detectChanges();
    const status = fx.nativeElement.querySelector('[role="status"]');
    expect(status).toBeTruthy();
    expect(status.textContent).toContain('Building UI');
  });

  it('renders three shimmer rows', () => {
    const fx = TestBed.createComponent(ChatGenuiSkeletonComponent);
    fx.detectChanges();
    const rows = fx.nativeElement.querySelectorAll('.chat-genui-skeleton__row');
    expect(rows.length).toBe(3);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx nx test chat --testFile chat-genui-skeleton.component.spec.ts 2>&1 | tail -10
```

Expected: FAIL — file not found.

- [ ] **Step 3: Implement the component**

```typescript
// libs/chat/src/lib/primitives/chat-genui-skeleton/chat-genui-skeleton.component.ts
// SPDX-License-Identifier: MIT
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CHAT_HOST_TOKENS } from '../../styles/chat-tokens';

@Component({
  selector: 'chat-genui-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [CHAT_HOST_TOKENS, `
    :host {
      display: block;
      width: 100%;
    }
    .chat-genui-skeleton {
      border: 1px solid var(--ngaf-chat-separator);
      border-radius: 10px;
      padding: 14px;
      background: var(--ngaf-chat-surface-alt);
    }
    .chat-genui-skeleton__label {
      font-size: 12px;
      color: var(--ngaf-chat-text-muted);
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .chat-genui-skeleton__rows {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .chat-genui-skeleton__row {
      height: 10px;
      border-radius: 5px;
      background: linear-gradient(
        90deg,
        var(--ngaf-chat-separator) 0%,
        color-mix(in srgb, var(--ngaf-chat-separator) 70%, transparent) 50%,
        var(--ngaf-chat-separator) 100%
      );
      background-size: 200% 100%;
      animation: chat-genui-skeleton-shimmer 1.4s ease-in-out infinite;
    }
    .chat-genui-skeleton__row:nth-child(1) { width: 70%; }
    .chat-genui-skeleton__row:nth-child(2) { width: 90%; }
    .chat-genui-skeleton__row:nth-child(3) { width: 50%; }
    @keyframes chat-genui-skeleton-shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `],
  template: `
    <div class="chat-genui-skeleton" role="status" aria-live="polite">
      <div class="chat-genui-skeleton__label">
        <span aria-hidden="true">✨</span>
        <span>Building UI…</span>
      </div>
      <div class="chat-genui-skeleton__rows">
        <div class="chat-genui-skeleton__row"></div>
        <div class="chat-genui-skeleton__row"></div>
        <div class="chat-genui-skeleton__row"></div>
      </div>
    </div>
  `,
})
export class ChatGenuiSkeletonComponent {}
```

- [ ] **Step 4: Run tests**

```bash
npx nx test chat --testFile chat-genui-skeleton.component.spec.ts 2>&1 | tail -10
```

Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add libs/chat/src/lib/primitives/chat-genui-skeleton/
git commit -m "feat(chat): chat-genui-skeleton primitive

Card-shaped placeholder rendered in place of streaming
tool-call JSON while an A2UI / json-render surface is being
built. Three shimmer rows + 'Building UI…' status label.
Themed via existing chat-tokens (separator color, surface-alt
background) so it inherits theme overrides."
```

---

## Phase 2 — Classifier rename + patience fix

### Task 2.1: Classifier source — rename `'undetermined'` → `'pending'`, add patience for `-` prefix

**Files:**
- Modify: `libs/chat/src/lib/streaming/content-classifier.ts`

- [ ] **Step 1: Replace the file contents**

```typescript
// libs/chat/src/lib/streaming/content-classifier.ts
// SPDX-License-Identifier: MIT
import { signal, untracked, type Signal } from '@angular/core';
import type { Spec } from '@json-render/core';
import { createPartialJsonParser } from '@cacheplane/partial-json';
import { createParseTreeStore, type ElementAccumulationState, type ParseTreeStore } from './parse-tree-store';
import { createA2uiMessageParser, type A2uiMessageParser } from '@ngaf/a2ui';
import type { A2uiSurface } from '@ngaf/a2ui';
import { createA2uiSurfaceStore, type A2uiSurfaceStore } from '../a2ui/surface-store';
import { isTraceEnabled, trace } from './trace';

export type ContentType = 'pending' | 'markdown' | 'json-render' | 'a2ui' | 'mixed';

const A2UI_PREFIX = '---a2ui_JSON---';

export interface ContentClassifier {
  update(content: string): void;
  readonly type: Signal<ContentType>;
  readonly markdown: Signal<string>;
  readonly spec: Signal<Spec | null>;
  readonly elementStates: Signal<Map<string, ElementAccumulationState>>;
  readonly a2uiSurfaces: Signal<Map<string, A2uiSurface>>;
  readonly streaming: Signal<boolean>;
  readonly errors: Signal<string[]>;
  dispose(): void;
}

export function createContentClassifier(): ContentClassifier {
  const typeSignal = signal<ContentType>('pending');
  const markdownSignal = signal<string>('');
  const specSignal = signal<Spec | null>(null);
  const elementStatesSignal = signal<Map<string, ElementAccumulationState>>(new Map());
  const streamingSignal = signal<boolean>(false);
  const errorsSignal = signal<string[]>([]);

  let processedLength = 0;
  let store: ParseTreeStore | null = null;
  let jsonStartIndex = 0;

  let a2uiParser: A2uiMessageParser | null = null;
  let a2uiStore: A2uiSurfaceStore | null = null;
  const a2uiSurfacesSignal = signal<Map<string, A2uiSurface>>(new Map());

  /**
   * Decide the content type from the first non-whitespace character.
   * Returns 'pending' when:
   *  - content is empty or all whitespace, OR
   *  - the first non-whitespace char is '-' AND content is too short to
   *    confirm or disprove the full A2UI_PREFIX (the "patience" case).
   * Once we have at least A2UI_PREFIX.length non-prefix chars after the
   * first '-', we commit to either 'a2ui' (full match) or 'markdown'
   * (definitively not the prefix).
   */
  function detectType(content: string): ContentType {
    for (let i = 0; i < content.length; i++) {
      const ch = content[i];
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') continue;

      if (ch === '{') {
        return 'json-render';
      }

      // Possible A2UI prefix path. Use patience: only commit once we
      // have enough chars to disambiguate.
      if (ch === '-') {
        if (content.startsWith(A2UI_PREFIX, i)) {
          return 'a2ui';
        }
        const remaining = content.length - i;
        if (remaining < A2UI_PREFIX.length) {
          // Still might be the prefix as more tokens arrive — stay pending.
          const candidate = content.slice(i);
          if (A2UI_PREFIX.startsWith(candidate)) {
            return 'pending';
          }
          // Already disproven (e.g. "-x" — A2UI_PREFIX doesn't start
          // with "-x"), commit to markdown.
          return 'markdown';
        }
        // Enough chars to know it's not the prefix.
        return 'markdown';
      }

      // Any other non-whitespace, non-`{`, non-`-` → markdown.
      return 'markdown';
    }
    return 'pending';
  }

  function initJsonStore(jsonContent: string): void {
    const parser = createPartialJsonParser();
    store = createParseTreeStore(parser);
    if (jsonContent.length > 0) {
      store.push(jsonContent);
    }
    syncJsonSignals();
  }

  function syncJsonSignals(): void {
    if (!store) return;
    specSignal.set(store.spec());
    elementStatesSignal.set(store.elementStates());

    const spec = store.spec();
    if (spec) {
      streamingSignal.set(isStillStreaming());
    } else {
      streamingSignal.set(true);
    }
  }

  function isStillStreaming(): boolean {
    if (!store) return false;
    const states = store.elementStates();
    for (const state of states.values()) {
      if (state.streaming) return true;
    }
    const spec = store.spec();
    if (!spec || !spec.root || !spec.elements) return true;
    return false;
  }

  function resetState(): void {
    typeSignal.set('pending');
    markdownSignal.set('');
    specSignal.set(null);
    elementStatesSignal.set(new Map());
    streamingSignal.set(false);
    errorsSignal.set([]);
    processedLength = 0;
    store = null;
    jsonStartIndex = 0;
    a2uiParser = null;
    a2uiStore = null;
    a2uiSurfacesSignal.set(new Map());
  }

  function update(content: string): void {
    untracked(() => {
      if (content.length < processedLength) {
        resetState();
      }
      const currentType = typeSignal();

      if (currentType === 'pending') {
        const detected = detectType(content);
        if (detected === 'pending') return;

        typeSignal.set(detected);

        if (detected === 'markdown') {
          markdownSignal.set(content);
          processedLength = content.length;
        } else if (detected === 'json-render') {
          streamingSignal.set(true);
          jsonStartIndex = 0;
          for (let i = 0; i < content.length; i++) {
            if (content[i] !== ' ' && content[i] !== '\t' && content[i] !== '\n' && content[i] !== '\r') {
              jsonStartIndex = i;
              break;
            }
          }
          const jsonContent = content.slice(jsonStartIndex);
          try {
            initJsonStore(jsonContent);
          } catch (err) {
            errorsSignal.update(prev => [...prev, err instanceof Error ? err.message : String(err)]);
          }
          processedLength = content.length;
        } else if (detected === 'a2ui') {
          streamingSignal.set(true);
          a2uiParser = createA2uiMessageParser();
          a2uiStore = createA2uiSurfaceStore();
          jsonStartIndex = content.indexOf(A2UI_PREFIX) + A2UI_PREFIX.length;
          const a2uiContent = content.slice(jsonStartIndex);
          if (a2uiContent.length > 0) {
            try {
              const msgs = a2uiParser.push(a2uiContent);
              for (const msg of msgs) a2uiStore.apply(msg);
              a2uiSurfacesSignal.set(a2uiStore.surfaces());
            } catch (err) {
              errorsSignal.update(prev => [...prev, err instanceof Error ? err.message : String(err)]);
            }
          }
          processedLength = content.length;
        }
        return;
      }

      const delta = content.slice(processedLength);
      processedLength = content.length;

      if (delta.length === 0) return;

      if (currentType === 'markdown' || currentType === 'mixed') {
        markdownSignal.set(content);
      } else if (currentType === 'json-render') {
        if (store) {
          try {
            store.push(delta);
            syncJsonSignals();
          } catch (err) {
            errorsSignal.update(prev => [...prev, err instanceof Error ? err.message : String(err)]);
          }
        }
      } else if (currentType === 'a2ui') {
        if (a2uiParser && a2uiStore) {
          try {
            const msgs = a2uiParser.push(delta);
            for (const msg of msgs) a2uiStore.apply(msg);
            a2uiSurfacesSignal.set(a2uiStore.surfaces());
          } catch (err) {
            errorsSignal.update(prev => [...prev, err instanceof Error ? err.message : String(err)]);
          }
        }
      }

      if (isTraceEnabled()) {
        trace('classifier.update', { contentLength: content.length, type: typeSignal() });
      }
    });
  }

  function dispose(): void {
    store = null;
    a2uiParser = null;
    a2uiStore = null;
  }

  return {
    update,
    type: typeSignal.asReadonly(),
    markdown: markdownSignal.asReadonly(),
    spec: specSignal.asReadonly(),
    elementStates: elementStatesSignal.asReadonly(),
    a2uiSurfaces: a2uiSurfacesSignal.asReadonly(),
    streaming: streamingSignal.asReadonly(),
    errors: errorsSignal.asReadonly(),
    dispose,
  };
}
```

- [ ] **Step 2: Verify the lib builds**

```bash
npx nx build chat 2>&1 | tail -5
```

Expected: green. (Spec file still has `'undetermined'` references — they will fail TYPESCRIPT in step 3 below if not updated, but `.spec.ts` files are excluded from the build by default. They will surface in the next task.)

### Task 2.2: Classifier tests — rename + new patience tests

**Files:**
- Modify: `libs/chat/src/lib/streaming/content-classifier.spec.ts`

- [ ] **Step 1: Read the existing spec file first**

```bash
cat libs/chat/src/lib/streaming/content-classifier.spec.ts | head -80
```

Note the existing tests so the rename doesn't lose coverage.

- [ ] **Step 2: Replace the `undetermined` references with `pending` and add new patience tests**

In every `expect(...).toBe('undetermined')` or `.toEqual('undetermined')` assertion, change the literal to `'pending'`.

Then append the following block of new tests at the end of the file (before the final closing brace if the file is wrapped in `describe`, OR as a new top-level `describe` block):

```typescript
describe('ContentClassifier — A2UI prefix patience', () => {
  it('stays pending on a single dash (partial A2UI prefix)', () => {
    const c = createContentClassifier();
    c.update('-');
    expect(c.type()).toBe('pending');
  });

  it('stays pending on partial A2UI prefix like --- or ---a or ---a2u', () => {
    const c1 = createContentClassifier();
    c1.update('---');
    expect(c1.type()).toBe('pending');

    const c2 = createContentClassifier();
    c2.update('---a');
    expect(c2.type()).toBe('pending');

    const c3 = createContentClassifier();
    c3.update('---a2u');
    expect(c3.type()).toBe('pending');
  });

  it('transitions to a2ui when the full A2UI prefix arrives', () => {
    const c = createContentClassifier();
    c.update('-');
    c.update('---a2ui_JSON---');
    expect(c.type()).toBe('a2ui');
  });

  it('commits to markdown when content starting with - is disproven early', () => {
    const c = createContentClassifier();
    // "-x" already does not match A2UI_PREFIX's second char ('-')
    c.update('-x');
    expect(c.type()).toBe('markdown');
  });

  it('commits to markdown once enough chars are seen without matching prefix', () => {
    const c = createContentClassifier();
    // Long content starting with - that is NOT the A2UI prefix.
    c.update('-this is just dashes leading text');
    expect(c.type()).toBe('markdown');
  });

  it('commits to json-render on a single { with no patience needed', () => {
    const c = createContentClassifier();
    c.update('{');
    expect(c.type()).toBe('json-render');
  });

  it('initial state is pending (renamed from undetermined)', () => {
    const c = createContentClassifier();
    expect(c.type()).toBe('pending');
  });
});
```

- [ ] **Step 3: Run all classifier tests**

```bash
npx nx test chat --testFile content-classifier.spec.ts 2>&1 | tail -15
```

Expected: all original tests pass (with `pending` substituted) + 7 new patience tests pass.

- [ ] **Step 4: Commit**

```bash
git add libs/chat/src/lib/streaming/content-classifier.ts \
        libs/chat/src/lib/streaming/content-classifier.spec.ts
git commit -m "refactor(chat): classifier — rename undetermined→pending + A2UI patience

Two changes:

1. Rename ContentType value 'undetermined' to 'pending'. The new
   name better reflects what the state means (we're waiting for
   enough content to decide), and is the state the chat composition
   reads when deciding whether to show the GenUI skeleton.

2. Add patience for the A2UI prefix. When the first non-whitespace
   char is '-', stay 'pending' until either the full prefix matches
   (commit to 'a2ui') or enough chars arrive without matching
   (commit to 'markdown'). Previously the classifier committed to
   'markdown' on the first '-', missing every streaming A2UI
   payload that hadn't yet emitted the full prefix in a single
   chunk."
```

---

## Phase 3 — chat-tool-calls excludeToolNames filter

### Task 3.1: Add `excludeToolNames` input + filter the `groups()` computed

**Files:**
- Modify: `libs/chat/src/lib/primitives/chat-tool-calls/chat-tool-calls.component.ts`

- [ ] **Step 1: Read the existing component**

```bash
grep -n "input\|groups\|toolCalls" libs/chat/src/lib/primitives/chat-tool-calls/chat-tool-calls.component.ts | head -15
```

The class body declares `agent`, `message`, `grouping`, `groupSummary` inputs and a `groups()` computed.

- [ ] **Step 2: Add the new input**

In `libs/chat/src/lib/primitives/chat-tool-calls/chat-tool-calls.component.ts`, locate the inputs block (look for `readonly agent = input.required<Agent>();`). Add immediately after the other inputs:

```typescript
  /**
   * Tool names whose groups should be hidden. Used by chat compositions
   * to filter out internal/orchestration tools (e.g. GenUI dispatchers)
   * whose args streaming is not meaningful to surface in the chat.
   * Default empty — preserves prior behavior for non-filtering consumers.
   */
  readonly excludeToolNames = input<readonly string[]>([]);
```

- [ ] **Step 3: Filter inside `groups()` computed**

Locate `readonly groups = computed((): Group[] => {`. Modify to filter at the start:

```typescript
  readonly groups = computed((): Group[] => {
    const excludeSet = new Set(this.excludeToolNames());
    const calls = this.toolCalls().filter(tc => !excludeSet.has(tc.name));
    const groupingMode = this.grouping();
    const registry = this.templateRegistry();
    const wildcard = registry.get('*');
    const out: Group[] = [];
    for (const tc of calls) {
      const tpl = registry.get(tc.name) ?? wildcard;
      const last = out[out.length - 1];
      const sameName = last && last.name === tc.name;
      const canGroup = groupingMode === 'auto' && sameName;
      if (canGroup) {
        last.calls.push(tc);
        if (!last.templateRef && tpl) last.templateRef = tpl;
      } else {
        out.push({ name: tc.name, calls: [tc], templateRef: tpl });
      }
    }
    return out;
  });
```

The only change is the first two lines: build a Set from `excludeToolNames()` and filter `this.toolCalls()` before grouping.

- [ ] **Step 4: Verify the lib builds**

```bash
npx nx build chat 2>&1 | tail -5
```

Expected: green.

### Task 3.2: chat-tool-calls tests — filter behavior

**Files:**
- Modify: `libs/chat/src/lib/primitives/chat-tool-calls/chat-tool-calls.component.spec.ts`

- [ ] **Step 1: Read the existing spec file**

```bash
cat libs/chat/src/lib/primitives/chat-tool-calls/chat-tool-calls.component.spec.ts | head -40
```

Identify the existing test pattern (TestBed host, stub Agent, etc.).

- [ ] **Step 2: Append the new tests at the end of the file**

```typescript
import { TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import type { Agent, ToolCall } from '../../agent';
import { ChatToolCallsComponent } from './chat-tool-calls.component';

function makeStubAgent(toolCalls: ToolCall[]): Agent {
  // Minimal stub matching the Agent surface used by chat-tool-calls.
  return {
    messages: signal([]),
    status: signal('idle'),
    isLoading: signal(false),
    error: signal(undefined),
    toolCalls: signal(toolCalls),
    state: signal({}),
    interrupt: signal(undefined),
    subagents: signal(new Map()),
    events$: { subscribe: () => ({ unsubscribe: () => undefined }) },
    submit: () => Promise.resolve(),
    stop: () => undefined,
  } as unknown as Agent;
}

const mkCall = (name: string, id: string): ToolCall => ({
  id,
  name,
  args: {},
  status: 'complete',
});

@Component({
  standalone: true,
  imports: [ChatToolCallsComponent],
  template: `<chat-tool-calls [agent]="agent" [excludeToolNames]="excluded" />`,
})
class FilterHost {
  agent = makeStubAgent([
    mkCall('generate_a2ui_schema', 'tc-1'),
    mkCall('search_documents', 'tc-2'),
    mkCall('research', 'tc-3'),
  ]);
  excluded: readonly string[] = [];
}

describe('ChatToolCallsComponent — excludeToolNames filter', () => {
  it('renders all groups when excludeToolNames is empty (default)', () => {
    TestBed.configureTestingModule({ imports: [FilterHost] });
    const fx = TestBed.createComponent(FilterHost);
    fx.detectChanges();
    // Three distinct tool names → three groups (or three cards if grouping breaks).
    const cards = fx.nativeElement.querySelectorAll('chat-tool-call-card, [data-group]');
    expect(cards.length).toBeGreaterThanOrEqual(1);
    // Each tool name should appear somewhere in the rendered text.
    const text = fx.nativeElement.textContent ?? '';
    expect(text).toContain('search_documents');
    expect(text).toContain('research');
  });

  it('omits a group whose name is in excludeToolNames', () => {
    TestBed.configureTestingModule({ imports: [FilterHost] });
    const fx = TestBed.createComponent(FilterHost);
    fx.componentInstance.excluded = ['generate_a2ui_schema'];
    fx.detectChanges();
    const text = fx.nativeElement.textContent ?? '';
    expect(text).not.toContain('generate_a2ui_schema');
    expect(text).toContain('search_documents');
    expect(text).toContain('research');
  });

  it('omits ALL groups when every tool name is excluded', () => {
    TestBed.configureTestingModule({ imports: [FilterHost] });
    const fx = TestBed.createComponent(FilterHost);
    fx.componentInstance.excluded = [
      'generate_a2ui_schema',
      'search_documents',
      'research',
    ];
    fx.detectChanges();
    const text = fx.nativeElement.textContent?.trim() ?? '';
    // No tool name should appear in the body; the host is effectively empty.
    expect(text).not.toContain('generate_a2ui_schema');
    expect(text).not.toContain('search_documents');
    expect(text).not.toContain('research');
  });
});
```

- [ ] **Step 3: Run the tests**

```bash
npx nx test chat --testFile chat-tool-calls.component.spec.ts 2>&1 | tail -15
```

Expected: existing tests pass + 3 new filter tests pass.

- [ ] **Step 4: Commit**

```bash
git add libs/chat/src/lib/primitives/chat-tool-calls/
git commit -m "feat(chat): chat-tool-calls excludeToolNames input

New optional input that filters out tool groups whose name is in
the exclude set. Used by chat compositions to hide
orchestration-only tool calls (e.g. GenUI dispatchers) whose
streaming args are not meaningful to the user."
```

---

## Phase 4 — Revert PR #245's chat-message changes

### Task 4.1: Restore chat-message to its pre-PR-#245 state

**Files:**
- Modify: `libs/chat/src/lib/primitives/chat-message/chat-message.component.ts`

- [ ] **Step 1: Replace the file with the original (pre-PR-#245) contents**

```typescript
// libs/chat/src/lib/primitives/chat-message/chat-message.component.ts
// SPDX-License-Identifier: MIT
import { Component, ChangeDetectionStrategy, input, output, computed, effect, inject } from '@angular/core';
import { CHAT_HOST_TOKENS } from '../../styles/chat-tokens';
import { CHAT_MESSAGE_STYLES } from '../../styles/chat-message.styles';
import { ChatCitationsComponent } from '../chat-citations/chat-citations.component';
import { ChatCheckpointMarkerComponent } from '../chat-checkpoint-marker/chat-checkpoint-marker.component';
import { CitationsResolverService } from '../../markdown/citations-resolver.service';
import type { Message } from '../../agent/message';

export type ChatMessageRole = 'user' | 'assistant' | 'system' | 'tool';

@Component({
  selector: 'chat-message',
  standalone: true,
  imports: [ChatCitationsComponent, ChatCheckpointMarkerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [CHAT_HOST_TOKENS, CHAT_MESSAGE_STYLES, `
    .chat-message__layout { display: flex; gap: 8px; align-items: flex-start; }
    .chat-message__gutter { flex: 0 0 14px; display: flex; align-items: flex-start; padding-top: 4px; }
    .chat-message__gutter:empty { flex-basis: 0; }
    .chat-message__main { flex: 1; min-width: 0; }
  `],
  providers: [CitationsResolverService],
  host: {
    '[attr.data-role]': 'role()',
    '[attr.data-current]': 'currentStr()',
    '[attr.data-streaming]': 'streamingStr()',
    '[attr.data-prev-role]': 'prevRole() ?? null',
  },
  template: `
    <div class="chat-message__layout">
      <div class="chat-message__gutter">
        @if (checkpointId(); as cpId) {
          <chat-checkpoint-marker
            [checkpointId]="cpId"
            [isActive]="checkpointActive()"
            (replayRequested)="replayRequested.emit($event)"
            (forkRequested)="forkRequested.emit($event)"
          />
        }
      </div>
      <div class="chat-message__main">
        <div [class]="bodyClass()">
          <ng-content />
          <span class="chat-message__caret" aria-hidden="true"></span>
        </div>
        @if (message()?.role === 'assistant' && message(); as msg) {
          <chat-citations [message]="msg" />
        }
        <div class="chat-message__controls">
          <ng-content select="[chatMessageControls]" />
        </div>
      </div>
    </div>
  `,
})
export class ChatMessageComponent {
  readonly role = input.required<ChatMessageRole>();
  readonly current = input(false);
  readonly streaming = input(false);
  readonly prevRole = input<ChatMessageRole | undefined>(undefined);
  readonly message = input<Message | undefined>(undefined);

  /** Optional checkpoint id to anchor a gutter marker. */
  readonly checkpointId = input<string | undefined>(undefined);
  readonly checkpointActive = input<boolean>(false);

  readonly replayRequested = output<string>();
  readonly forkRequested = output<string>();

  private readonly resolver = inject(CitationsResolverService);

  constructor() {
    effect(() => {
      this.resolver.message.set(this.message() ?? null);
    });
  }

  readonly currentStr = computed(() => String(this.current()));
  readonly streamingStr = computed(() => String(this.streaming()));

  readonly bodyClass = computed(() => {
    switch (this.role()) {
      case 'user': return 'chat-message__bubble';
      case 'assistant': return 'chat-message__assistant-body';
      default: return 'chat-message__plain';
    }
  });
}
```

This restores the file to its state before PR #245's changes — no `genuiToolNames`, no `isGenUiToolCall`, no `ChatGenuiSkeletonComponent` import, no template branch.

### Task 4.2: Drop the GenUI tests from chat-message spec

**Files:**
- Modify: `libs/chat/src/lib/primitives/chat-message/chat-message.component.spec.ts`

- [ ] **Step 1: Restore the spec to its pre-PR-#245 contents**

```typescript
// libs/chat/src/lib/primitives/chat-message/chat-message.component.spec.ts
// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { ChatMessageComponent } from './chat-message.component';
import { CitationsResolverService } from '../../markdown/citations-resolver.service';

describe('ChatMessageComponent', () => {
  it('instantiates without error', () => {
    TestBed.configureTestingModule({ providers: [CitationsResolverService] });
    let component!: ChatMessageComponent;
    TestBed.runInInjectionContext(() => {
      component = new ChatMessageComponent();
    });
    expect(component).toBeTruthy();
  });
});

@Component({
  standalone: true,
  imports: [ChatMessageComponent],
  template: `<chat-message
    role="assistant"
    [checkpointId]="cpId"
    (replayRequested)="replayed.push($event)"
    (forkRequested)="forked.push($event)">Hello</chat-message>`,
})
class GutterHost {
  cpId: string | undefined = undefined;
  replayed: string[] = [];
  forked: string[] = [];
}

describe('ChatMessageComponent — gutter checkpoint marker', () => {
  it('does not render a marker when checkpointId is unset', () => {
    TestBed.configureTestingModule({ imports: [GutterHost] });
    const fx = TestBed.createComponent(GutterHost);
    fx.detectChanges();
    expect(fx.nativeElement.querySelector('chat-checkpoint-marker')).toBeNull();
  });

  it('renders a marker in the gutter when checkpointId is set', () => {
    TestBed.configureTestingModule({ imports: [GutterHost] });
    const fx = TestBed.createComponent(GutterHost);
    fx.componentInstance.cpId = 'cp-99';
    fx.detectChanges();
    const marker = fx.nativeElement.querySelector('chat-checkpoint-marker');
    expect(marker).toBeTruthy();
    expect(marker.querySelector('[aria-label]').getAttribute('aria-label')).toContain('cp-99');
  });

  it('bubbles replayRequested from the marker as a message-level output', () => {
    TestBed.configureTestingModule({ imports: [GutterHost] });
    const fx = TestBed.createComponent(GutterHost);
    fx.componentInstance.cpId = 'cp-99';
    fx.detectChanges();
    (fx.nativeElement.querySelector('[data-action="rewind"]') as HTMLButtonElement).click();
    expect(fx.componentInstance.replayed).toEqual(['cp-99']);
  });

  it('bubbles forkRequested from the marker as a message-level output', () => {
    TestBed.configureTestingModule({ imports: [GutterHost] });
    const fx = TestBed.createComponent(GutterHost);
    fx.componentInstance.cpId = 'cp-99';
    fx.detectChanges();
    (fx.nativeElement.querySelector('[data-action="fork"]') as HTMLButtonElement).click();
    expect(fx.componentInstance.forked).toEqual(['cp-99']);
  });
});
```

This drops all GenUI suppression tests and keeps only the instantiation + gutter marker tests (the latter are from the earlier nav v2 work and stay valid).

- [ ] **Step 2: Run the tests**

```bash
npx nx test chat --testFile chat-message.component.spec.ts 2>&1 | tail -15
```

Expected: 5 passing (instantiation + 4 gutter tests).

- [ ] **Step 3: Commit**

```bash
git add libs/chat/src/lib/primitives/chat-message/
git commit -m "revert(chat): chat-message GenUI tool-call suppression (PR #245)

Reverts the chat-message-level skeleton suppression added in
PR #245. That approach hid the entire ng-content slot of
chat-message, which prevented the actual <a2ui-surface> from
rendering — the skeleton would 'replace' the surface forever.

GenUI orchestration is moving to the chat composition (next
commit) where it has access to the conditional render tree
and can show the skeleton as a sibling of the surface, not
a wrapper around it."
```

---

## Phase 5 — Chat composition: skeleton + tool-call filter + isGenuiTurn

### Task 5.1: Add `genuiToolNames` input, `isGenuiTurn` method, and `prevMessage` helper

**Files:**
- Modify: `libs/chat/src/lib/compositions/chat/chat.component.ts`

- [ ] **Step 1: Add the ChatGenuiSkeletonComponent import**

Find the existing chat-genui imports in `chat.component.ts` (look for `import { ChatGenerativeUiComponent }`). Add the new import on a new line nearby:

```typescript
import { ChatGenuiSkeletonComponent } from '../../primitives/chat-genui-skeleton/chat-genui-skeleton.component';
```

Then add `ChatGenuiSkeletonComponent` to the component's `imports` array (find the `imports: [...]` array — it's near the top of the `@Component({...})` decorator). Add the new symbol alongside the other primitive imports.

- [ ] **Step 2: Add the `genuiToolNames` input**

Find the existing inputs block (search for `readonly agent = input.required<Agent>()`). Add immediately after the other inputs:

```typescript
  /**
   * Tool names whose calls produce a rendered GenUI surface rather than
   * visible text. Used to (a) filter <chat-tool-calls> so internal
   * dispatchers don't render args JSON as cards, and (b) detect
   * "this is a GenUI turn" for the building-UI skeleton.
   * Default covers the canonical A2UI + json-render schema tools.
   */
  readonly genuiToolNames = input<readonly string[]>([
    'generate_a2ui_schema',
    'generate_json_render_spec',
  ]);
```

- [ ] **Step 3: Add `isGenuiTurn` method to the class body**

Find the existing `prevRole(index)` method (search for `prevRole(index: number)`). Add immediately after it:

```typescript
  /**
   * Look up the previous message in the agent's messages list.
   * Returns undefined for the first message.
   */
  protected prevMessage(index: number): unknown {
    if (index === 0) return undefined;
    return this.agent().messages()[index - 1];
  }

  /**
   * True when this assistant message is part of a GenUI render turn —
   * either it has a tool_call to a GenUI tool, OR its content array
   * contains a function_call block for one (live during streaming),
   * OR the previous message was a tool result for a GenUI tool. Used
   * to gate the building-UI skeleton.
   */
  protected isGenuiTurn(message: unknown, prevMsg: unknown): boolean {
    const names = new Set(this.genuiToolNames());
    const m = message as { extra?: Record<string, unknown> } | null | undefined;
    if (!m) return false;

    // Case 1: tool_calls field (post-streaming).
    const calls = (m.extra?.['tool_calls'] as Array<{ name?: string }> | undefined) ?? [];
    if (calls.some(c => c.name != null && names.has(c.name))) return true;

    // Case 2: OpenAI Responses-API function_call content block — present
    // from the first streaming chunk, before tool_calls populates.
    const rawContent = m.extra?.['content'];
    if (Array.isArray(rawContent)) {
      for (const block of rawContent) {
        if (block != null
            && typeof block === 'object'
            && (block as { type?: unknown }).type === 'function_call'
            && typeof (block as { name?: unknown }).name === 'string'
            && names.has((block as { name: string }).name)) {
          return true;
        }
      }
    }

    // Case 3: previous message was a tool result for a GenUI tool.
    const p = prevMsg as { role?: string; name?: string; extra?: Record<string, unknown> } | null | undefined;
    if (p && p.role === 'tool') {
      const toolName = (p.extra?.['name'] as string | undefined) ?? p.name;
      if (typeof toolName === 'string' && names.has(toolName)) return true;
    }

    return false;
  }
```

### Task 5.2: Wire the skeleton branch + tool-calls filter into the template

**Files:**
- Modify: `libs/chat/src/lib/compositions/chat/chat.component.ts`

- [ ] **Step 1: Update the AI message template**

Find the `<ng-template chatMessageTemplate="ai" let-message let-i="index">` block (around line 137). Inside that template, find:

- The line `@let content = messageContent(message);`
- The line `@let classified = classifyMessage(content, message);`

Add two new `@let` declarations immediately after `@let classified`:

```html
@let pending = classified.type() === 'pending';
@let genuiTurn = isGenuiTurn(message, prevMessage(i));
```

Then find the `<chat-tool-calls [agent]="agent()" [message]="message">` line. Add the `[excludeToolNames]` binding so it becomes:

```html
<chat-tool-calls [agent]="agent()" [message]="message" [excludeToolNames]="genuiToolNames()">
```

Then find the existing block `@if (classified.markdown(); as md) {` and immediately **above** it, insert the skeleton branch:

```html
@if ((pending || (classified.type() === 'a2ui' && classified.a2uiSurfaces().size === 0)) && genuiTurn) {
  <chat-genui-skeleton />
}
```

The final structure inside `<chat-message>` should be (showing only the new + nearby lines):

```html
<chat-message ...>
  @if (message.reasoning) {
    <chat-reasoning .../>
  }
  <chat-tool-calls [agent]="agent()" [message]="message" [excludeToolNames]="genuiToolNames()">
    <ng-container ngProjectAs="[chatToolCallTemplate]">
      <ng-content select="[chatToolCallTemplate]" />
    </ng-container>
  </chat-tool-calls>
  <chat-subagents [agent]="agent()" />
  @if ((pending || (classified.type() === 'a2ui' && classified.a2uiSurfaces().size === 0)) && genuiTurn) {
    <chat-genui-skeleton />
  }
  @if (classified.markdown(); as md) {
    <chat-streaming-md .../>
  }
  @if (classified.spec(); as spec) {
    <chat-generative-ui .../>
  }
  @if (classified.type() === 'a2ui' && views(); as catalog) {
    @for (entry of classified.a2uiSurfaces() | keyvalue; track entry.key) {
      <a2ui-surface .../>
    }
  }
  <chat-message-actions chatMessageControls .../>
</chat-message>
```

- [ ] **Step 2: Verify the lib builds**

```bash
npx nx build chat 2>&1 | tail -5
```

Expected: green.

### Task 5.3: Composition tests for the new behavior

**Files:**
- Check / Create: `libs/chat/src/lib/compositions/chat/chat.component.spec.ts`

- [ ] **Step 1: Determine whether the spec file exists**

```bash
ls libs/chat/src/lib/compositions/chat/chat.component.spec.ts 2>&1
```

If it exists, read it to understand the pattern. If not, create a new minimal spec.

- [ ] **Step 2: Add new test block (append if file exists; create otherwise)**

If the file does not exist, create it with this contents. If it exists, append everything inside the outermost `describe` block (or as a sibling describe).

```typescript
// libs/chat/src/lib/compositions/chat/chat.component.spec.ts
// SPDX-License-Identifier: MIT
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ChatComponent } from './chat.component';

describe('ChatComponent — isGenuiTurn', () => {
  let comp: ChatComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ChatComponent] });
    // Instantiate without mounting — we only call the protected method
    // via a typed cast since it doesn't need the full render tree.
    TestBed.runInInjectionContext(() => {
      comp = new ChatComponent();
    });
  });

  // Cast to any to access the protected method in tests.
  const isGenuiTurn = (m: unknown, p: unknown): boolean =>
    (comp as unknown as { isGenuiTurn: (a: unknown, b: unknown) => boolean }).isGenuiTurn(m, p);

  it('returns true for an assistant message with tool_calls referencing a GenUI tool', () => {
    const msg = {
      role: 'assistant',
      extra: { tool_calls: [{ name: 'generate_a2ui_schema' }] },
    };
    expect(isGenuiTurn(msg, undefined)).toBe(true);
  });

  it('returns true for an assistant message with a function_call content block (live streaming)', () => {
    const msg = {
      role: 'assistant',
      extra: {
        content: [
          { type: 'reasoning', summary: [] },
          { type: 'function_call', name: 'generate_a2ui_schema', arguments: '{"req' },
        ],
        tool_calls: [],
      },
    };
    expect(isGenuiTurn(msg, undefined)).toBe(true);
  });

  it('returns true for an assistant message whose previous message is a GenUI tool result', () => {
    const prev = { role: 'tool', name: 'generate_a2ui_schema', extra: {} };
    const msg = { role: 'assistant', content: '', extra: {} };
    expect(isGenuiTurn(msg, prev)).toBe(true);
  });

  it('returns true when the previous tool message has the name nested under extra.name', () => {
    const prev = { role: 'tool', extra: { name: 'generate_json_render_spec' } };
    const msg = { role: 'assistant', content: '', extra: {} };
    expect(isGenuiTurn(msg, prev)).toBe(true);
  });

  it('returns false for a non-GenUI tool call (e.g. search_documents)', () => {
    const msg = {
      role: 'assistant',
      extra: { tool_calls: [{ name: 'search_documents' }] },
    };
    expect(isGenuiTurn(msg, undefined)).toBe(false);
  });

  it('returns false for an assistant message with no tool_calls and no qualifying previous message', () => {
    const msg = { role: 'assistant', content: 'hi', extra: {} };
    const prev = { role: 'user', content: 'hello' };
    expect(isGenuiTurn(msg, prev)).toBe(false);
  });

  it('returns false when called with null message', () => {
    expect(isGenuiTurn(null, undefined)).toBe(false);
  });
});
```

- [ ] **Step 3: Run the tests**

```bash
npx nx test chat --testFile chat.component.spec.ts 2>&1 | tail -15
```

Expected: 7 new isGenuiTurn tests pass (plus any pre-existing tests in the file).

- [ ] **Step 4: Build + lint the whole lib**

```bash
npx nx build chat 2>&1 | tail -5
npx nx lint chat 2>&1 | tail -5
```

Expected: both green.

- [ ] **Step 5: Commit**

```bash
git add libs/chat/src/lib/compositions/chat/
git commit -m "feat(chat): composition owns GenUI turn orchestration

Adds isGenuiTurn(message, prevMessage) to the chat composition,
which inspects message structure across three independent signals
(tool_calls field, function_call content block, prev-tool-message
name) to decide whether this assistant turn is producing a GenUI
surface.

Template changes inside the AI message branch:
- <chat-tool-calls> now gets [excludeToolNames]=\"genuiToolNames()\",
  so internal GenUI dispatchers don't render args JSON as cards.
- New <chat-genui-skeleton /> branch renders when the classifier
  is 'pending' (or 'a2ui' with no surfaces yet) AND isGenuiTurn
  is true — bridging the gap between streaming start and the
  rendered surface mounting.

The skeleton is a SIBLING of <a2ui-surface> and <chat-generative-ui>,
not a wrapper around them — so it cleanly hands off once content
disambiguates."
```

---

## Phase 6 — Public API + finalize

### Task 6.1: Export `ChatGenuiSkeletonComponent` from public-api

**Files:**
- Modify: `libs/chat/src/public-api.ts`

- [ ] **Step 1: Add the export**

Find an existing nearby primitive export (search for `ChatCheckpointMarkerComponent`). Append:

```typescript
export { ChatGenuiSkeletonComponent } from './lib/primitives/chat-genui-skeleton/chat-genui-skeleton.component';
```

- [ ] **Step 2: Build the lib**

```bash
npx nx build chat 2>&1 | tail -5
```

Expected: green.

- [ ] **Step 3: Run all chat tests**

```bash
npx nx test chat 2>&1 | tail -15
```

Expected: all chat tests green. Failures here are showstoppers — investigate before continuing.

- [ ] **Step 4: Commit**

```bash
git add libs/chat/src/public-api.ts
git commit -m "feat(chat): export ChatGenuiSkeletonComponent"
```

---

## Phase 7 — Controller-handled wrap (api-docs + PR)

These steps are run by the controller (controller of the subagent-driven session), not by the implementer subagent.

### Task 7.1: Regenerate api-docs

```bash
npm run generate-api-docs 2>&1 | tail -5
git status apps/website/content/docs/ --short
```

If api-docs.json changed:

```bash
git add apps/website/content/docs/
git commit -m "chore: regenerate api-docs after GenUI architecture fix"
```

### Task 7.2: Push + open PR + close PR #245

```bash
git push -u origin claude/genui-architecture-fix
```

```bash
gh pr create --title "fix(chat): GenUI streaming architecture — composition-level orchestration" --body "$(cat <<'EOF'
## Summary

Replaces PR #245's chat-message-level GenUI suppression — which broke the actual surface rendering by hiding chat-message's entire ng-content slot — with a clean separation of concerns:

- **Classifier** (\`createContentClassifier\`) stays content-only. Renamed \`'undetermined'\` → \`'pending'\`, plus a patience fix: when content starts with \`-\`, the classifier waits until either the full \`---a2ui_JSON---\` prefix arrives (→ \`'a2ui'\`) or enough chars rule it out (→ \`'markdown'\`). Previously committed to markdown on the first \`-\`, missing every streaming A2UI payload.

- **Chat composition** owns \"is this a GenUI turn?\" via a new \`isGenuiTurn(message, prevMessage)\` method that reads message structure (\`tool_calls\` field, \`content[].type === 'function_call'\` block, previous-tool-message name).

- **\`<chat-genui-skeleton>\`** primitive lifted from PR #245, now rendered from the composition template as a sibling of \`<a2ui-surface>\` / \`<chat-generative-ui>\` — not a wrapper around them. Skeleton shows when classifier is \`'pending'\` AND \`isGenuiTurn\` is true, OR when classifier is \`'a2ui'\` but no surfaces have parsed yet (late-arrival guard).

- **\`<chat-tool-calls>\`** gains an \`excludeToolNames\` input. Composition passes the GenUI tool names so internal dispatchers don't render args JSON as cards.

- **chat-message** reverts to its pre-PR-#245 simple ng-content wrapper. The 9 GenUI tests it briefly carried are dropped.

Spec: \`docs/superpowers/specs/2026-05-11-genui-streaming-architecture-design.md\`.

## What this fixes

The user flow today (PR #245 + patch applied): typing indicator → flash of JSON → late \"Building UI\" skeleton → never resolves to the rendered surface.

After this PR: typing indicator → skeleton from the first token → rendered surface mounts as soon as envelopes parse.

## Test plan
- [x] \`nx test chat\` — all green (existing + classifier patience tests + chat-tool-calls filter tests + isGenuiTurn tests; chat-message GenUI tests removed)
- [x] \`nx build chat\` + \`nx lint chat\` green
- [ ] Live smoke at \`/embed\` with the \"Render a settings card…\" suggestion — verify clean skeleton → surface transition with no JSON visible
- [ ] Live smoke with a non-GenUI prompt — verify normal markdown streaming, no skeleton flash
- [ ] CI green

Closes #245.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Capture the new PR URL.

Then close PR #245 referencing this one:

```bash
gh pr close 245 --comment "Closing in favor of #<NEW_PR_NUMBER>, which moves the GenUI orchestration from chat-message (wrong layer — hid the surface mounting slot) to the chat composition (right layer — sibling of the surface branch). See spec at docs/superpowers/specs/2026-05-11-genui-streaming-architecture-design.md."
```

---

## Verification matrix

| Surface | Verifier |
|---|---|
| Classifier rename + patience | `content-classifier.spec.ts` extended (7 new tests) |
| chat-tool-calls filter | `chat-tool-calls.component.spec.ts` extended (3 new tests) |
| chat-message PR-#245 revert | `chat-message.component.spec.ts` reduced to 5 original tests |
| Composition isGenuiTurn | `chat.component.spec.ts` (7 new tests) |
| Composition template skeleton + filter binding | Live smoke at `/embed`, `/popup`, `/sidebar` |
| End-to-end A2UI render | Chrome MCP: settings-card suggestion → clean skeleton → surface |

---

## Risk register

- **Classifier patience window**: up to ~15 chars (≈450ms) of blank bubble for messages starting with `-` that turn out to be markdown. Acceptable per spec.
- **`isGenuiTurn` keys off message structure**: three independent paths reduce risk; if Python graph changes silently, tests catch the regression.
- **A2UI envelopes arrive but don't parse**: late-arrival guard keeps skeleton up. Acceptable.
- **Rename ripples**: grep verified — only `content-classifier.{ts,spec.ts}` reference `'undetermined'`. No other consumers.
- **PR #245 input removal**: `[genuiToolNames]` on `<chat-message>` was added by PR #245 and never shipped to main. No downstream consumer to break.
