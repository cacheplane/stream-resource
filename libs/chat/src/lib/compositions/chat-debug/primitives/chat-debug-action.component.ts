// SPDX-License-Identifier: MIT
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CHAT_HOST_TOKENS } from '../../../styles/chat-tokens';

@Component({
  selector: 'chat-debug-action',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    CHAT_HOST_TOKENS,
    `
    :host { display: block; }
    button {
      appearance: none;
      background: var(--ngaf-chat-surface-alt);
      color: var(--ngaf-chat-text);
      border: 1px solid var(--ngaf-chat-separator);
      border-radius: var(--ngaf-chat-radius-button);
      padding: 6px 12px;
      font: inherit;
      font-size: var(--ngaf-chat-font-size-sm);
      cursor: pointer;
      width: 100%;
      text-align: left;
    }
    button:hover { background: color-mix(in srgb, var(--ngaf-chat-text) 5%, var(--ngaf-chat-surface-alt)); }
    `,
  ],
  template: `
    <button type="button" (click)="clicked.emit()">{{ label() }}</button>
  `,
})
export class ChatDebugActionComponent {
  readonly label = input.required<string>();
  readonly clicked = output<void>();
}
