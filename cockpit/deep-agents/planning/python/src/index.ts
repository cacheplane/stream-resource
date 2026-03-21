export interface CockpitCapabilityModule {
  id: string;
  manifestIdentity: {
    product: 'deep-agents';
    section: 'core-capabilities';
    topic: 'planning';
    page: 'overview';
    language: 'python';
  };
  title: string;
  docsPath: string;
  promptAssetPaths: string[];
  codeAssetPaths: string[];
}

export const deepAgentsPlanningPythonModule: CockpitCapabilityModule = {
  id: 'deep-agents-planning-python',
  manifestIdentity: {
    product: 'deep-agents',
    section: 'core-capabilities',
    topic: 'planning',
    page: 'overview',
    language: 'python',
  },
  title: 'Deep Agents Planning (Python)',
  docsPath: '/docs/deep-agents/core-capabilities/planning/overview/python',
  promptAssetPaths: ['cockpit/deep-agents/planning/python/prompts/planning.md'],
  codeAssetPaths: ['cockpit/deep-agents/planning/python/src/index.ts'],
};
