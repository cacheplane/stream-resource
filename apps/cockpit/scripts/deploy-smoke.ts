import { resolve } from 'node:path';

export interface DeploySmokeOptions {
  url: string;
  expectedTitle?: string;
  dryRun?: boolean;
}

export interface ParsedDeploySmokeArgs extends DeploySmokeOptions {}

const DEFAULT_EXPECTED_TITLE = 'Cockpit';

export const parseDeploySmokeArgs = (argv: string[]): ParsedDeploySmokeArgs => {
  const options: ParsedDeploySmokeArgs = {
    url: 'http://127.0.0.1:3000',
    expectedTitle: DEFAULT_EXPECTED_TITLE,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (current === '--url' && argv[index + 1]) {
      options.url = argv[index + 1];
      index += 1;
      continue;
    }

    if (current === '--expected-title' && argv[index + 1]) {
      options.expectedTitle = argv[index + 1];
      index += 1;
      continue;
    }

    if (current === '--dry-run') {
      options.dryRun = true;
    }
  }

  return options;
};

export const runDeploySmoke = async ({
  url,
  expectedTitle = DEFAULT_EXPECTED_TITLE,
  dryRun = false,
}: DeploySmokeOptions): Promise<string> => {
  if (dryRun) {
    return `dry-run:${url}:${expectedTitle}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Deploy smoke failed for ${url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  if (!html.includes(expectedTitle)) {
    throw new Error(`Deploy smoke failed for ${url}: missing title ${expectedTitle}`);
  }

  return `pass:${url}:${expectedTitle}`;
};

if (process.argv[1] === resolve(process.cwd(), 'apps/cockpit/scripts/deploy-smoke.ts')) {
  const options = parseDeploySmokeArgs(process.argv.slice(2));

  runDeploySmoke(options)
    .then((result) => {
      process.stdout.write(`${result}\n`);
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    });
}
