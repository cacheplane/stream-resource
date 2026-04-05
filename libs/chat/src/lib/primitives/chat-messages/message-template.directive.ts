// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { Directive, input, TemplateRef, inject } from '@angular/core';
import type { MessageTemplateType } from '../../chat.types';

@Directive({
  selector: 'ng-template[messageTemplate]',
  standalone: true,
})
export class MessageTemplateDirective {
  readonly messageTemplate = input.required<MessageTemplateType>();
  readonly templateRef = inject(TemplateRef);
}
