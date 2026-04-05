// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  Component,
  computed,
  contentChild,
  input,
  TemplateRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import type { BaseMessage } from '@langchain/core/messages';
import type { StreamResourceRef, ToolCallWithResult } from '@cacheplane/stream-resource';

@Component({
  selector: 'chat-tool-calls',
  standalone: true,
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (toolCall of toolCalls(); track toolCall.id) {
      @if (templateRef()) {
        <ng-container
          [ngTemplateOutlet]="templateRef()!"
          [ngTemplateOutletContext]="{ $implicit: toolCall }"
        />
      }
    }
  `,
})
export class ChatToolCallsComponent {
  readonly ref = input.required<StreamResourceRef<any, any>>();
  readonly message = input<BaseMessage | undefined>(undefined);

  readonly templateRef = contentChild(TemplateRef);

  readonly toolCalls = computed((): ToolCallWithResult[] => {
    const msg = this.message();
    if (msg && 'tool_calls' in msg && Array.isArray((msg as any).tool_calls)) {
      return (msg as any).tool_calls as ToolCallWithResult[];
    }
    return this.ref().toolCalls();
  });
}
