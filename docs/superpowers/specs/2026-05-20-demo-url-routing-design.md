# Demo URL routing — Design

**Status:** Approved
**Date:** 2026-05-20
**Goal:** Make every shareable thing about a demo session round-trip through the URL — active thread, agent knobs, theme, color scheme, selected project — so visitors can share their session as a link and recipients land on the exact same state. Ephemeral semantics: shared URL state overrides on visit but does not write to the recipient's localStorage.

## Why now

Today the canonical demo persists state in `localStorage` only. A visitor who customizes their setup (picks a model, switches to dark theme, opens a thread) has no way to share that exact view. The URL is just `/embed` regardless. Adding URL-based state turns the demo into a meaningful sharing surface for "look at this thread I made on Threadplane" without auth gating.

## Decisions locked during brainstorming

| Decision | Choice |
|---|---|
| What state goes in the URL | **Full demo state**: thread id, model, effort, gen-ui mode, theme, color scheme, selected project |
| Thread id placement | **Path segment** (`/<mode>/<thread-id>`) — canonical identity. ChatGPT/Claude-style. |
| Knob placement | **Query params**, omitted when at default value (`?model=gpt-5-nano&effort=high`) |
| Permission/auth on shared threads | **Out of scope** — public demo surface; thread ids are guessable but threads contain no sensitive data |
| URL → localStorage write semantics | **Ephemeral** — URL writes signals on visit but does NOT write to localStorage. localStorage only updates when the user explicitly changes a knob via the UI. Receivers of a shared link don't get their preferences overwritten. |

## URL shape

```
/<mode>[/<thread-id>][?model=&effort=&genui=&theme=&color=&project=]
```

Examples:
- `/embed` — fresh demo, no thread, all defaults
- `/embed/019e434c-...` — load that thread, defaults for everything else
- `/embed/019e434c-...?model=gpt-5-nano&effort=high` — thread + non-default agent knobs
- `/popup/abc123?genui=json-render&theme=material-dark&color=light` — full state, popup mode
- `/sidebar?theme=material-dark` — no thread yet, custom theme

**Default values omitted from URL.** A user who hasn't changed anything from defaults shares `/embed/<id>` — short, meaningful. The defaults table (matching today's persistence fallbacks):

| Param | Default | Source signal |
|---|---|---|
| `model` | `gpt-5-mini` | `model` |
| `effort` | `minimal` | `effort` |
| `genui` | `a2ui` | `genUiMode` |
| `theme` | `default-dark` | `theme` |
| `color` | `dark` | `colorScheme` |
| `project` | `null` (omitted) | `selectedProjectId` |

## Architecture

### Routes (`app.routes.ts`)

Each mode gains a sibling route that accepts an optional `:threadId` path segment. Both routes load the same mode component:

```ts
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'embed' },
  {
    path: '',
    loadComponent: () => import('./shell/demo-shell.component').then(m => m.DemoShell),
    children: [
      { path: 'embed',                 loadComponent: () => import('./modes/embed-mode.component').then(m => m.EmbedMode) },
      { path: 'embed/:threadId',       loadComponent: () => import('./modes/embed-mode.component').then(m => m.EmbedMode) },
      { path: 'popup',                 loadComponent: () => import('./modes/popup-mode.component').then(m => m.PopupMode) },
      { path: 'popup/:threadId',       loadComponent: () => import('./modes/popup-mode.component').then(m => m.PopupMode) },
      { path: 'sidebar',               loadComponent: () => import('./modes/sidebar-mode.component').then(m => m.SidebarMode) },
      { path: 'sidebar/:threadId',     loadComponent: () => import('./modes/sidebar-mode.component').then(m => m.SidebarMode) },
    ],
  },
  { path: '**', redirectTo: 'embed' },
];
```

The mode components stay untouched — `demo-shell` reads route params through `ActivatedRoute.firstChild` (or by walking the activated route tree on NavigationEnd events).

### URL → signal hydration (one-shot, on mount + on every navigation)

A new private method `readUrlState()` runs once on `DemoShell` mount and on every `NavigationEnd`:

1. Resolve the deepest activated route via `router.routerState.root.firstChild?.firstChild` (the child mode route).
2. Read `paramMap.get('threadId')` — null if route has no `:threadId`.
3. Read `queryParamMap` for `model`, `effort`, `genui`, `theme`, `color`, `project`.
4. For each present URL value, **set the corresponding signal**. Do NOT write to localStorage from this path.
5. For absent URL values, leave signal at its current state (init value already read from localStorage at signal-construction time).

The signal init order on first construction stays:

```ts
readonly model = signal<string>(this.persistence.read('model') ?? 'gpt-5-mini');
```

This is the localStorage → default fallback. Then `readUrlState()` overrides any signal whose URL value is present. Effective precedence: **URL → localStorage → default**. ✓

### Signal → URL writes

Three categories of writes, three policies:

| Category | Trigger | Router call | History behavior |
|---|---|---|---|
| **Mode change** | `onModeChange(next)` | `router.navigate(['/' + next, this.threadIdSignal() ?? ''], { queryParamsHandling: 'preserve' })` | **Push** — back/forward navigates between modes |
| **Thread switch** | `onThreadSelected`, `onNewThread`, agent `onThreadId` callback | `router.navigate(['/' + this.mode(), id], { queryParamsHandling: 'preserve' })` | **Push** — each thread is a distinct URL |
| **Knob change** | `onModelChange`, `onEffortChange`, `onGenUiModeChange`, `onThemeChange`, `onColorSchemeChange`, `onProjectSelected` | `router.navigate([], { queryParams: <computed-full-set>, replaceUrl: true })` (no `queryParamsHandling` → replace all query params with this object; keys whose value is `null` are dropped from the URL) | **Replace** — dropdown clicks don't pollute browser history |

