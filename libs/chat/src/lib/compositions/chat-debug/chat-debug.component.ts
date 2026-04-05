// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  Component,
  computed,
  input,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import type { StreamResourceRef, ThreadState } from '@cacheplane/stream-resource';
import type { BaseMessage } from '@langchain/core/messages';
import { ChatMessagesComponent } from '../../primitives/chat-messages/chat-messages.component';
import { MessageTemplateDirective } from '../../primitives/chat-messages/message-template.directive';
import { ChatInputComponent } from '../../primitives/chat-input/chat-input.component';
import { ChatTypingIndicatorComponent } from '../../primitives/chat-typing-indicator/chat-typing-indicator.component';
import { ChatErrorComponent } from '../../primitives/chat-error/chat-error.component';
import { DebugTimelineComponent } from './debug-timeline.component';
import { DebugDetailComponent } from './debug-detail.component';
import { DebugControlsComponent } from './debug-controls.component';
import { DebugSummaryComponent } from './debug-summary.component';
import type { DebugCheckpoint } from './debug-checkpoint-card.component';
import { toDebugCheckpoint, extractStateValues } from './debug-utils';

@Component({
  selector: 'chat-debug',
  standalone: true,
  imports: [
    ChatMessagesComponent,
    MessageTemplateDirective,
    ChatInputComponent,
    ChatTypingIndicatorComponent,
    ChatErrorComponent,
    DebugTimelineComponent,
    DebugDetailComponent,
    DebugControlsComponent,
    DebugSummaryComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-full">
      <!-- Chat area -->
      <div class="flex-1 flex flex-col min-w-0">
        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          <chat-messages [ref]="ref()">
            <ng-template messageTemplate="human" let-message>
              <div class="flex justify-end">
                <div class="max-w-[75%] rounded-2xl px-4 py-2 bg-blue-600 text-white">
                  {{ messageContent(message) }}
                </div>
              </div>
            </ng-template>

            <ng-template messageTemplate="ai" let-message>
              <div class="flex justify-start">
                <div class="max-w-[75%] rounded-2xl px-4 py-2 bg-gray-100 text-gray-900">
                  {{ messageContent(message) }}
                </div>
              </div>
            </ng-template>

            <ng-template messageTemplate="tool" let-message>
              <div class="flex justify-start">
                <div class="max-w-[75%] rounded-lg px-3 py-2 bg-gray-50 text-gray-600 text-sm font-mono border border-gray-200">
                  {{ messageContent(message) }}
                </div>
              </div>
            </ng-template>

            <ng-template messageTemplate="system" let-message>
              <div class="flex justify-center">
                <div class="text-xs text-gray-400 italic">
                  {{ messageContent(message) }}
                </div>
              </div>
            </ng-template>
          </chat-messages>

          <chat-typing-indicator [ref]="ref()">
            <div class="flex justify-start">
              <div class="rounded-2xl px-4 py-2 bg-gray-100 text-gray-500 text-sm">
                <span class="animate-pulse">Thinking...</span>
              </div>
            </div>
          </chat-typing-indicator>
        </div>

        <chat-error [ref]="ref()">
          <div class="px-4 py-3 bg-red-50 border-t border-red-200 text-sm text-red-700">
            An error occurred. Please try again.
          </div>
        </chat-error>

        <div class="border-t border-gray-200 p-4">
          <chat-input
            [ref]="ref()"
            [submitOnEnter]="true"
            placeholder="Type a message..."
          />
        </div>
      </div>

      <!-- Debug panel toggle (when closed) -->
      @if (!debugOpen()) {
        <button
          class="w-8 flex items-center justify-center border-l border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-gray-500"
          title="Open debug panel"
          (click)="debugOpen.set(true)"
        >
          &laquo;
        </button>
      }

      <!-- Debug panel -->
      @if (debugOpen()) {
        <div class="w-80 border-l border-gray-200 bg-white flex flex-col overflow-hidden shrink-0">
          <!-- Header -->
          <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200">
            <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Debug</h3>
            <button
              class="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              (click)="debugOpen.set(false)"
            >&raquo; Close</button>
          </div>

          <!-- Summary -->
          <div class="px-3 py-2 border-b border-gray-100">
            <debug-summary [ref]="ref()" [checkpoints]="checkpoints()" />
          </div>

          <!-- Controls -->
          <div class="px-3 py-2 border-b border-gray-100">
            <debug-controls
              [ref]="ref()"
              [checkpointCount]="checkpoints().length"
              [selectedIndex]="selectedCheckpointIndex()"
              (stepForward)="stepForward()"
              (stepBack)="stepBack()"
              (jumpToStart)="jumpToStart()"
              (jumpToEnd)="jumpToEnd()"
            />
          </div>

          <!-- Timeline -->
          <div class="flex-1 overflow-y-auto px-3 py-2">
            <debug-timeline
              [checkpoints]="checkpoints()"
              [selectedIndex]="selectedCheckpointIndex()"
              (checkpointSelected)="selectedCheckpointIndex.set($event)"
            />
          </div>

          <!-- Detail -->
          @if (selectedCheckpointIndex() >= 0) {
            <div class="border-t border-gray-200 px-3 py-2 max-h-64 overflow-y-auto">
              <debug-detail
                [currentState]="selectedState()"
                [previousState]="previousState()"
              />
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ChatDebugComponent {
  readonly ref = input.required<StreamResourceRef<any, any>>();

  readonly debugOpen = signal<boolean>(true);
  readonly selectedCheckpointIndex = signal<number>(-1);

  readonly checkpoints = computed((): DebugCheckpoint[] =>
    this.ref().history().map((state, i) => toDebugCheckpoint(state, i)),
  );

  readonly selectedState = computed((): Record<string, unknown> => {
    const idx = this.selectedCheckpointIndex();
    const history = this.ref().history();
    return extractStateValues(history[idx]);
  });

  readonly previousState = computed((): Record<string, unknown> => {
    const idx = this.selectedCheckpointIndex();
    const history = this.ref().history();
    if (idx <= 0) return {};
    return extractStateValues(history[idx - 1]);
  });

  messageContent(message: BaseMessage): string {
    const content = message.content;
    if (typeof content === 'string') return content;
    return JSON.stringify(content);
  }

  stepForward(): void {
    const idx = this.selectedCheckpointIndex();
    if (idx < this.checkpoints().length - 1) {
      this.selectedCheckpointIndex.set(idx + 1);
    }
  }

  stepBack(): void {
    const idx = this.selectedCheckpointIndex();
    if (idx > 0) {
      this.selectedCheckpointIndex.set(idx - 1);
    }
  }

  jumpToStart(): void {
    this.selectedCheckpointIndex.set(0);
  }

  jumpToEnd(): void {
    this.selectedCheckpointIndex.set(this.checkpoints().length - 1);
  }
}
