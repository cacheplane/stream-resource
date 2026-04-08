// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { Observable, takeUntil } from 'rxjs';
import {
  ResourceStatus,
  StreamResourceOptions,
  StreamSubjects,
  StreamEvent,
  StreamResourceTransport,
} from '../stream-resource.types';
import { FetchStreamTransport } from '../transport/fetch-stream.transport';
import { BagTemplate } from '@langchain/langgraph-sdk';
import type { BaseMessage } from '@langchain/core/messages';
import type { Interrupt } from '@langchain/langgraph-sdk';

export interface StreamManagerBridgeOptions<T, ResolvedBag extends BagTemplate = BagTemplate> {
  options:   StreamResourceOptions<T, ResolvedBag>;
  subjects:  StreamSubjects<T, ResolvedBag>;
  threadId$: Observable<string | null>;
  destroy$:  Observable<void>;
}

export interface StreamManagerBridge {
  submit:       (values: unknown, opts?: unknown) => Promise<void>;
  stop:         () => Promise<void>;
  switchThread: (id: string | null) => void;
  joinStream:   (runId: string, lastEventId?: string) => Promise<void>;
  resubmitLast: () => Promise<void>;
}

export function createStreamManagerBridge<T, ResolvedBag extends BagTemplate = BagTemplate>(
  { options, subjects, threadId$, destroy$ }: StreamManagerBridgeOptions<T, ResolvedBag>
): StreamManagerBridge {
  const transport: StreamResourceTransport =
    options.transport ?? new FetchStreamTransport(options.apiUrl, options.onThreadId);

  let currentThreadId: string | null = null;
  let lastPayload: unknown = null;
  let abortController: AbortController | null = null;
  let hasSeenThreadId = false;

  function resetThreadState(): void {
    subjects.values$.next({} as T);
    subjects.messages$.next([]);
    subjects.history$.next([]);
    subjects.interrupt$.next(undefined);
    subjects.interrupts$.next([]);
    subjects.isThreadLoading$.next(false);
  }

  function setThreadId(id: string | null, resetState: boolean): void {
    if (resetState) {
      abortController?.abort();
    }
    currentThreadId = id;
    if (resetState) {
      resetThreadState();
    }
  }

  // Track threadId changes
  threadId$.pipe(takeUntil(destroy$)).subscribe(id => {
    const shouldReset = hasSeenThreadId && currentThreadId !== id;
    hasSeenThreadId = true;
    setThreadId(id, shouldReset);
  });

  async function runStream(payload: unknown): Promise<void> {
    abortController?.abort();
    abortController = new AbortController();

    subjects.status$.next(ResourceStatus.Loading);
    subjects.error$.next(undefined);
    lastPayload = payload;

    try {
      const iter = transport.stream(
        options.assistantId,
        currentThreadId,
        payload,
        abortController.signal,
      );

      for await (const event of iter) {
        if (abortController.signal.aborted) break;
        processEvent(event);
      }

      if (!abortController.signal.aborted) {
        subjects.status$.next(ResourceStatus.Resolved);
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        subjects.status$.next(ResourceStatus.Resolved);
      } else {
        subjects.error$.next(err);
        subjects.status$.next(ResourceStatus.Error);
      }
    }
  }

  function processEvent(event: StreamEvent): void {
    if (isMessagesEvent(event.type)) {
      const msgs = normalizeMessages(event);
      if (!msgs) return;
      if (options.toMessage) {
        subjects.messages$.next(msgs.map(options.toMessage));
      } else {
        subjects.messages$.next(msgs as BaseMessage[]);
      }
      return;
    }

    switch (event.type) {
      case 'values':
        subjects.values$.next(event['values'] as T);
        break;
      case 'updates':
        subjects.values$.next({
          ...subjects.values$.value,
          ...(event['updates'] as object),
        } as T);
        break;
      case 'error':
        subjects.error$.next(event['error']);
        subjects.status$.next(ResourceStatus.Error);
        break;
      case 'interrupt':
        subjects.interrupt$.next(event['interrupt'] as Interrupt);
        break;
      case 'interrupts':
        subjects.interrupts$.next(event['interrupts'] as Interrupt[]);
        break;
      // TODO: 'tool_progress' → subjects.toolProgress$.next(...)
      // TODO: 'tool_calls'    → subjects.toolCalls$.next(...)
      // These require matching the LangGraph SDK's ToolProgressEvent/ToolCallEvent
      // shapes. Implement once the SDK event types are confirmed.
    }
  }

  return {
    submit: (payload, _opts) => runStream(payload),

    stop: async () => {
      abortController?.abort();
      subjects.status$.next(ResourceStatus.Resolved);
    },

    switchThread: (id) => {
      setThreadId(id, true);
    },

    joinStream: async (runId, lastEventId) => {
      if (!currentThreadId) return;
      abortController?.abort();
      abortController = new AbortController();
      subjects.status$.next(ResourceStatus.Loading);
      try {
        const iter = transport.joinStream
          ? transport.joinStream(currentThreadId, runId, lastEventId, abortController.signal)
          // eslint-disable-next-line @typescript-eslint/no-empty-function, require-yield
          : (async function*() {})();
        for await (const event of iter) {
          processEvent(event);
        }
        subjects.status$.next(ResourceStatus.Resolved);
      } catch (err) {
        subjects.error$.next(err);
        subjects.status$.next(ResourceStatus.Error);
      }
    },

    resubmitLast: async () => {
      if (lastPayload !== null) {
        await runStream(lastPayload);
      }
    },
  };
}

function isMessagesEvent(type: StreamEvent['type']): boolean {
  return type === 'messages' || type.startsWith('messages/');
}

function normalizeMessages(event: StreamEvent): unknown[] | null {
  const directMessages = event['messages'];
  if (Array.isArray(directMessages)) {
    return directMessages;
  }

  const data = event['data'];
  if (Array.isArray(data)) {
    if (data.every(isMessageLike)) {
      return data;
    }
    if (isMessageLike(data[0])) {
      return [data[0]];
    }
  }

  const indexedValues = Object.keys(event)
    .filter(key => /^\d+$/.test(key))
    .sort((left, right) => Number(left) - Number(right))
    .map(key => event[key]);

  if (indexedValues.every(isMessageLike)) {
    return indexedValues;
  }
  if (isMessageLike(indexedValues[0])) {
    return [indexedValues[0]];
  }

  return null;
}

function isMessageLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object'
    && value !== null
    && (
      'content' in value
      || 'type' in value
      || 'id' in value
    );
}
