export interface CockpitCapabilityModule {
  id: string;
  manifestIdentity: {
    product: 'langgraph';
    section: 'core-capabilities';
    topic: 'persistence';
    page: 'overview';
    language: 'python';
  };
  title: string;
  docsPath: string;
  promptAssetPaths: string[];
  codeAssetPaths: string[];
}

export const langgraphPersistencePythonModule: CockpitCapabilityModule = {
  id: 'langgraph-persistence-python',
  manifestIdentity: {
    product: 'langgraph',
    section: 'core-capabilities',
    topic: 'persistence',
    page: 'overview',
    language: 'python',
  },
  title: 'LangGraph Persistence (Python)',
  docsPath: '/docs/langgraph/core-capabilities/persistence/overview/python',
  promptAssetPaths: ['cockpit/langgraph/persistence/python/prompts/persistence.md'],
  codeAssetPaths: ['cockpit/langgraph/persistence/python/src/index.ts'],
};
