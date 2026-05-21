// SPDX-License-Identifier: MIT
import { test, expect } from '@playwright/test';
import { toolbarSelect } from './test-helpers';

/**
 * URL routing smoke tests — deep-link hydration and mode-switch URL preservation.
 *
 * These specs exercise the two behaviours added by the url-routing-demo branch:
 *   1. Query-param hydration: ?model=<value> applied to the URL on first load
 *      should populate the model picker without any user interaction.
 *   2. Mode-switch preservation: clicking a mode button carries the current
 *      ?model query param into the new route so the selection is not lost.
 *
 * No aimock / backend needed — both specs only assert DOM state and the browser
 * URL; they do not submit any messages.
 */

test('deep link ?model=gpt-5-nano selects gpt-5-nano in the model picker', async ({
  page,
}) => {
  // Navigate directly so the query param is processed by readUrlState().
  // Do NOT use openDemo() here — it clears storage then re-navigates to the
  // bare path, stripping the query string we need to test.
  await page.goto('/embed?model=gpt-5-nano');

  const modelTrigger = toolbarSelect(page, 'Model');
  await expect(modelTrigger).toContainText('gpt-5-nano');
});

test('switching mode preserves ?model query param', async ({ page }) => {
  await page.goto('/embed?model=gpt-5-nano');

  // Confirm the picker hydrated correctly before we switch modes.
  await expect(toolbarSelect(page, 'Model')).toContainText('gpt-5-nano');

  // Click the Popup mode button (onModeChange uses queryParamsHandling:'preserve').
  await page.locator('.demo-shell__segmented-button', { hasText: 'Popup' }).click();

  // The route should now be /popup (optionally with a :threadId segment) and
  // ?model=gpt-5-nano must still be present in the URL.
  await expect(page).toHaveURL(/\/popup(\/[^?]+)?\?.*model=gpt-5-nano/);

  // The toolbar in popup mode should still show the hydrated selection.
  await expect(toolbarSelect(page, 'Model')).toContainText('gpt-5-nano');
});
