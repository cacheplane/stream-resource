// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { A2uiIconComponent } from './icon.component';

describe('A2uiIconComponent', () => {
  it('should create with default empty name', () => {
    const fixture = TestBed.createComponent(A2uiIconComponent);
    expect(fixture.componentInstance.name()).toBe('');
  });

  it('should accept name input', () => {
    const fixture = TestBed.createComponent(A2uiIconComponent);
    fixture.componentRef.setInput('name', 'star');
    expect(fixture.componentInstance.name()).toBe('star');
  });
});
