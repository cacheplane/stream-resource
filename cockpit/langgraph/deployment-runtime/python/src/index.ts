export interface CockpitCapabilityModule {
  id: string;
  manifestIdentity: {
    product: 'langgraph';
    section: 'core-capabilities';
    topic: 'deployment-runtime';
    page: 'overview';
    language: 'python';
  };
  title: string;
  docsPath: string;
  promptAssetPaths: string[];
  codeAssetPaths: string[];
}

export const langgraphDeploymentRuntimePythonModule: CockpitCapabilityModule = {
  id: 'langgraph-deployment-runtime-python',
  manifestIdentity: {
    product: 'langgraph',
    section: 'core-capabilities',
    topic: 'deployment-runtime',
    page: 'overview',
    language: 'python',
  },
  title: 'LangGraph Deployment Runtime (Python)',
  docsPath: '/docs/langgraph/core-capabilities/deployment-runtime/overview/python',
  promptAssetPaths: [
    'cockpit/langgraph/deployment-runtime/python/prompts/deployment-runtime.md',
  ],
  codeAssetPaths: ['cockpit/langgraph/deployment-runtime/python/src/index.ts'],
};
