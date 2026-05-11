// SPDX-License-Identifier: MIT
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CHAT_HOST_TOKENS } from '../../../styles/chat-tokens';

export interface SegmentedOption {
  readonly value: string;
  readonly label: string;
}

@Component({
  selector: 'chat-debug-segmented',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    CHAT_HOST_TOKENS,
    `
    :host { display: block; }
    .segmented {
      display: inline-flex;
      gap: 0;
      padding: 2px;
      background: var(--ngaf-chat-surface-alt);
      border: 1px solid var(--ngaf-chat-separator);
      border-radius: var(--ngaf-chat-radius-button);
    }
    .segmented__btn {
      appearance: none;
      border: 0;
      background: transparent;
      padding: 4px 10px;
      font-size: var(--ngaf-chat-font-size-sm);
      color: var(--ngaf-chat-text-muted);
      cursor: pointer;
      border-radius: calc(var(--ngaf-chat-radius-button) - 2px);
    }
    .segmented__btn.is-active {
      background: var(--ngaf-chat-bg);
      color: var(--ngaf-chat-text);
      box-shadow: var(--ngaf-chat-shadow-sm);
    }
    `,
  ],
  template: `
    <div class="segmented" role="tablist">
      @for (opt of options(); track opt.value) {
        <button
          type="button"
          role="tab"
          class="segmented__btn"
          [class.is-active]="opt.value === value()"
          [attr.aria-selected]="opt.value === value()"
          (click)="valueChange.emit(opt.value)"
        >{{ opt.label }}</button>
      }
    </div>
  `,
})
export class ChatDebugSegmentedComponent {
  readonly options = input.required<readonly SegmentedOption[]>();
  readonly value = input.required<string>();
  readonly valueChange = output<string>();
}
