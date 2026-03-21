import { describe, expect, it } from 'vitest';
import { getAllDocSlugs, getDocBySlug } from './docs';

describe('website docs bindings', () => {
  it('lists product-first docs slugs from shared bundle metadata', () => {
    expect(getAllDocSlugs()).toContainEqual([
      'deep-agents',
      'core-capabilities',
      'planning',
      'overview',
      'python',
    ]);
    expect(getAllDocSlugs()).toContainEqual([
      'langgraph',
      'core-capabilities',
      'streaming',
      'build',
      'python',
    ]);
  });

  it('falls back to the product getting-started overview when the requested language bundle does not exist', () => {
    expect(
      getDocBySlug([
        'langgraph',
        'core-capabilities',
        'streaming',
        'build',
        'typescript',
      ])
    ).toMatchObject({
      title: 'LangGraph Overview',
      bundle: {
        product: 'langgraph',
        section: 'getting-started',
        topic: 'overview',
        page: 'overview',
        language: 'python',
      },
    });
  });
});
