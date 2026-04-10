// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { A2uiTextComponent } from './text.component';

describe('A2uiTextComponent', () => {
  it('should create with default empty text', () => {
    const fixture = TestBed.createComponent(A2uiTextComponent);
    expect(fixture.componentInstance.text()).toBe('');
  });

  it('should accept text input', () => {
    const fixture = TestBed.createComponent(A2uiTextComponent);
    fixture.componentRef.setInput('text', 'Hello World');
    expect(fixture.componentInstance.text()).toBe('Hello World');
  });
});
