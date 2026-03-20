// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { StreamResourceTransport, StreamEvent } from '../stream-resource.types';

export class MockStreamTransport implements StreamResourceTransport {
  private script: StreamEvent[][];
  private scriptIndex = 0;
  private streaming = false;
  private eventQueue: StreamEvent[] = [];
  // Each resolver simply wakes the stream loop to re-check state.
  private resolvers: Array<() => void> = [];
  private closed = false;
  private pendingError: Error | null = null;

  constructor(script: StreamEvent[][] = []) {
    this.script = script;
  }

  nextBatch(): StreamEvent[] {
    if (this.scriptIndex >= this.script.length) return [];
    return this.script[this.scriptIndex++];
  }

  emit(events: StreamEvent[]): void {
    this.eventQueue.push(...events);
    this.flush();
  }

  emitError(err: Error): void {
    this.pendingError = err;
    this.flush();
  }

  close(): void {
    this.closed = true;
    this.flush();
  }

  isStreaming(): boolean {
    return this.streaming;
  }

  async *stream(
    _assistantId: string,
    _threadId: string | null,
    _payload: unknown,
    signal: AbortSignal,
  ): AsyncIterable<StreamEvent> {
    this.streaming = true;
    try {
      while (!this.closed && !signal.aborted) {
        if (this.pendingError) throw this.pendingError;
        if (this.eventQueue.length > 0) {
          yield this.eventQueue.shift()!;
        } else {
          // Wait until flush() wakes us, then loop again to check state.
          await new Promise<void>((resolve) => {
            if (signal.aborted) { resolve(); return; }
            this.resolvers.push(resolve);
          });
        }
      }
      if (signal.aborted) return;
      // Drain remaining events after close()
      while (this.eventQueue.length > 0) yield this.eventQueue.shift()!;
    } finally {
      this.streaming = false;
    }
  }

  private flush(): void {
    const resolve = this.resolvers.shift();
    if (resolve) resolve();
  }
}
