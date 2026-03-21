import { describe, expect, it } from 'vitest';
import {
  resolveDocsBundle,
  toCockpitHref,
  toDocsSlug,
} from './docs-bundle';

describe('resolveDocsBundle', () => {
  it('resolves an exact docs bundle by topic, page, and language', () => {
    expect(
      resolveDocsBundle({
        product: 'langgraph',
        section: 'core-capabilities',
        topic: 'streaming',
        page: 'build',
        language: 'python',
      })
    ).toMatchObject({
      title: 'LangGraph Streaming Build',
      sourcePath:
        'langgraph/core-capabilities/streaming/python/build.mdx',
    });
  });

  it('falls back to the product getting-started overview when no equivalent language bundle exists', () => {
    expect(
      resolveDocsBundle({
        product: 'langgraph',
        section: 'core-capabilities',
        topic: 'streaming',
        page: 'build',
        language: 'typescript',
      })
    ).toMatchObject({
      product: 'langgraph',
      section: 'getting-started',
      topic: 'overview',
      page: 'overview',
      language: 'python',
    });
  });
});

describe('docs bundle links', () => {
  it('generates metadata-driven website and cockpit links from a bundle', () => {
    const bundle = resolveDocsBundle({
      product: 'deep-agents',
      section: 'core-capabilities',
      topic: 'planning',
      page: 'overview',
      language: 'python',
    });

    expect(toDocsSlug(bundle)).toEqual([
      'deep-agents',
      'core-capabilities',
      'planning',
      'overview',
      'python',
    ]);
    expect(toCockpitHref(bundle)).toBe(
      '/deep-agents/core-capabilities/planning/overview/python'
    );
  });
});
