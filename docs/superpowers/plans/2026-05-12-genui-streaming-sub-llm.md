# Progressive A2UI Streaming via Parent-LLM Envelope Emission — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stream A2UI v1 envelopes from the LangGraph backend to the Angular frontend as the parent LLM emits them, realizing the per-component fallback transition wired by PR #252 but currently invisible.

**Architecture:** Three independent PRs. PR 1 adds a frontend bridge that subscribes to LangGraph custom events named `a2ui-partial` and feeds envelopes into the A2UI surface store via `@cacheplane/partial-json` extraction. PR 2 replaces the two-LLM hop with a single parent LLM that emits envelopes as typed tool arguments under OpenAI strict mode. PR 3 attaches a Python `AsyncCallbackHandler` to the `generate` node that sidebands streaming `tool_call_chunks` as `a2ui-partial` custom events.

**Tech Stack:** Angular 21 standalone + signals + OnPush · Vitest (lib tests) · @cacheplane/partial-json · LangGraph Python SDK · langchain_core callbacks · OpenAI structured outputs (strict mode) · pytest.

**Spec:** `docs/superpowers/specs/2026-05-12-genui-streaming-sub-llm-design.md` (commit `44870b1f` on `claude/spec-genui-streaming-parent-llm`).

**Hard constraint:** Never reference hashbrown / copilotkit / chatgpt / chatbot-kit / claude in code, comments, commits, PR bodies, or docs (third-party library mentions in markdown spec/plan files are OK).

---

## File Structure

### PR 1 — Frontend custom-event bridge (`claude/genui-streaming-frontend-bridge`)

**Create**
- `libs/chat/src/lib/a2ui/envelope-normalizer.ts` — pure-fn shape normalizer (envelopes/envelope/positional/flat). Shared with backend's Python normalizer via fixture parity tests.
- `libs/chat/src/lib/a2ui/envelope-normalizer.spec.ts` — 6 tests covering the four shapes + invalid input.
- `libs/chat/src/lib/a2ui/partial-args-bridge.ts` — per-tool_call_id partial-JSON parser; extracts newly-complete envelopes from the cumulative args string; emits canonical `A2uiMessage` values.
- `libs/chat/src/lib/a2ui/partial-args-bridge.spec.ts` — 8 tests covering incremental extraction, synthesis safety net, poisoned-state handling, shape variance.

**Modify**
- `libs/chat/src/lib/a2ui/surface-store.ts` — add `applyPartialArgs(toolCallId, envelopes)` entry point; track per-toolCallId activity so the wrapped-content classifier path can skip duplicate work.
- `libs/chat/src/lib/a2ui/surface-store.spec.ts` — add 3 tests for the new entry point.
- `libs/chat/src/lib/compositions/chat/chat.component.ts` — `effect` subscribes the bridge to `agent.customEvents()` filtered by `name === 'a2ui-partial'`.
- `libs/chat/src/lib/compositions/chat/chat.component.spec.ts` — add 1 test asserting the bridge wires up.

**Already exists, no changes needed**
- `LangGraphAgent.customEvents: Signal<CustomStreamEvent[]>` is already exposed in `libs/langgraph/src/lib/agent.fn.ts` and wired through the stream-manager bridge (`internals/stream-manager.bridge.ts:509`). PR 1 only adds a consumer.

### PR 2 — Backend envelope-tool (`claude/genui-streaming-envelope-tool`)

**Create**
- `examples/chat/python/src/streaming/__init__.py` — package marker.
- `examples/chat/python/src/streaming/envelope_tool.py` — Pydantic envelope models + `render_a2ui_surface` tool.
- `examples/chat/python/src/streaming/envelope_normalizer.py` — Python port of the four-shape normalizer; identical fixture parity with the TS version.
- `examples/chat/python/tests/test_envelope_tool.py` — 7 tests.
- `examples/chat/python/tests/test_envelope_normalizer.py` — 6 tests.

