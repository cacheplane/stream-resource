# Threads + Checkpoints Navigation v2 — Design

**Status:** Approved (brainstorm 2026-05-10)
**Scope:** Library primitives (`@ngaf/chat`, `@ngaf/langgraph`), Python graph metadata write, demo shell rewire.
**Replaces:** Phase 6 timeline slider panel and Phase 7 threads side panel as the *primary* nav surfaces. The slider survives as an advanced affordance inside the Debug overlay.

---

## Problem

The shipped Phase 6 + 7 navigation has three structural issues:

1. **Real estate.** Two fixed-position side panels eat chat width. They overlap each other and the chat below 1024px. PR #240 narrowed them but did not address the underlying pattern.
2. **Information design.** Thread items display only the truncated thread id (`Thread 019e140c`) — 50+ of them, unscannable. Checkpoint rows display raw node names (`__start__`, `generate`) with bare `Replay` / `Fork` buttons and no notion of "current position."
3. **Information architecture.** Two parallel toggles in the palette compete with each other and bury what should be the primary navigation. The user has no signal that threads (between conversations) and checkpoints (within a conversation) are different scopes.

## Solution overview

Split the two surfaces by mental model:

- **Threads** become a left-edge slide-out drawer, opened by a permanent hamburger anchored top-left. Replaces the fixed side panel. Push-mode at ≥1024px, overlay-mode below.
- **Checkpoints** become inline gutter markers in the conversation stream — a `●` dot in a 14px gutter next to every assistant turn. Hover reveals a `↶ Rewind | ⑂ Fork` pill. Replaces the fixed right panel.
- **Legacy timeline slider** stays in the codebase but is demoted to the Debug overlay only, so the library still ships an example of the panel pattern.

## Components

### New — `@ngaf/chat`

**`compositions/chat-thread-drawer/chat-thread-drawer.component.ts`**
Slide-in container wrapping `chat-thread-list`.

- Inputs: `open: boolean`, `mode: 'push' | 'overlay'` (default `'push'`), `width: number` (default `280`)
- Outputs: `openChange: EventEmitter<boolean>` (emitted when the user closes via scrim click or Escape)
- Push mode: applies `transform: translateX(0|-100%)` to itself with `transition: transform .2s`. The host page is responsible for reserving space (the drawer takes itself out of flow via `position: fixed`; the host applies `padding-left: var(--drawer-width)` to the chat surface when open).
- Overlay mode: same drawer + a sibling `<div class="chat-thread-drawer__scrim">` with `position: fixed; inset: 0; background: rgba(0,0,0,.4)` that emits `openChange(false)` on click.
- Re-projects content via `<ng-content>` so the consumer drops `<chat-thread-list>` (or a custom replacement) inside.

**`primitives/chat-checkpoint-marker/chat-checkpoint-marker.component.ts`**
Small standalone marker — the `●` dot plus the hover pill.

- Inputs: `checkpointId: string`, `isActive: boolean` (default `false`)
- Outputs: `replayRequested: EventEmitter<string>`, `forkRequested: EventEmitter<string>`
- Renders a focusable `<button>` containing the dot. On hover/focus, a popover positioned right of the dot shows two buttons; `pointer-events: none` until shown to keep the gutter slim.
- Active state: filled dot (`background: var(--a2ui-primary)`); inactive: outlined (`box-shadow: inset 0 0 0 1px var(--a2ui-primary)`).
- Touch: on viewports with `(pointer: coarse)`, the dot opens the pill via tap rather than hover. The pill auto-dismisses on outside tap or Escape.

### Changed — `@ngaf/chat`

**`primitives/chat-thread-list/chat-thread-list.component.ts`** (extend existing)
The default item template renders two lines:

```
<title-or-id>
<relative-time>
```

- Title resolution unchanged (`thread.title` or fall back to `Thread <id-slice>`).
- New formatter inside the component computes relative time from an optional `Thread.updatedAt: number` (epoch ms). Falls back to empty string if absent.
- `templateRef` content projection still wins when present — back-compat preserved.

**`primitives/chat-message/chat-message.component.ts`** (extend existing)
- New input: `checkpointId?: string`.
- When set, renders `<chat-checkpoint-marker [checkpointId] [isActive]>` in a left gutter slot. When unset, the gutter is collapsed (`width: 0`).
- Bubbles `replayRequested` / `forkRequested` from the marker as new component outputs.

### New — `@ngaf/langgraph`

