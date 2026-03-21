export interface CockpitCapabilityModule {
  id: string;
  manifestIdentity: {
    product: 'langgraph';
    section: 'core-capabilities';
    topic: 'durable-execution';
    page: 'overview';
    language: 'python';
  };
  title: string;
  docsPath: string;
  promptAssetPaths: string[];
  codeAssetPaths: string[];
}

export const langgraphDurableExecutionPythonModule: CockpitCapabilityModule = {
  id: 'langgraph-durable-execution-python',
  manifestIdentity: {
    product: 'langgraph',
    section: 'core-capabilities',
    topic: 'durable-execution',
    page: 'overview',
    language: 'python',
  },
  title: 'LangGraph Durable Execution (Python)',
  docsPath: '/docs/langgraph/core-capabilities/durable-execution/overview/python',
  promptAssetPaths: [
    'cockpit/langgraph/durable-execution/python/prompts/durable-execution.md',
  ],
  codeAssetPaths: ['cockpit/langgraph/durable-execution/python/src/index.ts'],
};
