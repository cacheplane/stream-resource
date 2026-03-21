import { describe, expect, it } from 'vitest';
import { parseDeploySmokeArgs, runDeploySmoke } from './deploy-smoke';

describe('deploy smoke helper', () => {
  it('parses the deploy smoke command line', () => {
    expect(
      parseDeploySmokeArgs(['--url', 'https://cockpit.stream-resource.dev', '--dry-run'])
    ).toEqual({
      url: 'https://cockpit.stream-resource.dev',
      expectedTitle: 'Cockpit',
      dryRun: true,
    });
  });

  it('formats dry-run output without performing a network request', async () => {
    await expect(
      runDeploySmoke({
        url: 'https://cockpit.stream-resource.dev',
        expectedTitle: 'Cockpit',
        dryRun: true,
      })
    ).resolves.toBe('dry-run:https://cockpit.stream-resource.dev:Cockpit');
  });
});
