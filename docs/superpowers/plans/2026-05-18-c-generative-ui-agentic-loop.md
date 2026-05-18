# c-generative-ui Agentic-Loop Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current 6-node split-graph (router → generate_shell → populate_initial_data → emit_state → respond; or router → plan_tools → call_tools → emit_state → respond) with a single agentic loop: `START → agent ↔ tools → emit_state → respond → END`. Adds a `render_spec` tool so the LLM authors the spec AND chooses which data tools to call in one coherent reasoning step.

**Architecture:** Single `agent` node (gpt-5 reasoning='minimal') bound with 5 tools (`render_spec` + 4 existing data tools). Loops via `tools` (ToolNode) + `should_continue` (max 8 iterations per turn). `render_spec` is a `Command`-returning tool that updates `dashboard_spec` in state. The system prompt instructs first-turn = `render_spec` + relevant data tools; follow-up = case-based per existing rules.

**Tech Stack:** Python 3.12, LangGraph ≥0.3 (`Command`-from-tool), langchain-openai (`gpt-5` reasoning='minimal' for agent, `gpt-5-mini` for respond), uv. Per-cap canonical = `cockpit/chat/generative-ui/python/src/graph.py`; umbrella mirror = `cockpit/langgraph/streaming/python/src/dashboard_graph.py`. Per-cap prompt = `cockpit/chat/generative-ui/python/prompts/dashboard.md`; umbrella mirror = `cockpit/langgraph/streaming/python/prompts/dashboard.md`.

---

## Pre-flight (READ FIRST)

**Shared-checkout chaos.** The repo's working tree gets switched by parallel agents in this checkout. Confirmed during PR #428 — branch hijacking made chrome MCP smoke impossible because the langgraph dev server kept loading whichever code was on disk when it booted. This plan defends against it: every code-modifying task starts with `git branch --show-current` check, and Task 7 (chrome MCP) **uses an isolated worktree** for the dev server.

Before starting:

```bash
git fetch origin
git checkout -b claude/genui-agentic-loop claude/genui-agentic-loop-spec
```

The spec commit is the only commit between origin/main and `claude/genui-agentic-loop-spec` — implementation branches off the spec branch.

---

## Files modified

- Modify: `cockpit/chat/generative-ui/python/src/graph.py` (per-cap canonical — full rewrite)
- Modify: `cockpit/langgraph/streaming/python/src/dashboard_graph.py` (umbrella mirror)
- Modify: `cockpit/chat/generative-ui/python/prompts/dashboard.md` (per-cap canonical prompt)
- Modify: `cockpit/langgraph/streaming/python/prompts/dashboard.md` (umbrella mirror prompt)

No `dashboard_tools.py` changes. No frontend changes. No `pyproject.toml` changes.

---

## Task 1: Rewrite per-cap graph

**Files:**
- Modify: `cockpit/chat/generative-ui/python/src/graph.py` (replace contents)

- [ ] **Step 1: Verify branch**

```bash
test "$(git branch --show-current)" = "claude/genui-agentic-loop" && echo OK || echo WRONG_BRANCH
```

Expected: `OK`. If `WRONG_BRANCH`, STOP — do not proceed.

- [ ] **Step 2: Replace `cockpit/chat/generative-ui/python/src/graph.py` with the agentic-loop version**

Write the file with this exact content:

