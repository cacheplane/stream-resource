import {
  cockpitManifest,
  type CockpitLanguage,
  type CockpitProduct,
} from '../../../cockpit-registry/src/index';

export interface DocsBundle {
  product: CockpitProduct;
  section: 'getting-started' | 'core-capabilities';
  topic: string;
  page: 'overview' | 'build' | 'prompts' | 'code' | 'testing';
  language: CockpitLanguage;
  title: string;
  sourcePath: string;
}

export interface ResolveDocsBundleOptions {
  product: CockpitProduct;
  section: DocsBundle['section'];
  topic: string;
  page: DocsBundle['page'];
  language: CockpitLanguage;
}

const docsBundles: DocsBundle[] = [
  {
    product: 'deep-agents',
    section: 'getting-started',
    topic: 'overview',
    page: 'overview',
    language: 'python',
    title: 'Deep Agents Overview',
    sourcePath: 'deep-agents/getting-started/overview/python/overview.mdx',
  },
  {
    product: 'langgraph',
    section: 'getting-started',
    topic: 'overview',
    page: 'overview',
    language: 'python',
    title: 'LangGraph Overview',
    sourcePath: 'langgraph/getting-started/overview/python/overview.mdx',
  },
  {
    product: 'deep-agents',
    section: 'core-capabilities',
    topic: 'planning',
    page: 'overview',
    language: 'python',
    title: 'Deep Agents Planning Overview',
    sourcePath: 'deep-agents/core-capabilities/planning/python/overview.mdx',
  },
  {
    product: 'deep-agents',
    section: 'core-capabilities',
    topic: 'planning',
    page: 'build',
    language: 'python',
    title: 'Deep Agents Planning Build',
    sourcePath: 'deep-agents/core-capabilities/planning/python/build.mdx',
  },
  {
    product: 'deep-agents',
    section: 'core-capabilities',
    topic: 'planning',
    page: 'prompts',
    language: 'python',
    title: 'Deep Agents Planning Prompts',
    sourcePath: 'deep-agents/core-capabilities/planning/python/prompts.mdx',
  },
  {
    product: 'deep-agents',
    section: 'core-capabilities',
    topic: 'planning',
    page: 'code',
    language: 'python',
    title: 'Deep Agents Planning Code',
    sourcePath: 'deep-agents/core-capabilities/planning/python/code.mdx',
  },
  {
    product: 'deep-agents',
    section: 'core-capabilities',
    topic: 'planning',
    page: 'testing',
    language: 'python',
    title: 'Deep Agents Planning Testing',
    sourcePath: 'deep-agents/core-capabilities/planning/python/testing.mdx',
  },
  {
    product: 'langgraph',
    section: 'core-capabilities',
    topic: 'streaming',
    page: 'overview',
    language: 'python',
    title: 'LangGraph Streaming Overview',
    sourcePath: 'langgraph/core-capabilities/streaming/python/overview.mdx',
  },
  {
    product: 'langgraph',
    section: 'core-capabilities',
    topic: 'streaming',
    page: 'build',
    language: 'python',
    title: 'LangGraph Streaming Build',
    sourcePath: 'langgraph/core-capabilities/streaming/python/build.mdx',
  },
  {
    product: 'langgraph',
    section: 'core-capabilities',
    topic: 'streaming',
    page: 'prompts',
    language: 'python',
    title: 'LangGraph Streaming Prompts',
    sourcePath: 'langgraph/core-capabilities/streaming/python/prompts.mdx',
  },
  {
    product: 'langgraph',
    section: 'core-capabilities',
    topic: 'streaming',
    page: 'code',
    language: 'python',
    title: 'LangGraph Streaming Code',
    sourcePath: 'langgraph/core-capabilities/streaming/python/code.mdx',
  },
  {
    product: 'langgraph',
    section: 'core-capabilities',
    topic: 'streaming',
    page: 'testing',
    language: 'python',
    title: 'LangGraph Streaming Testing',
    sourcePath: 'langgraph/core-capabilities/streaming/python/testing.mdx',
  },
];

const findBundle = (options: ResolveDocsBundleOptions): DocsBundle | undefined =>
  docsBundles.find(
    (bundle) =>
      bundle.product === options.product &&
      bundle.section === options.section &&
      bundle.topic === options.topic &&
      bundle.page === options.page &&
      bundle.language === options.language
  );

export const resolveDocsBundle = (
  options: ResolveDocsBundleOptions
): DocsBundle => {
  const exactBundle = findBundle(options);

  if (exactBundle) {
    return exactBundle;
  }

  const matchingManifestEntry = cockpitManifest.find(
    (entry) =>
      entry.product === options.product &&
      entry.section === options.section &&
      entry.topic === options.topic
  );

  if (!matchingManifestEntry) {
    throw new Error(
      `No manifest entry for ${options.product}/${options.section}/${options.topic}`
    );
  }

  return findBundle({
    product: options.product,
    section: 'getting-started',
    topic: 'overview',
    page: 'overview',
    language: 'python',
  }) as DocsBundle;
};

export const toDocsSlug = (bundle: DocsBundle): string[] => [
  bundle.product,
  bundle.section,
  bundle.topic,
  bundle.page,
  bundle.language,
];

export const toCockpitHref = (bundle: DocsBundle): string =>
  `/${bundle.product}/${bundle.section}/${bundle.topic}/${bundle.page}/${bundle.language}`;

export const getDocsBundles = (): DocsBundle[] => docsBundles;
