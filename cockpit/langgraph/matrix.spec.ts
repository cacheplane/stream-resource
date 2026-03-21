import { describe, expect, it } from 'vitest';
import { langgraphStreamingPythonModule } from './streaming/python/src/index';
import { langgraphPersistencePythonModule } from './persistence/python/src/index';
import { langgraphDurableExecutionPythonModule } from './durable-execution/python/src/index';
import { langgraphInterruptsPythonModule } from './interrupts/python/src/index';
import { langgraphMemoryPythonModule } from './memory/python/src/index';
import { langgraphSubgraphsPythonModule } from './subgraphs/python/src/index';
import { langgraphTimeTravelPythonModule } from './time-travel/python/src/index';
import { langgraphDeploymentRuntimePythonModule } from './deployment-runtime/python/src/index';

describe('LangGraph matrix slice', () => {
  it('exposes canonical python modules for the approved core capability topics', () => {
    const modules = [
      langgraphPersistencePythonModule,
      langgraphDurableExecutionPythonModule,
      langgraphStreamingPythonModule,
      langgraphInterruptsPythonModule,
      langgraphMemoryPythonModule,
      langgraphSubgraphsPythonModule,
      langgraphTimeTravelPythonModule,
      langgraphDeploymentRuntimePythonModule,
    ];

    expect(modules).toHaveLength(8);
    expect(modules.map((module) => module.manifestIdentity.topic)).toEqual([
      'persistence',
      'durable-execution',
      'streaming',
      'interrupts',
      'memory',
      'subgraphs',
      'time-travel',
      'deployment-runtime',
    ]);

    for (const module of modules) {
      expect(module.manifestIdentity).toMatchObject({
        product: 'langgraph',
        section: 'core-capabilities',
        page: 'overview',
        language: 'python',
      });
      expect(module.docsPath).toBe(
        `/docs/langgraph/core-capabilities/${module.manifestIdentity.topic}/overview/python`
      );
      expect(module.promptAssetPaths.length).toBe(1);
      expect(module.codeAssetPaths.length).toBe(1);
    }
  });
});
