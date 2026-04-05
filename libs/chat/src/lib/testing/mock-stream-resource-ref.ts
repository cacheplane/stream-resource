// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { signal } from '@angular/core';
import type { StreamResourceRef, SubagentStreamRef, ResourceStatus as ResourceStatusType, Interrupt, ThreadState, SubmitOptions } from '@cacheplane/stream-resource';
import type { ToolProgress, ToolCallWithResult } from '@langchain/langgraph-sdk';
import { ResourceStatus } from '@cacheplane/stream-resource';
import type { BaseMessage, AIMessage as CoreAIMessage } from '@langchain/core/messages';
import type { MessageMetadata } from '@langchain/langgraph-sdk/ui';

/**
 * Creates a mock StreamResourceRef with writable signals for testing.
 * Control state by writing to the returned writable signals directly.
 */
export function createMockStreamResourceRef(
  initial: {
    messages?: BaseMessage[];
    status?: ResourceStatusType;
    isLoading?: boolean;
    error?: unknown;
    hasValue?: boolean;
    isThreadLoading?: boolean;
  } = {}
): StreamResourceRef<any, any> {
  const messages$ = signal<BaseMessage[]>(initial.messages ?? []);
  const status$ = signal<ResourceStatusType>(initial.status ?? ResourceStatus.Idle);
  const isLoading$ = signal<boolean>(initial.isLoading ?? false);
  const error$ = signal<unknown>(initial.error ?? null);
  const hasValue$ = signal<boolean>(initial.hasValue ?? false);
  const value$ = signal<any>(null);
  const interrupt$ = signal<Interrupt<any> | undefined>(undefined);
  const interrupts$ = signal<Interrupt<any>[]>([]);
  const toolProgress$ = signal<ToolProgress[]>([]);
  const toolCalls$ = signal<ToolCallWithResult[]>([]);
  const branch$ = signal<string>('');
  const history$ = signal<ThreadState<any>[]>([]);
  const isThreadLoading$ = signal<boolean>(initial.isThreadLoading ?? false);
  const subagents$ = signal<Map<string, SubagentStreamRef>>(new Map());
  const activeSubagents$ = signal<SubagentStreamRef[]>([]);

  const ref: StreamResourceRef<any, any> = {
    value: value$,
    status: status$,
    isLoading: isLoading$,
    error: error$,
    hasValue: hasValue$,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    reload: () => {},

    messages: messages$,
    interrupt: interrupt$,
    interrupts: interrupts$,
    toolProgress: toolProgress$,
    toolCalls: toolCalls$,

    branch: branch$,
    history: history$,
    isThreadLoading: isThreadLoading$,

    subagents: subagents$,
    activeSubagents: activeSubagents$,

    submit: (_values: any, _opts?: SubmitOptions) => Promise.resolve(),
    stop: () => Promise.resolve(),
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    switchThread: (_threadId: string | null) => {},
    joinStream: (_runId: string, _lastEventId?: string) => Promise.resolve(),
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    setBranch: (_branch: string) => {},
    getMessagesMetadata: (_msg: BaseMessage, _idx?: number): MessageMetadata<Record<string, unknown>> | undefined => undefined,
    getToolCalls: (_msg: CoreAIMessage): ToolCallWithResult[] => [],
  };

  return ref;
}
