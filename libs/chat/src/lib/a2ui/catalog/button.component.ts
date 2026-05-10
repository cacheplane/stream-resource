// SPDX-License-Identifier: MIT
import { Component, input, ChangeDetectionStrategy } from '@angular/core';
// TODO(Phase 3): Remove validationResult input when Button is ported to v1 (child Text component instead of label).
interface A2uiValidationResult { valid: boolean; errors: string[] }
import { A2uiValidationErrorsComponent } from './validation-errors.component';

@Component({
  selector: 'a2ui-button',
  standalone: true,
  imports: [A2uiValidationErrorsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      [class]="variant() === 'borderless' ? 'bg-transparent hover:bg-white/10' : 'bg-blue-600 hover:bg-blue-700 text-white'"
      [disabled]="disabled() || !validationResult().valid"
      (click)="handleClick()"
    >{{ label() }}</button>
    <a2ui-validation-errors [result]="validationResult()" />
  `,
})
export class A2uiButtonComponent {
  readonly label = input<string>('');
  readonly variant = input<string>('primary');
  readonly disabled = input<boolean>(false);
  readonly validationResult = input<A2uiValidationResult>({ valid: true, errors: [] });
  readonly emit = input<(event: string) => void>(() => { /* noop */ });

  handleClick(): void {
    this.emit()('click');
  }
}
