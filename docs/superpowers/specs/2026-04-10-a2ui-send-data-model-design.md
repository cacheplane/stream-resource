# A2UI sendDataModel & v0.9 Action Envelope Design

**Date:** 2026-04-10
**Status:** Approved

## Overview

Close the agent-to-UI-to-agent data loop by implementing v0.9 spec-compliant outbound action messages. When a user triggers an event action (e.g., clicking a submit button), `A2uiSurfaceComponent` builds the complete v0.9 `A2uiActionMessage` envelope — including resolved context values, source component ID, timestamp, and optionally the full data model — and emits it through a dedicated `(action)` output. `ChatComponent` forwards it to the agent as a human message.

## 1. Types — v0.9 Action Envelope

### New types in `libs/a2ui/src/lib/types.ts`

```typescript
/** v0.9 client data model envelope — attached when sendDataModel is true. */
export interface A2uiClientDataModel {
  version: 'v0.9';
  surfaces: Record<string, Record<string, unknown>>;
}

/** v0.9 outbound action message — sent when a component's event action fires. */
export interface A2uiActionMessage {
  version: 'v0.9';
  action: {
    name: string;
    surfaceId: string;
    sourceComponentId: string;
    timestamp: string; // ISO 8601
    context: Record<string, unknown>; // resolved values, not raw DynamicValues
  };
  metadata?: {
    a2uiClientDataModel: A2uiClientDataModel;
  };
}
```

Both types are exported from `@cacheplane/a2ui` public API.

### `A2uiSurface` update

Add `sendDataModel` to the surface interface so the flag is preserved from `createSurface`:

```typescript
export interface A2uiSurface {
  surfaceId: string;
  catalogId: string;
  theme?: A2uiTheme;
  sendDataModel?: boolean; // new
  components: Map<string, A2uiComponent>;
  dataModel: Record<string, unknown>;
}
```

### Surface store update

The `createSurface` handler in `createA2uiSurfaceStore()` preserves the flag:

```typescript
case 'createSurface': {
  next.set(message.surfaceId, {
    surfaceId: message.surfaceId,
    catalogId: message.catalogId,
    theme: message.theme,
    sendDataModel: message.sendDataModel,
    components: new Map(),
    dataModel: {},
  });
}
```

**Files:**
- `libs/a2ui/src/lib/types.ts` — add `A2uiActionMessage`, `A2uiClientDataModel`, update `A2uiSurface`
- `libs/a2ui/src/index.ts` — export new types
- `libs/chat/src/lib/a2ui/surface-store.ts` — preserve `sendDataModel` in `createSurface`

## 2. Context Resolution & Source Component ID in `surfaceToSpec()`

### Problem

