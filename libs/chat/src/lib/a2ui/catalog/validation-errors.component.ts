// SPDX-License-Identifier: MIT
import { Component, input, ChangeDetectionStrategy } from '@angular/core';
// TODO(Phase 3): Remove when catalog components are ported to v1 — validation-errors is also being retired.
interface A2uiValidationResult { valid: boolean; errors: string[] }

@Component({
  selector: 'a2ui-validation-errors',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!result().valid) {
      @for (error of result().errors; track error) {
        <p class="text-xs mt-1" style="color: var(--a2ui-error, #ef4444);">{{ error }}</p>
      }
    }
  `,
})
export class A2uiValidationErrorsComponent {
  readonly result = input<A2uiValidationResult>({ valid: true, errors: [] });
}
