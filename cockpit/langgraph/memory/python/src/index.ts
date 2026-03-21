export interface CockpitCapabilityModule {
  id: string;
  manifestIdentity: {
    product: 'langgraph';
    section: 'core-capabilities';
    topic: 'memory';
    page: 'overview';
    language: 'python';
  };
  title: string;
  docsPath: string;
  promptAssetPaths: string[];
  codeAssetPaths: string[];
}

export const langgraphMemoryPythonModule: CockpitCapabilityModule = {
  id: 'langgraph-memory-python',
  manifestIdentity: {
    product: 'langgraph',
    section: 'core-capabilities',
    topic: 'memory',
    page: 'overview',
    language: 'python',
  },
  title: 'LangGraph Memory (Python)',
  docsPath: '/docs/langgraph/core-capabilities/memory/overview/python',
  promptAssetPaths: ['cockpit/langgraph/memory/python/prompts/memory.md'],
  codeAssetPaths: ['cockpit/langgraph/memory/python/src/index.ts'],
};
