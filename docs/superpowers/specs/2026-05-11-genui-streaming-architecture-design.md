# GenUI Streaming Architecture — Design

**Status:** Approved (brainstorm 2026-05-11)
**Scope:** `@ngaf/chat` lib — content classifier, chat composition, chat-tool-calls primitive, chat-message revert.
**Replaces:** The chat-message-level GenUI suppression introduced in PR #245 (architecturally wrong; hides the actual surface mounting slot).

---

## Problem

When the user submits a prompt that triggers a GenUI tool call (`generate_a2ui_schema` or `generate_json_render_spec`), the streaming experience is janky:

1. A loading indicator flashes, then…
2. Raw JSON streams visibly (the tool-call args of `generate_a2ui_schema` rendered by `<chat-tool-calls>`, followed by the emit-phase content streaming before the classifier resolves to a known structured type).
3. Late skeleton ("Building UI…") appears once the classifier finally sees the A2UI prefix — too late to be useful.
4. With PR #245's chat-message-level fix applied, the skeleton appears TWICE (once per assistant message) and the actual `<a2ui-surface>` never renders because the skeleton suppresses the ng-content slot containing it.

Three separable architectural problems are at play:

- **P1.** `<chat-tool-calls>` renders the args of `generate_a2ui_schema` verbatim during streaming. These args are an LLM-internal mechanism, not user-facing content.
- **P2.** The classifier (`createContentClassifier`) commits to `'markdown'` the moment the first non-whitespace char isn't `{` or the start of a full A2UI prefix. During the prefix streaming, the first char `-` is ambiguous between "this is going to be the A2UI prefix" and "this is literal text starting with a dash" — the classifier picks markdown prematurely and never re-classifies.
- **P3.** Between the moment streaming begins and the moment the classifier resolves to `'a2ui'` / `'json-render'`, there is a 100-300ms gap where no visible rendering happens. The user sees an empty bubble or stream-of-text.

The PR #245 fix attempted to solve all three by adding GenUI awareness to `<chat-message>` itself, which has the wrong scope: chat-message wraps the rendered surface, so its template-level suppression also hides the surface.

## Solution overview

Clean separation between content classification (purely content-driven) and turn orchestration (lives in the chat composition which already owns the conditional render tree).

- **Classifier stays narrow.** Its only changes: rename `'undetermined'` → `'pending'` and gain patience when the first char is `-` (waits for enough chars to either match the full A2UI prefix or definitively rule it out).
- **Composition owns "is this a GenUI turn?"** via a new `isGenuiTurn(message, prevMessage)` method that reads message structure (`tool_calls`, `content` blocks, previous tool message name). It uses that knowledge to (a) show `<chat-genui-skeleton>` during the `pending` phase and (b) filter `<chat-tool-calls>` to hide GenUI tool cards.
- **chat-message reverts** to its pre-PR #245 simple ng-content wrapper. No GenUI awareness in the primitive.

The composition template becomes:

```html
@let pending = classified.type() === 'pending';
@let genui = isGenuiTurn(message, prevMessage(i));

<chat-message ...>
  @if (reasoning) { <chat-reasoning ... /> }
  <chat-tool-calls [excludeToolNames]="genuiToolNames()" ... />
  <chat-subagents ... />
  @if ((pending || (classified.type() === 'a2ui' && classified.a2uiSurfaces().size === 0)) && genui) {
    <chat-genui-skeleton />
  }
  @if (classified.markdown(); as md) { <chat-streaming-md [content]="md" ... /> }
  @if (classified.spec(); as spec) { <chat-generative-ui [spec]="spec" ... /> }
  @if (classified.type() === 'a2ui') {
    @for (entry of classified.a2uiSurfaces() | keyvalue; track entry.key) {
      <a2ui-surface ... />
    }
  }
  <chat-message-actions ... />
</chat-message>
```

## Components

### Changed — `@ngaf/chat` lib

**`streaming/content-classifier.ts`** — extend
- Rename `ContentType` value `'undetermined'` → `'pending'`. Update all references in the file.
- `detectType()` patience: when the first non-whitespace char is `-`, return `'pending'` if content length minus that index is less than `A2UI_PREFIX.length` AND `A2UI_PREFIX.startsWith(content.slice(i))`. Once content is long enough, commit to `'a2ui'` if the prefix matches or `'markdown'` if it doesn't.
- No other API changes; classifier stays content-only.

**`primitives/chat-tool-calls/chat-tool-calls.component.ts`** — extend
- New input: `excludeToolNames = input<readonly string[]>([])`.
- Inside the `groups()` computed, filter out any group whose `name` is in the exclude set.
- Default empty array preserves existing behavior for non-demo consumers.

