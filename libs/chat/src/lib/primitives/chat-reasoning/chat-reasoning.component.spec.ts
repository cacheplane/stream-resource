// SPDX-License-Identifier: MIT
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { ChatReasoningComponent } from './chat-reasoning.component';

@Component({
  standalone: true,
  imports: [ChatReasoningComponent],
  template: `
    <chat-reasoning
      [content]="content()"
      [isStreaming]="streaming()"
      [durationMs]="durationMs()"
      [defaultExpanded]="defaultExpanded()"
    />
  `,
})
class HostComponent {
  content = signal<string>('I considered the problem.');
  streaming = signal<boolean>(false);
  durationMs = signal<number | undefined>(undefined);
  defaultExpanded = signal<boolean>(false);
}

function makeFixture() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return fixture;
}

function getEl(fixture: ReturnType<typeof makeFixture>): HTMLElement {
  return fixture.nativeElement.querySelector('chat-reasoning');
}

function getHeader(fixture: ReturnType<typeof makeFixture>): HTMLButtonElement {
  return fixture.nativeElement.querySelector('chat-reasoning button.chat-reasoning__header');
}

function getLabelText(fixture: ReturnType<typeof makeFixture>): string {
  return fixture.nativeElement.querySelector('chat-reasoning .chat-reasoning__label')?.textContent?.trim() ?? '';
}

describe('ChatReasoningComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  it('hides itself when content is empty', () => {
    const fixture = makeFixture();
    fixture.componentInstance.content.set('');
    fixture.detectChanges();
    expect(getEl(fixture).getAttribute('data-has-content')).toBe('false');
  });

  it('shows itself when content is non-empty', () => {
    const fixture = makeFixture();
    expect(getEl(fixture).getAttribute('data-has-content')).toBe('true');
  });

  it('renders "Thinking…" while streaming', () => {
    const fixture = makeFixture();
    fixture.componentInstance.streaming.set(true);
    fixture.detectChanges();
    expect(getLabelText(fixture)).toContain('Thinking');
  });

  it('renders "Thought for Ns" when idle with durationMs', () => {
    const fixture = makeFixture();
    fixture.componentInstance.streaming.set(false);
    fixture.componentInstance.durationMs.set(4000);
    fixture.detectChanges();
    expect(getLabelText(fixture)).toContain('Thought for 4s');
  });

  it('renders "Show reasoning" when idle without durationMs', () => {
    const fixture = makeFixture();
    fixture.componentInstance.streaming.set(false);
    fixture.componentInstance.durationMs.set(undefined);
    fixture.detectChanges();
    expect(getLabelText(fixture)).toContain('Show reasoning');
  });

  it('starts collapsed by default', () => {
    const fixture = makeFixture();
    expect(getEl(fixture).getAttribute('data-expanded')).toBe('false');
  });

  it('starts expanded when defaultExpanded=true', () => {
    const fixture = makeFixture();
    fixture.componentInstance.defaultExpanded.set(true);
    fixture.detectChanges();
    expect(getEl(fixture).getAttribute('data-expanded')).toBe('true');
  });

  it('force-expands while streaming', () => {
    const fixture = makeFixture();
    fixture.componentInstance.streaming.set(true);
    fixture.detectChanges();
    expect(getEl(fixture).getAttribute('data-expanded')).toBe('true');
  });

  it('toggles open and closed on header click', () => {
    const fixture = makeFixture();
    const header = getHeader(fixture);
    header.click();
    fixture.detectChanges();
    expect(getEl(fixture).getAttribute('data-expanded')).toBe('true');
    header.click();
    fixture.detectChanges();
    expect(getEl(fixture).getAttribute('data-expanded')).toBe('false');
  });

  it('preserves user choice across isStreaming transitions', () => {
    const fixture = makeFixture();
    // User opens manually
    getHeader(fixture).click();
    fixture.detectChanges();
    expect(getEl(fixture).getAttribute('data-expanded')).toBe('true');

    // Streaming completes (isStreaming false → still true after transition because user opened)
    fixture.componentInstance.streaming.set(true);
    fixture.detectChanges();
    fixture.componentInstance.streaming.set(false);
    fixture.detectChanges();

    expect(getEl(fixture).getAttribute('data-expanded')).toBe('true');
  });

  it('renders the content body inside chat-streaming-md when expanded', () => {
    const fixture = makeFixture();
    fixture.componentInstance.defaultExpanded.set(true);
    fixture.detectChanges();
    const md = fixture.nativeElement.querySelector('chat-reasoning chat-streaming-md');
    expect(md).not.toBeNull();
  });
});
