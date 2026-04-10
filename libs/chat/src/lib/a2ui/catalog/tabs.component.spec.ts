// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { A2uiTabsComponent } from './tabs.component';

const mockSpec = { elements: {} } as never;

describe('A2uiTabsComponent', () => {
  it('should create with default inputs', () => {
    const fixture = TestBed.createComponent(A2uiTabsComponent);
    fixture.componentRef.setInput('spec', mockSpec);
    const component = fixture.componentInstance;
    expect(component.tabs()).toEqual([]);
    expect(component.selected()).toBe(0);
  });

  it('should update activeIndex and emit binding on tab selection', () => {
    const fixture = TestBed.createComponent(A2uiTabsComponent);
    fixture.componentRef.setInput('spec', mockSpec);
    const component = fixture.componentInstance;
    const emitFn = vi.fn();
    fixture.componentRef.setInput('emit', emitFn);
    fixture.componentRef.setInput('_bindings', { selected: '/activeTab' });

    component.selectTab(2);
    expect(emitFn).toHaveBeenCalledWith('a2ui:datamodel:/activeTab:2');
  });

  it('should compute activeChildKeys from tabs and activeIndex', () => {
    const fixture = TestBed.createComponent(A2uiTabsComponent);
    fixture.componentRef.setInput('spec', mockSpec);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('tabs', [
      { label: 'Tab 1', childKeys: ['a', 'b'] },
      { label: 'Tab 2', childKeys: ['c'] },
    ]);

    expect(component.activeChildKeys()).toEqual(['a', 'b']);
    component.selectTab(1);
    expect(component.activeChildKeys()).toEqual(['c']);
  });
});
