export interface CockpitCapabilityModule {
  id: string;
  manifestIdentity: {
    product: 'langgraph';
    section: 'core-capabilities';
    topic: 'time-travel';
    page: 'overview';
    language: 'python';
  };
  title: string;
  docsPath: string;
  promptAssetPaths: string[];
  codeAssetPaths: string[];
}

export const langgraphTimeTravelPythonModule: CockpitCapabilityModule = {
  id: 'langgraph-time-travel-python',
  manifestIdentity: {
    product: 'langgraph',
    section: 'core-capabilities',
    topic: 'time-travel',
    page: 'overview',
    language: 'python',
  },
  title: 'LangGraph Time Travel (Python)',
  docsPath: '/docs/langgraph/core-capabilities/time-travel/overview/python',
  promptAssetPaths: ['cockpit/langgraph/time-travel/python/prompts/time-travel.md'],
  codeAssetPaths: ['cockpit/langgraph/time-travel/python/src/index.ts'],
};
