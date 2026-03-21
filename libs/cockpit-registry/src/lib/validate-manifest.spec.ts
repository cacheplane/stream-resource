import { describe, expect, it } from 'vitest';
import { cockpitManifest } from './manifest';
import { validateCockpitManifest } from './validate-manifest';
import type { CockpitManifestEntry } from './manifest.types';

describe('validateCockpitManifest', () => {
  it('rejects duplicate canonical identities', () => {
    const duplicateManifest: CockpitManifestEntry[] = [
      cockpitManifest[0],
      {
        ...cockpitManifest[0],
        title: 'Duplicate entry',
      },
    ];

    expect(validateCockpitManifest(duplicateManifest)).toEqual([
      'Duplicate canonical identity: deep-agents/getting-started/overview/overview/python',
    ]);
  });

  it('rejects fallback targets that do not exist in the manifest', () => {
    const invalidFallbackManifest: CockpitManifestEntry[] = [
      {
        ...cockpitManifest[0],
        fallbackTarget: {
          product: 'langgraph',
          section: 'core-capabilities',
          topic: 'missing-target',
          page: 'overview',
          language: 'typescript',
        },
      },
    ];

    expect(validateCockpitManifest(invalidFallbackManifest)).toEqual([
      'Invalid fallback target for deep-agents/getting-started/overview/overview/python: langgraph/core-capabilities/missing-target/overview/typescript',
    ]);
  });

  it('rejects capability entries without explicit testing metadata', () => {
    const capabilityEntry = cockpitManifest.find(
      (entry) =>
        entry.product === 'langgraph' &&
        entry.section === 'core-capabilities' &&
        entry.topic === 'streaming'
    )!;
    const invalidManifest = [{ ...(capabilityEntry as CockpitManifestEntry) }];

    delete (invalidManifest[0] as CockpitManifestEntry & { testingContract?: unknown })
      .testingContract;

    expect(validateCockpitManifest(invalidManifest)).toContain(
      'Missing testing contract for langgraph/core-capabilities/streaming/overview/python'
    );
  });

  it('rejects secret-gated entries without an integration target', () => {
    const capabilityEntry = cockpitManifest.find(
      (entry) =>
        entry.product === 'langgraph' &&
        entry.section === 'core-capabilities' &&
        entry.topic === 'deployment-runtime'
    )!;
    const invalidManifest = [
      {
        ...capabilityEntry,
        testingContract: {
          ...capabilityEntry.testingContract,
          integrationMode: 'secret-gated' as const,
          integrationTarget: null,
        },
      },
    ];

    expect(validateCockpitManifest(invalidManifest)).toContain(
      'Missing integration target for langgraph/core-capabilities/deployment-runtime/overview/python'
    );
  });
});
