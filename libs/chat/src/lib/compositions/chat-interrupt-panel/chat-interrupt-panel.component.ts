// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  Component,
  computed,
  input,
  output,
  ChangeDetectionStrategy,
} from '@angular/core';
import type { StreamResourceRef } from '@cacheplane/stream-resource';

export type InterruptAction = 'accept' | 'edit' | 'respond' | 'ignore';

@Component({
  selector: 'chat-interrupt-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (interrupt()) {
      <div style="background: var(--chat-warning-bg); border: 1px solid var(--chat-border); border-radius: var(--chat-radius-card); padding: 16px; display: flex; flex-direction: column; gap: 12px;">
        <!-- Warning header -->
        <div style="display: flex; align-items: flex-start; gap: 8px;">
          <span style="color: var(--chat-warning-text); font-size: 18px;">⚠</span>
          <div style="flex: 1;">
            <h3 style="font-size: 14px; font-weight: 600; color: var(--chat-warning-text); margin: 0;">Agent Interrupt</h3>
            <p style="font-size: 14px; color: var(--chat-warning-text); margin: 4px 0 0;">{{ interruptPayload() }}</p>
          </div>
        </div>

        <!-- Action buttons -->
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          <button
            style="padding: 6px 12px; font-size: 14px; font-weight: 500; background: var(--chat-bg-alt); color: var(--chat-text); border: 1px solid var(--chat-border); border-radius: var(--chat-radius-card); cursor: pointer;"
            (click)="action.emit('accept')"
          >
            Accept
          </button>
          <button
            style="padding: 6px 12px; font-size: 14px; font-weight: 500; background: var(--chat-bg-alt); color: var(--chat-text); border: 1px solid var(--chat-border); border-radius: var(--chat-radius-card); cursor: pointer;"
            (click)="action.emit('edit')"
          >
            Edit
          </button>
          <button
            style="padding: 6px 12px; font-size: 14px; font-weight: 500; background: var(--chat-bg-alt); color: var(--chat-text); border: 1px solid var(--chat-border); border-radius: var(--chat-radius-card); cursor: pointer;"
            (click)="action.emit('respond')"
          >
            Respond
          </button>
          <button
            style="padding: 6px 12px; font-size: 14px; font-weight: 500; background: transparent; color: var(--chat-text-muted); border: none; cursor: pointer;"
            (click)="action.emit('ignore')"
          >
            Ignore
          </button>
        </div>
      </div>
    }
  `,
})
export class ChatInterruptPanelComponent {
  readonly ref = input.required<StreamResourceRef<any, any>>();

  readonly action = output<InterruptAction>();

  readonly interrupt = computed(() => this.ref().interrupt());

  readonly interruptPayload = computed(() => {
    const interrupt = this.interrupt();
    if (!interrupt) return '';
    const val = interrupt.value;
    if (typeof val === 'string') return val;
    return JSON.stringify(val);
  });
}
