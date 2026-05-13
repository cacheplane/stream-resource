# Homepage content fills — ProofStrip / Promises / HomeFAQ

**Date:** 2026-05-12
**Scope:** Editorial pass on three landing components shipped in Phase 4 (PR #270). Fill gaps identified in the full analysis: missing claim line, redundant signal, undersold package family, two overlapping Promises, two over-stated FAQ answers, three missing FAQ questions.

**Out of scope:** Hero, Differentiator, Stream/Render/Ship FeatureBlocks, PilotBlock, WhitePaperBlock, FinalCTA. Screenshot pipeline (separate workstream). The broken `/docs/agent/guides/production` link in the Ship block (flagged for a follow-up task).

---

## Files touched

- `apps/website/src/components/landing/ProofStrip.tsx`
- `apps/website/src/components/landing/Promises.tsx`
- `apps/website/src/components/landing/HomeFAQ.tsx`

No new components. No structural changes — only data-array edits plus one new heading element in ProofStrip.

---

## 1. ProofStrip

### Add a claim line

Insert a single sentence heading between the existing `Eyebrow` ("Built in the open") and the signals grid:

> **Open code, open packages, a live reference app.**

Styling: render as a centered `<p>` (not a section h2) using `tokens.typography.bodyLg`, `fontWeight: 600`, `color: tokens.colors.textPrimary`, with the existing `Eyebrow` keeping its current spacing above and the signals grid retaining its spacing below. This keeps ProofStrip's `tight` Section rhythm — the claim is an emphasis line, not a new section heading.

### Replace signal #3 (currently redundant)

| Field | Current | New |
|---|---|---|
| `label` | `LangGraph + AG-UI` | `Adapter contract` |
| `value` | `Two adapters` | `LangGraph + AG-UI + your own` |
| `href` | `null` | `null` |

### Reframe signal #5 (currently undersells the package family)

| Field | Current | New |
|---|---|---|
| `label` | `On npm` | `On npm` |
| `value` | `@ngaf/chat` | `@ngaf/* — 7 packages` |
| `href` | `https://www.npmjs.com/package/@ngaf/chat` | `https://www.npmjs.com/search?q=%40ngaf` |

(`7 packages` = current count of non-private `libs/*/package.json` files: a2ui, ag-ui, chat, langgraph, licensing, partial-json, render. If that count changes before merge, update.)

---

## 2. Promises

Full replacement of the `PROMISES` array. Same shape (`{ title, body }`), same card count (5), same section heading and surrounding copy.

```ts
const PROMISES = [
  {
    title: 'No closed core',
    body: 'MIT today, MIT tomorrow. Primitives and compositions both stay in the open repo. Pilot-to-Prod is the only paid thing.',
  },
  {
    title: 'No abandoned majors',
    body: 'We follow Angular’s LTS. When Angular ships, we ship.',
  },
  {
    title: 'No required cloud',
    body: 'Self-host LangGraph + your Angular app. Run it all in your VPC.',
  },
  {
    title: 'No telemetry',
    body: 'We don’t collect anything from your app. Not at install, not at runtime.',
  },
  {
    title: 'No model lock-in',
    body: 'Adapters work with any LLM your runtime supports. Swap providers without changing Angular code.',
  },
];
```

Beat changes:
- Old `No vendor lock-in` + `No paid Angular tier` + `No closed primitives` → consolidated into new `No closed core` (one distinct beat instead of three overlapping ones).
- Old `No required cloud` body reworded from "No phone-home" to "Run it all in your VPC" — leaves "phone-home" framing to the new `No telemetry` card.
- New `No telemetry` — explicit promise that matches the `FinalCTA` caption.
- New `No model lock-in` — net-new beat not duplicated upstream.

---

## 3. HomeFAQ

Full replacement of the `ITEMS` array. Same shape (`FAQItem[]`), expands from 8 to 11 entries. Two existing answers reworded; three new questions appended.

```ts
const ITEMS: FAQItem[] = [
  {
    q: 'How is this different from CopilotKit or AG-UI directly?',
    a: 'CopilotKit has an Angular SDK; we made different choices (signals, DI, zoneless-first). AG-UI is a protocol, not a UI library — you still build the Angular side. Angular Agent Framework gives you signal-native primitives plus adapters that hide the protocol, so you can swap LangGraph for AG-UI without rewriting your UI.',
  },
  // Q2 unchanged: existing-app
  // Q3 unchanged: zoneless
  // Q4 unchanged: without LangGraph
  // Q5 unchanged: P2P required
  // Q6 unchanged: cost
  {
    q: 'Is this production-ready today?',
    a: 'It runs the full stack in our reference deployment (cockpit.cacheplane.ai), and breaking changes are called out in release notes. We track current and previous Angular majors.',
  },
  // Q8 unchanged: where to report issues
  {
    q: 'I’m using CopilotKit today — how hard is the migration?',
    a: 'Component-by-component. `useChat`-style hooks map to the `agent()` signal API; actions map to LangGraph/AG-UI tool calls. Thread state lives in a service (not the component tree), so plan a session to port that. There isn’t a one-shot codemod.',
  },
  {
    q: 'Does it work with Angular Universal / SSR?',
    a: 'Streaming is client-side by design — agents are stateful and signal-based. If your shell is SSR’d, the chat compositions render with a loading state on the server and hydrate; the agent-talking parts stay client-only.',
  },
  {
    q: 'How do I test agent-driven components?',
    a: 'The agent is provided through Angular DI, so test doubles work the way you’re used to — supply a stub agent in your test module, drive it with signals, assert on the rendered output. See /docs/agent/guides/testing.',
  },
];
```

Final order: Q1 (reworded) → Q2 → Q3 → Q4 → Q5 → Q6 → Q7 (reworded) → Q8 → Q9 (new) → Q10 (new) → Q11 (new).

Edits in detail:
- **Q1:** softens the "ports React patterns to Angular" claim about CopilotKit (factually shaky — CopilotKit's Angular SDK exists and may not be a literal port). Keeps the positioning beat without the risk.
- **Q7:** drops unqualified "Yes — production-ready today." We're at 0.0.x with patch-level versioning; the previous answer doesn't cash. New copy lets evidence (Cockpit + release notes) carry it.
- **Q9 (new):** the obvious follow-up to Q1. The most commercially-relevant question this section can answer.
- **Q10 (new):** SSR is a hard-stop for many enterprise Angular shops. Silence reads as "doesn't support it." Honest answer is better than no answer.
- **Q11 (new):** Angular teams care about testing; silence here suggests it's hard. Links to existing `apps/website/content/docs/agent/guides/testing.mdx`.

---

## Verification

- Visit `/` in the preview dev server, confirm ProofStrip claim renders above the cards, Promises shows the new 5-card lineup, FAQ shows 11 items in the expected order.
- Verify the new signal #5 link (`npm search ?q=%40ngaf`) opens to a populated results page.
- Verify the `/docs/agent/guides/testing` link from Q11 resolves.
- TypeScript build passes (`nx build website`).

## Risk / rollback

Single PR, three file edits, no schema or shape changes. Rollback is `git revert`. No dependencies on screenshot work or other in-flight PRs.
