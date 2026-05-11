// SPDX-License-Identifier: MIT
import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import type { AgentWithHistory } from '../../../agent';
import { CHAT_HOST_TOKENS } from '../../../styles/chat-tokens';
import { DebugStateInspectorComponent } from '../debug-state-inspector.component';
import { extractStateValues } from '../debug-utils';

@Component({
  selector: 'chat-debug-state-tab',
  standalone: true,
  imports: [DebugStateInspectorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    CHAT_HOST_TOKENS,
    `
    :host { display: flex; flex-direction: column; height: 100%; }
    .state__header {
      display: flex;
      justify-content: flex-end;
      padding: var(--ngaf-chat-space-2) var(--ngaf-chat-space-4);
      border-bottom: 1px solid var(--ngaf-chat-separator);
    }
    .state__copy {
      background: transparent;
      border: 1px solid var(--ngaf-chat-separator);
      border-radius: var(--ngaf-chat-radius-button);
      padding: 2px 8px;
      font: inherit;
      font-size: var(--ngaf-chat-font-size-xs);
      color: var(--ngaf-chat-text-muted);
      cursor: pointer;
    }
    .state__body {
      flex: 1;
      overflow-y: auto;
      padding: var(--ngaf-chat-space-2) var(--ngaf-chat-space-4);
    }
    `,
  ],
  template: `
    <div class="state__header">
      <button type="button" class="state__copy" (click)="copy()">Copy</button>
    </div>
    <div class="state__body">
      <chat-debug-state-inspector [state]="state()" />
    </div>
  `,
})
export class StateInspectorComponent {
  readonly agent = input.required<AgentWithHistory>();

  readonly state = computed((): Record<string, unknown> => {
    const history = this.agent().history();
    const last = history[history.length - 1];
    return extractStateValues(last);
  });

  copy(): void {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    void navigator.clipboard.writeText(JSON.stringify(this.state(), null, 2));
  }
}
