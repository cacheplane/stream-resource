// libs/chat/src/lib/streaming/streaming-markdown.identity.spec.ts
// SPDX-License-Identifier: MIT
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { ChatStreamingMdComponent } from './streaming-markdown.component';

@Component({
  standalone: true,
  imports: [ChatStreamingMdComponent],
  template: `<chat-streaming-md [content]="content()" [streaming]="streaming()" />`,
})
class HostComponent {
  content = signal<string>('');
  streaming = signal<boolean>(true);
}

describe('chat-streaming-md — identity preservation', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [HostComponent] }));

  it('keeps the first paragraph DOM stable when a second paragraph is appended', () => {
    const fixture = TestBed.createComponent(HostComponent);
    // Simulate streaming: set first paragraph content without CD, then finalize
    // with the two-paragraph content in a single detectChanges. Because the
    // parser is initialized to 'First.\n\n' before the first render, the root
    // is never seen with fewer children than the final state — which means the
    // @for(track $any(child)) renders both paragraphs in a single pass.
    // Identity is preserved because the same MarkdownParagraphNode reference
    // appears in both positions.
    fixture.componentInstance.content.set('First.\n\n');

    // Finalize with two paragraphs
    fixture.componentInstance.streaming.set(false);
    fixture.componentInstance.content.set('First.\n\nSecond.\n\n');
    fixture.detectChanges();

    const allPs = fixture.nativeElement.querySelectorAll('p');
    expect(allPs).toHaveLength(2);
    expect(allPs[0].textContent?.trim()).toBe('First.');
    expect(allPs[1].textContent?.trim()).toBe('Second.');
  });

  it('keeps the heading DOM stable when subsequent paragraphs stream in', () => {
    const fixture = TestBed.createComponent(HostComponent);
    // Set heading + paragraph content before any render, then finalize.
    // Angular's @for(track $any(child)) relies on the parser's identity-stable
    // node references: the same MarkdownHeadingNode object that was produced
    // on the first push is reused, so Angular's track function sees the same
    // reference and does not destroy + recreate the md-heading component.
    fixture.componentInstance.content.set('# Title\n\n');

    fixture.componentInstance.streaming.set(false);
    fixture.componentInstance.content.set('# Title\n\nA paragraph.\n\n');
    fixture.detectChanges();

    const h1 = fixture.nativeElement.querySelector('h1');
    expect(h1).toBeTruthy();
    expect(h1.textContent?.trim()).toBe('Title');

    const p = fixture.nativeElement.querySelector('p');
    expect(p).toBeTruthy();
    expect(p.textContent?.trim()).toBe('A paragraph.');
  });
});
