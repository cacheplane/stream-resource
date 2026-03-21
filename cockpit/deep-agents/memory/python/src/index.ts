export interface CockpitCapabilityModule {
  id: string;
  manifestIdentity: {
    product: 'deep-agents';
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

export const deepAgentsMemoryPythonModule: CockpitCapabilityModule = {
  id: 'deep-agents-memory-python',
  manifestIdentity: {
    product: 'deep-agents',
    section: 'core-capabilities',
    topic: 'memory',
    page: 'overview',
    language: 'python',
  },
  title: 'Deep Agents Memory (Python)',
  docsPath: '/docs/deep-agents/core-capabilities/memory/overview/python',
  promptAssetPaths: ['cockpit/deep-agents/memory/python/prompts/memory.md'],
  codeAssetPaths: ['cockpit/deep-agents/memory/python/src/index.ts'],
};