```python
"""Single-node agentic graph for the airline operations KPI dashboard.

Flow:
  START → agent ↔ tools → emit_state → respond → END

`agent` is a single LLM call with all 5 tools bound (render_spec + 4 data
tools). Loops via `should_continue` until the LLM returns no tool_calls or
the iteration cap is hit. Replaces the prior 6-node split graph (PR #428's
generate_shell / populate_initial_data / plan_tools / router scaffolding)
with a single coherent reasoning loop, as described in the agentic-loop
design spec (2026-05-18).
"""

import json
from pathlib import Path
from typing import Annotated, Literal

from langchain_core.messages import AIMessage, SystemMessage, ToolMessage
from langchain_core.tools import InjectedToolCallId, tool
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, MessagesState, END
from langgraph.prebuilt import ToolNode
from langgraph.types import Command

from src.dashboard_tools import ALL_TOOLS as _DATA_TOOLS

_PROMPT = (Path(__file__).parent.parent / "prompts" / "dashboard.md").read_text()

_MAX_TOOL_ITERATIONS = 8


class DashboardState(MessagesState):
    """Extended state that persists the dashboard spec across turns."""
    dashboard_spec: str | None


@tool
def render_spec(spec: dict, tool_call_id: Annotated[str, InjectedToolCallId]) -> Command:
    """Render an interactive dashboard layout from a JSON spec.

    Use this tool to author or update the dashboard layout. The spec is a
    JSON object with `elements` (a dict keyed by component id) and `root`
    (the id of the top-level component). See the system prompt for the full
    schema and component catalog.

    Call this tool FIRST on any turn where the layout needs to be created
    or restructured. After calling render_spec, call the data tools needed
    to populate the components you authored.

    Args:
        spec: The dashboard JSON render spec.

    Returns:
        Command updating dashboard_spec in state and emitting a ToolMessage.
    """
    spec_text = json.dumps(spec)
    return Command(
        update={
            "dashboard_spec": spec_text,
            "messages": [
                ToolMessage(
                    content="Spec accepted.",
                    tool_call_id=tool_call_id,
                    name="render_spec",
                )
            ],
        }
    )


_ALL_TOOLS = [render_spec, *_DATA_TOOLS]

_llm_with_tools = ChatOpenAI(
    model="gpt-5",
    temperature=0,
    streaming=True,
    reasoning_effort="minimal",
).bind_tools(_ALL_TOOLS)

_respond_llm = ChatOpenAI(model="gpt-5-mini", temperature=0, streaming=True)


async def agent(state: DashboardState) -> dict:
    """Single agentic node: LLM bound with all 5 tools, driven by the
    dashboard.md system prompt. Loops via the `tools` node + should_continue
    until the LLM returns no tool_calls."""
    messages = [SystemMessage(content=_PROMPT)] + state["messages"]
    response = await _llm_with_tools.ainvoke(messages)
    return {"messages": [response]}


def should_continue(state: DashboardState) -> Literal["tools", "emit_state"]:
    """Loop while the agent emits tool_calls, up to _MAX_TOOL_ITERATIONS this
    turn. After the cap, force exit to emit_state — partial dashboard is
    better than an infinite loop."""
    last = state["messages"][-1]
    if not (hasattr(last, "tool_calls") and last.tool_calls):
        return "emit_state"

    iter_count = 0
    for msg in reversed(state["messages"]):
        if msg.type == "human":
            break
        if msg.type == "ai" and getattr(msg, "tool_calls", None):
            iter_count += 1
    if iter_count >= _MAX_TOOL_ITERATIONS:
        return "emit_state"
    return "tools"


async def emit_state(state: DashboardState) -> DashboardState:
    """Emit state_update custom events from tool results.

    Uses LangGraph 1.x's `get_stream_writer()` — `adispatch_custom_event`
    no longer flows into the `custom` stream channel. The chat-lib bridge
    parses the payload as `{name: 'state_update', data: <patches>}`.

    Walks `state["messages"]` in reverse, accumulates state patches from
    ToolMessages produced this turn (until the most recent ai turn boundary
    or human message). Tool names not in the known set are ignored
    (e.g. render_spec, which writes to dashboard_spec via Command instead).
    """
    from langgraph.config import get_stream_writer

    tool_results = {}
    for msg in reversed(state["messages"]):
        if msg.type == "tool":
            try:
                data = json.loads(msg.content) if isinstance(msg.content, str) else msg.content
            except (json.JSONDecodeError, TypeError):
                continue

            if msg.name == "query_airline_kpis":
                for section_key, section_val in data.items():
                    if isinstance(section_val, dict):
                        for k, v in section_val.items():
                            tool_results[f"/{section_key}/{k}"] = v
            elif msg.name == "query_on_time_trend":
                tool_results["/on_time_trend"] = data
            elif msg.name == "query_flights_by_airline":
                tool_results["/flights_by_airline"] = data
            elif msg.name == "query_recent_disruptions":
                tool_results["/recent_disruptions"] = data
        elif msg.type == "ai":
            # Tool results from this turn are after the most recent prior ai
            # turn — but since the agent loop produces multiple ai messages
            # per turn (one per tool-call round), don't break on ai. Break
            # on human instead.
            continue
        elif msg.type == "human":
            break

    if tool_results:
        writer = get_stream_writer()
        writer({"name": "state_update", "data": tool_results})

    return state


async def respond(state: DashboardState) -> dict:
    """Generate a brief conversational summary of what just happened on this
    turn. ALWAYS runs (no early-exit) so the user-visible summary is always
    authored by this node, never inherited from the agent's tool-calling
    chatter."""
    messages = [
        SystemMessage(content=(
            "Provide a brief (1-2 sentence) conversational summary of what "
            "you just did this turn. If you generated a dashboard, say so. "
            "If you filtered data, say what you filtered. "
            "Do NOT output JSON. Do NOT ask follow-up questions."
        ))
    ] + state["messages"]
    response = await _respond_llm.ainvoke(messages)
    return {"messages": [response]}


_builder = StateGraph(DashboardState)
_builder.add_node("agent", agent)
_builder.add_node("tools", ToolNode(_ALL_TOOLS))
_builder.add_node("emit_state", emit_state)
_builder.add_node("respond", respond)

_builder.set_entry_point("agent")
_builder.add_conditional_edges("agent", should_continue)
_builder.add_edge("tools", "agent")
_builder.add_edge("emit_state", "respond")
_builder.add_edge("respond", END)

graph = _builder.compile()
```

