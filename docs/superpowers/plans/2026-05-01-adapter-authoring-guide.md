# Adapter Authoring Guide

> Documentation work — single MDX page + worked example. The example is a runnable in-process "echo" adapter that satisfies the full `Agent` contract; reading it should suffice for someone to write their own.

**Goal:** Help users write a runtime adapter against the `@ngaf/chat` `Agent` contract for a backend not covered by `@ngaf/langgraph` or `@ngaf/ag-ui`. The guide walks through every signal/method, then shows a complete minimal-but-real adapter (~80 lines) plus how to validate it with the conformance suite.

---

## File Structure

- Create: `apps/website/content/docs/chat/guides/writing-an-adapter.mdx`
- Modify: `apps/website/src/lib/docs-config.ts` — add the new page to the chat library's "Guides" section.

No source code changes outside docs.

---

### Task 1: Write the adapter authoring guide

- [ ] **Step 1: Create `apps/website/content/docs/chat/guides/writing-an-adapter.mdx`**

Sections (each 1-3 short paragraphs unless code):

1. **When to write your own adapter** — when neither `@ngaf/langgraph` nor `@ngaf/ag-ui` fits (custom RPC, in-process, mock for tests, exotic protocol).

2. **The contract** — link to `@ngaf/chat`'s `Agent` and `AgentWithHistory` types. Brief explanation that an Agent is a runtime-neutral set of signals (state) + an Observable of events + submit/stop methods.

3. **Field-by-field reference** — table walking through each field of `Agent`:

| Field | Type | What you supply |
|---|---|---|
| `messages` | `Signal<Message[]>` | A signal of the conversation messages so far |
| `status` | `Signal<AgentStatus>` | `'idle' \| 'running' \| 'error'` |
| `isLoading` | `Signal<boolean>` | True while a run is in flight |
| `error` | `Signal<unknown>` | Last error, or null |
| `toolCalls` | `Signal<ToolCall[]>` | Tool invocations and their results |
| `state` | `Signal<Record<string, unknown>>` | Backend-defined state snapshot |
| `events$` | `Observable<AgentEvent>` | Discriminated `state_update` / `custom` events |
| `submit` | `(input, opts?) => Promise<void>` | Send a message or resume |
| `stop` | `() => Promise<void>` | Abort the in-flight run |
| `interrupt?` | `Signal<AgentInterrupt \| undefined>` | (optional) Current pause-for-input |
| `subagents?` | `Signal<Map<string, Subagent>>` | (optional) Spawned subagents |

4. **Worked example: an in-process echo adapter** — a complete `EchoAgent` factory in ~80 lines that:
   - Holds writable signals for state.
   - On `submit({ message })`: optimistically appends the user message, then after a short delay appends an assistant message that echoes the input back.
   - Exposes `events$` as `EMPTY` (no custom events).
   - Reads cleanly to anyone who just wants the contract picture without tangling with HTTP/SSE/runtime SDKs.

   Code (full, embedded in the MDX):

   ```ts
   import { signal, type Signal } from '@angular/core';
   import { EMPTY, type Observable } from 'rxjs';
   import type {
     Agent, Message, AgentStatus, ToolCall,
     AgentEvent, AgentSubmitInput, AgentSubmitOptions,
   } from '@ngaf/chat';

   export interface EchoAgentOptions {
     /** Delay before the echoed reply appears, in ms. Defaults to 400. */
     delayMs?: number;
   }

   export function createEchoAgent(opts: EchoAgentOptions = {}): Agent {
     const messages = signal<Message[]>([]);
     const status = signal<AgentStatus>('idle');
     const isLoading = signal(false);
     const error = signal<unknown>(null);
     const toolCalls = signal<ToolCall[]>([]);
     const state = signal<Record<string, unknown>>({});
     let pending: ReturnType<typeof setTimeout> | undefined;

     const submit = async (input: AgentSubmitInput, _opts?: AgentSubmitOptions) => {
       if (input.message === undefined) return;

       const text = typeof input.message === 'string'
         ? input.message
         : input.message.map((b) => b.type === 'text' ? b.text : '').join('');

       // Optimistic user message
       messages.update((prev) => [
         ...prev,
         { id: cryptoRandomId(), role: 'user', content: text },
       ]);

       status.set('running');
       isLoading.set(true);
       error.set(null);

       pending = setTimeout(() => {
         messages.update((prev) => [
           ...prev,
           { id: cryptoRandomId(), role: 'assistant', content: `You said: ${text}` },
         ]);
         status.set('idle');
         isLoading.set(false);
         pending = undefined;
       }, opts.delayMs ?? 400);
     };

     const stop = async () => {
       if (pending !== undefined) clearTimeout(pending);
       pending = undefined;
       status.set('idle');
       isLoading.set(false);
     };

     return {
       messages,
       status,
       isLoading,
       error,
       toolCalls,
       state,
       events$: EMPTY satisfies Observable<AgentEvent>,
       submit,
       stop,
     };
   }

   function cryptoRandomId(): string {
     return Math.random().toString(36).slice(2);
   }
   ```

