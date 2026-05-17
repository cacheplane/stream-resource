# Umbrella cleanup — design

> **Place in the larger plan.** The `cockpit/langgraph/streaming/python/` directory inherited a dump of every c-* chat graph back when the cockpit demos shared one langgraph deployment. Per-cap standalone backends (PR #396) and the shared-deployment manifest generator (`scripts/generate-shared-deployment-config.ts`) have since superseded that pattern — but the dumped code is still sitting in `streaming/python/` and was the source of a recent invisible-edit bug ([PR #382 first attempt][pr-382] modified the dead copy of `c_interrupts`, not the live one). This spec deletes the dead code.
>
> Follow-ups already on deck: (1) rename + structural consistency sweep across cockpit examples — including the `cockpit/agui/streaming/angular` outlier, (2) audit `examples/chat/python` for similar dead-code/duplicate issues, (3) auto-generate the CI per-cap e2e loop from the capability registry so adding a new aimock-covered cap doesn't need a CI edit.
>
> [pr-382]: https://github.com/cacheplane/angular-agent-framework/pull/382

## Goal

Delete the duplicate c-* graph code from `cockpit/langgraph/streaming/python/`, leaving only the `streaming` capability's own backend. Make the umbrella indistinguishable from any other per-cap backend so future edits land in the right place by construction.

## Non-goals

- Renaming `cockpit/langgraph/streaming/` — separate cleanup, deferred.
- Auditing `examples/chat/python` — deferred.
- Refactoring the CI per-cap loop to auto-generate from `apps/cockpit/scripts/capability-registry.ts` — separate cleanup, deferred.
- Touching any per-cap backend (`cockpit/chat/<name>/python/`, `cockpit/langgraph/<other>/python/`, etc.).
- Touching the shared-deployment manifest generator or production deploy workflow.

## Audit findings (the why)

Every backend in the repo registers exactly 1 graph in its `langgraph.json` — except `cockpit/langgraph/streaming/python/langgraph.json`, which registers 12. The 11 c-* registrations point at `./src/chat_graphs.py`, `./src/a2ui_graph.py`, and `./src/dashboard_graph.py`. None of these are read by:

1. **Local dev.** Each cockpit demo proxies to its own per-cap backend (`cockpit/chat/<name>/angular/proxy.conf.json` → `localhost:5503`-class ports → `cockpit/chat/<name>/python/`).
2. **CI.** The cockpit-e2e job iterates per-cap angular projects; each spawns its OWN langgraph dev via `createGlobalSetup({ langgraphCwd: 'cockpit/chat/<name>/python', ... })`.
3. **Production.** `scripts/generate-shared-deployment-config.ts` walks `apps/cockpit/scripts/capability-registry.ts` (which lists per-cap python dirs) and the `examples/chat/python` extra, stages each into `deployments/shared-dev/deps/`, and emits a single langgraph.json. It reads the umbrella's manifest ONLY for `python_version` + `env` metadata (with safe defaults).

All internal imports of the dead files are self-referential (chat_graphs→aviation_tools→aviation_data; a2ui_graph→aviation_tools; chat_graphs→dashboard_graph→dashboard_tools→aviation_data). No external code imports them. Confirmed via repo-wide grep — only docs/specs/cache-files reference these paths.

## What changes

### File deletions

All under `cockpit/langgraph/streaming/python/src/`:

| File | Lines | Why it's dead |
|------|------:|--------------|
| `chat_graphs.py` | 198 | All c-* graphs (c_messages, c_input, c_debug, c_interrupts, c_theming, c_threads, c_timeline, c_tool_calls, c_subagents) live in per-cap backends now |
| `a2ui_graph.py` | 472 | c-a2ui has its own backend at `cockpit/chat/a2ui/python/` |
| `dashboard_graph.py` | 177 | c-generative-ui has its own backend at `cockpit/chat/generative-ui/python/` |
| `dashboard_tools.py` | 78 | Only `dashboard_graph.py` imports it |
| `aviation_data.py` | 207 | Only `chat_graphs.py` + `a2ui_graph.py` + `dashboard_tools.py` import it |
| `aviation_tools.py` | 90 | Only `chat_graphs.py` + `a2ui_graph.py` import it |
| **Total** | **1222** | |

Survives: `src/graph.py` (the `streaming` capability's own backend), `src/index.ts` (nx hook).

### `langgraph.json` trim

Before (12 entries):
```json
{
  "graphs": {
    "streaming": "./src/graph.py:graph",
    "c-generative-ui": "./src/chat_graphs.py:generative_ui",
    "c-messages": "./src/chat_graphs.py:c_messages",
    "c-input": "./src/chat_graphs.py:c_input",
    "c-debug": "./src/chat_graphs.py:c_debug",
    "c-interrupts": "./src/chat_graphs.py:c_interrupts",
    "c-theming": "./src/chat_graphs.py:c_theming",
    "c-threads": "./src/chat_graphs.py:c_threads",
    "c-timeline": "./src/chat_graphs.py:c_timeline",
    "c-tool-calls": "./src/chat_graphs.py:c_tool_calls",
    "c-subagents": "./src/chat_graphs.py:c_subagents",
    "c-a2ui": "./src/a2ui_graph.py:graph"
  },
  "dependencies": ["."],
  "python_version": "3.12",
  "env": ".env"
}
```

After (1 entry):
```json
{
  "graphs": {
    "streaming": "./src/graph.py:graph"
  },
  "dependencies": ["."],
  "python_version": "3.12",
  "env": ".env"
}
```

### `pyproject.toml` dep trim

Read `cockpit/langgraph/streaming/python/pyproject.toml`. Identify any dep that exists ONLY for the deleted files (e.g., if `dashboard_tools.py` pulled in a charting library, or if `a2ui_graph.py` needed a specific schema package). The `streaming` graph keeps `langgraph`, `langchain-openai`, and any transitive deps those resolve.

Implementation check: after trimming, run `uv sync && uv run python -c "from src.graph import graph"` — if any required transitive dep was removed, the import fails and we restore it. Then run `uv run langgraph dev --port 5500 --no-browser` for ~10s and confirm one graph registers.

### Docs

Skim `cockpit/langgraph/streaming/python/docs/guide.md` — if it documents the c-* graphs, replace with a single-capability framing. (Likely already framed for the streaming graph since this is the langgraph-streaming capability's own guide; verify and update if needed.)

### Memory note

Update `~/.claude/projects/-Users-blove-repos-angular-agent-framework/memory/project_cockpit_chat_examples_llm_driven_followup.md` — remove the "umbrella" framing now that the dead code is gone. Specifically the note's reference to graphs being defined in `cockpit/langgraph/streaming/python/` should redirect to `cockpit/chat/<name>/python/`. Optional; not blocking the PR.

## Risk surface

- **`pyproject.toml` over-trim.** If we remove a dep the streaming graph transitively needs, `uv sync` fails the verification step. Mitigation: change one dep at a time; verify between.
- **Hidden consumer of the umbrella's c-* registrations.** Grep + capability-registry audit shows none. If something turns up post-merge (e.g., a manual `langgraph dev` workflow someone has in their personal config), surface in `deploy-langgraph.yml` log or e2e fail; revert and reintroduce on a per-cap basis.
- **Branch concurrency.** The shared checkout has multiple parallel agents. Implementer must `git fetch origin && git rebase origin/main` before starting and verify the umbrella files still exist with the dead-code shape described here.

## Acceptance criteria

- `cockpit/langgraph/streaming/python/src/` contains only `graph.py` (+ `index.ts`, `__pycache__/`). The six files listed above are deleted.
- `cockpit/langgraph/streaming/python/langgraph.json` registers exactly one graph: `streaming`.
- `cd cockpit/langgraph/streaming/python && uv sync && uv run python -c "from src.graph import graph; print(type(graph).__name__)"` prints `CompiledStateGraph` (or equivalent).
- `cd cockpit/langgraph/streaming/python && uv run langgraph dev --port 5500 --no-browser` (or any free port) registers exactly 1 graph (`streaming`); no traceback.
- `npx tsx scripts/generate-shared-deployment-config.ts` succeeds. Compare its output `deployments/shared-dev/langgraph.json` before/after: graph count and entries unchanged (the umbrella's c-* registrations were never reached by the script).
- `nx e2e cockpit-langgraph-streaming-angular` passes (the streaming cap demo still works).
- `nx e2e cockpit-chat-tool-calls-angular`, `nx e2e cockpit-chat-subagents-angular`, and any other passing cockpit-chat-* e2e suites still pass — proves no per-cap demo depended on the dead umbrella code.
- Repo-wide grep `grep -rn 'chat_graphs\|dashboard_graph\|a2ui_graph' cockpit/langgraph/streaming/` returns zero matches.
- Repo-wide grep for the deleted symbol names (`c_messages`, `c_input`, `c_debug`, `c_interrupts`, `c_theming`, `c_threads`, `c_timeline`, `c_tool_calls`, `c_subagents` as exported python symbols, NOT as graph IDs) returns matches only in per-cap backends and docs/specs.