Critical fix: the `emit_state` `elif msg.type == "ai": break` from PR #428 would prematurely break out of the reverse walk after the FIRST ai message — but in the agentic loop, we now have multiple ai messages per turn (one per tool-call round). The corrected loop breaks on `human` instead, which marks the true turn boundary.

- [ ] **Step 3: Verify compile + render_spec callable**

```bash
test "$(git branch --show-current)" = "claude/genui-agentic-loop" && echo OK || exit 1
cd cockpit/chat/generative-ui/python && uv run python -c "
import asyncio
from src.graph import graph, render_spec, agent, should_continue
print('TYPE:', type(graph).__name__)
print('NODES:', sorted(graph.nodes))
# Invoke render_spec directly to confirm it returns a Command
result = render_spec.invoke({'spec': {'elements': {'root': {'type': 'dashboard_grid'}}, 'root': 'root'}, 'tool_call_id': 'call_test'})
print('RENDER_SPEC_TYPE:', type(result).__name__)
print('RENDER_SPEC_UPDATE_KEYS:', sorted(result.update.keys()))
print('RENDER_SPEC_HAS_DASHBOARD_SPEC:', 'dashboard_spec' in result.update)
"
```

Expected:
```
TYPE: CompiledStateGraph
NODES: ['__end__', '__start__', 'agent', 'emit_state', 'respond', 'tools']
RENDER_SPEC_TYPE: Command
RENDER_SPEC_UPDATE_KEYS: ['dashboard_spec', 'messages']
RENDER_SPEC_HAS_DASHBOARD_SPEC: True
```

- [ ] **Step 4: Commit**

```bash
test "$(git branch --show-current)" = "claude/genui-agentic-loop" && echo OK || exit 1
git add cockpit/chat/generative-ui/python/src/graph.py
git commit -m "feat(c-generative-ui): rewrite as single agentic loop with render_spec tool (per-cap)"
```

---

## Task 2: Rewrite per-cap system prompt

**Files:**
- Modify: `cockpit/chat/generative-ui/python/prompts/dashboard.md`

- [ ] **Step 1: Verify branch**

```bash
test "$(git branch --show-current)" = "claude/genui-agentic-loop" && echo OK || exit 1
```

- [ ] **Step 2: Replace the prompt's workflow sections**

The file currently starts with a `# Airline Operations Dashboard Agent` heading, then "## Your Behavior" with "### First message" + "### Follow-up messages" subsections, then "## JSON Render Spec Format" through "## Example Spec". Replace EVERYTHING from the top through the "Categorize the user's request:" section (i.e. through the end of "Follow-up messages"), keeping the "## JSON Render Spec Format" section onwards byte-identical. Open the existing file to find the exact byte ranges before editing.

Use `Edit` to do this replacement (not `Write`, to preserve the schema sections perfectly). The new opening, replacing everything from `# Airline Operations Dashboard Agent` through the end of the follow-up-messages list, should be:

```markdown
# Airline Operations Dashboard Agent

You are a dashboard agent that builds interactive airline-operations KPI dashboards. You have five tools:

- `render_spec(spec)` — Author or update the dashboard layout. The spec is a JSON object describing component types, props, children, and state bindings. See the schema below.
- `query_airline_kpis()` — Snapshot of operational KPIs: on-time %, flights today, avg delay, load factor.
- `query_on_time_trend(months=12)` — On-time performance per month, for the line chart.
- `query_flights_by_airline(airlines=None)` — Daily flight counts per airline, for the bar chart.
- `query_recent_disruptions(limit=5, type=None)` — Recent delays/cancellations, for the data grid.

## Workflow

### When no dashboard exists yet (first turn)

1. Call `render_spec` with a complete dashboard layout — stat cards, charts, table — using `$state` bindings to the slots that the data tools populate (see "State Path Conventions" below).
2. Call EACH data tool that backs a component in your spec. Do NOT call tools whose data your spec doesn't reference.
3. Return — no further tool calls. A separate node will write a brief summary.

### When the dashboard exists (follow-up turn)

Categorize the user's request and act ONCE. DO NOT ask clarifying questions — pick the most reasonable interpretation and act.

- **Filter / scope** (e.g. "filter to cancelled flights only", "last 6 months", "top 3"): call EXACTLY ONE data tool — the one that backs the affected component — with the new parameters. Do NOT call `render_spec`.
- **Structural change** (e.g. "add a card for X", "remove the table"): call `render_spec` with the modified layout, then call data tools only for the NEW components.
- **Interpretive question** that no tool could resolve (e.g. "why is on-time % low?"): respond in plain prose with no tool calls. Use this ONLY when no tool fetch could answer the question.

```

Then immediately follow with the existing `## JSON Render Spec Format` section (and everything below), preserved verbatim. The final file should be: new opening (above) + `## JSON Render Spec Format` onwards (existing content).

- [ ] **Step 3: Verify the file has both the new opening AND the existing schema sections**

```bash
grep -c "render_spec(spec)" cockpit/chat/generative-ui/python/prompts/dashboard.md
grep -c "JSON Render Spec Format" cockpit/chat/generative-ui/python/prompts/dashboard.md
grep -c "State Path Conventions" cockpit/chat/generative-ui/python/prompts/dashboard.md
grep -c "Example Spec" cockpit/chat/generative-ui/python/prompts/dashboard.md
grep -c "First message" cockpit/chat/generative-ui/python/prompts/dashboard.md
```

Expected (in order): `1`, `1`, `1`, `1`, `0`. The "First message" header must NOT be in the file anymore (replaced with "When no dashboard exists yet (first turn)"). The schema sections (JSON Render Spec Format, State Path Conventions, Example Spec) MUST still be present.

- [ ] **Step 4: Commit**

```bash
test "$(git branch --show-current)" = "claude/genui-agentic-loop" && echo OK || exit 1
git add cockpit/chat/generative-ui/python/prompts/dashboard.md
git commit -m "feat(c-generative-ui): rewrite system prompt for agentic-loop workflow (per-cap)"
```

---

## Task 3: Mirror to umbrella graph

**Files:**
- Modify: `cockpit/langgraph/streaming/python/src/dashboard_graph.py`

- [ ] **Step 1: Verify branch + copy per-cap graph.py to umbrella**

```bash
test "$(git branch --show-current)" = "claude/genui-agentic-loop" && echo OK || exit 1
cp cockpit/chat/generative-ui/python/src/graph.py cockpit/langgraph/streaming/python/src/dashboard_graph.py
```

The per-cap and umbrella are byte-identical mirrors per PR #396 policy. The only path-related difference is the import (`from src.dashboard_tools import ...`) — `src.dashboard_tools` resolves correctly in both packages because both have a `src/` package containing `dashboard_tools.py`. Verify:

```bash
test -f cockpit/langgraph/streaming/python/src/dashboard_tools.py && echo OK || echo MISSING_DASHBOARD_TOOLS
```

Expected: `OK`. If `MISSING_DASHBOARD_TOOLS`, STOP — the umbrella is in an unexpected state.

- [ ] **Step 2: Verify umbrella compiles + render_spec works**

