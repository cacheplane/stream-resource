import { expect, test } from '@playwright/test';

test.describe('Render Registry Example', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4404');
    await page.waitForSelector('app-registry', { state: 'attached' });
  });

  test('renders the sidebar with registry info', async ({ page }) => {
    await expect(page.locator('chat')).toBeVisible();
    await expect(page.locator('aside')).toBeVisible();
    await expect(page.locator('.registry-info')).toBeVisible();
  });

  test('displays the component registry heading', async ({ page }) => {
    await expect(page.locator('aside h3')).toHaveText('Component Registry');
  });
});
