// SPDX-License-Identifier: MIT
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Component, contentChildren, TemplateRef } from '@angular/core';
import { ChatToolCallTemplateDirective } from './chat-tool-call-template.directive';

@Component({
  standalone: true,
  imports: [ChatToolCallTemplateDirective],
  template: `
    <ng-template chatToolCallTemplate="search_web" let-call>
      <span data-template="search_web">{{ call.name }}</span>
    </ng-template>
    <ng-template chatToolCallTemplate="generate_image" let-call let-status="status">
      <span data-template="generate_image">{{ call.name }} / {{ status }}</span>
    </ng-template>
    <ng-template chatToolCallTemplate="*" let-call>
      <span data-template="wildcard">{{ call.name }}</span>
    </ng-template>
  `,
})
class HostComponent {
  readonly templates = contentChildren(ChatToolCallTemplateDirective);
}

describe('ChatToolCallTemplateDirective', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  it('exposes the tool name via the input alias', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const directives = fixture.debugElement
      .queryAll((e) => e.injector.get(ChatToolCallTemplateDirective, null) !== null)
      .map((e) => e.injector.get(ChatToolCallTemplateDirective));
    expect(directives.map((d) => d.name())).toEqual(['search_web', 'generate_image', '*']);
  });

  it('captures the TemplateRef', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const directive = fixture.debugElement
      .query((e) => e.injector.get(ChatToolCallTemplateDirective, null) !== null)
      .injector.get(ChatToolCallTemplateDirective);
    expect(directive.templateRef).toBeInstanceOf(TemplateRef);
  });
});
