// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { InjectionToken, Provider } from '@angular/core';
import { StreamResourceTransport } from './stream-resource.types';

export interface StreamResourceConfig {
  apiUrl?:    string;
  transport?: StreamResourceTransport;
}

export const STREAM_RESOURCE_CONFIG =
  new InjectionToken<StreamResourceConfig>('STREAM_RESOURCE_CONFIG');

export function provideStreamResource(config: StreamResourceConfig): Provider {
  return {
    provide: STREAM_RESOURCE_CONFIG,
    useValue: config,
  };
}
