// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { A2uiImageComponent } from './image.component';

describe('A2uiImageComponent', () => {
  it('should create with default empty inputs', () => {
    const fixture = TestBed.createComponent(A2uiImageComponent);
    expect(fixture.componentInstance.url()).toBe('');
    expect(fixture.componentInstance.alt()).toBe('');
  });

  it('should accept url and alt inputs', () => {
    const fixture = TestBed.createComponent(A2uiImageComponent);
    fixture.componentRef.setInput('url', 'https://example.com/img.png');
    fixture.componentRef.setInput('alt', 'Example image');
    expect(fixture.componentInstance.url()).toBe('https://example.com/img.png');
    expect(fixture.componentInstance.alt()).toBe('Example image');
  });
});