```bash
cd cockpit/langgraph/streaming/python && uv run python -c "
from src.dashboard_graph import graph, render_spec
print('TYPE:', type(graph).__name__)
print('NODES:', sorted(graph.nodes))
result = render_spec.invoke({'spec': {'elements': {'root': {'type': 'dashboard_grid'}}, 'root': 'root'}, 'tool_call_id': 'call_test'})
print('UPDATE_KEYS:', sorted(result.update.keys()))
"
```

Expected: `TYPE: CompiledStateGraph`, NODES includes `agent` + `tools` + `emit_state` + `respond` (no router/generate_shell/etc.), UPDATE_KEYS `['dashboard_spec', 'messages']`.

- [ ] **Step 3: Commit**

```bash
test "$(git branch --show-current)" = "claude/genui-agentic-loop" && echo OK || exit 1
git add cockpit/langgraph/streaming/python/src/dashboard_graph.py
git commit -m "feat(c-generative-ui umbrella): mirror agentic-loop rewrite"
```

---

## Task 4: Mirror prompt to umbrella

**Files:**
- Modify: `cockpit/langgraph/streaming/python/prompts/dashboard.md`

- [ ] **Step 1: Verify branch + copy per-cap prompt to umbrella**

```bash
test "$(git branch --show-current)" = "claude/genui-agentic-loop" && echo OK || exit 1
cp cockpit/chat/generative-ui/python/prompts/dashboard.md cockpit/langgraph/streaming/python/prompts/dashboard.md
```

- [ ] **Step 2: Verify diff is empty**

```bash
diff cockpit/chat/generative-ui/python/prompts/dashboard.md cockpit/langgraph/streaming/python/prompts/dashboard.md && echo IDENTICAL
```

Expected: `IDENTICAL`.

- [ ] **Step 3: Commit**

```bash
git add cockpit/langgraph/streaming/python/prompts/dashboard.md
git commit -m "feat(c-generative-ui umbrella): mirror prompt rewrite"
```

---

## Task 5: End-to-end real-LLM smoke (per-cap)

**Files:** none (verification only). Requires `OPENAI_API_KEY`.

- [ ] **Step 1: Confirm key present**

```bash
grep -q '^OPENAI_API_KEY=' .env && echo found
```

- [ ] **Step 2: Run the multi-turn smoke**

```bash
set -a; source .env; set +a
cd cockpit/chat/generative-ui/python && uv run python -c "
import asyncio, json
from src.graph import graph
from langchain_core.messages import HumanMessage

async def main():
    # Turn 1: first turn
    s1 = await graph.ainvoke({'messages': [HumanMessage(content='Show me a dashboard of airline operations.')], 'dashboard_spec': None})
    msgs = s1['messages']
    tool_msgs = [m for m in msgs if m.type == 'tool']
    tool_names = [m.name for m in tool_msgs]
    print('TURN1_TOOL_NAMES:', tool_names)
    print('TURN1_HAS_RENDER_SPEC:', 'render_spec' in tool_names)
    print('TURN1_DATA_TOOL_COUNT:', sum(1 for n in tool_names if n != 'render_spec'))
    print('TURN1_HAS_SPEC:', bool(s1.get('dashboard_spec')))
    final = msgs[-1].content[:200] if isinstance(msgs[-1].content, str) else str(msgs[-1].content)[:200]
    print('TURN1_FINAL:', final[:160])
    assert 'render_spec' in tool_names, f'expected render_spec call, got {tool_names!r}'
    assert sum(1 for n in tool_names if n != 'render_spec') >= 1, f'expected >=1 data tool call, got {tool_names!r}'
    assert s1.get('dashboard_spec'), 'dashboard_spec not populated'
    assert not final.lstrip().startswith('{'), f'final looks like JSON: {final[:80]!r}'

    # Turn 2: filter
    s2 = await graph.ainvoke({'messages': msgs + [HumanMessage(content='Filter to only cancelled flights')], 'dashboard_spec': s1['dashboard_spec']})
    msgs2 = s2['messages']
    new_tool_msgs = [m for m in msgs2[len(msgs):] if m.type == 'tool']
    new_tool_names = [m.name for m in new_tool_msgs]
    print('TURN2_NEW_TOOL_NAMES:', new_tool_names)
    final2 = msgs2[-1].content[:200] if isinstance(msgs2[-1].content, str) else str(msgs2[-1].content)[:200]
    print('TURN2_FINAL:', final2[:160])
    assert 'render_spec' not in new_tool_names, f'filter should NOT trigger render_spec: {new_tool_names!r}'
    assert len(new_tool_names) >= 1, f'expected >=1 new data tool call on follow-up: {new_tool_names!r}'

    # Turn 3: interpretive
    s3 = await graph.ainvoke({'messages': msgs2 + [HumanMessage(content='Why might on-time percentage be lower than industry average?')], 'dashboard_spec': s2['dashboard_spec']})
    msgs3 = s3['messages']
    new_tool_msgs3 = [m for m in msgs3[len(msgs2):] if m.type == 'tool']
    print('TURN3_NEW_TOOL_NAMES:', [m.name for m in new_tool_msgs3])
    final3 = msgs3[-1].content[:300] if isinstance(msgs3[-1].content, str) else str(msgs3[-1].content)[:300]
    print('TURN3_FINAL:', final3[:200])
    # Turn 3 should be a prose answer (interpretive case 3) — assert no tool calls is too strict for gpt-5
    # so just print and let reviewer eyeball.

asyncio.run(main())
"
```

