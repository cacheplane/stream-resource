export interface CockpitCapabilityModule {
  id: string;
  manifestIdentity: {
    product: 'langgraph';
    section: 'core-capabilities';
    topic: 'interrupts';
    page: 'overview';
    language: 'python';
  };
  title: string;
  docsPath: string;
  promptAssetPaths: string[];
  codeAssetPaths: string[];
}

export const langgraphInterruptsPythonModule: CockpitCapabilityModule = {
  id: 'langgraph-interrupts-python',
  manifestIdentity: {
    product: 'langgraph',
    section: 'core-capabilities',
    topic: 'interrupts',
    page: 'overview',
    language: 'python',
  },
  title: 'LangGraph Interrupts (Python)',
  docsPath: '/docs/langgraph/core-capabilities/interrupts/overview/python',
  promptAssetPaths: ['cockpit/langgraph/interrupts/python/prompts/interrupts.md'],
  codeAssetPaths: ['cockpit/langgraph/interrupts/python/src/index.ts'],
};