A helper `buildQueryParams()` returns an object where every knob is mapped to either its non-default value or `null`. Angular's router omits null keys from the URL automatically when `queryParamsHandling` is left unset.

### Mode signal becomes derived from route, not URL-parsed

Today's `mode` signal parses `router.url` manually via `modeFromUrl` (`split('/').filter(Boolean)[0]`). Keep that helper — it correctly extracts the first non-empty segment regardless of whether a `:threadId` follows. Updated wiring: subscribe to `NavigationEnd` and apply `modeFromUrl(urlAfterRedirects)` as today. No semantic change to the mode signal; this PR just adds threadId + query-param hydration alongside.

### threadIdSignal becomes URL-driven, drops localStorage

Today: `threadIdSignal = signal(this.persistence.read('threadId') ?? null)` — init from localStorage; `onThreadId` callback writes back to localStorage.

After: `threadIdSignal = signal<string | null>(null)` — init null. The `readUrlState()` setter populates it from the path. The `onThreadId` callback navigates the router (which updates the URL), not localStorage. Remove `persistence.read('threadId')` and all `persistence.write('threadId', ...)` calls.

This matches the user's earlier "drawerOpen always starts false; stop persisting drawer state" pattern — transient routing state belongs in the URL, not localStorage.

### Knob persistence (unchanged on user action)

The existing `onModelChange`, `onEffortChange`, etc. handlers continue to `persistence.write('model', next)` etc. — so habitual visitors keep their preferences across sessions. The "ephemeral" semantic ONLY blocks URL-hydration writes; explicit user actions still persist.

### Browser back/forward

Native — every Router navigation pushes (or replaces) history. Going back from `/embed/abc?model=nano` to `/embed/abc?model=mini` is just popstate → Router → `readUrlState()` → signal updates.

## Files touched (demo-only)

| File | Change |
|---|---|
| `examples/chat/angular/src/app/app.routes.ts` | Add 3 sibling `:threadId` routes |
| `examples/chat/angular/src/app/shell/demo-shell.component.ts` | URL-bridge methods (`readUrlState`, `buildQueryParams`, knob navigation), drop `threadId` persistence read+write, derive `mode` from activated route |
| `examples/chat/angular/src/app/shell/demo-shell.component.spec.ts` | Tests (below) |

No library changes. No lib version bump needed.

## Testing

Unit tests in `demo-shell.component.spec.ts`:

1. **Routes accept `/embed`, `/embed/:threadId`, `/popup`, `/popup/:threadId`, `/sidebar`, `/sidebar/:threadId`** — navigate to each and assert the demo-shell mounts.
2. **threadId hydration from URL** — navigate to `/embed/abc123` → assert `threadIdSignal()` is `'abc123'`.
3. **threadId is null when route has no `:threadId`** — navigate to `/embed` → assert `threadIdSignal()` is `null`.
4. **Knob hydration from query params** — navigate to `/embed?model=gpt-5-nano&effort=high` → assert `model() === 'gpt-5-nano'` and `effort() === 'high'`.
5. **Default values omitted from URL** — call `onModelChange('gpt-5-mini')` (the default) → assert URL has no `model=` param.
6. **Non-default values appear in URL** — call `onModelChange('gpt-5-nano')` → assert URL has `?model=gpt-5-nano`.
7. **Mode change preserves thread + query params** — at `/embed/abc123?model=gpt-5-nano`, call `onModeChange('popup')` → assert URL becomes `/popup/abc123?model=gpt-5-nano`.
8. **Thread switch updates URL** — call `onThreadSelected('xyz')` → assert URL path is `/embed/xyz`.
9. **Ephemeral hydration**: navigate to `/embed?theme=material-dark` and assert `persistence.write('theme', ...)` was NOT called.
10. **User action persists**: call `onThemeChange('material-dark')` and assert `persistence.write('theme', 'material-dark')` was called.

E2E (Playwright, `examples/chat/angular/e2e/url-routing.spec.ts`, new file):

- Open `/embed/<known-thread-id>` directly → confirm the chat shows that thread's messages.
- Open `/embed?model=gpt-5-nano` → confirm the model picker shows gpt-5-nano selected.
- Switch the mode segmented control from Embed to Popup → URL changes from `/embed/.../?model=...` to `/popup/.../?model=...`, query params preserved.

## Out of scope

- A visible "Copy link" UI button (the URL is the link — copy from the address bar). Could land in a follow-up if a CTA is desired.
- OG tags / server-side rendering for previews on social platforms.
- Auth or read-only modes for shared threads.
- URL state for sub-controls inside `chat-input` (model picker pill, etc.) — those mirror demo-shell signals already and ride along.
- Cross-tab synchronization of state (BroadcastChannel etc.) — separate concern from URL sharing.
- A migration path that reads the old `localStorage.threadId` on first load after this PR ships. Returning users will see a clean welcome state once and re-pick the thread they want (or hit a bookmark). Acceptable churn.

## References

- Current `app.routes.ts:1-29` — three flat routes, no thread param
- Current `demo-shell.component.ts:42-45` — `modeFromUrl` URL parser (replaced by route-driven derivation)
- Current `demo-shell.component.ts:133-141` — `mode` toSignal derived from NavigationEnd (kept, but reads from activated route's routeConfig.path instead of parsing `router.url`)
- Current persistence keys (in `palette-persistence.service.ts`) — `model`, `effort`, `genUiMode`, `theme`, `colorScheme`, `selectedProjectId`, formerly `threadId` (removed by this PR)
