// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { A2uiModalComponent } from './modal.component';

const mockSpec = { elements: {} } as never;

describe('A2uiModalComponent', () => {
  it('should create with default inputs', () => {
    const fixture = TestBed.createComponent(A2uiModalComponent);
    fixture.componentRef.setInput('spec', mockSpec);
    const component = fixture.componentInstance;
    expect(component.title()).toBe('');
    expect(component.open()).toBe(false);
    expect(component.dismissible()).toBe(true);
    expect(component.childKeys()).toEqual([]);
  });

  it('should emit binding on backdrop click when dismissible', () => {
    const fixture = TestBed.createComponent(A2uiModalComponent);
    fixture.componentRef.setInput('spec', mockSpec);
    const emitFn = vi.fn();
    fixture.componentRef.setInput('emit', emitFn);
    fixture.componentRef.setInput('_bindings', { open: '/showModal' });

    fixture.componentInstance.onBackdropClick();
    expect(emitFn).toHaveBeenCalledWith('a2ui:datamodel:/showModal:false');
  });

  it('should not emit on backdrop click when not dismissible', () => {
    const fixture = TestBed.createComponent(A2uiModalComponent);
    fixture.componentRef.setInput('spec', mockSpec);
    const emitFn = vi.fn();
    fixture.componentRef.setInput('emit', emitFn);
    fixture.componentRef.setInput('dismissible', false);
    fixture.componentRef.setInput('_bindings', { open: '/showModal' });

    fixture.componentInstance.onBackdropClick();
    expect(emitFn).not.toHaveBeenCalled();
  });
});
