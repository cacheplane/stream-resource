import { defineConfig } from '@playwright/test';

const baseURL = process.env['BASE_URL'] ?? 'http://localhost:3000';
const shouldStartLocalServer = !process.env['BASE_URL'];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  use: {
    baseURL,
  },
  webServer: shouldStartLocalServer
    ? {
        command: 'npx next dev . --port 3000',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env['CI'],
      }
    : undefined,
});
