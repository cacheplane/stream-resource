export interface CockpitCapabilityModule {
  id: string;
  manifestIdentity: {
    product: 'deep-agents';
    section: 'core-capabilities';
    topic: 'filesystem';
    page: 'overview';
    language: 'python';
  };
  title: string;
  docsPath: string;
  promptAssetPaths: string[];
  codeAssetPaths: string[];
}

export const deepAgentsFilesystemPythonModule: CockpitCapabilityModule = {
  id: 'deep-agents-filesystem-python',
  manifestIdentity: {
    product: 'deep-agents',
    section: 'core-capabilities',
    topic: 'filesystem',
    page: 'overview',
    language: 'python',
  },
  title: 'Deep Agents Filesystem (Python)',
  docsPath: '/docs/deep-agents/core-capabilities/filesystem/overview/python',
  promptAssetPaths: ['cockpit/deep-agents/filesystem/python/prompts/filesystem.md'],
  codeAssetPaths: ['cockpit/deep-agents/filesystem/python/src/index.ts'],
};
