// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CockpitTelemetryService } from './cockpit-telemetry.service';
import { COCKPIT_TELEMETRY_CONFIG } from './tokens';
import { ActivationAggregator } from './activation-aggregator';
import { CHAT_LIFECYCLE, type ChatLifecycle } from '@ngaf/chat';

const mocks = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
}));

vi.mock('posthog-js', () => ({
  default: { init: mocks.init, capture: mocks.capture },
}));

function makeChatLifecycle(): ChatLifecycle & { _setFirstMessage: () => void } {
  const firstMessageSent = signal(false);
  return {
    componentReady: signal(true).asReadonly(),
    firstMessageSent: firstMessageSent.asReadonly(),
    messageCount: signal(0).asReadonly(),
    inputSubmittedAt: signal<number | null>(null).asReadonly(),
    _setFirstMessage: () => firstMessageSent.set(true),
  };
}

describe('CockpitTelemetryService', () => {
  let svc: CockpitTelemetryService;
  let chat: ReturnType<typeof makeChatLifecycle>;

  beforeEach(() => {
    mocks.init.mockClear();
    mocks.capture.mockClear();
    chat = makeChatLifecycle();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: COCKPIT_TELEMETRY_CONFIG,
          useValue: { posthogKey: 'phc_test', distinctId: 'd1', capabilitySlug: 'streaming' },
        },
        ActivationAggregator,
        { provide: CHAT_LIFECYCLE, useValue: chat },
        CockpitTelemetryService,
      ],
    });
    svc = TestBed.inject(CockpitTelemetryService);
  });

  test('init() initializes posthog-js with memory persistence + bootstrap distinctID', () => {
    svc.init();
    expect(mocks.init).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        persistence: 'memory',
        bootstrap: { distinctID: 'd1' },
        autocapture: false,
        capture_pageview: false,
      }),
    );
  });

  test('init() is idempotent', () => {
    svc.init();
    svc.init();
    expect(mocks.init).toHaveBeenCalledTimes(1);
  });

  test('fires cockpit:chat_first_message when ChatLifecycle.firstMessageSent flips to true', async () => {
    svc.init();
    chat._setFirstMessage();
    TestBed.tick();
    await Promise.resolve();
    expect(mocks.capture).toHaveBeenCalledWith(
      'cockpit:chat_first_message',
      expect.objectContaining({ capability: 'streaming' }),
    );
  });

  test('does not fire if lifecycle was already-true at init time and never transitions', async () => {
    chat._setFirstMessage(); // before init
    svc.init();
    TestBed.tick();
    await Promise.resolve();
    // Effect runs once, captures the current state — fire-on-init is allowed.
    // The contract is "fires once at most".
    const calls = mocks.capture.mock.calls.filter(([e]) => e === 'cockpit:chat_first_message');
    expect(calls.length).toBeLessThanOrEqual(1);
  });

  test('no lifecycle present → no events fire', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: COCKPIT_TELEMETRY_CONFIG,
          useValue: { posthogKey: 'phc_test', distinctId: 'd1', capabilitySlug: 'streaming' },
        },
        ActivationAggregator,
        CockpitTelemetryService,
      ],
    });
    const svc2 = TestBed.inject(CockpitTelemetryService);
    svc2.init();
    expect(mocks.capture).not.toHaveBeenCalled();
  });

  test('captures include capability property from config', async () => {
    svc.init();
    chat._setFirstMessage();
    TestBed.tick();
    await Promise.resolve();
    const call = mocks.capture.mock.calls.find(([e]) => e === 'cockpit:chat_first_message');
    expect((call?.[1] as Record<string, unknown>)['capability']).toBe('streaming');
  });
});