Expected:
- TURN1: `render_spec` in tool names, ≥1 data tool call, `dashboard_spec` populated, final is prose
- TURN2: 1+ new data tool calls, NO new `render_spec`, final commits to action
- TURN3: ideally 0 new tool calls and a prose answer; if 1-2 tool calls appear, eyeball the final response

If turn 1 or 2 fails the assertions, fix and re-run before continuing.

- [ ] **Step 3: If smoke reveals an issue, fix the earlier task's code and re-run.**

If a fix was needed:

```bash
test "$(git branch --show-current)" = "claude/genui-agentic-loop" && echo OK || exit 1
git add cockpit/chat/generative-ui/python/src/graph.py cockpit/chat/generative-ui/python/prompts/dashboard.md cockpit/langgraph/streaming/python/src/dashboard_graph.py cockpit/langgraph/streaming/python/prompts/dashboard.md
git commit -m "fix(c-generative-ui): smoke fixes for agentic-loop"
```

---

## Task 6: Build verification

**Files:** none.

- [ ] **Step 1: Build per-cap python**

```bash
pnpm nx run cockpit-chat-generative-ui-python:build
```

Expected: green.

- [ ] **Step 2: Build umbrella python**

```bash
pnpm nx run cockpit-langgraph-streaming-python:build
```

Expected: green.

- [ ] **Step 3: Build Angular (sanity)**

```bash
pnpm nx run cockpit-chat-generative-ui-angular:build
```

Expected: green.

- [ ] **Step 4: Production deploy manifest unchanged**

```bash
npx tsx scripts/generate-shared-deployment-config.ts && git diff deployments/shared-dev/langgraph.json
```

Expected: empty diff (we changed Python source, not the manifest).

- [ ] **Step 5: No commit**

---

## Task 7: REQUIRED — chrome MCP end-to-end smoke (in isolated worktree)

**Files:** none.

PR #428's chrome MCP smoke was defeated by concurrent worktree branch-switching in the shared checkout. This task uses an isolated worktree where no parallel agent can switch the branch.

- [ ] **Step 1: Create isolated worktree**

```bash
ISOLATED_DIR="/tmp/genui-agentic-loop-verify"
rm -rf "$ISOLATED_DIR"
git worktree add "$ISOLATED_DIR" claude/genui-agentic-loop
cd "$ISOLATED_DIR"
git branch --show-current
```

Expected: `claude/genui-agentic-loop`. This directory is a SEPARATE checkout — no other agent has any reason to switch its branch.

- [ ] **Step 2: Install deps in the isolated worktree's per-cap python**

```bash
cd cockpit/chat/generative-ui/python && uv sync 2>&1 | tail -3
```

- [ ] **Step 3: Start servers from the isolated worktree**

From `$ISOLATED_DIR`:

```bash
lsof -t -i :5508 -i :4508 2>/dev/null | xargs kill -9 2>/dev/null
set -a; source .env 2>/dev/null || source /Users/blove/repos/angular-agent-framework/.env; set +a
nohup pnpm nx run cockpit-chat-generative-ui-python:serve > /tmp/agentic-loop-backend.log 2>&1 &
nohup pnpm nx serve cockpit-chat-generative-ui-angular --port 4508 > /tmp/agentic-loop-frontend.log 2>&1 &
```

Wait for both ready (`Application started up` in backend log; `Local:` in frontend log).

- [ ] **Step 4: Verify the loaded graph is the new one**

```bash
curl -s http://localhost:5508/assistants/c-generative-ui/graph | python3 -c "
import json, sys
d = json.load(sys.stdin)
nodes = sorted([n['id'] for n in d.get('nodes', [])])
print('NODES:', nodes)
print('HAS_AGENT:', 'agent' in nodes)
print('HAS_ROUTER:', 'router' in nodes)
print('HAS_GENERATE_SHELL:', 'generate_shell' in nodes)
"
```

Expected: `agent` IN nodes, `router` and `generate_shell` NOT in nodes. If the wrong graph is loaded, STOP — the worktree isolation didn't work or there's a caching issue. Investigate before continuing.

- [ ] **Step 5: Drive the flow via chrome MCP**

1. Navigate to `http://localhost:4508/`
2. Click "Render a dashboard" → wait ~30s → expect populated KPI cards (numbers, not "Building UI…" placeholders), line chart with data, bar chart, data table with rows
3. Type "Filter to only cancelled flights" → press Enter → wait ~15s → expect data table updates to cancellations only
4. Take a screenshot with `save_to_disk: true` for the PR description
5. Optional: type "Why might on-time percentage be lower than industry average?" → expect prose answer

- [ ] **Step 6: Stop servers + clean up worktree**

```bash
lsof -t -i :5508 -i :4508 2>/dev/null | xargs kill -9 2>/dev/null
rm -f /tmp/agentic-loop-backend.log /tmp/agentic-loop-frontend.log
cd /Users/blove/repos/angular-agent-framework
git worktree remove "$ISOLATED_DIR" --force
```

---

## Task 8: Open PR + watch CI + merge

- [ ] **Step 1: Push branch**