**`agent.messageCheckpoints(): Signal<Map<string, string>>`**
Reactive map of `messageId → checkpointId`. Computed by walking `agent.history()` once: for each checkpoint, find the most recent assistant message and pair them. Refreshes on every history update.

The mapping rule: a checkpoint belongs to the *last AIMessage* whose id is present in the checkpoint's `values.messages`. Checkpoints with no AIMessage in scope (e.g. `__start__`) are skipped.

### Changed — Python graph

Add a single side-effect after the first user message in a thread:

- Inside the existing `generate` (or its entry) node, check if `metadata.title` is unset for the current thread.
- If unset, call `client.threads.update(thread_id, metadata={"title": first_user_msg[:50]})`.
- Guard against overwriting: only PATCH when `metadata.title` is currently absent. Subsequent sends do not modify the title.
- Slice by grapheme cluster (use `regex` or `\X` equivalent) to avoid splitting emoji or combining marks mid-codepoint.

### Changed — demo shell

**Removed**
- `Timeline off/on` and `Threads off/on` toggles from `control-palette`.
- `.demo-shell__timeline-panel` and `.demo-shell__threads-panel` from `demo-shell.component.html` + .css.
- Phase 6 + 7 persisted keys (`timeline`, `threads`) from `PaletteState` — replaced by `drawerOpen`.

**Added**
- `<demo-shell-header>` strip across the top of the viewport: hamburger (left, 44×44 tap target) + control palette (right). Replaces the floating palette.
- `<chat-thread-drawer [open]="drawerOpen()" [mode]="drawerMode()">` hosting `<chat-thread-list>`.
- `drawerOpen` signal + `drawerMode` computed signal (`'push'` at ≥1024px, `'overlay'` below; derived from a `viewportWidth` signal updated on `resize`).
- Push-mode reflow: `.demo-shell__main { padding-left: var(--drawer-width); transition: padding-left .2s }` applied conditionally on `drawerMode() === 'push' && drawerOpen()`.

**Wired**
- Thread selection → existing `onThreadSelected` path.
- New thread → existing `onNewThread` path.
- Marker `replayRequested` / `forkRequested` from `<chat-message>` → existing `onTimelineReplay` / `onTimelineFork` handlers.

**Debug overlay**
- The existing `<chat-debug>` gains a new section that mounts `<chat-timeline-slider>` as before. Demonstrates the panel pattern for library consumers.

## Data flow

```
hamburger click
  → drawerOpen toggles
  → chat-thread-drawer animates in
  → reads ThreadsService.threads() (already populated via existing effect)

thread item click
  → drawer emits threadSelected(id) → demo-shell sets threadIdSignal + persists
  → agent recomputes; messages re-render
  → drawer stays open

first user message in a fresh thread
  → graph generate node detects metadata.title absent
  → client.threads.update(id, metadata={title: msg[:50]})
  → next ThreadsService.refresh() returns the title

streaming turn lands
  → graph emits checkpoint after generate
  → agent.messageCheckpoints() Map updates
  → <chat-message [checkpointId]> resolves via the Map
  → <chat-checkpoint-marker> renders ● in gutter

marker hover → pill → Rewind click
  → marker emits replayRequested(checkpointId)
  → bubbles via chat-message → demo-shell.onTimelineReplay
  → agent.submit(null, { checkpointId })

marker Fork click
  → marker emits forkRequested(checkpointId)
  → demo-shell.onTimelineFork: POST /threads + agent.submit(null, { checkpointId })
```

## Responsive behaviour

| Viewport | Drawer mode | Width | Scrim | Hamburger | Pill trigger |
|---|---|---|---|---|---|
| ≥1024 | push | 280 | no | top-left, 32×32 | hover/focus |
| 768–1023 | overlay | 280 | yes (rgba(0,0,0,.4)) | top-left, 36×36 | hover/focus |
| <768 | overlay | 100% | yes | top-left, 44×44 | tap |

`pointer: coarse` media query controls hover vs tap regardless of viewport width, so a touch laptop at 1440 still gets tap-to-reveal.

## Cross-mode behaviour

- **`/embed`** — drawer + hamburger are the chat's only chrome. Gutter dots render inside the embed surface.
- **`/popup`** — drawer + hamburger live on demo-shell; the popup panel opens above (higher z-index). Gutter dots render inside the popup's chat surface. Threads list applies regardless of which mode is active.
- **`/sidebar`** — drawer opens at viewport left; the chat sidebar opens at viewport right (existing behaviour). Both can coexist. Gutter dots render inside the sidebar's chat surface.