`surfaceToSpec()` currently passes `evt.context` through as-is, which may contain unresolved `DynamicValue` objects (path refs, function calls). The v0.9 spec requires context values to be resolved at dispatch time. Additionally, `sourceComponentId` (the component's `id`) is not threaded into the action params.

### Solution

In `surfaceToSpec()`, resolve context `DynamicValue`s against the data model and include `sourceComponentId`:

```typescript
if ('event' in comp.action) {
  const evt = comp.action.event;
  const resolvedContext: Record<string, unknown> = {};
  if (evt.context) {
    for (const [key, value] of Object.entries(evt.context)) {
      resolvedContext[key] = resolveDynamic(value, surface.dataModel);
    }
  }
  on = {
    click: {
      action: 'a2ui:event',
      params: {
        surfaceId: surface.surfaceId,
        sourceComponentId: id,
        name: evt.name,
        context: resolvedContext,
      },
    },
  };
}
```

Since `surfaceToSpec()` runs inside a `computed()`, context values are always resolved against the current data model. When a user fills in fields and then clicks submit, context paths resolve to the latest values.

**File:** `libs/chat/src/lib/a2ui/surface.component.ts` — `surfaceToSpec()` function

## 3. Action Envelope Construction in `A2uiSurfaceComponent`

### Problem

The `a2ui:event` handler currently returns raw params. The v0.9 spec requires a structured action envelope with `version`, `timestamp`, and optionally the data model snapshot.

### Solution

Add a dedicated `(action)` output on `A2uiSurfaceComponent`. The `a2ui:event` handler builds the complete `A2uiActionMessage` and emits it:

```typescript
@Component({ ... })
export class A2uiSurfaceComponent {
  // Existing
  readonly surface = input.required<A2uiSurface>();
  readonly catalog = input.required<ViewRegistry>();
  readonly handlers = input<Record<string, (params: Record<string, unknown>) => unknown | Promise<unknown>>>({});
  readonly events = output<RenderEvent>();

  // New — agent-bound action messages
  readonly action = output<A2uiActionMessage>();
```

The `a2ui:event` handler in `internalHandlers`:

```typescript
'a2ui:event': (params: Record<string, unknown>) => {
  const surface = this.surface();
  const message: A2uiActionMessage = {
    version: 'v0.9',
    action: {
      name: params['name'] as string,
      surfaceId: surface.surfaceId,
      sourceComponentId: params['sourceComponentId'] as string,
      timestamp: new Date().toISOString(),
      context: (params['context'] as Record<string, unknown>) ?? {},
    },
  };
  if (surface.sendDataModel) {
    message.metadata = {
      a2uiClientDataModel: {
        version: 'v0.9',
        surfaces: { [surface.surfaceId]: surface.dataModel },
      },
    };
  }
  this.action.emit(message);
  return message;
},
```

The `(events)` output remains for observation/logging. The `(action)` output is the agent-bound channel. Clean separation — `ChatComponent` never needs to know about data models or `sendDataModel`.

**File:** `libs/chat/src/lib/a2ui/surface.component.ts` — `A2uiSurfaceComponent`

## 4. ChatComponent Routing

### Problem

`ChatComponent.onA2uiEvent()` currently intercepts render events, parses `a2ui:event` actions, and manually constructs a human message. It would need to dig into classifiers to access surface state for `sendDataModel`.

### Solution

Bind to the new `(action)` output instead. `ChatComponent` becomes a thin forwarder:

```html
<a2ui-surface
  [surface]="entry.value"
  [catalog]="catalog"
  [handlers]="handlers()"
  (action)="onA2uiAction($event)"
  (events)="onA2uiEvent($event, index, entry.key)"
/>
```

```typescript
onA2uiAction(message: A2uiActionMessage): void {
  this.ref().submit({
    messages: [{ role: 'human', content: JSON.stringify(message) }],
  });
}
```

The existing `onA2uiEvent()` handler is simplified — it no longer needs the `a2ui:event` routing logic, just emits render events for observation:

```typescript
onA2uiEvent(event: RenderEvent, messageIndex: number, surfaceId: string): void {
  this.renderEvent.emit({ messageIndex, surfaceId, event });
}
```

**File:** `libs/chat/src/lib/compositions/chat/chat.component.ts`

## 5. Cockpit Example Update

The contact form example demonstrates the complete round-trip:

1. Set `sendDataModel: true` on `createSurface`
2. Add context path refs to the submit button's action
3. Parse the v0.9 envelope in the agent's event handler

```python
# createSurface with sendDataModel
json.dumps({"type": "createSurface", "surfaceId": "contact", "catalogId": "basic", "sendDataModel": True})

# Button with context path refs
{"id": "submit_btn", "component": "Button", "label": "Submit",
 "action": {"event": {
   "name": "formSubmit",
   "context": {
     "name": {"path": "/name"},
     "email": {"path": "/email"},
     "department": {"path": "/department"}
   }
 }}}
```

Agent-side parsing:

```python
payload = json.loads(last.content)
if isinstance(payload, dict) and payload.get("version") == "v0.9" and "action" in payload:
    action = payload["action"]
    name = action["name"]
    context = action["context"]
    surface_id = action["surfaceId"]
    data_model = payload.get("metadata", {}).get("a2uiClientDataModel", {}).get("surfaces", {}).get(surface_id)
```

**File:** `cockpit/chat/a2ui/python/src/graph.py`

## 6. Documentation Updates

### `overview.mdx`

Add a section on "Events & Data Model Transport" covering:
- How event actions produce v0.9 `A2uiActionMessage` payloads
- The `sendDataModel` flag and when the data model is attached
- The `(action)` output on `A2uiSurfaceComponent`
- How `ChatComponent` auto-routes actions to the agent
- Example showing the full outbound JSON shape

### `catalog.mdx`

Update the Button section to show context path refs in the action example:

```json
{"action": {"event": {"name": "submit", "context": {"email": {"path": "/email"}}}}}
```

**Files:**
- `apps/website/content/docs/chat/a2ui/overview.mdx`
- `apps/website/content/docs/chat/a2ui/catalog.mdx`

## File Summary

| File | Change |
|------|--------|
| `libs/a2ui/src/lib/types.ts` | Add `A2uiActionMessage`, `A2uiClientDataModel`, update `A2uiSurface` |
| `libs/a2ui/src/index.ts` | Export new types |
| `libs/chat/src/lib/a2ui/surface-store.ts` | Preserve `sendDataModel` in `createSurface` |
| `libs/chat/src/lib/a2ui/surface.component.ts` | Resolve context in `surfaceToSpec()`, add `(action)` output, build v0.9 envelope |
| `libs/chat/src/lib/compositions/chat/chat.component.ts` | Add `onA2uiAction()`, simplify `onA2uiEvent()` |
| `cockpit/chat/a2ui/python/src/graph.py` | Update example with `sendDataModel`, context paths, v0.9 parsing |
| `apps/website/content/docs/chat/a2ui/overview.mdx` | Add events & transport section |
| `apps/website/content/docs/chat/a2ui/catalog.mdx` | Update Button action example |
