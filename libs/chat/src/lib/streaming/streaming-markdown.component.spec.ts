// SPDX-License-Identifier: MIT
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatStreamingMdComponent } from './streaming-markdown.component';
import '../../test-setup';

function flushRaf(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => resolve());
  });
}

describe('ChatStreamingMdComponent', () => {
  let fixture: ComponentFixture<ChatStreamingMdComponent>;
  let component: ChatStreamingMdComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ChatStreamingMdComponent],
    });
    fixture = TestBed.createComponent(ChatStreamingMdComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('content', '');
  });

  it('renders markdown into innerHTML on first content', async () => {
    fixture.componentRef.setInput('content', '# Heading');
    fixture.detectChanges();
    await flushRaf();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.innerHTML).toContain('<h1');
    expect(el.innerHTML).toContain('Heading');
  });

  it('coalesces multiple updates into one render per frame', async () => {
    fixture.componentRef.setInput('content', '# A');
    fixture.detectChanges();
    fixture.componentRef.setInput('content', '# AB');
    fixture.detectChanges();
    fixture.componentRef.setInput('content', '# ABC');
    fixture.detectChanges();
    await flushRaf();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.innerHTML).toContain('ABC');
  });

  it('handles content shrinking without freezing (regression)', async () => {
    fixture.componentRef.setInput('content', '# Long heading');
    fixture.detectChanges();
    await flushRaf();
    fixture.componentRef.setInput('content', '# Short');
    fixture.detectChanges();
    await flushRaf();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.innerHTML).toContain('Short');
    expect(el.innerHTML).not.toContain('Long heading');
  });

  it('cleans up pending RAF on destroy', async () => {
    const spy = vi.spyOn(globalThis, 'cancelAnimationFrame');
    fixture.componentRef.setInput('content', '# X');
    fixture.detectChanges();
    fixture.destroy();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
