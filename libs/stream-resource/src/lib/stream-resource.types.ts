// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { Signal } from '@angular/core';
import type { ResourceStatus as NgResourceStatus } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import type {
  BagTemplate,
  InferBag,
  Interrupt,
  ThreadState,
  ToolProgress,
  ToolCallWithResult,
} from '@langchain/langgraph-sdk';
import type {
  MessageMetadata,
  SubmitOptions,
} from '@langchain/langgraph-sdk/ui';
import type { BaseMessage, AIMessage as CoreAIMessage } from '@langchain/core/messages';

// Re-export SDK types so consumers don't need to import from langgraph-sdk directly
export type { BagTemplate, InferBag, Interrupt, ThreadState, SubmitOptions };

/**
 * Runtime constant mirroring Angular's ResourceStatus string-union type.
 * Angular 21 ships ResourceStatus as a pure string-union type (no runtime value),
 * so we provide a const-object shim for code that needs runtime comparisons.
 */
export const ResourceStatus = {
  Idle:       'idle',
  Loading:    'loading',
  Reloading:  'reloading',
  Resolved:   'resolved',
  Error:      'error',
  Local:      'local',
} as const satisfies Record<string, NgResourceStatus>;

export type ResourceStatus = NgResourceStatus;

// ── Transport interface ──────────────────────────────────────────────────────

export interface StreamEvent {
  type:
    | 'values'
    | 'messages'
    | `messages/${string}`
    | 'updates'
    | 'tools'
    | 'custom'
    | 'error'
    | 'metadata'
    | 'checkpoints'
    | 'tasks'
    | 'debug'
    | 'events'
    | 'interrupt'
    | 'interrupts';
  [key: string]: unknown;
}

export interface StreamResourceTransport {
  stream(
    assistantId: string,
    threadId: string | null,
    payload: unknown,
    signal: AbortSignal,
  ): AsyncIterable<StreamEvent>;

  /** Optional: join an already-started run without creating a new one. */
  joinStream?(
    threadId: string,
    runId: string,
    lastEventId: string | undefined,
    signal: AbortSignal,
  ): AsyncIterable<StreamEvent>;
}

// ── Options ──────────────────────────────────────────────────────────────────

export interface StreamResourceOptions<T, ResolvedBag extends BagTemplate> {
  apiUrl: string;
  assistantId: string;
  threadId?: Signal<string | null> | string | null;
  onThreadId?: (id: string) => void;
  initialValues?: Partial<T>;
  messagesKey?: string;
  throttle?: number | false;
  toMessage?: (msg: unknown) => BaseMessage;
  transport?: StreamResourceTransport;
  filterSubagentMessages?: boolean;
  subagentToolNames?: string[];
}

// ── SubagentStreamRef ────────────────────────────────────────────────────────

export interface SubagentStreamRef {
  toolCallId: string;
  status: Signal<'pending' | 'running' | 'complete' | 'error'>;
  values: Signal<Record<string, unknown>>;
  messages: Signal<BaseMessage[]>;
}

// ── StreamResourceRef ────────────────────────────────────────────────────────

export interface StreamResourceRef<T, ResolvedBag extends BagTemplate> {
  // ResourceRef<T> compatible members (duck-typed, not inherited)
  value:    Signal<T>;
  status:   Signal<ResourceStatus>;
  isLoading: Signal<boolean>;
  error:    Signal<unknown>;
  hasValue: Signal<boolean>;
  reload:   () => void;

  // Streaming state
  messages:        Signal<BaseMessage[]>;
  interrupt:       Signal<Interrupt<ResolvedBag['InterruptType']> | undefined>;
  interrupts:      Signal<Interrupt<ResolvedBag['InterruptType']>[]>;
  toolProgress:    Signal<ToolProgress[]>;
  toolCalls:       Signal<ToolCallWithResult[]>;

  // Thread & history
  branch:          Signal<string>;
  history:         Signal<ThreadState<T>[]>;
  isThreadLoading: Signal<boolean>;

  // Subagents
  subagents:       Signal<Map<string, SubagentStreamRef>>;
  activeSubagents: Signal<SubagentStreamRef[]>;

  // Actions
  submit:              (values: ResolvedBag['UpdateType'] | null, opts?: SubmitOptions) => Promise<void>;
  stop:                () => Promise<void>;
  switchThread:        (threadId: string | null) => void;
  joinStream:          (runId: string, lastEventId?: string) => Promise<void>;
  setBranch:           (branch: string) => void;
  getMessagesMetadata: (msg: BaseMessage, idx?: number) => MessageMetadata<Record<string, unknown>> | undefined;
  getToolCalls:        (msg: CoreAIMessage) => ToolCallWithResult[];
}

// ── Internal: StreamSubjects ─────────────────────────────────────────────────
// Not exported from public-api.ts

export interface StreamSubjects<T, ResolvedBag extends BagTemplate = BagTemplate> {
  status$:          BehaviorSubject<ResourceStatus>;
  values$:          BehaviorSubject<T>;
  messages$:        BehaviorSubject<BaseMessage[]>;
  error$:           BehaviorSubject<unknown>;
  interrupt$:       BehaviorSubject<Interrupt<ResolvedBag['InterruptType']> | undefined>;
  interrupts$:      BehaviorSubject<Interrupt<ResolvedBag['InterruptType']>[]>;
  branch$:          BehaviorSubject<string>;
  history$:         BehaviorSubject<ThreadState<T>[]>;
  isThreadLoading$: BehaviorSubject<boolean>;
  toolProgress$:    BehaviorSubject<ToolProgress[]>;
  toolCalls$:       BehaviorSubject<ToolCallWithResult[]>;
  subagents$:       BehaviorSubject<Map<string, SubagentStreamRef>>;
}
