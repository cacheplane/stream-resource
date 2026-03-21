export interface CockpitCapabilityModule {
  id: string;
  manifestIdentity: {
    product: 'deep-agents';
    section: 'core-capabilities';
    topic: 'skills';
    page: 'overview';
    language: 'python';
  };
  title: string;
  docsPath: string;
  promptAssetPaths: string[];
  codeAssetPaths: string[];
}

export const deepAgentsSkillsPythonModule: CockpitCapabilityModule = {
  id: 'deep-agents-skills-python',
  manifestIdentity: {
    product: 'deep-agents',
    section: 'core-capabilities',
    topic: 'skills',
    page: 'overview',
    language: 'python',
  },
  title: 'Deep Agents Skills (Python)',
  docsPath: '/docs/deep-agents/core-capabilities/skills/overview/python',
  promptAssetPaths: ['cockpit/deep-agents/skills/python/prompts/skills.md'],
  codeAssetPaths: ['cockpit/deep-agents/skills/python/src/index.ts'],
};