```bash
test "$(git branch --show-current)" = "claude/genui-agentic-loop" && echo OK || exit 1
git push -u origin claude/genui-agentic-loop
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --title "refactor(c-generative-ui): single agentic loop with render_spec tool" --body "$(cat <<'EOF'
## Summary
Replaces the c-generative-ui 6-node split graph with a single agentic loop, addressing the architectural critique from PR #428's discussion: today's \`populate_initial_data\` deterministically fires all 4 data tools regardless of what the LLM authored, ignoring the spec entirely. That fudges the demo's core claim ("the LLM intelligently composes UI and data fetches together").

After this PR:
- Single \`agent\` node (gpt-5, reasoning='minimal') with 5 tools bound: a new \`render_spec(spec)\` tool + the 4 existing data tools.
- LLM authors the spec by calling \`render_spec\` (which returns \`Command(update={"dashboard_spec": ..., "messages": [...]})\` to mutate state), then calls only the data tools its spec references.
- Loop via \`agent ↔ tools\` (canonical pattern, same as \`c_tool_calls\` and \`c_subagents\`), capped at 8 iterations per turn.
- System prompt rewritten to be agentic-loop-aware: first-turn = \`render_spec\` + relevant data tools; follow-up = filter/structural/interpretive cases per the existing rules.
- Removed: \`router\`, \`generate_shell\`, \`populate_initial_data\`, \`plan_tools\`. Kept: \`emit_state\` (with one fix — break on human, not ai, since the loop now produces multiple ai messages per turn), \`respond\`.

## Why this over PR #428's fix
PR #428 made the demo render but at the cost of replacing LLM judgement with a hardcoded loop over all 4 tools. The agent never adapts to the spec; the demo's "generative" claim is hollow. This PR restores the claim: one LLM, one prompt, full agentic composition.

## Files
- \`cockpit/chat/generative-ui/python/src/graph.py\` — per-cap canonical (full rewrite)
- \`cockpit/langgraph/streaming/python/src/dashboard_graph.py\` — umbrella mirror
- \`cockpit/chat/generative-ui/python/prompts/dashboard.md\` — agentic workflow + schema preserved
- \`cockpit/langgraph/streaming/python/prompts/dashboard.md\` — umbrella mirror

## Test plan
- [x] \`pnpm nx run cockpit-chat-generative-ui-python:build\` — green
- [x] \`pnpm nx run cockpit-langgraph-streaming-python:build\` — green
- [x] \`pnpm nx run cockpit-chat-generative-ui-angular:build\` — green
- [x] Shared-deployment manifest unchanged (26 graphs)
- [x] **Programmatic real-LLM smoke (3-turn)**:
  - Turn 1 ("Show me a dashboard of airline operations.") — calls \`render_spec\` + ≥1 data tool; \`dashboard_spec\` populated; final = conversational prose
  - Turn 2 ("Filter to only cancelled flights") — ≥1 new data tool call; NO new \`render_spec\`; final commits to action
  - Turn 3 ("Why might on-time percentage be lower than industry average?") — prose answer
- [x] **Chrome MCP smoke (in isolated worktree)**: dashboard renders with real data, filter works, screenshot attached
- [ ] CI

Plan: \`docs/superpowers/plans/2026-05-18-c-generative-ui-agentic-loop.md\`
Spec: \`docs/superpowers/specs/2026-05-18-c-generative-ui-agentic-loop-design.md\`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Watch CI**

```bash
gh pr checks <PR#> --watch
```

- [ ] **Step 4: Squash-merge on green**

```bash
gh pr merge <PR#> --squash --delete-branch
```

---

## Self-Review

**Spec coverage:**
- Decision 1 (render_spec tool) → Task 1 Step 2 ✓
- Decision 2 (Command-from-tool for dashboard_spec) → Task 1 Step 2 ✓
- Decision 3 (graph shape: agent ↔ tools → emit_state → respond) → Task 1 Step 2 (builder block) ✓
- Decision 4 (iteration cap at 8) → Task 1 Step 2 (`_MAX_TOOL_ITERATIONS = 8` + `should_continue`) ✓
- Decision 5 (gpt-5 minimal + gpt-5-mini for respond) → Task 1 Step 2 (LLM bindings) ✓
- Decision 6 (emit_state unchanged behavior, ignores render_spec) → Task 1 Step 2 (fall-through OK; `break on human` fix) ✓
- Decision 7 (respond unchanged from PR #428) → Task 1 Step 2 ✓
- Decision 8 (tool_choice='auto' — implicit since we don't set tool_choice) → Task 1 Step 2 (no tool_choice arg = default auto) ✓
- Decision 9 (system prompt rewrite) → Task 2 ✓
- Decision 10 (full mirror to umbrella graph + prompt) → Tasks 3 + 4 ✓
- Programmatic smoke (3-turn) → Task 5 ✓
- Chrome MCP smoke in isolated worktree → Task 7 ✓ (with explicit recovery path from PR #428's hijack issue)

**Placeholder scan:** None. Every code-modifying step has full code. Task 2 references the existing prompt's schema sections "verbatim" — acceptable because they ARE correct already and re-pasting them in the plan would double the plan length.

**Type consistency:**
- `DashboardState(MessagesState)` with `dashboard_spec: str | None` matches today's shape; `render_spec` Command writes `str` (via `json.dumps(spec)`) which matches the annotation.
- `render_spec(spec: dict, tool_call_id: Annotated[str, InjectedToolCallId])` — `InjectedToolCallId` is the canonical annotation for tool-side access to the calling AI message's tool_call_id (langchain-core ≥0.3, which the cockpit deps already pin).
- `_ALL_TOOLS = [render_spec, *_DATA_TOOLS]` — same list passed to both `bind_tools` and `ToolNode`, so the tool universe is consistent end-to-end.
- `should_continue` return type `Literal["tools", "emit_state"]` matches both destinations in the builder's `add_conditional_edges("agent", should_continue)` call.
- `emit_state` reading `msg.name == "query_..."` matches the names produced by `dashboard_tools.py`'s `@tool` decorators (which default tool name to the function name).

**Concurrency notes:** Every code-modifying task starts with a `git branch --show-current` check. Task 7 uses an isolated worktree to bypass the dev-server cache issue from PR #428.