5. **Wiring it into a component** — short example: define an injection token, register the factory in `app.config.ts`, inject in a component, pass to `<chat>`.

   ```ts
   // app.config.ts
   import { ApplicationConfig, InjectionToken } from '@angular/core';
   import type { Agent } from '@ngaf/chat';
   import { createEchoAgent } from './echo-agent';

   export const ECHO_AGENT = new InjectionToken<Agent>('ECHO_AGENT');

   export const appConfig: ApplicationConfig = {
     providers: [
       { provide: ECHO_AGENT, useFactory: () => createEchoAgent({ delayMs: 250 }) },
     ],
   };
   ```

   ```ts
   // app.ts
   import { Component, inject } from '@angular/core';
   import { ChatComponent } from '@ngaf/chat';
   import { ECHO_AGENT } from './app.config';

   @Component({
     selector: 'app-root',
     standalone: true,
     imports: [ChatComponent],
     template: `<chat [agent]="agent" />`,
   })
   export class App {
     protected readonly agent = inject(ECHO_AGENT);
   }
   ```

6. **Validating with the conformance suite** — show how to import `runAgentConformance` from `@ngaf/chat/testing` and run it against your factory in a Vitest spec:

   ```ts
   // echo-agent.conformance.spec.ts
   import { runAgentConformance } from '@ngaf/chat/testing';
   import { createEchoAgent } from './echo-agent';

   runAgentConformance('createEchoAgent', () => createEchoAgent());
   ```

   Note: the conformance suite verifies the contract shape (every signal exists, returns the right type) plus a few semantic invariants (e.g., `isLoading()` is only true when `status() === 'running'`).

7. **`AgentWithHistory` (optional)** — when to extend the basic contract. Same pattern; add a `history: Signal<AgentCheckpoint[]>` field. Use `runAgentWithHistoryConformance` from `@ngaf/chat/testing` instead.

8. **Publishing your adapter** — peer-deps, naming convention (`@org/X-agent` or `your-package`), Angular library setup. Brief; not exhaustive.

   - Peer-deps to declare: `@angular/core`, `@ngaf/chat`, `rxjs`.
   - Optional: `@ngaf/licensing` if you want license-key gating.
   - Conformance helper as a dev-only dep: `@ngaf/chat` (the testing entry point ships from `@ngaf/chat/testing`, no separate package install).

- [ ] **Step 2: Add the page to `apps/website/src/lib/docs-config.ts`**

Find the `chat` library entry, locate its "Guides" section, add a page entry:

```ts
{ title: 'Writing an Adapter', slug: 'writing-an-adapter', section: 'guides' },
```

- [ ] **Step 3: Build website to verify the page renders**

```bash
npx nx build website 2>&1 | tail -3
```

Expected: PASS. The new MDX is picked up; the route `/docs/chat/guides/writing-an-adapter` resolves.

If a route mismatch surfaces: confirm slug format matches existing entries (kebab-case, no `.mdx` suffix).

- [ ] **Step 4: Commit + push + open PR**

```bash
git add apps/website/content/docs/chat/guides/writing-an-adapter.mdx \
        apps/website/src/lib/docs-config.ts
git commit -m "docs(chat): adapter authoring guide with worked echo example

Walks through every Agent contract field, includes a complete in-process
EchoAgent factory (~80 lines) demonstrating the runtime-neutral signal
pattern, shows DI wiring + conformance test usage, and notes peer-deps
for publishing your own adapter.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push
```

PR title: `docs(chat): adapter authoring guide`
PR body: link to the guide page (relative URL works in PR description previews); summary of what's covered.

---

## Out of Scope

- A second worked example beyond Echo (not needed; Echo plus the existing AG-UI/LangGraph adapters give plenty of reference).
- Full publishing-your-adapter walkthrough (npm setup, ng-packagr config, etc.). The guide notes peer-deps and points at Nx Angular library docs.
- Migration guide from existing in-house adapters. Not requested.
- Updates to `@ngaf/chat`'s public API to support the example (the example fits the existing contract; nothing to change in the lib).
- Creating an actual `cockpit/echo/angular/` demo — the MDX code blocks are sufficient documentation.
