# Cockpit aimock E2E Phase 3 — c-subagents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add an aimock-driven Playwright spec for `c-subagents` (orchestrator with `task` tool dispatching subagents) at `cockpit/chat/subagents/angular/e2e/`, mirroring the Phase 2 c-tool-calls pattern.

**Architecture:** Per-example dir under the harness library landed in Phase 2 ([#356](https://github.com/cacheplane/angular-agent-framework/pull/356)). LangGraph port 8125 (next after streaming=8123 and tool-calls=8124). Multi-turn fixture (parent task tool_calls + tool results + continuation). No library changes.

**Tech Stack:** `@copilotkit/aimock`, Playwright, `libs/internal/aimock-harness/`, `uv` for the python langgraph dev server.

**Spec:** [docs/superpowers/specs/2026-05-16-cockpit-aimock-c-subagents-design.md](../specs/2026-05-16-cockpit-aimock-c-subagents-design.md)

---

## Working environment

- Worktree: `/tmp/c-subagents` (branch `claude/cockpit-aimock-c-subagents`).
- `node_modules` symlinked from main checkout; `npx`/`nx`/`uv` work directly.
- License header `// SPDX-License-Identifier: MIT` on line 1 of every new TS file.
- One commit per task. DO NOT push, amend, or `git add -A`.
- Spec commit already on the branch; this plan adds a second commit, then implementation commits.

---

## Task 1: Scaffold per-example e2e dir (configs + helpers)

**Files:**
- Create: `cockpit/chat/subagents/angular/e2e/tsconfig.json`
- Create: `cockpit/chat/subagents/angular/e2e/.gitignore`
- Create: `cockpit/chat/subagents/angular/e2e/playwright.config.ts`
- Create: `cockpit/chat/subagents/angular/e2e/global-setup-impl.ts`

- [ ] **Step 1: Create tsconfig.json**

Write `cockpit/chat/subagents/angular/e2e/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "test-results", "playwright-report"]
}
```

- [ ] **Step 2: Create .gitignore**

Write `cockpit/chat/subagents/angular/e2e/.gitignore`:

```
test-results/
playwright-report/
*.tmp
```

- [ ] **Step 3: Create playwright.config.ts**

Write `cockpit/chat/subagents/angular/e2e/playwright.config.ts`:

```typescript
// SPDX-License-Identifier: MIT
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4505',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  globalSetup: './global-setup-impl.ts',
  globalTeardown: require.resolve('../../../../../libs/internal/aimock-harness/src/global-teardown'),
});
```

- [ ] **Step 4: Create global-setup-impl.ts**

Write `cockpit/chat/subagents/angular/e2e/global-setup-impl.ts`:

```typescript
// SPDX-License-Identifier: MIT
import { resolve } from 'node:path';
import { createGlobalSetup } from '../../../../../libs/internal/aimock-harness/src';

export default createGlobalSetup({
  langgraphCwd: 'cockpit/langgraph/streaming/python',
  // Each cockpit example pins its OWN langgraph port to avoid TIME_WAIT
  // collisions when a sequential CI loop runs multiple per-example e2es
  // back-to-back. Streaming uses 8123; tool-calls 8124; subagents 8125.
  // The Angular proxy.conf.json target must match.
  langgraphPort: 8125,
  angularProject: 'cockpit-chat-subagents-angular',
  angularPort: 4505,
  fixturesDir: resolve(__dirname, 'fixtures'),
});
```

- [ ] **Step 5: Type-check**

```bash
cd /tmp/c-subagents/cockpit/chat/subagents/angular/e2e
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit Task 1**

```bash
cd /tmp/c-subagents
git add cockpit/chat/subagents/angular/e2e/tsconfig.json \
        cockpit/chat/subagents/angular/e2e/.gitignore \
        cockpit/chat/subagents/angular/e2e/playwright.config.ts \
        cockpit/chat/subagents/angular/e2e/global-setup-impl.ts
git commit -m "feat(cockpit-chat-subagents): scaffold aimock e2e dir"
```

---

## Task 2: Update Angular proxy + project.json

**Files:**
- Modify: `cockpit/chat/subagents/angular/proxy.conf.json`
- Modify: `cockpit/chat/subagents/angular/project.json`

- [ ] **Step 1: Update proxy.conf.json target port**

Open `cockpit/chat/subagents/angular/proxy.conf.json`. Change `target` from `"http://localhost:8123"` to `"http://localhost:8125"`:

```json
{
  "/api": {
    "target": "http://localhost:8125",
    "secure": false,
    "changeOrigin": true,
    "pathRewrite": { "^/api": "" },
    "ws": true
  }
}
```

- [ ] **Step 2: Add e2e target to project.json**

Open `cockpit/chat/subagents/angular/project.json`. Add to `targets`:

```json
"e2e": {
  "executor": "@nx/playwright:playwright",
  "options": {
    "config": "cockpit/chat/subagents/angular/e2e/playwright.config.ts"
  }
}
```

Verify the file is still valid JSON:

```bash
cd /tmp/c-subagents
python3 -c "import json; json.load(open('cockpit/chat/subagents/angular/project.json'))" && echo "OK"
```

Expected: `OK`.

- [ ] **Step 3: Commit Task 2**

```bash
cd /tmp/c-subagents
git add cockpit/chat/subagents/angular/proxy.conf.json \
        cockpit/chat/subagents/angular/project.json
git commit -m "feat(cockpit-chat-subagents): wire e2e target + per-example langgraph port 8125"
```

---

## Task 3: Capture the c-subagents fixture

**Files:**
- Create: `cockpit/chat/subagents/angular/e2e/scripts/record-c-subagents.py`
- Create: `cockpit/chat/subagents/angular/e2e/fixtures/c-subagents.json` (generated by script)

- [ ] **Step 1: Write the capture script**

Write `cockpit/chat/subagents/angular/e2e/scripts/record-c-subagents.py`:

```python
"""Capture parent task tool_calls + orchestrator continuation for c-subagents.

Mirrors cockpit/langgraph/streaming/python/src/chat_graphs.py's
_build_subagents_graph() LLM setup: ChatOpenAI(gpt-5-mini, streaming=True)
bound with the `task` tool, system prompt from prompts/subagents.md.

Iterates the agent ↔ tool loop until the LLM stops emitting tool_calls;
each loop iteration is one round of `task` dispatch + tool result. Writes
all rounds into a single aimock fixture file using the hasToolResult
discriminator on continuation entries.

Run from repo root:
  OPENAI_API_KEY=sk-... uv run --project cockpit/langgraph/streaming/python \\
    python cockpit/chat/subagents/angular/e2e/scripts/record-c-subagents.py
"""
import json
import os
import sys
import uuid
from pathlib import Path

env_path = Path("cockpit/langgraph/streaming/python/.env")
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

if not os.environ.get("OPENAI_API_KEY"):
    print("OPENAI_API_KEY not set", file=sys.stderr)
    sys.exit(1)

sys.path.insert(0, str(Path("cockpit/langgraph/streaming/python/src").resolve()))

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI

from src.chat_graphs import task  # type: ignore  # the @tool the orchestrator dispatches with

PROMPT = "Plan a trip from LAX to JFK"
SYSTEM_PROMPT = (
    Path("cockpit/langgraph/streaming/python/prompts/subagents.md").read_text()
)

llm = ChatOpenAI(model="gpt-5-mini", temperature=0).bind_tools([task])

# Agent ↔ tool loop. Capture each LLM response. Stop when LLM emits no tool_calls.
history = [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=PROMPT)]
captured_responses = []

for round_i in range(5):  # 5 rounds is plenty; recursion limit safety
    response = llm.invoke(history)
    captured_responses.append(response)
    tcs = response.tool_calls or []
    if not tcs:
        print(f"round {round_i}: orchestrator emitted final text ({len(response.content or '')} chars)")
        break
    print(f"round {round_i}: {len(tcs)} task tool_calls")
    # Add the AI message to history and execute each tool call.
    history.append(
        AIMessage(
            content=response.content or "",
            tool_calls=[
                {"name": tc.get("name"), "args": tc.get("args") or {}, "id": tc.get("id") or f"call_{uuid.uuid4().hex[:12]}", "type": "tool_call"}
                for tc in tcs
            ],
        )
    )
    for tc in tcs:
        result = task.invoke(tc.get("args") or {})
        history.append(
            ToolMessage(
                content=str(result),
                tool_call_id=tc.get("id") or f"call_{uuid.uuid4().hex[:12]}",
            )
        )
else:
    print("WARNING: reached round 5 without final-text response; using last captured", file=sys.stderr)

if not captured_responses:
    print("No LLM responses captured", file=sys.stderr)
    sys.exit(2)

# Build fixture.
# - First entry: orchestrator's FINAL response (last in captured_responses). Match needs
#   hasToolResult=true since by then the request history includes tool results.
# - Second entry: orchestrator's FIRST response (the initial task tool_calls fanout).
#   Match needs just userMessage (no tool_result in history yet).
first = captured_responses[0]
last = captured_responses[-1]

if not first.tool_calls:
    print("First orchestrator call did NOT emit tool_calls; cannot build subagents fixture", file=sys.stderr)
    print("Content:", str(first.content)[:200])
    sys.exit(3)

final_text = last.content if isinstance(last.content, str) else ""
if last is first or last.tool_calls:
    # Single-round flow: only one response, which had tool_calls. We don't have a
    # continuation text. Fail loudly — the test needs both.
    print("LLM did not emit a final-text continuation; aborting", file=sys.stderr)
    print("Tried 5 rounds; last response still had tool_calls:", bool(last.tool_calls))
    sys.exit(4)

fixture = {
    "fixtures": [
        # ORDER MATTERS: continuation match is more specific (hasToolResult);
        # aimock evaluates fixtures top-to-bottom.
        {
            "match": {"userMessage": PROMPT, "hasToolResult": True},
            "response": {"content": final_text},
        },
        {
            "match": {"userMessage": PROMPT},
            "response": {
                "toolCalls": [
                    {"name": tc.get("name"), "arguments": tc.get("args") or {}}
                    for tc in first.tool_calls
                ]
            },
        },
    ]
}

out_path = Path("cockpit/chat/subagents/angular/e2e/fixtures/c-subagents.json")
out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(json.dumps(fixture, indent=2) + "\n")
print(f"\nWrote fixture to {out_path}")
print(f"  first call: {len(first.tool_calls)} task tool_calls")
print(f"  continuation: {len(final_text)} chars; first 80: {final_text[:80]!r}")
```

If Task 3 Step 2 (run) reports the LLM did 3+ rounds (intermediate task calls after initial response), the simple 2-entry fixture above won't reproduce all rounds — but aimock will match the continuation entry on EVERY post-first call thanks to `hasToolResult: true`, so the orchestrator gets the captured final text whenever it has a tool result in history. The captured final text was generated from a 3-round-deep history, so its phrasing assumes that context. For Phase 3 the test assertions are loose (presence of subagent card + aviation phrase), so this collapse is acceptable.

- [ ] **Step 2: Run the capture script**

```bash
cd /tmp/c-subagents
cp /Users/blove/repos/angular-agent-framework/examples/chat/python/.env cockpit/langgraph/streaming/python/.env
node libs/licensing/scripts/generate-public-key.mjs 2>&1 | tail -1
uv run --project cockpit/langgraph/streaming/python python cockpit/chat/subagents/angular/e2e/scripts/record-c-subagents.py
```

Expected output:
```
round 0: <N> task tool_calls
... (possibly more rounds)
round X: orchestrator emitted final text (<NNN> chars)
Wrote fixture to cockpit/chat/subagents/angular/e2e/fixtures/c-subagents.json
  first call: <N> task tool_calls
  continuation: <NNN> chars; first 80: '...'
```

If the script exits with code 3 (first call no tool_calls) or 4 (no final text after 5 rounds), STOP and report. Likely causes:
- The PROMPT doesn't strongly enough invite `task` dispatch — try a more explicit prompt like "Use the task tool to dispatch research, booking, and itinerary subagents for a trip from LAX to JFK".
- The system prompt at `prompts/subagents.md` is configured differently than expected; read it and adjust the PROMPT.

DO NOT commit `cockpit/langgraph/streaming/python/.env` (gitignored, verify with `git status`).

- [ ] **Step 3: Inspect the captured fixture**

```bash
cd /tmp/c-subagents
head -30 cockpit/chat/subagents/angular/e2e/fixtures/c-subagents.json
```

Verify the file starts with `{"fixtures": [` and contains two entries: a continuation with `content` (final text) and a first-call with `toolCalls` array containing `task` entries. Note a distinctive phrase from the continuation content for Task 4's assertion.

- [ ] **Step 4: Commit Task 3**

```bash
cd /tmp/c-subagents
git add cockpit/chat/subagents/angular/e2e/scripts/record-c-subagents.py \
        cockpit/chat/subagents/angular/e2e/fixtures/c-subagents.json
git commit -m "feat(cockpit-chat-subagents): add capture script + fixture"
```

---

## Task 4: Write the c-subagents spec

**Files:**
- Create: `cockpit/chat/subagents/angular/e2e/c-subagents.spec.ts`

- [ ] **Step 1: Write the spec**

Write `cockpit/chat/subagents/angular/e2e/c-subagents.spec.ts`:

```typescript
// SPDX-License-Identifier: MIT
import { test, expect } from '@playwright/test';
import { sendPromptAndWait } from '../../../../../libs/internal/aimock-harness/src';

const PROMPT = 'Plan a trip from LAX to JFK';

test('c-subagents: orchestrator dispatches task subagents, summary surfaces in bubble', async ({
  page,
}) => {
  const bubble = await sendPromptAndWait(page, PROMPT);

  // At least one subagent card rendered in the chat-subagents UI primitive.
  // Proves the orchestrator's `task` tool_call routed through chat-subagents'
  // default subagentToolNames filter (which is ['task']).
  const subagentCard = page.locator('chat-subagent-card').first();
  await expect(subagentCard).toBeAttached({ timeout: 30_000 });

  // Final summary text contains an aviation-related phrase from the captured
  // continuation. Loose regex so refactors to the subagent prompts (research/
  // booking/itinerary outputs) don't break the test.
  const finalText = await bubble.innerText();
  expect(finalText.toLowerCase()).toMatch(/lax|jfk|itinerary|trip|flight/);
});
```

- [ ] **Step 2: Run the spec**

```bash
cd /tmp/c-subagents
npx playwright install --with-deps chromium  # idempotent if already installed
npx nx e2e cockpit-chat-subagents-angular --skip-nx-cache
```

Expected: 1 test passes within ~60–120s (Angular dev-server cold-start dominates).

If the spec fails:
- "subagent card not attached" → check the trace at `cockpit/chat/subagents/angular/e2e/test-results/`. The selector `chat-subagent-card` is verified against `libs/chat/src/lib/compositions/chat-subagent-card/chat-subagent-card.component.ts:33`. If a refactor renamed it, update the selector.
- "innerText regex didn't match" → look at the captured fixture's continuation text; pick a phrase that appears verbatim and update the regex.
- Otherwise STOP and report the failure.

- [ ] **Step 3: Stability check**

Run 3 times with port cooldown:

```bash
cd /tmp/c-subagents
for i in 1 2 3; do
  echo "=== Run $i ==="
  rm -rf cockpit/chat/subagents/angular/e2e/test-results cockpit/chat/subagents/angular/e2e/playwright-report
  sleep 8
  npx nx e2e cockpit-chat-subagents-angular --skip-nx-cache
done
```

Expected: 3/3 pass.

- [ ] **Step 4: Commit Task 4**

```bash
cd /tmp/c-subagents
git add cockpit/chat/subagents/angular/e2e/c-subagents.spec.ts
git commit -m "test(cockpit-chat-subagents): aimock e2e — orchestrator task fanout"
```

---

## Task 5: Update CI loop

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Locate the cockpit-e2e loop**

Open `.github/workflows/ci.yml`. Find the cockpit-e2e job's run step (currently iterates `cockpit-langgraph-streaming-angular cockpit-chat-tool-calls-angular`):

```yaml
      - name: Run cockpit example aimock e2e suites
        run: |
          set -e
          for proj in cockpit-langgraph-streaming-angular cockpit-chat-tool-calls-angular; do
            echo "::group::nx e2e $proj"
            npx nx e2e "$proj" --skip-nx-cache
            echo "::endgroup::"
            sleep 5
          done
```

- [ ] **Step 2: Append cockpit-chat-subagents-angular to the loop**

Change the `for proj in ...` line to include the new project:

```yaml
          for proj in cockpit-langgraph-streaming-angular cockpit-chat-tool-calls-angular cockpit-chat-subagents-angular; do
```

- [ ] **Step 3: Verify YAML parses**

```bash
cd /tmp/c-subagents
npx -y js-yaml .github/workflows/ci.yml > /dev/null && echo "OK"
```

Expected: `OK`.

- [ ] **Step 4: Commit Task 5**

```bash
cd /tmp/c-subagents
git add .github/workflows/ci.yml
git commit -m "ci(cockpit): include cockpit-chat-subagents-angular in e2e loop"
```

---

## Task 6: Verify, push, open PR

- [ ] **Step 1: Final local verification — run all three sequentially**

```bash
cd /tmp/c-subagents
lsof -ti :8123 :8124 :8125 :4300 :4504 :4505 2>/dev/null | xargs kill -9 2>/dev/null
ps aux | grep -E "uv |langgraph dev" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null
sleep 5
for proj in cockpit-langgraph-streaming-angular cockpit-chat-tool-calls-angular cockpit-chat-subagents-angular; do
  echo "=== $proj ==="
  npx nx e2e "$proj" --skip-nx-cache 2>&1 | tail -3
  sleep 5
done
```

Expected: all 3 projects pass.

If any fail, STOP and report.

- [ ] **Step 2: Confirm working tree is clean**

```bash
cd /tmp/c-subagents
rm -rf cockpit/chat/subagents/angular/e2e/test-results cockpit/chat/subagents/angular/e2e/playwright-report
rm -rf cockpit/chat/tool-calls/angular/e2e/test-results cockpit/langgraph/streaming/angular/e2e/test-results
git status --short
```

Expected: only the `node_modules` symlink and the `.env` file at `cockpit/langgraph/streaming/python/.env` as untracked. Both are gitignored.

- [ ] **Step 3: Push branch**

```bash
cd /tmp/c-subagents
git push -u origin claude/cockpit-aimock-c-subagents
```

- [ ] **Step 4: Open PR**

```bash
gh pr create --title "test(cockpit): aimock e2e — c-subagents (Phase 3)" --body "$(cat <<'EOF'
## Summary

Adds a per-example aimock e2e for \`c-subagents\` (orchestrator LLM with a \`task\` tool that dispatches subagents). Second per-example spec under the harness library landed in Phase 2 ([#356](https://github.com/cacheplane/angular-agent-framework/pull/356)).

- **New per-example dir** at \`cockpit/chat/subagents/angular/e2e/\` (configs, fixture, capture script, spec).
- **Per-example langgraph port** 8125 (streaming=8123, tool-calls=8124, subagents=8125). Proxy.conf.json target updated to match.
- **Fixture** captured from real \`gpt-5-mini\` for the prompt \"Plan a trip from LAX to JFK\". Two entries: continuation (with \`hasToolResult: true\`) + first-call (with \`task\` tool_calls).
- **CI loop** updated to include the new project.

Sits on Phase 2 ([#356](https://github.com/cacheplane/angular-agent-framework/pull/356)) + the c-* aviation refactor PR 1 ([#347](https://github.com/cacheplane/angular-agent-framework/pull/347)).

## Test plan

- [x] Pilot spec passes 3/3 stability runs locally
- [x] All three cockpit example e2e suites pass sequentially via the CI loop locally (streaming + tool-calls + subagents)
- [x] No harness library changes (proves the Phase 2 library handles richer scenarios)
- [ ] CI green on this PR

## Notes for reviewers

- Spec assertions are loose by design: presence of any \`<chat-subagent-card>\` + an aviation-related phrase in the final summary. Subagent prompts (research/booking/itinerary) can be edited without breaking the test.
- The \`task\` tool execution happens server-side in langgraph (real subagent functions); aimock only mocks the orchestrator LLM calls.

Spec: \`docs/superpowers/specs/2026-05-16-cockpit-aimock-c-subagents-design.md\`
Plan: \`docs/superpowers/plans/2026-05-16-cockpit-aimock-c-subagents.md\`
EOF
)"
```

- [ ] **Step 5: Watch CI**

```bash
gh pr checks <PR-NUMBER> --watch --interval 30
```

When green, merge with `--squash` and clean up worktree.

---

## Self-review checklist

- [x] Spec coverage: library reuse (Tasks 1+4), per-example layout (Tasks 1+2+3+4), CI loop (Task 5), per-example port (Task 1+2), capture script + fixture (Task 3), spec assertions (Task 4), acceptance criteria (Task 6).
- [x] Placeholder scan: no TBD. `<DISTINCTIVE_PHRASE>`-style placeholders avoided — the spec assertion uses a fixed loose regex.
- [x] Type consistency: `createGlobalSetup`, `sendPromptAndWait` match the library's exports as committed in PR #356.
- [x] Constraints: `@copilotkit/aimock` referenced in imports/plans only, NOT in commit messages or PR body.

## Execution handoff

Plan complete. Recommended: **subagent-driven-development** with one implementer for Tasks 1–5 (sequential, similar shape to Phase 2 c-tool-calls). Task 6 (push + PR + watch CI + merge) handled by the orchestrator.
