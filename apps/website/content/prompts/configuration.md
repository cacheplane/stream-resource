Configure stream-resource globally and per-component in my Angular application.

Global config (applies to all streamResource() calls in the app):
In app.config.ts, provideStreamResource({ apiUrl: 'https://my-langgraph-server.com', }) — import provideStreamResource from '@cacheplane/stream-resource'.

Per-call override (overrides global config for one component):
Pass apiUrl directly to streamResource({ apiUrl: 'https://other-server.com', assistantId: 'my-agent' }) — per-call options take precedence over global config.

Custom transport (for auth headers, logging, or testing):
Implement StreamResourceTransport interface — it has one method: stream(input, options). Pass it as transport: myTransport to either provideStreamResource or streamResource(). FetchStreamTransport is the default.

To pass a system prompt to the LangGraph agent per-thread, use the config option:
streamResource({ config: { configurable: { system_prompt: 'You are a helpful assistant.' } } })