**`primitives/chat-message/chat-message.component.ts`** — revert PR #245's changes
- Remove `DEFAULT_GENUI_TOOL_NAMES` constant.
- Remove `genuiToolNames` input.
- Remove `isGenUiToolCall` computed.
- Remove the `<chat-genui-skeleton>` template branch.
- Remove the `ChatGenuiSkeletonComponent` import.
- Restore the original ng-content-only template (matches the state before PR #245).

**`primitives/chat-message/chat-message.component.spec.ts`** — drop tests
- Remove the 5 GenUI-suppression tests added in PR #245.
- Remove the 4 partial-prefix detection tests added in the follow-up patch.
- Original instantiation + gutter-marker tests stay.

**`compositions/chat/chat.component.ts`** — extend
- Import `ChatGenuiSkeletonComponent`; add to component imports array.
- New input on the composition class: `readonly genuiToolNames = input<readonly string[]>(['generate_a2ui_schema', 'generate_json_render_spec'])`.
- New protected method `isGenuiTurn(message: Message, prevMessage: Message | undefined): boolean`:
  - Returns true when `message.extra?.tool_calls` contains an entry whose `name` is in `genuiToolNames()`.
  - Returns true when `message.extra?.content` is an array containing a `{ type: 'function_call', name: <genui> }` block.
  - Returns true when `prevMessage?.role === 'tool'` AND `prevMessage.name` (or `prevMessage.extra?.name`) is in `genuiToolNames()`.
- Helper method `prevMessage(i: number): Message | undefined` if not already present (look up the prior message by index in `agent().messages()`).
- Template inside the `chatMessageTemplate="ai"` block:
  - Add `[excludeToolNames]="genuiToolNames()"` to the existing `<chat-tool-calls>`.
  - Add the skeleton branch with the condition `(pending || (type === 'a2ui' && surfaces.size === 0)) && genui` (the second disjunct keeps the skeleton up if envelopes arrive but parsing produces no surfaces — see Risks).

### Unchanged

`primitives/chat-genui-skeleton/` — created in PR #245, stays as-is. Just rendered from a different place.

### No demo-shell or backend changes.

## Data flow

GenUI prompt end-to-end:

```
T=0    User submits "Render a settings card…"
       Agent submits. status → 'running'. chat-typing-indicator shows.

T+50ms Message 1 (tool-call) appears in langGraphMessages.
       M1.extra.content = [
         { type: 'function_call', name: 'generate_a2ui_schema',
           arguments: '' }
       ]
       M1.extra.tool_calls = []  ← empty until streaming ends

       classifier.update('') → type stays 'pending' (no content)
       isGenuiTurn(M1, prevUser) → true (function_call block)
       chat-tool-calls renders no groups (excluded by name)
       Skeleton: not rendered (M1's content is always pending-with-empty
                 → the skeleton condition is true, but M1 streams nothing
                 visible AND the body renders nothing either; user sees
                 only the typing indicator)

T+~3s  M1 finalizes. ToolMessage appears (M_tool, name=generate_a2ui_schema),
       hidden by the empty 'tool' template in chat-message-list.

T+~3.1s Message 2 (emit) starts streaming.
       isGenuiTurn(M2, M_tool) → true (prevMsg.role==='tool' AND name match)
       classifier.update('') → pending
       Skeleton renders ("✨ Building UI…")

T+~3.2s Content arrives: '-'.
       classifier sees first non-WS '-'. A2UI_PREFIX.startsWith('-')→true.
       content.length < A2UI_PREFIX.length → stay 'pending'. ← PATIENCE FIX
       Skeleton continues.

T+~3.3s Content: '---a2ui_JSON---\n{"surfaceUpdate":...'.
       classifier matches full prefix → transition to 'a2ui'.
       a2uiParser starts accumulating envelopes.

T+~3.4s First surfaceUpdate envelope completes. a2uiSurfaces.size → 1.
       Skeleton condition becomes false (pending=false, a2ui+empty=false).
       <a2ui-surface> mounts and renders.

T+~6s  Streaming completes. status → 'idle'. typing indicator hides.
       Final state: a2ui-surface rendered; M1 has no visible body.
```

Json-render mode follows the same flow except the classifier resolves to `'json-render'` on the first `{` (no patience needed). The skeleton flashes for ~50ms then `<chat-generative-ui>` takes over.

Non-GenUI prompts: `isGenuiTurn` returns false; skeleton never renders; existing markdown / tool-call paths work normally.

## Responsive behaviour

No new responsive concerns. The skeleton inherits the chat-message bubble width. The classifier patience window adds at most ~450ms of blank-bubble time for messages starting with `-` that turn out to be markdown (see Risks).

## Testing

### Unit — classifier (`content-classifier.spec.ts`)

- Empty content returns `'pending'` (renamed assertion).
- Single `-` returns `'pending'` (patience).
- `'--'`, `'---a'`, `'---a2u'` all return `'pending'` (still ambiguous).
- `'---a2ui_JSON---'` returns `'a2ui'` (full prefix match).
- `'-some long text without prefix'` returns `'markdown'` once content length exceeds the prefix length without matching.
- `'Hello world'` returns `'markdown'` (regular text).
- `'{'` returns `'json-render'` (no patience needed).
- All existing classifier tests pass after the rename (search/replace `'undetermined'` → `'pending'`).

### Unit — chat-tool-calls (`chat-tool-calls.component.spec.ts`)

- Default `excludeToolNames=[]` renders all groups (existing behavior).
- `excludeToolNames=['generate_a2ui_schema']` with a mixed tool-call message omits matching groups, keeps others.
- `excludeToolNames` matching all groups produces no rendered groups.

### Unit — chat-message (`chat-message.component.spec.ts`) — REVERT

- Drop the 9 GenUI-detection tests (5 from PR #245 + 4 from the follow-up patch).
- Restore the original instantiation + gutter-marker tests (untouched).

### Unit — chat composition (`chat.component.spec.ts`) — extend

- `isGenuiTurn` returns true for a message with `extra.content` containing a function_call block whose name is in `genuiToolNames`.
- `isGenuiTurn` returns true for a message with `extra.tool_calls[].name` in `genuiToolNames`.
- `isGenuiTurn` returns true for a trailing assistant message whose previous message is a tool with a GenUI name.
- `isGenuiTurn` returns false for a non-GenUI tool call (e.g. `search_documents`).
- Skeleton renders when classifier is `'pending'` AND `isGenuiTurn` is true.
- Skeleton disappears when classifier transitions to `'a2ui'` AND surfaces exist.
- Skeleton persists when classifier transitions to `'a2ui'` but `a2uiSurfaces.size === 0` (the late-arrival guard).
- chat-tool-calls receives `[excludeToolNames]="genuiToolNames()"` and filters the rendered groups.
- Non-GenUI assistant messages render the normal markdown / tool-call branches with no skeleton.

### Live smoke (Chrome MCP)

- `/embed` with the "Render a settings card with a toggle for dark mode, a language dropdown…" suggestion:
  1. Typing indicator at bottom (existing).
  2. M1 appears with no visible body (no tool-call card, no JSON).
  3. M2 starts streaming → skeleton appears immediately ("✨ Building UI…").
  4. Skeleton replaces with the rendered settings card.
  5. No raw JSON visible at any point in the flow.
- `/embed` with a non-GenUI prompt ("Tell me about coral reefs."):
  - Normal markdown streaming, no skeleton flash, no tool-call card interference.
- `/embed` with json-render gen-ui mode and a suggestion that triggers `generate_json_render_spec`:
  - Same flow as A2UI but resolves to `<chat-generative-ui>` instead of `<a2ui-surface>`.

## Risks

- **Classifier patience window can flash blank for `-`-prefixed text.** Up to ~15 chars (≈450ms at typical streaming rates) of empty bubble before classifier commits to markdown. Documented as known minor jank; not blocking.

- **`isGenuiTurn` keys off LangChain message structure.** If the Python graph changes how it emits the tool message (drops the `name` field, restructures `content` blocks), the detection silently degrades. Mitigation: three independent detection paths (any one is sufficient) plus dedicated tests cover each path.

- **A2UI envelopes arrive but parsing fails to produce a surface.** Classifier resolves to `'a2ui'` but `a2uiSurfaces` stays empty. The late-arrival guard `(type === 'a2ui' && surfaces.size === 0)` keeps the skeleton up; the @for over surfaces renders nothing. Net effect: user sees skeleton until either a surface lands or the run completes with an error. Acceptable.

- **Classifier rename ripples through dependent code.** Search the lib for `'undetermined'` and update all references in one pass: classifier source + spec + any consumers (likely composition template + parse-tree-store internals). Tests will catch missed references.

- **chat-message revert removes the `genuiToolNames` input shipped in PR #245.** This is a breaking shape change at the chat-message level. PR #245 has not been merged to main as of this design, so no downstream consumer exists. Safe to revert. Document the shape change in the new PR body.

## Phasing

Single PR (`claude/genui-architecture-fix`). The changes are tightly coupled:

- classifier rename + patience fix
- chat-tool-calls filter input
- chat-message revert (delete PR #245's chat-message changes)
- chat composition new method + template branch + binding
- all related tests

Net diff: ~150 LOC added (classifier + composition + tests) and ~120 LOC deleted (chat-message revert).

PR #245 should be closed in favor of this PR. The `chat-genui-skeleton` primitive code from PR #245 lifts into this PR unchanged.

## Out of scope

- Mode-specific skeleton shapes (one generic skeleton; mode prop is additive later).
- CSS crossfade between skeleton and surface (visual polish for later).
- Error display when GenUI parse fails (separate fix in `chat-error` or new error state on the skeleton).
- Schema-aware skeleton matching the expected surface layout (too speculative for now).
- Touch-specific skeleton sizing (current size works at all viewport widths).
