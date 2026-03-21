import { expect, test } from '@playwright/test';

test('renders navigation and representative shell panes on the home page', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Cockpit' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Cockpit navigation' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Docs' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Code' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Prompts' })).toBeVisible();
});

test('navigates from the tree to a capability route and shows the loaded surface', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: 'LangGraph Streaming' }).click();

  await expect(page).toHaveURL(/\/langgraph\/core-capabilities\/streaming\/overview\/python$/);
  await expect(page.getByText('/docs/langgraph/core-capabilities/streaming/overview/python')).toBeVisible();
  await expect(page.getByText('cockpit/langgraph/streaming/python/src/index.ts')).toBeVisible();
  await expect(page.getByText('cockpit/langgraph/streaming/python/prompts/streaming.md')).toBeVisible();
});

test('falls back to the product overview when a missing typescript route is requested', async ({ page }) => {
  await page.goto('/langgraph/core-capabilities/streaming/overview/typescript');

  await expect(page).toHaveURL(/\/langgraph\/getting-started\/overview\/overview\/python$/);
  await expect(page.getByText('/docs/langgraph/getting-started/overview/overview/python')).toBeVisible();
});