**Modify**
- `examples/chat/python/src/graph.py` — bind `render_a2ui_surface` with `strict=True`; prepend `A2UI_V1_SCHEMA_PROMPT` (with a streaming-order override) to parent `SYSTEM_PROMPT`; delete `generate_a2ui_schema` tool and its sub-LLM body; simplify `emit_generated_surface` (read validated envelopes from ToolMessage, reorder, wrap, in-place AIMessage replace per PR #255).
- `examples/chat/python/tests/test_graph_smoke.py` — update tests that referenced the old tool; add a new test for end-to-end shape via the new tool.

### PR 3 — Backend a2ui-partial handler (`claude/genui-streaming-partial-handler`)

**Create**
- `examples/chat/python/src/streaming/a2ui_partial_handler.py` — `AsyncCallbackHandler` that tracks `tool_call_chunks` per `tool_call_id` and dispatches `adispatch_custom_event("a2ui-partial", ...)`.
- `examples/chat/python/tests/test_a2ui_partial_handler.py` — 5 tests against canned `on_chat_model_stream` events.
- `examples/chat/python/tests/test_streaming_smoke.py` — 1 integration test against a canned stream fixture, asserts ≥3 `a2ui-partial` events + final ToolMessage + single-bubble AIMessage shape.

**Modify**
- `examples/chat/python/src/graph.py` — attach `A2uiPartialHandler` to the `generate` node via `config={"callbacks": [...]}` and metadata key `a2ui:emit_partial`.

---

## Phase 1 — Frontend custom-event bridge (PR 1)

### Task 1.0: Fork PR 1 branch (controller)

- [ ] **Step 1: Fork**
```bash
git fetch origin && git checkout -b claude/genui-streaming-frontend-bridge origin/main
git log --oneline -1
```
Expected: latest origin/main HEAD.

---

### Task 1.1: Envelope-shape normalizer

**Files:**
- Create: `libs/chat/src/lib/a2ui/envelope-normalizer.ts`
- Create: `libs/chat/src/lib/a2ui/envelope-normalizer.spec.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// libs/chat/src/lib/a2ui/envelope-normalizer.spec.ts
// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { normalizeEnvelopeArgs } from './envelope-normalizer';

describe('normalizeEnvelopeArgs', () => {
  it('returns the list for the canonical {envelopes: [...]} shape', () => {
    const args = { envelopes: [{ surfaceUpdate: { surfaceId: 's', components: [] } }] };
    expect(normalizeEnvelopeArgs(args)).toEqual(args.envelopes);
  });

  it('returns the list for the singular {envelope: [...]} typo shape', () => {
    const args = { envelope: [{ beginRendering: { surfaceId: 's', root: 'r' } }] };
    expect(normalizeEnvelopeArgs(args)).toEqual(args.envelope);
  });

  it('unflattens positional {0: ..., 1: ...} keys in numeric order', () => {
    const e1 = { surfaceUpdate: { surfaceId: 's', components: [] } };
    const e2 = { beginRendering: { surfaceId: 's', root: 'r' } };
    const args = { 1: e2, 0: e1 };
    expect(normalizeEnvelopeArgs(args)).toEqual([e1, e2]);
  });

  it('wraps a flat single envelope into a one-element array', () => {
    const args = { surfaceUpdate: { surfaceId: 's', components: [] } };
    expect(normalizeEnvelopeArgs(args)).toEqual([args]);
  });

  it('returns null for an empty object', () => {
    expect(normalizeEnvelopeArgs({})).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(normalizeEnvelopeArgs(null as unknown as Record<string, unknown>)).toBeNull();
    expect(normalizeEnvelopeArgs('x' as unknown as Record<string, unknown>)).toBeNull();
  });
});
```

- [ ] **Step 2: Run, verify fail**
```bash
npx nx test chat --testFile envelope-normalizer.spec.ts 2>&1 | tail -10
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// libs/chat/src/lib/a2ui/envelope-normalizer.ts
// SPDX-License-Identifier: MIT

const ENVELOPE_KEYS = ['surfaceUpdate', 'beginRendering', 'dataModelUpdate', 'deleteSurface'] as const;

/**
 * The parent LLM may emit envelope-tool arguments in four shapes (observed in
 * the spike across gpt-5-mini and gpt-5): the canonical {envelopes: [...]},
 * a singular typo {envelope: [...]}, positional keys {0: env, 1: env, ...}
 * when the model treats the args as the array, or a flat single envelope.
 * This pure function maps all four into a canonical envelope list.
 *
 * Strict-mode tool binding (OpenAI) should eliminate the non-canonical
 * shapes in production, but the normalizer is the safety net.
 */
export function normalizeEnvelopeArgs(
  args: Record<string, unknown> | null | undefined,
): unknown[] | null {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return null;

  // (a) canonical: { envelopes: [...] }
  if (Array.isArray((args as { envelopes?: unknown }).envelopes)) {
    return (args as { envelopes: unknown[] }).envelopes;
  }
  // (b) singular typo: { envelope: [...] }
  if (Array.isArray((args as { envelope?: unknown }).envelope)) {
    return (args as { envelope: unknown[] }).envelope;
  }
  const keys = Object.keys(args);
  if (keys.length === 0) return null;
  // (c) positional keys: { 0: env, 1: env, ... }
  if (keys.every((k) => /^\d+$/.test(k))) {
    return keys
      .map((k) => Number(k))
      .sort((a, b) => a - b)
      .map((k) => (args as Record<string, unknown>)[String(k)]);
  }
  // (d) flat single envelope: { surfaceUpdate: {...} } | { beginRendering: ... } | etc
  if (ENVELOPE_KEYS.some((k) => k in args)) {
    return [args];
  }
  return null;
}
```

- [ ] **Step 4: Run, verify pass**
```bash
npx nx test chat --testFile envelope-normalizer.spec.ts 2>&1 | tail -10
```
Expected: 6 passing.

- [ ] **Step 5: Commit**
```bash
git add libs/chat/src/lib/a2ui/envelope-normalizer.ts \
        libs/chat/src/lib/a2ui/envelope-normalizer.spec.ts
git commit -m "feat(chat): A2UI envelope-args shape normalizer

Accepts four argument shapes observed in the streaming-envelope-tool
spike: canonical {envelopes:[...]}, singular {envelope:[...]}, positional
keys {0,1,...}, and flat single envelope. Returns a canonical envelope
list or null. Shared shape with the Python normalizer in PR 2."
```

---

### Task 1.2: `surface-store.applyPartialArgs` entry point

**Files:**
- Modify: `libs/chat/src/lib/a2ui/surface-store.ts`
- Modify: `libs/chat/src/lib/a2ui/surface-store.spec.ts`

- [ ] **Step 1: Append tests to surface-store.spec.ts**

```typescript
// Append to libs/chat/src/lib/a2ui/surface-store.spec.ts
describe('createA2uiSurfaceStore — applyPartialArgs', () => {
  it('dispatches each envelope via apply() in order', () => {
    const store = createA2uiSurfaceStore();
    const envelopes = [
      { surfaceUpdate: { surfaceId: 's1', components: [{ id: 'c', type: 'text', props: {} }] } },
      { beginRendering: { surfaceId: 's1', root: 'c' } },
    ];
    store.applyPartialArgs('tc-1', envelopes);
    expect(store.surfaces().get('s1')?.components.has('c')).toBe(true);
  });

  it('records the tool_call_id as live (queryable)', () => {
    const store = createA2uiSurfaceStore();
    expect(store.isPartialLive('tc-1')).toBe(false);
    store.applyPartialArgs('tc-1', [{ surfaceUpdate: { surfaceId: 's1', components: [] } }]);
    expect(store.isPartialLive('tc-1')).toBe(true);
  });

  it('ignores invalid envelopes silently', () => {
    const store = createA2uiSurfaceStore();
    // missing required top-level key — apply() ignores
    store.applyPartialArgs('tc-x', [{ junk: 1 } as never]);
    expect(store.surfaces().size).toBe(0);
    expect(store.isPartialLive('tc-x')).toBe(true);  // still tracked
  });
});
```

- [ ] **Step 2: Run, verify fail**
```bash
npx nx test chat --testFile surface-store.spec.ts 2>&1 | tail -10
```
Expected: FAIL — `applyPartialArgs` is not a function.

- [ ] **Step 3: Extend the store interface + factory**

Edit `libs/chat/src/lib/a2ui/surface-store.ts`. Find the `A2uiSurfaceStore` interface (line 17) and add two members:

```typescript
export interface A2uiSurfaceStore {
  apply(message: A2uiMessage): void;
  /**
   * Live-stream entry point. Iterates envelopes and feeds each through
   * `apply()`. Records the tool_call_id so the wrapped-content classifier
   * can short-circuit duplicate dispatch when the final AIMessage arrives.
   */
  applyPartialArgs(toolCallId: string, envelopes: readonly A2uiMessage[]): void;
  /** True if a tool_call_id has produced live envelopes via applyPartialArgs. */
  isPartialLive(toolCallId: string): boolean;
  readonly surfaces: Signal<Map<string, A2uiSurface>>;
  surface(surfaceId: string): Signal<A2uiSurface | undefined>;
}
```

Inside `createA2uiSurfaceStore()` (after the existing `apply` definition, before the `return`), add:

```typescript
  const liveTools = new Set<string>();

  function applyPartialArgs(
    toolCallId: string,
    envelopes: readonly A2uiMessage[],
  ): void {
    liveTools.add(toolCallId);
    for (const env of envelopes) {
      apply(env);
    }
  }

  function isPartialLive(toolCallId: string): boolean {
    return liveTools.has(toolCallId);
  }
```

Update the return statement to expose both:

```typescript
  return {
    apply,
    applyPartialArgs,
    isPartialLive,
    surfaces: surfacesSignal.asReadonly(),
    surface,
  };
```

- [ ] **Step 4: Run, verify pass**
```bash
npx nx test chat --testFile surface-store.spec.ts 2>&1 | tail -10
```
Expected: all existing + 3 new tests passing.

- [ ] **Step 5: Commit**
```bash
git add libs/chat/src/lib/a2ui/surface-store.ts \
        libs/chat/src/lib/a2ui/surface-store.spec.ts
git commit -m "feat(chat): A2UI surface-store applyPartialArgs entry point

Adds a live-stream feed alongside apply(). Records the tool_call_id so
downstream consumers (content classifier) can short-circuit duplicate
envelope dispatch when the final wrapped AIMessage arrives carrying the
same content the live stream already applied."
```

---

### Task 1.3: Partial-args bridge

**Files:**
- Create: `libs/chat/src/lib/a2ui/partial-args-bridge.ts`
- Create: `libs/chat/src/lib/a2ui/partial-args-bridge.spec.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// libs/chat/src/lib/a2ui/partial-args-bridge.spec.ts
// SPDX-License-Identifier: MIT
import { describe, it, expect, beforeEach } from 'vitest';
import { createPartialArgsBridge } from './partial-args-bridge';
import { createA2uiSurfaceStore, type A2uiSurfaceStore } from './surface-store';

describe('createPartialArgsBridge', () => {
  let store: A2uiSurfaceStore;
  beforeEach(() => { store = createA2uiSurfaceStore(); });

  function chunks(...frames: string[]): readonly string[] {
    return frames;
  }

  it('extracts a surfaceUpdate envelope as soon as it parses, mounts surface via synthetic beginRendering', () => {
    const bridge = createPartialArgsBridge(store);
    const frames = chunks(
      '{"envelopes":[',
      '{"surfaceUpdate":{"surfaceId":"s","components":[{"id":"root","type":"text","props":{}}]}}',
      ',',
    );
    for (const f of frames) bridge.push('tc-1', f);
    // After surfaceUpdate parses and bridge synthesises beginRendering, the surface materialises.
    expect(store.surfaces().get('s')?.components.has('root')).toBe(true);
  });

  it('does not synthesise twice if the LLM emits its own beginRendering later', () => {
    const bridge = createPartialArgsBridge(store);
    const surfaceUpdate = JSON.stringify({ surfaceUpdate: { surfaceId: 's', components: [{ id: 'root', type: 'text', props: {} }] } });
    const beginRendering = JSON.stringify({ beginRendering: { surfaceId: 's', root: 'root' } });
    bridge.push('tc-2', '{"envelopes":[' + surfaceUpdate + ',' + beginRendering + ']}');
    // Same surface, single mount — components map unchanged across the second beginRendering.
    const surface = store.surfaces().get('s');
    expect(surface).toBeTruthy();
    expect(surface!.components.size).toBe(1);
  });

  it('handles the singular {envelope:[...]} shape', () => {
    const bridge = createPartialArgsBridge(store);
    bridge.push('tc-3', '{"envelope":[{"surfaceUpdate":{"surfaceId":"s","components":[{"id":"root","type":"text","props":{}}]}}]}');
    expect(store.surfaces().get('s')?.components.has('root')).toBe(true);
  });

  it('handles positional keys {0: env, 1: env}', () => {
    const bridge = createPartialArgsBridge(store);
    const envs = [
      { surfaceUpdate: { surfaceId: 's', components: [{ id: 'root', type: 'text', props: {} }] } },
      { dataModelUpdate: { surfaceId: 's', contents: [{ key: 'msg', valueString: 'hi' }] } },
    ];
    bridge.push('tc-4', JSON.stringify({ 0: envs[0], 1: envs[1] }));
    expect(store.surfaces().get('s')?.dataModel).toEqual({ msg: 'hi' });
  });

  it('marks tool_call_id as live in the store', () => {
    const bridge = createPartialArgsBridge(store);
    bridge.push('tc-5', '{"envelopes":[{"surfaceUpdate":{"surfaceId":"s","components":[]}}]}');
    expect(store.isPartialLive('tc-5')).toBe(true);
  });

  it('does not dispatch the same envelope twice across incremental pushes', () => {
    const bridge = createPartialArgsBridge(store);
    const piece1 = '{"envelopes":[{"surfaceUpdate":{"surfaceId":"s","components":[{"id":"root","type":"text","props":{}}]}}';
    const piece2 = piece1 + ',{"dataModelUpdate":{"surfaceId":"s","contents":[{"key":"k","valueString":"v"}]}}]}';
    bridge.push('tc-6', piece1);
    bridge.push('tc-6', piece2);
    // The dataModelUpdate appears only in the second push but bridge re-runs the parser
    // against the cumulative buffer; the surfaceUpdate envelope must NOT re-dispatch.
    expect(store.surfaces().get('s')?.dataModel).toEqual({ k: 'v' });
  });

  it('marks tool_call_id as poisoned if a chunk is invalid JSON garbage', () => {
    const bridge = createPartialArgsBridge(store);
    bridge.push('tc-7', '{{{not_json');
    // Subsequent valid pushes are ignored once poisoned.
    bridge.push('tc-7', '{"envelopes":[{"surfaceUpdate":{"surfaceId":"s","components":[]}}]}');
    expect(store.surfaces().size).toBe(0);
  });

  it('synthetic beginRendering picks first component when none has id="root"', () => {
    const bridge = createPartialArgsBridge(store);
    bridge.push('tc-8', '{"envelopes":[{"surfaceUpdate":{"surfaceId":"s","components":[{"id":"only","type":"text","props":{}}]}}]}');
    expect(store.surfaces().get('s')?.components.has('only')).toBe(true);
  });
});
```

- [ ] **Step 2: Run, verify fail**
```bash
npx nx test chat --testFile partial-args-bridge.spec.ts 2>&1 | tail -10
```
Expected: FAIL — `createPartialArgsBridge` not found.

- [ ] **Step 3: Implement**

```typescript
// libs/chat/src/lib/a2ui/partial-args-bridge.ts
// SPDX-License-Identifier: MIT
import { createPartialJsonParser, materialize } from '@cacheplane/partial-json';
import type { A2uiMessage, A2uiSurfaceUpdate } from '@ngaf/a2ui';
import type { A2uiSurfaceStore } from './surface-store';
import { normalizeEnvelopeArgs } from './envelope-normalizer';

export interface PartialArgsBridge {
  /**
   * Replace the cumulative argument-string buffer for `toolCallId` with
   * `argsSoFar` and re-extract any newly-complete envelopes. The args
   * string is expected to grow monotonically.
   */
  push(toolCallId: string, argsSoFar: string): void;
  /** True if a tool_call_id has been poisoned by malformed input. */
  isPoisoned(toolCallId: string): boolean;
}

interface BridgeState {
  parser: ReturnType<typeof createPartialJsonParser>;
  /** Number of envelopes already dispatched to the store. */
  dispatchedCount: number;
  /** Have we synthesised a beginRendering for this turn yet? */
  synthesised: boolean;
  /** surfaceId the synthesised beginRendering targets (to avoid double-mounting). */
  synthesisedSurfaceId: string | null;
  /** Once true, all subsequent pushes are ignored. */
  poisoned: boolean;
}

/**
 * Subscribes to LangGraph custom events of name 'a2ui-partial' and feeds
 * the surface store envelope-by-envelope as the parent LLM streams its
 * tool_call.arguments JSON. Uses @cacheplane/partial-json to extract
 * structurally-complete envelope objects from the growing args string.
 *
 * Synthesis safety net: if the first complete surfaceUpdate arrives and
 * no beginRendering has been extracted yet, the bridge synthesises one
 * targeted at the surfaceUpdate's first component (preferring id='root'
 * if present). This makes the surface mount IMMEDIATELY after the first
 * surfaceUpdate parses — without waiting for the LLM to emit beginRendering
 * at the end of its envelope list — so the render-element fallback gate
 * (PR #252) actually fires while dataModelUpdates flow in.
 *
 * The store's apply() already treats repeated beginRendering for the same
 * surfaceId as idempotent (just re-applies styles), so the LLM's eventual
 * beginRendering (if any) is a no-op rather than a conflict.
 */
export function createPartialArgsBridge(store: A2uiSurfaceStore): PartialArgsBridge {
  const states = new Map<string, BridgeState>();

  function stateOf(toolCallId: string): BridgeState {
    let s = states.get(toolCallId);
    if (!s) {
      s = {
        parser: createPartialJsonParser(),
        dispatchedCount: 0,
        synthesised: false,
        synthesisedSurfaceId: null,
        poisoned: false,
      };
      states.set(toolCallId, s);
    }
    return s;
  }

  function pickRoot(components: readonly { id: string }[]): string | null {
    if (components.length === 0) return null;
    const explicitRoot = components.find((c) => c.id === 'root');
    return explicitRoot ? explicitRoot.id : components[0].id;
  }

  function synthesisedBegin(env: A2uiMessage, state: BridgeState): A2uiMessage | null {
    if (state.synthesised || !('surfaceUpdate' in env)) return null;
    const upd = env.surfaceUpdate as A2uiSurfaceUpdate;
    const root = pickRoot(upd.components);
    if (!root) return null;
    state.synthesised = true;
    state.synthesisedSurfaceId = upd.surfaceId;
    return { beginRendering: { surfaceId: upd.surfaceId, root } };
  }

  function push(toolCallId: string, argsSoFar: string): void {
    const state = stateOf(toolCallId);
    if (state.poisoned) return;
    try {
      // Reset the parser to a fresh state and feed the entire cumulative
      // string. The parser is monotonic — same input always yields the
      // same tree — so re-parsing is safe and avoids delta-tracking bugs.
      state.parser = createPartialJsonParser();
      state.parser.push(argsSoFar);
    } catch {
      state.poisoned = true;
      return;
    }
    const rootNode = state.parser.getByPath('/');
    if (!rootNode) return;
    const materialised = materialize(rootNode) as Record<string, unknown> | null;
    if (!materialised || typeof materialised !== 'object') return;
    const envelopes = normalizeEnvelopeArgs(materialised);
    if (!envelopes) return;

    // Dispatch envelopes that haven't been dispatched yet. partial-json
    // returns partially-built objects too; skip incomplete ones (those
    // missing the discriminator top-level key).
    const ready: A2uiMessage[] = [];
    for (let i = 0; i < envelopes.length; i++) {
      const env = envelopes[i] as A2uiMessage;
      if (!isStructurallyComplete(env)) continue;
      // Only dispatch envelopes BEYOND those already sent.
      if (i < state.dispatchedCount) continue;
      ready.push(env);
      // Inject synthesised beginRendering immediately after first surfaceUpdate.
      const synth = synthesisedBegin(env, state);
      if (synth) ready.push(synth);
    }
    if (ready.length === 0) return;

    // Advance the dispatched counter ONLY by real (non-synthesised) envelopes.
    state.dispatchedCount += ready.filter((e) => !isSynthesisedBegin(e, state)).length;
    store.applyPartialArgs(toolCallId, ready);
  }

  function isPoisoned(toolCallId: string): boolean {
    return stateOf(toolCallId).poisoned;
  }

  return { push, isPoisoned };
}

/** True if the envelope has a recognised discriminator key with an object value. */
function isStructurallyComplete(env: unknown): env is A2uiMessage {
  if (!env || typeof env !== 'object' || Array.isArray(env)) return false;
  const obj = env as Record<string, unknown>;
  for (const k of ['surfaceUpdate', 'beginRendering', 'dataModelUpdate', 'deleteSurface']) {
    if (k in obj && typeof obj[k] === 'object' && obj[k] !== null) {
      // For surfaceUpdate, also require non-undefined surfaceId + components.
      if (k === 'surfaceUpdate') {
        const su = obj[k] as { surfaceId?: unknown; components?: unknown };
        return typeof su.surfaceId === 'string' && Array.isArray(su.components);
      }
      return true;
    }
  }
  return false;
}

function isSynthesisedBegin(env: A2uiMessage, state: BridgeState): boolean {
  return (
    'beginRendering' in env
    && state.synthesised
    && state.synthesisedSurfaceId === (env as { beginRendering: { surfaceId: string } }).beginRendering.surfaceId
  );
}
```

- [ ] **Step 4: Run, verify pass**
```bash
npx nx test chat --testFile partial-args-bridge.spec.ts 2>&1 | tail -15
```
Expected: 8 passing.

- [ ] **Step 5: Run all chat tests to check regressions**
```bash
npx nx test chat 2>&1 | tail -10
```
Expected: all green.

- [ ] **Step 6: Commit**
```bash
git add libs/chat/src/lib/a2ui/partial-args-bridge.ts \
        libs/chat/src/lib/a2ui/partial-args-bridge.spec.ts
git commit -m "feat(chat): A2UI partial-args bridge for streaming envelopes

Subscribes to LangGraph custom events ('a2ui-partial') and feeds the
A2UI surface store envelope-by-envelope as the parent LLM streams its
tool_call.arguments JSON. Uses @cacheplane/partial-json to extract
structurally-complete envelopes from the growing args string.

Safety net: synthesises beginRendering immediately after the first
surfaceUpdate (targeting component id='root' or the first component),
so the surface mounts and the per-component fallback gate (PR #252)
fires while dataModelUpdates stream in — without waiting for the LLM
to emit beginRendering at the end of its envelope list. Repeated
beginRendering on the same surface is idempotent in the store."
```

---

### Task 1.4: Wire bridge into chat composition

**Files:**
- Modify: `libs/chat/src/lib/compositions/chat/chat.component.ts`
- Modify: `libs/chat/src/lib/compositions/chat/chat.component.spec.ts`

- [ ] **Step 1: Find the agent injection point**

```bash
grep -n "inject(AGENT)\|agent()\|customEvents\|CustomStreamEvent" libs/chat/src/lib/compositions/chat/chat.component.ts | head -8
```

The agent token is `AGENT` from `../../tokens/agent.token` (or similar). It returns a `LangGraphAgent`-shaped object that exposes `customEvents: Signal<CustomStreamEvent[]>`.

- [ ] **Step 2: Add the bridge wiring**

Edit `libs/chat/src/lib/compositions/chat/chat.component.ts`. Near the existing imports, add:

```typescript
import { createPartialArgsBridge } from '../../a2ui/partial-args-bridge';
import { createA2uiSurfaceStore, type A2uiSurfaceStore } from '../../a2ui/surface-store';
```

In the component class, near the constructor (after existing injects), add a shared surface store for live streaming + the bridge effect:

```typescript
  /** Shared A2UI surface store fed by the live partial-args bridge. The
   *  content-classifier path will share this store via tool_call_id
   *  short-circuit (skipping re-dispatch for live tool_call_ids). */
  protected readonly liveSurfaceStore: A2uiSurfaceStore = createA2uiSurfaceStore();

  private readonly partialBridge = createPartialArgsBridge(this.liveSurfaceStore);

  constructor() {
    // ... existing constructor body ...

    // Subscribe to a2ui-partial custom events from the LangGraph backend.
    // Each event delivers a cumulative args string keyed by tool_call_id;
    // bridge.push() re-parses and dispatches new envelopes incrementally.
    let lastIndex = 0;
    effect(() => {
      const events = this.agent().customEvents();
      for (let i = lastIndex; i < events.length; i++) {
        const e = events[i];
        if (e.name !== 'a2ui-partial') continue;
        const d = e.data as { tool_call_id?: string; args_so_far?: string } | null;
        if (!d || typeof d.tool_call_id !== 'string' || typeof d.args_so_far !== 'string') continue;
        this.partialBridge.push(d.tool_call_id, d.args_so_far);
      }
      lastIndex = events.length;
    });
  }
```

Make sure `effect` is in the existing `@angular/core` import.

- [ ] **Step 3: Add a wiring test**

Append to `libs/chat/src/lib/compositions/chat/chat.component.spec.ts`:

```typescript
describe('Chat composition — partial-args bridge wiring', () => {
  it('feeds the bridge when a2ui-partial custom events arrive', async () => {
    // Set up: render Chat with a stub agent that exposes customEvents.
    const events = signal<{ name: string; data: unknown }[]>([]);
    const stubAgent = makeStubAgent({ customEvents: events });
    // ... mount composition with stubAgent ...

    // Initially no surfaces.
    expect(stubAgent.liveSurfaceStore?.surfaces().size ?? 0).toBe(0);

    // Emit an a2ui-partial event with one surfaceUpdate.
    events.set([{
      name: 'a2ui-partial',
      data: {
        tool_call_id: 'tc-1',
        args_so_far: '{"envelopes":[{"surfaceUpdate":{"surfaceId":"s","components":[{"id":"root","type":"text","props":{}}]}}]}',
      },
    }]);

    // After effect flushes, surface is materialised via the synthesised beginRendering.
    await TestBed.inject(ApplicationRef).whenStable();
    // ... assert surface exists with the root component ...
  });
});
```

(Note: this is a smoke test; the bridge unit tests in Task 1.3 cover behaviour. The `makeStubAgent` helper should already exist in `chat.component.spec.ts` — extend it to include `customEvents` if needed.)

- [ ] **Step 4: Run tests**
```bash
npx nx test chat --testFile chat.component.spec.ts 2>&1 | tail -10
npx nx build chat 2>&1 | tail -5
```
Both green expected.

- [ ] **Step 5: Commit**
```bash
git add libs/chat/src/lib/compositions/chat/
git commit -m "feat(chat): wire partial-args bridge to agent.customEvents

The chat composition subscribes to LangGraph custom events of name
a2ui-partial and forwards the cumulative args strings to the bridge.
Effect tracks last-processed index so re-renders don't re-dispatch."
```

---

### Task 1.5: Public API + PR open

**Files:**
- Modify: `libs/chat/src/public-api.ts`

- [ ] **Step 1: Add exports**

Append to `libs/chat/src/public-api.ts`:

```typescript
export { createPartialArgsBridge } from './lib/a2ui/partial-args-bridge';
export type { PartialArgsBridge } from './lib/a2ui/partial-args-bridge';
export { normalizeEnvelopeArgs } from './lib/a2ui/envelope-normalizer';
```

- [ ] **Step 2: Verify build + lint + tests**
```bash
npx nx build chat 2>&1 | tail -5
npx nx test chat 2>&1 | tail -10
npx nx lint chat 2>&1 | tail -5
```
All green.

- [ ] **Step 3: Regenerate api-docs**
```bash
npm run generate-api-docs 2>&1 | tail -5
git status apps/website/content/docs/ --short
```
Stage any changes.

- [ ] **Step 4: Commit + push + open PR**

```bash
git add libs/chat/src/public-api.ts
git diff --cached --quiet || git commit -m "feat(chat): export partial-args bridge + normalizer"

git add apps/website/content/docs/ 2>/dev/null
git diff --cached --quiet || git commit -m "chore: regenerate api-docs for partial-args bridge"

git push -u origin claude/genui-streaming-frontend-bridge

gh pr create --title "feat(chat): frontend bridge for streaming A2UI envelopes" --body "$(cat <<'EOF'
## Summary

Adds the frontend half of progressive A2UI streaming. The chat composition subscribes to LangGraph custom events named \`a2ui-partial\` and feeds them through a new \`PartialArgsBridge\` that uses \`@cacheplane/partial-json\` to extract structurally-complete envelopes from the cumulative \`tool_call.arguments\` string the parent LLM streams. Each envelope flows into the A2UI surface store via the new \`applyPartialArgs(toolCallId, envelopes)\` entry point.

The bridge synthesises a \`beginRendering\` envelope immediately after the first complete \`surfaceUpdate\` (targeting component \`id='root'\` or the first component as a safety net), so the surface mounts and the per-component fallback gate (#252) actually fires while dataModelUpdates stream in.

This PR ships **dormant code**: no backend yet emits \`a2ui-partial\` events. PR for the backend lands separately (envelope-tool refactor + callback handler).

Spec: \`docs/superpowers/specs/2026-05-12-genui-streaming-sub-llm-design.md\`.

## Test plan
- [x] \`nx test chat\` green (envelope-normalizer 6 tests; surface-store 3 new tests; partial-args-bridge 8 tests; chat composition 1 wiring test)
- [x] \`nx build chat\` + \`nx lint chat\` green
- [ ] CI green
EOF
)"
```

Capture the PR URL.

---

## Phase 2 — Backend envelope-tool + normalizer (PR 2)

### Task 2.0: Fork PR 2 branch (controller)

- [ ] **Step 1: Fork from origin/main (independent of PR 1)**
```bash
git checkout -b claude/genui-streaming-envelope-tool origin/main
git log --oneline -1
```

---

### Task 2.1: Pydantic envelope models + tool

**Files:**
- Create: `examples/chat/python/src/streaming/__init__.py`
- Create: `examples/chat/python/src/streaming/envelope_tool.py`
- Create: `examples/chat/python/tests/test_envelope_tool.py`

- [ ] **Step 1: Write failing tests**

```python
# examples/chat/python/tests/test_envelope_tool.py
"""Tests for the parent-emits-envelopes tool used by the GenUI flow."""
import json

import pytest

from src.streaming.envelope_tool import (
    SurfaceUpdate,
    BeginRendering,
    DataModelUpdate,
    A2uiEnvelope,
    render_a2ui_surface,
)


class TestPydanticEnvelopeModels:
    def test_surface_update_round_trips(self):
        m = SurfaceUpdate(surfaceId="s1", components=[{"id": "c", "type": "text", "props": {}}])
        assert m.surfaceId == "s1"
        assert m.components == [{"id": "c", "type": "text", "props": {}}]

    def test_begin_rendering_required_fields(self):
        m = BeginRendering(surfaceId="s1", root="c")
        assert m.root == "c"

    def test_data_model_update_path_is_optional(self):
        m = DataModelUpdate(surfaceId="s1", contents=[{"key": "k", "valueString": "v"}])
        assert m.path is None

    def test_a2ui_envelope_accepts_surface_update_field(self):
        e = A2uiEnvelope(surfaceUpdate={"surfaceId": "s", "components": []})
        assert e.surfaceUpdate is not None
        assert e.beginRendering is None
        assert e.dataModelUpdate is None


class TestRenderA2uiSurfaceTool:
    def test_serializes_envelopes_to_json_string(self):
        envelopes = [
            {"surfaceUpdate": {"surfaceId": "s", "components": [{"id": "c", "type": "text", "props": {}}]}},
            {"beginRendering": {"surfaceId": "s", "root": "c"}},
        ]
        result = render_a2ui_surface.invoke({"envelopes": envelopes})
        parsed = json.loads(result)
        assert isinstance(parsed, list)
        assert len(parsed) == 2
        assert "surfaceUpdate" in parsed[0]
        assert "beginRendering" in parsed[1]

    def test_strips_none_fields_via_exclude_none(self):
        envelopes = [{"surfaceUpdate": {"surfaceId": "s", "components": []}}]
        result = render_a2ui_surface.invoke({"envelopes": envelopes})
        parsed = json.loads(result)
        # beginRendering / dataModelUpdate are None on this envelope and should be stripped.
        assert "beginRendering" not in parsed[0]
        assert "dataModelUpdate" not in parsed[0]

    def test_raises_on_empty_envelopes_list(self):
        with pytest.raises(ValueError):
            render_a2ui_surface.invoke({"envelopes": []})
```

- [ ] **Step 2: Run, verify fail**
```bash
cd examples/chat/python && source .venv/bin/activate && python -m pytest tests/test_envelope_tool.py -v 2>&1 | tail -10
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`examples/chat/python/src/streaming/__init__.py`:
```python
# SPDX-License-Identifier: MIT
"""Backend streaming helpers for progressive A2UI envelope emission."""
```

`examples/chat/python/src/streaming/envelope_tool.py`:
```python
# SPDX-License-Identifier: MIT
"""Parent-LLM-bound tool that emits A2UI v1 envelopes as structured tool
arguments. Replaces the old two-LLM `generate_a2ui_schema` flow (parent
calls a sub-LLM that produces envelopes); the parent now emits envelopes
directly so the natural token stream IS the surface-rendering stream.

The Pydantic schemas enable OpenAI strict-mode validation when the tool
is bound via `bind_tools([..., render_a2ui_surface], strict=True)`.
"""
from __future__ import annotations

import json
from typing import Optional

from langchain_core.tools import tool
from pydantic import BaseModel, Field


class SurfaceUpdate(BaseModel):
    """Component-tree envelope. Required first envelope per turn."""
    surfaceId: str = Field(description="Stable identifier for this surface.")
    components: list[dict] = Field(
        description="Component tree as a list of {id, type, props} objects."
    )


class BeginRendering(BaseModel):
    """Render-start envelope. Required; identifies the root component."""
    surfaceId: str
    root: str = Field(description="Component id of the surface root.")
    styles: Optional[dict] = None


class DataModelUpdate(BaseModel):
    """Initial state envelope. Optional; one per state path the surface binds to."""
    surfaceId: str
    path: Optional[str] = None
    contents: list[dict] = Field(description="Entries: {key, valueString|valueNumber|valueBoolean|valueMap}.")


class A2uiEnvelope(BaseModel):
    """Single A2UI v1 envelope. Exactly one of the three discriminators
    is set per envelope."""
    surfaceUpdate: Optional[SurfaceUpdate] = None
    beginRendering: Optional[BeginRendering] = None
    dataModelUpdate: Optional[DataModelUpdate] = None


@tool
def render_a2ui_surface(envelopes: list[A2uiEnvelope]) -> str:
    """Render a UI surface using A2UI v1 envelopes. Emit:
      - exactly one `surfaceUpdate` (component tree),
      - exactly one `beginRendering` (root reference),
      - zero or more `dataModelUpdate` entries (initial state).

    Envelope order in this call should be: surfaceUpdate, beginRendering,
    then any dataModelUpdate entries (so the surface mounts and per-component
    placeholders show before initial state arrives).
    """
    if not envelopes:
        raise ValueError("render_a2ui_surface requires at least one envelope")
    return json.dumps([e.model_dump(exclude_none=True) for e in envelopes])
```

- [ ] **Step 4: Run, verify pass**
```bash
cd examples/chat/python && source .venv/bin/activate && python -m pytest tests/test_envelope_tool.py -v 2>&1 | tail -10
```
Expected: 7 passing.

- [ ] **Step 5: Commit**
```bash
git add examples/chat/python/src/streaming/__init__.py \
        examples/chat/python/src/streaming/envelope_tool.py \
        examples/chat/python/tests/test_envelope_tool.py
git commit -m "feat(examples-chat): Pydantic A2UI envelope tool

Parent-LLM-bound tool render_a2ui_surface accepts envelopes as typed
structured arguments. OpenAI strict-mode bind_tools will validate against
the Pydantic schema. Body serializes via model_dump(exclude_none=True)
so optional fields don't leak as null into the wire JSON."
```

---

### Task 2.2: Envelope-args normalizer (Python)

**Files:**
- Create: `examples/chat/python/src/streaming/envelope_normalizer.py`
- Create: `examples/chat/python/tests/test_envelope_normalizer.py`

- [ ] **Step 1: Write failing tests**

```python
# examples/chat/python/tests/test_envelope_normalizer.py
"""Parity tests with libs/chat/src/lib/a2ui/envelope-normalizer.spec.ts."""
import pytest

from src.streaming.envelope_normalizer import normalize_envelope_args


class TestNormalizeEnvelopeArgs:
    def test_canonical_envelopes_shape(self):
        args = {"envelopes": [{"surfaceUpdate": {"surfaceId": "s", "components": []}}]}
        assert normalize_envelope_args(args) == args["envelopes"]

    def test_singular_envelope_typo_shape(self):
        args = {"envelope": [{"beginRendering": {"surfaceId": "s", "root": "r"}}]}
        assert normalize_envelope_args(args) == args["envelope"]

    def test_positional_keys_unflattened_in_numeric_order(self):
        e1 = {"surfaceUpdate": {"surfaceId": "s", "components": []}}
        e2 = {"beginRendering": {"surfaceId": "s", "root": "r"}}
        args = {"1": e2, "0": e1}
        assert normalize_envelope_args(args) == [e1, e2]

    def test_flat_single_envelope_wrapped_in_list(self):
        args = {"surfaceUpdate": {"surfaceId": "s", "components": []}}
        assert normalize_envelope_args(args) == [args]

    def test_empty_object_returns_none(self):
        assert normalize_envelope_args({}) is None

    def test_non_dict_input_returns_none(self):
        assert normalize_envelope_args(None) is None
        assert normalize_envelope_args("x") is None
```

- [ ] **Step 2: Run, verify fail**
```bash
cd examples/chat/python && source .venv/bin/activate && python -m pytest tests/test_envelope_normalizer.py -v 2>&1 | tail -10
```

- [ ] **Step 3: Implement**

```python
# examples/chat/python/src/streaming/envelope_normalizer.py
# SPDX-License-Identifier: MIT
"""Normalises the four envelope-args shapes the parent LLM may emit into
a canonical envelope list. Parity with libs/chat/src/lib/a2ui/envelope-normalizer.ts.

The spike (examples/chat/python/spike/parent_envelope_quality.py) observed
these shapes across gpt-5-mini and gpt-5; strict-mode tool binding should
eliminate the non-canonical ones in production, but this normalizer is
the safety net.
"""
from __future__ import annotations

from typing import Any

_ENVELOPE_KEYS = ("surfaceUpdate", "beginRendering", "dataModelUpdate", "deleteSurface")


def normalize_envelope_args(args: Any) -> list[dict] | None:
    """Return a canonical envelope list, or None if `args` is unrecognised."""
    if not isinstance(args, dict) or not args:
        return None
    # (a) canonical {envelopes: [...]}
    envelopes = args.get("envelopes")
    if isinstance(envelopes, list):
        return envelopes
    # (b) singular {envelope: [...]} typo
    envelope = args.get("envelope")
    if isinstance(envelope, list):
        return envelope
    keys = list(args.keys())
    # (c) positional keys {"0": env, "1": env, ...}
    if keys and all(isinstance(k, str) and k.isdigit() for k in keys):
        return [args[k] for k in sorted(keys, key=int)]
    # (d) flat single envelope
    if any(k in args for k in _ENVELOPE_KEYS):
        return [args]
    return None
```

- [ ] **Step 4: Run, verify pass**
```bash
cd examples/chat/python && source .venv/bin/activate && python -m pytest tests/test_envelope_normalizer.py -v 2>&1 | tail -10
```
Expected: 6 passing.

- [ ] **Step 5: Commit**
```bash
git add examples/chat/python/src/streaming/envelope_normalizer.py \
        examples/chat/python/tests/test_envelope_normalizer.py
git commit -m "feat(examples-chat): Python envelope-args normalizer

Parity with libs/chat envelope-normalizer.ts. Accepts envelopes/envelope/
positional/flat shapes the parent LLM may emit under non-strict tool
binding. Returns a canonical envelope list or None."
```

---

### Task 2.3: Wire the new tool into the graph, drop sub-LLM dispatch

**Files:**
- Modify: `examples/chat/python/src/graph.py`
- Modify: `examples/chat/python/tests/test_graph_smoke.py`

- [ ] **Step 1: Read current graph.py around the tool bindings + emit_generated_surface**

```bash
grep -n "generate_a2ui_schema\|bind_tools\|emit_generated_surface\|ToolNode\|SYSTEM_PROMPT" examples/chat/python/src/graph.py | head -20
```

Note the line ranges for: `generate` node (~383-414), `generate_a2ui_schema` tool (~329-343), `emit_generated_surface` node (~470-578), `ToolNode` registration (~646-649).

- [ ] **Step 2: Add failing test asserting the new tool is bound**

Append to `examples/chat/python/tests/test_graph_smoke.py`:

```python
class TestParentEmitsEnvelopes:
    def test_render_a2ui_surface_is_bound_for_a2ui_mode(self):
        """Sanity: the parent LLM's generate node binds render_a2ui_surface
        when gen_ui_mode='a2ui'. We import the graph module and check the
        tools registered on ToolNode."""
        from src.graph import _builder
        from src.streaming.envelope_tool import render_a2ui_surface

        tool_node = next(
            n for n_id, n in _builder.nodes.items() if n_id == "tools"
        )
        # ToolNode keeps a `.tools_by_name` dict
        tool_names = list(tool_node.tools_by_name.keys())  # type: ignore[attr-defined]
        assert "render_a2ui_surface" in tool_names

    def test_generate_a2ui_schema_tool_is_removed(self):
        """The old sub-LLM-dispatching tool must be removed from the graph."""
        from src.graph import _builder
        tool_node = next(
            n for n_id, n in _builder.nodes.items() if n_id == "tools"
        )
        tool_names = list(tool_node.tools_by_name.keys())  # type: ignore[attr-defined]
        assert "generate_a2ui_schema" not in tool_names
```

- [ ] **Step 3: Run, verify fail**
```bash
cd examples/chat/python && source .venv/bin/activate && python -m pytest tests/test_graph_smoke.py::TestParentEmitsEnvelopes -v 2>&1 | tail -10
```
Expected: FAIL — `render_a2ui_surface` not in tool names; `generate_a2ui_schema` still present.

- [ ] **Step 4: Update graph.py**

In `examples/chat/python/src/graph.py`:

**(a) Add imports near existing langchain imports:**
```python
from src.streaming.envelope_tool import render_a2ui_surface
from src.streaming.envelope_normalizer import normalize_envelope_args
from src.schemas.a2ui_v1 import A2UI_V1_SCHEMA_PROMPT
```

**(b) Delete `generate_a2ui_schema` tool (~lines 329-343).** Remove the entire `@tool async def generate_a2ui_schema(...)` block AND its import-site reference inside `generate`.

**(c) Update `generate` node binding (~line 404-411):**

Find:
```python
gen_ui_mode = state.get("gen_ui_mode") or "a2ui"
gen_ui_tool = (
    generate_a2ui_schema if gen_ui_mode == "a2ui"
    else generate_json_render_spec
)
llm = ChatOpenAI(**kwargs).bind_tools([
    search_documents, request_approval, research, gen_ui_tool,
])
messages = [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"]
```

Replace with:
```python
gen_ui_mode = state.get("gen_ui_mode") or "a2ui"
gen_ui_tool = (
    render_a2ui_surface if gen_ui_mode == "a2ui"
    else generate_json_render_spec
)
# Strict mode is enabled for the envelope-emission tool so OpenAI enforces
# the canonical {envelopes: [...]} argument shape; the JS bridge and Python
# normalizer treat the non-canonical shapes as safety nets.
llm = ChatOpenAI(**kwargs).bind_tools(
    [search_documents, request_approval, research, gen_ui_tool],
    strict=True if gen_ui_mode == "a2ui" else False,
)
# Append A2UI v1 schema to system prompt when in a2ui mode, so the parent
# LLM knows how to construct the envelopes directly.
system = SYSTEM_PROMPT
if gen_ui_mode == "a2ui":
    system = SYSTEM_PROMPT + "\n\n--- A2UI v1 SCHEMA ---\n" + A2UI_V1_SCHEMA_PROMPT + (
        "\n\nWhen rendering UI in a2ui mode, emit envelopes in this order: "
        "surfaceUpdate FIRST, then beginRendering, then any dataModelUpdate "
        "entries. This lets the client mount the surface as early as possible."
    )
messages = [SystemMessage(content=system)] + state["messages"]
```

**(d) Update ToolNode registration (~line 646-649):**

Find:
```python
_builder.add_node("tools", ToolNode([
    search_documents, request_approval, research,
    generate_a2ui_schema, generate_json_render_spec,
]))
```

Replace with:
```python
_builder.add_node("tools", ToolNode([
    search_documents, request_approval, research,
    render_a2ui_surface, generate_json_render_spec,
]))
```

**(e) Simplify `emit_generated_surface` (~lines 470-578):**

Find the A2UI branch (`if tool_name == "generate_a2ui_schema":`) and replace the `tool_name` check + parse logic:

```python
    # Detect the GenUI tool that produced this turn's surface.
    if tool_name == "render_a2ui_surface":
        # Tool body already validated + JSON-encoded the envelope list.
        try:
            arr = json.loads(payload)
            assert isinstance(arr, list)
        except (json.JSONDecodeError, AssertionError):
            return {}
        # Static reorder (same logic as PR #255): surfaceUpdate, then first
        # beginRendering, then dataModelUpdates, then any others, then any
        # remaining beginRenderings. Kept as defence-in-depth even though
        # the system prompt now instructs the LLM to emit them in this order.
        surface_updates = [e for e in arr if isinstance(e, dict) and "surfaceUpdate" in e]
        begin_renderings = [e for e in arr if isinstance(e, dict) and "beginRendering" in e]
        data_updates = [e for e in arr if isinstance(e, dict) and "dataModelUpdate" in e]
        others = [
            e for e in arr
            if isinstance(e, dict)
            and not ("surfaceUpdate" in e or "beginRendering" in e or "dataModelUpdate" in e)
        ]
        reordered = (
            surface_updates
            + (begin_renderings[:1] if begin_renderings else [])
            + data_updates
            + others
            + begin_renderings[1:]
        )
        jsonl = "\n".join(json.dumps(env) for env in reordered)
        wrapped = A2UI_PREFIX + "\n" + jsonl + "\n"
    elif tool_name == "generate_json_render_spec":
        # ... existing json-render branch unchanged ...
```

(Keep the json-render branch and the final ToolMessage placeholder + in-place AIMessage replacement logic that follows — those are PR #255's single-bubble invariant.)

- [ ] **Step 5: Run failing test from Step 2**
```bash
cd examples/chat/python && source .venv/bin/activate && python -m pytest tests/test_graph_smoke.py::TestParentEmitsEnvelopes -v 2>&1 | tail -10
```
Expected: 2 passing.

- [ ] **Step 6: Run the full test suite**
```bash
cd examples/chat/python && source .venv/bin/activate && python -m pytest tests/ -v 2>&1 | tail -15
```
Expected: all green (existing tests for emit_generated_surface should pass since the in-place AIMessage replacement logic is preserved).

- [ ] **Step 7: Commit**
```bash
git add examples/chat/python/src/graph.py \
        examples/chat/python/tests/test_graph_smoke.py
git commit -m "feat(examples-chat): parent LLM emits A2UI envelopes directly

Replaces the two-LLM hop (parent → tool body's sub-LLM) with a single
parent LLM bound to render_a2ui_surface(envelopes: list[A2uiEnvelope])
under OpenAI strict mode. The A2UI v1 schema prompt is appended to the
parent's system prompt with explicit envelope-emission ordering so the
surface mounts as soon as surfaceUpdate parses.

emit_generated_surface keeps its PR #255 job: read the validated envelope
list from ToolMessage, apply the static reorder for defence-in-depth,
wrap with A2UI_PREFIX, replace upstream AI message in place (single-bubble
invariant). The new envelope-emission flow already streams natively via
the parent LLM's tool_call_chunks; PR 3 attaches a callback handler that
sidebands the chunks as a2ui-partial custom events for the live UX."
```

---

### Task 2.4: Public-API regen + open PR

- [ ] **Step 1: Regenerate api-docs (Python example is documented in apps/website)**
```bash
npm run generate-api-docs 2>&1 | tail -5
git status apps/website/content/docs/ --short
```
Stage any changes.

- [ ] **Step 2: Commit + push + open PR**
```bash
git add apps/website/content/docs/ 2>/dev/null
git diff --cached --quiet || git commit -m "chore: regenerate api-docs after envelope-tool refactor"

git push -u origin claude/genui-streaming-envelope-tool

gh pr create --title "feat(examples-chat): replace sub-LLM dispatch with parent-emits-envelopes" --body "$(cat <<'EOF'
## Summary

Replaces the two-LLM GenUI flow (parent calls \`generate_a2ui_schema\` tool → sub-LLM produces envelopes → ToolMessage) with a single parent LLM that emits A2UI v1 envelopes directly as structured tool arguments under OpenAI strict mode.

The spike (committed earlier on \`claude/spec-genui-streaming-parent-llm\`) validated this approach against 15 representative prompts: 93% valid on gpt-5-mini, 80% on gpt-5 after argument-shape normalization. Strict-mode binding eliminates most non-canonical shapes; the normalizer (\`src/streaming/envelope_normalizer.py\` + parity TS in \`libs/chat/src/lib/a2ui/envelope-normalizer.ts\`) is the safety net for what slips through.

\`emit_generated_surface\` keeps its #255 job (static reorder + in-place AIMessage replacement). Wire shape unchanged for non-streaming consumers. PR 3 turns on live streaming via a callback handler that sidebands the parent LLM's tool_call_chunks as \`a2ui-partial\` custom events.

Spec: \`docs/superpowers/specs/2026-05-12-genui-streaming-sub-llm-design.md\`.

## Test plan
- [x] \`pytest tests/test_envelope_tool.py\` — 7 tests
- [x] \`pytest tests/test_envelope_normalizer.py\` — 6 tests
- [x] \`pytest tests/test_graph_smoke.py\` — existing + 2 new tests
- [ ] CI green
EOF
)"
```

Capture the PR URL.

---

## Phase 3 — Backend a2ui-partial handler (PR 3)

> Depends on PR 2 merging. Fork from origin/main AFTER PR 2 merges.

### Task 3.0: Fork PR 3 branch (controller)

- [ ] **Step 1: Fork from origin/main (after PR 2 merge)**
```bash
git fetch origin && git checkout -b claude/genui-streaming-partial-handler origin/main
git log --oneline -2  # verify PR 2's render_a2ui_surface is present
```

---

### Task 3.1: The callback handler

**Files:**
- Create: `examples/chat/python/src/streaming/a2ui_partial_handler.py`
- Create: `examples/chat/python/tests/test_a2ui_partial_handler.py`

- [ ] **Step 1: Write failing tests**

```python
# examples/chat/python/tests/test_a2ui_partial_handler.py
"""Tests for A2uiPartialHandler — drives canned on_chat_model_stream events."""
import asyncio
from unittest.mock import patch, AsyncMock

import pytest
from langchain_core.messages import AIMessageChunk

from src.streaming.a2ui_partial_handler import A2uiPartialHandler


class TestA2uiPartialHandler:
    @pytest.mark.asyncio
    async def test_dispatches_event_when_chunk_grows_args(self):
        handler = A2uiPartialHandler(tool_name="render_a2ui_surface")
        with patch("src.streaming.a2ui_partial_handler.adispatch_custom_event", new=AsyncMock()) as mock:
            chunk = AIMessageChunk(content="", tool_call_chunks=[
                {"id": "tc-1", "name": "render_a2ui_surface", "args": "{\"envelopes\":[", "index": 0},
            ])
            await handler.on_chat_model_stream(chunk, run_id="r1")
        mock.assert_awaited_once_with("a2ui-partial", {"tool_call_id": "tc-1", "args_so_far": "{\"envelopes\":["})

    @pytest.mark.asyncio
    async def test_concatenates_args_across_chunks_same_tool_call_id(self):
        handler = A2uiPartialHandler(tool_name="render_a2ui_surface")
        with patch("src.streaming.a2ui_partial_handler.adispatch_custom_event", new=AsyncMock()) as mock:
            await handler.on_chat_model_stream(
                AIMessageChunk(content="", tool_call_chunks=[{"id": "tc-1", "name": "render_a2ui_surface", "args": "{", "index": 0}]),
                run_id="r1",
            )
            await handler.on_chat_model_stream(
                AIMessageChunk(content="", tool_call_chunks=[{"id": "tc-1", "name": "render_a2ui_surface", "args": "\"x\":1}", "index": 0}]),
                run_id="r1",
            )
        # Second dispatch carries the cumulative string.
        assert mock.await_count == 2
        args = [call.args for call in mock.await_args_list]
        assert args[0][1]["args_so_far"] == "{"
        assert args[1][1]["args_so_far"] == "{\"x\":1}"

    @pytest.mark.asyncio
    async def test_ignores_chunks_for_unrelated_tools(self):
        handler = A2uiPartialHandler(tool_name="render_a2ui_surface")
        with patch("src.streaming.a2ui_partial_handler.adispatch_custom_event", new=AsyncMock()) as mock:
            await handler.on_chat_model_stream(
                AIMessageChunk(content="", tool_call_chunks=[{"id": "tc-x", "name": "search_documents", "args": "x", "index": 0}]),
                run_id="r1",
            )
        mock.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_no_dispatch_when_args_did_not_grow(self):
        handler = A2uiPartialHandler(tool_name="render_a2ui_surface")
        with patch("src.streaming.a2ui_partial_handler.adispatch_custom_event", new=AsyncMock()) as mock:
            # Same chunk twice — second dispatch is suppressed since cumulative string unchanged.
            for _ in range(2):
                await handler.on_chat_model_stream(
                    AIMessageChunk(content="", tool_call_chunks=[{"id": "tc-1", "name": "render_a2ui_surface", "args": "{", "index": 0}]),
                    run_id="r1",
                )
        mock.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_per_tool_call_id_state_isolation(self):
        handler = A2uiPartialHandler(tool_name="render_a2ui_surface")
        with patch("src.streaming.a2ui_partial_handler.adispatch_custom_event", new=AsyncMock()) as mock:
            await handler.on_chat_model_stream(
                AIMessageChunk(content="", tool_call_chunks=[
                    {"id": "tc-A", "name": "render_a2ui_surface", "args": "{", "index": 0},
                    {"id": "tc-B", "name": "render_a2ui_surface", "args": "[", "index": 1},
                ]),
                run_id="r1",
            )
        assert mock.await_count == 2
        ids = {call.args[1]["tool_call_id"] for call in mock.await_args_list}
        assert ids == {"tc-A", "tc-B"}
```

- [ ] **Step 2: Run, verify fail**
```bash
cd examples/chat/python && source .venv/bin/activate && python -m pytest tests/test_a2ui_partial_handler.py -v 2>&1 | tail -10
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```python
# examples/chat/python/src/streaming/a2ui_partial_handler.py
# SPDX-License-Identifier: MIT
"""Streaming callback handler that sidebands a parent LLM's growing
tool_call.arguments as A2UI-partial custom events. Listens to LangChain's
on_chat_model_stream events; per tool_call_id, concatenates argument
deltas and dispatches each cumulative state via adispatch_custom_event.
The frontend bridge (libs/chat partial-args-bridge) consumes these.
"""
from __future__ import annotations

from typing import Any

from langchain_core.callbacks import AsyncCallbackHandler
from langchain_core.callbacks import adispatch_custom_event


class A2uiPartialHandler(AsyncCallbackHandler):
    """Track per-tool_call_id cumulative arguments; dispatch a2ui-partial
    custom events when the cumulative string grows."""

    def __init__(self, tool_name: str = "render_a2ui_surface") -> None:
        super().__init__()
        self._tool_name = tool_name
        # tool_call_id -> cumulative args string
        self._buffers: dict[str, str] = {}

    async def on_chat_model_stream(
        self,
        chunk: Any,
        *,
        run_id: str | None = None,
        **kwargs: Any,
    ) -> None:
        # `chunk` is an AIMessageChunk. Each chunk may carry multiple
        # tool_call_chunks (e.g. interleaved across concurrent tool_calls).
        tool_call_chunks = getattr(chunk, "tool_call_chunks", None) or []
        for tc in tool_call_chunks:
            name = tc.get("name") or ""
            call_id = tc.get("id")
            delta = tc.get("args") or ""
            if name != self._tool_name or not call_id:
                continue
            existing = self._buffers.get(call_id, "")
            updated = existing + delta
            if updated == existing:
                # No growth — don't re-dispatch the same payload.
                continue
            self._buffers[call_id] = updated
            await adispatch_custom_event(
                "a2ui-partial",
                {"tool_call_id": call_id, "args_so_far": updated},
            )
```

- [ ] **Step 4: Run, verify pass**
```bash
cd examples/chat/python && source .venv/bin/activate && python -m pytest tests/test_a2ui_partial_handler.py -v 2>&1 | tail -10
```
Expected: 5 passing.

- [ ] **Step 5: Commit**
```bash
git add examples/chat/python/src/streaming/a2ui_partial_handler.py \
        examples/chat/python/tests/test_a2ui_partial_handler.py
git commit -m "feat(examples-chat): A2uiPartialHandler sidebands streaming envelopes

Async callback handler tracking per-tool_call_id cumulative arguments
from on_chat_model_stream events. Each growth in the cumulative string
dispatches an a2ui-partial custom event carrying {tool_call_id,
args_so_far}; the frontend partial-args-bridge consumes these and feeds
envelopes into the A2UI surface store as they parse."
```

---

### Task 3.2: Attach handler to the generate node

**Files:**
- Modify: `examples/chat/python/src/graph.py`
- Create: `examples/chat/python/tests/test_streaming_smoke.py`

- [ ] **Step 1: Write smoke test using a canned stream fixture**

```python
# examples/chat/python/tests/test_streaming_smoke.py
"""Integration smoke: the generate node, when invoked with a canned chat-model
stream, dispatches a2ui-partial events and the final state has the
single-bubble shape from PR #255."""
import asyncio
import json
from unittest.mock import patch, AsyncMock, MagicMock

import pytest
from langchain_core.messages import AIMessage, AIMessageChunk, HumanMessage

from src.streaming.a2ui_partial_handler import A2uiPartialHandler


def _make_canned_stream() -> list[AIMessageChunk]:
    """Five chunks of growing args for one tool_call to render_a2ui_surface."""
    return [
        AIMessageChunk(content="", tool_call_chunks=[{
            "id": "tc-1", "name": "render_a2ui_surface", "index": 0,
            "args": '{"envelopes":[',
        }]),
        AIMessageChunk(content="", tool_call_chunks=[{
            "id": "tc-1", "name": "render_a2ui_surface", "index": 0,
            "args": '{"surfaceUpdate":{"surfaceId":"s","components":[{"id":"root","type":"text","props":{}}]}},',
        }]),
        AIMessageChunk(content="", tool_call_chunks=[{
            "id": "tc-1", "name": "render_a2ui_surface", "index": 0,
            "args": '{"beginRendering":{"surfaceId":"s","root":"root"}},',
        }]),
        AIMessageChunk(content="", tool_call_chunks=[{
            "id": "tc-1", "name": "render_a2ui_surface", "index": 0,
            "args": '{"dataModelUpdate":{"surfaceId":"s","contents":[{"key":"text","valueString":"hi"}]}}',
        }]),
        AIMessageChunk(content="", tool_call_chunks=[{
            "id": "tc-1", "name": "render_a2ui_surface", "index": 0,
            "args": "]}",
        }]),
    ]


@pytest.mark.asyncio
async def test_handler_dispatches_per_chunk():
    """At least 3 a2ui-partial events fire as the canned stream advances."""
    handler = A2uiPartialHandler(tool_name="render_a2ui_surface")
    with patch("src.streaming.a2ui_partial_handler.adispatch_custom_event", new=AsyncMock()) as mock:
        for chunk in _make_canned_stream():
            await handler.on_chat_model_stream(chunk, run_id="r1")
    assert mock.await_count >= 3
    # Last cumulative string is the full envelope JSON.
    last = mock.await_args_list[-1].args[1]
    assert last["tool_call_id"] == "tc-1"
    body = json.loads(last["args_so_far"])
    assert "envelopes" in body
    assert len(body["envelopes"]) == 3
```

- [ ] **Step 2: Run, verify fail**
```bash
cd examples/chat/python && source .venv/bin/activate && python -m pytest tests/test_streaming_smoke.py -v 2>&1 | tail -10
```
Expected: FAIL only if `on_chat_model_stream` plumbing has a different signature; otherwise should pass against the handler — verify.

- [ ] **Step 3: Attach handler in `generate` node**

In `examples/chat/python/src/graph.py`, find the `generate` function. Near the top, add the import:

```python
from src.streaming.a2ui_partial_handler import A2uiPartialHandler
```

Inside `generate`, after the `llm = ChatOpenAI(**kwargs).bind_tools(...)` line and before `response = await llm.ainvoke(...)`, modify the invocation to pass a callback:

```python
    # When in a2ui mode, attach the partial-envelope sideband handler so
    # the parent LLM's tool_call_chunks for render_a2ui_surface are
    # dispatched as a2ui-partial custom events (consumed by the frontend
    # partial-args bridge).
    callbacks = []
    if gen_ui_mode == "a2ui":
        callbacks.append(A2uiPartialHandler(tool_name="render_a2ui_surface"))
    response = await llm.ainvoke(messages, config={"callbacks": callbacks})
```

- [ ] **Step 4: Run pytest**
```bash
cd examples/chat/python && source .venv/bin/activate && python -m pytest tests/ -v 2>&1 | tail -15
```
Expected: all existing tests still pass + new tests pass.

- [ ] **Step 5: Commit + push + open PR**
```bash
git add examples/chat/python/src/graph.py \
        examples/chat/python/tests/test_streaming_smoke.py
git commit -m "feat(examples-chat): wire A2uiPartialHandler to generate node

Attached only when gen_ui_mode='a2ui'. Sidebands the parent LLM's
tool_call_chunks for render_a2ui_surface as a2ui-partial custom events.
Together with the frontend partial-args bridge (claude/genui-streaming-
frontend-bridge) and the envelope-tool refactor (claude/genui-streaming-
envelope-tool), this realises the per-component fallback transition
wired by PR #252 — surface mounts on first surfaceUpdate, components
flip from fallback to real as dataModelUpdates stream in."

git push -u origin claude/genui-streaming-partial-handler

gh pr create --title "feat(examples-chat): turn on A2UI envelope streaming via callback handler" --body "$(cat <<'EOF'
## Summary

Final piece of the progressive A2UI streaming work. The \`A2uiPartialHandler\` async callback handler is attached to the \`generate\` node when \`gen_ui_mode='a2ui'\`. As the parent LLM streams \`tool_call_chunks\` for \`render_a2ui_surface\` (PR added by claude/genui-streaming-envelope-tool), the handler concatenates per-\`tool_call_id\` cumulative argument strings and dispatches \`a2ui-partial\` custom events via \`adispatch_custom_event\`. The frontend bridge (claude/genui-streaming-frontend-bridge) consumes these and feeds the A2UI surface store envelope-by-envelope.

Result: the per-component fallback transition wired by PR #252 is now actually visible. Surface mounts on the first \`surfaceUpdate\`; components show their fallback while their \`dataModelUpdate\` envelopes stream; each component flips from fallback to real as its binding resolves.

Spec: \`docs/superpowers/specs/2026-05-12-genui-streaming-sub-llm-design.md\`.

## Test plan
- [x] \`pytest tests/test_a2ui_partial_handler.py\` — 5 tests
- [x] \`pytest tests/test_streaming_smoke.py\` — 1 integration test against canned stream
- [x] Full \`pytest tests/\` — all existing tests still pass
- [ ] Live smoke at \`/embed\` after all three PRs merge: sample DOM via requestAnimationFrame and confirm frames where \`render-default-fallback\` count > 0
- [ ] CI green
EOF
)"
```

Capture the PR URL.

---

## Verification matrix

| Surface | Verifier |
|---|---|
| TS envelope-shape normalizer | `envelope-normalizer.spec.ts` (6 tests) |
| Python envelope-shape normalizer | `test_envelope_normalizer.py` (6 tests) |
| Pydantic envelope tool | `test_envelope_tool.py` (7 tests) |
| Surface store streaming entry point | `surface-store.spec.ts` (3 new tests) |
| Frontend partial-args bridge | `partial-args-bridge.spec.ts` (8 tests) |
| Chat composition wiring | `chat.component.spec.ts` (1 new test) |
| Graph binds new tool | `test_graph_smoke.py::TestParentEmitsEnvelopes` (2 tests) |
| Callback handler dispatch | `test_a2ui_partial_handler.py` (5 tests) |
| End-to-end canned stream | `test_streaming_smoke.py` (1 test) |
| End-to-end live | Chrome MCP smoke at `/embed`: trigger GenUI prompt, sample DOM via `requestAnimationFrame`, confirm ≥1 frame with `render-default-fallback` count > 0 |

## Risk register

- **Strict-mode coverage on non-canonical shapes.** Spike was run without `strict=True`. Production should retest after the bind; if residual variance persists, the normalizer (TS + Python) is the safety net. The two normalizers MUST have identical behaviour — fixture parity is required.

- **System-prompt token bloat.** A2UI v1 schema is ~28 KB appended to the parent's system prompt. The sub-LLM that was removed in PR 2 also consumed ~28 KB on its own system prompt, so net per-turn token spend should be roughly equivalent (though the parent now does more work in a single call).

- **Synthesised beginRendering uses heuristic.** When the LLM doesn't follow the system prompt's order instruction, the frontend bridge synthesises beginRendering targeting the first `id='root'` component (or first component as fallback). If a surface has neither convention, the surface still mounts but with a non-canonical root. Mitigation: backend reorder in `emit_generated_surface` (preserved from PR #255) catches the persisted path; classifier consumes the canonical wrapped content. Live UX may briefly show the wrong root for genuine edge cases.

- **Replay UX.** Replay restores final state from the persisted AIMessage content in one tick. No staircase — that's correct behaviour for replay, but worth noting in user-facing docs.

- **Render-element latch coupling.** PR #252's monotonic latch means once a component renders real, a later fallback re-request is ignored. With streaming, dispatching the same envelope twice (e.g. live + classifier) is safe: the second dispatch's state matches the first, so re-application is a no-op.

- **Tool-call linkage under concurrent calls.** The handler keys by `tool_call_id`. If the parent LLM emits two `render_a2ui_surface` tool_calls in the same response (e.g. multi-surface), the handler dispatches two independent custom-event streams keyed by their respective ids. Bridge handles them via per-tool_call_id state. Tested.

- **Frontend bridge poisoning.** A malformed args delta poisons that `tool_call_id` permanently in the bridge. The classifier path is unaffected and the wrapped AIMessage still materialises the surface — just without the live staircase for that turn.

- **Custom-event drops.** LangGraph SDK's event stream is best-effort under network conditions. Bridge degrades gracefully — wrapped AIMessage content still arrives over the standard stream and the classifier path catches up.
