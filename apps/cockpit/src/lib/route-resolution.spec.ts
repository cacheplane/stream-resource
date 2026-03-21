import { describe, expect, it } from 'vitest';
import { cockpitManifest } from '../../../../libs/cockpit-registry/src/index';
import {
  buildNavigationTree,
  getCapabilityPresentation,
  resolveCockpitEntry,
} from './route-resolution';

describe('resolveCockpitEntry', () => {
  it('resolves exact entries from shared manifest metadata', () => {
    expect(
      resolveCockpitEntry({
        manifest: cockpitManifest,
        product: 'langgraph',
        section: 'core-capabilities',
        topic: 'streaming',
        page: 'overview',
        language: 'python',
      })
    ).toMatchObject({
      product: 'langgraph',
      topic: 'streaming',
      language: 'python',
    });
  });

  it('falls back to the product getting-started overview when the requested language has no equivalent', () => {
    expect(
      resolveCockpitEntry({
        manifest: cockpitManifest,
        product: 'langgraph',
        section: 'core-capabilities',
        topic: 'streaming',
        page: 'overview',
        language: 'typescript',
      })
    ).toMatchObject({
      product: 'langgraph',
      section: 'getting-started',
      topic: 'overview',
      language: 'python',
    });
  });
});

describe('buildNavigationTree', () => {
  it('groups manifest entries by product and section', () => {
    const tree = buildNavigationTree(cockpitManifest);

    expect(tree[0]).toMatchObject({
      product: 'deep-agents',
    });
    expect(tree[1]).toMatchObject({
      product: 'langgraph',
    });
  });
});

describe('getCapabilityPresentation', () => {
  it('distinguishes docs-only entries from capability entries', () => {
    const docsEntry = resolveCockpitEntry({
      manifest: cockpitManifest,
      product: 'deep-agents',
      section: 'getting-started',
      topic: 'overview',
      page: 'overview',
      language: 'python',
    });
    const capabilityEntry = resolveCockpitEntry({
      manifest: cockpitManifest,
      product: 'langgraph',
      section: 'core-capabilities',
      topic: 'streaming',
      page: 'overview',
      language: 'python',
    });

    expect(getCapabilityPresentation(docsEntry)).toMatchObject({
      kind: 'docs-only',
      docsPath: '/docs/deep-agents/getting-started/overview/overview/python',
    });
    expect(getCapabilityPresentation(capabilityEntry)).toMatchObject({
      kind: 'capability',
      docsPath: '/docs/langgraph/core-capabilities/streaming/overview/python',
      promptAssetPaths: ['cockpit/langgraph/streaming/python/prompts/streaming.md'],
      codeAssetPaths: ['cockpit/langgraph/streaming/python/src/index.ts'],
    });
  });

  it('resolves module-backed metadata for every implemented capability topic', () => {
    const capabilityEntries = cockpitManifest.filter(
      (entry) => entry.entryKind === 'capability'
    );

    for (const entry of capabilityEntries) {
      expect(getCapabilityPresentation(entry)).toMatchObject({
        kind: 'capability',
      });
      expect(
        (getCapabilityPresentation(entry).kind === 'capability' &&
          getCapabilityPresentation(entry).promptAssetPaths.length > 0) ||
          false
      ).toBe(true);
      expect(
        (getCapabilityPresentation(entry).kind === 'capability' &&
          getCapabilityPresentation(entry).codeAssetPaths.length > 0) ||
          false
      ).toBe(true);
    }
  });
});
