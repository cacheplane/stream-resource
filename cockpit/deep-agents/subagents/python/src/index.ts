export interface CockpitCapabilityModule {
  id: string;
  manifestIdentity: {
    product: 'deep-agents';
    section: 'core-capabilities';
    topic: 'subagents';
    page: 'overview';
    language: 'python';
  };
  title: string;
  docsPath: string;
  promptAssetPaths: string[];
  codeAssetPaths: string[];
}

export const deepAgentsSubagentsPythonModule: CockpitCapabilityModule = {
  id: 'deep-agents-subagents-python',
  manifestIdentity: {
    product: 'deep-agents',
    section: 'core-capabilities',
    topic: 'subagents',
    page: 'overview',
    language: 'python',
  },
  title: 'Deep Agents Subagents (Python)',
  docsPath: '/docs/deep-agents/core-capabilities/subagents/overview/python',
  promptAssetPaths: ['cockpit/deep-agents/subagents/python/prompts/subagents.md'],
  codeAssetPaths: ['cockpit/deep-agents/subagents/python/src/index.ts'],
};
