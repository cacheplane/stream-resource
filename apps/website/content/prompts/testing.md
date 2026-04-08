Write unit tests for my Angular component that uses @cacheplane/langchain, without hitting a real LangGraph server.

Use MockStreamTransport from '@cacheplane/langchain'. It implements StreamResourceTransport and lets you script exactly what events the stream emits.

Test setup:
const transport = new MockStreamTransport();
const chat = streamResource({ transport, assistantId: 'test', apiUrl: '' });

To emit a streaming response:
transport.emit([
  { type: 'values', values: { messages: [] } },
  { type: 'messages', messages: [[{ type: 'ai', content: 'Hello' }, { id: '1' }]] },
]);

Assertions after emit:
expect(chat.messages()).toHaveLength(1);
expect(chat.messages()[0].content).toBe('Hello');

To test error state:
transport.emitError(new Error('Network failure'));
expect(chat.status()).toBe('error');
expect(chat.error()).toBeInstanceOf(Error);

Never mock streamResource() itself — always use MockStreamTransport and test through the real function.