## Testing

### Unit — `@ngaf/chat`

- `chat-thread-drawer.spec.ts`
  - `[open]=false` → drawer translated off-screen (transform check)
  - `[open]=true` → drawer translated to 0
  - `[mode]=overlay` + open → scrim rendered; scrim click emits `openChange(false)`
  - `[mode]=push` → no scrim rendered
  - Escape key dispatched to drawer host emits `openChange(false)`

- `chat-checkpoint-marker.spec.ts`
  - Renders button with role + accessible name including checkpoint id (or "checkpoint" + position)
  - Hover/focus shows pill; blur/mouseleave hides it
  - Pill Rewind click emits `replayRequested(checkpointId)`
  - Pill Fork click emits `forkRequested(checkpointId)`
  - `[isActive]=true` adds active class; `=false` removes it

- `chat-thread-list.spec.ts` (extend)
  - Default template renders title line + relative-time line when `updatedAt` set
  - Default template omits time line when `updatedAt` absent
  - `templateRef` projection still overrides the default

- `chat-message.spec.ts` (extend)
  - `[checkpointId]` unset → gutter slot has zero width (no marker rendered)
  - `[checkpointId]="cp1"` → marker rendered with that id
  - Marker `replayRequested` bubbles as message-level output

### Unit — `@ngaf/langgraph`

- `messageCheckpoints` returns empty map when history empty
- Pairs each `AIMessage` with the most recent checkpoint that contains it
- Skips checkpoints with no AIMessage in scope
- Updates reactively when `history()` updates

### Backend — Python

- First user send writes `metadata.title` truncated to 50 grapheme clusters
- Second send does not modify `metadata.title`
- Title with emoji at position 49 is not split mid-codepoint
- `/threads/search` returns the title in the next response

### Live smoke (Chrome MCP, all three modes)

- Hamburger visible top-left of viewport; click toggles drawer
- Drawer renders thread titles (not raw ids) after at least one round-trip
- Thread item click switches active thread; chat re-renders; drawer remains open
- New-thread button creates and switches
- Send message → gutter dot appears next to each assistant turn after run completes
- Hover dot → pill shows with Rewind + Fork
- Rewind click → run re-executes from that checkpoint
- Fork click → new thread created, switches to it, runs from the checkpoint
- Debug overlay open → `<chat-timeline-slider>` visible with same checkpoint set
- Resize to 1440 → push mode, chat reflows when drawer toggles
- Resize to 800 → overlay mode with scrim; scrim click closes
- Resize to 480 → full-sheet drawer; tap dot reveals pill (no hover)

## Risks

- **Push-mode reflow jank.** Chat content `padding-left` transition needs to coexist with active streaming. Composer width must not jump mid-stream. Mitigation: transition only `padding-left`, not `width`; composer reads its own width from container, not viewport.
- **Metadata write race.** Concurrent first + second message could both PATCH. Mitigation: graph reads `metadata.title` inside the node and skips if present; LangGraph's metadata write is last-writer-wins, so the worst case is one redundant write.
- **Grapheme slicing.** Naive `[:50]` on a Python `str` slices by code unit, splitting emoji. Mitigation: use `regex` library's `\X` pattern (or unicodedata grapheme iteration) to slice on grapheme boundaries.
- **`messageCheckpoints` performance on long threads.** A single walk per history update is O(n) and runs once per checkpoint emission. Fine for hundreds of turns; revisit if we ever hit thousands.

## Phasing

Three independent merge-ready PRs:

1. **Lib primitives.** `chat-thread-drawer` + `chat-checkpoint-marker` + extended `chat-thread-list`/`chat-message` + `agent.messageCheckpoints()`. Ships with full unit-test coverage. No demo-visible changes.
2. **Backend title write.** Python graph metadata write + Python test. Demo shows real titles in the existing drawer pattern (or in PR #1 if rebased after).
3. **Demo shell wiring.** Remove old palette toggles + side panels; add header strip + drawer + marker wiring; move slider into Debug overlay. The visible flip — verified by live smoke.

Each PR independently testable; PR #3 depends on PR #1 (primitives) but not on PR #2 (titles degrade gracefully to ids).

## Out of scope

- Thread search / filter.
- Thread rename UI (titles are derived once and never edited).
- Thread delete.
- Checkpoint diff view / preview of state at each checkpoint.
- Custom thread item templates beyond what `templateRef` projection already supports.
- Drawer pinning (always-open mode).
