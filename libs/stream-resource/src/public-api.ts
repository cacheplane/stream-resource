// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Primary function
export { streamResource } from './lib/stream-resource.fn';

// Provider
export { provideStreamResource, STREAM_RESOURCE_CONFIG } from './lib/stream-resource.provider';
export type { StreamResourceConfig } from './lib/stream-resource.provider';

// Public types
export type {
  StreamResourceOptions,
  StreamResourceRef,
  StreamResourceTransport,
  StreamEvent,
  SubagentStreamRef,
} from './lib/stream-resource.types';

// Re-export from SDK (consumers import from stream-resource, not langgraph-sdk)
export type { BagTemplate, InferBag, Interrupt, ThreadState, SubmitOptions }
  from './lib/stream-resource.types';

// Re-export ResourceStatus shim for convenience
export { ResourceStatus } from './lib/stream-resource.types';

// Test utilities (always exported — tree-shaken in prod builds)
export { MockStreamTransport } from './lib/transport/mock-stream.transport';
export { FetchStreamTransport } from './lib/transport/fetch-stream.transport';
