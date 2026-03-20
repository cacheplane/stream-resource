import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideStreamResource, STREAM_RESOURCE_CONFIG } from './stream-resource.provider';
import { MockStreamTransport } from './transport/mock-stream.transport';

describe('provideStreamResource', () => {
  it('provides STREAM_RESOURCE_CONFIG token', () => {
    TestBed.configureTestingModule({
      providers: [provideStreamResource({ apiUrl: 'https://api.example.com' })],
    });
    const config = TestBed.inject(STREAM_RESOURCE_CONFIG);
    expect(config.apiUrl).toBe('https://api.example.com');
  });

  it('provides custom transport via config', () => {
    const transport = new MockStreamTransport();
    TestBed.configureTestingModule({
      providers: [provideStreamResource({ apiUrl: '', transport })],
    });
    const config = TestBed.inject(STREAM_RESOURCE_CONFIG);
    expect(config.transport).toBe(transport);
  });
});
