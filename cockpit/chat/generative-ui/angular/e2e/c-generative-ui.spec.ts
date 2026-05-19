// SPDX-License-Identifier: MIT
import { test, expect } from '@playwright/test';
import { submitAndWaitForResponse } from '../../../../../libs/e2e-harness/src';

test('c-generative-ui: dashboard prompt renders chat-generative-ui surface', async ({ page }) => {
  await submitAndWaitForResponse(page, 'Show me a dashboard of airline operations.');

  // The render_spec tool call returns a dashboard JSON spec which the
  // content-classifier in @ngaf/chat mounts as a <chat-generative-ui>
  // primitive inside the assistant bubble. Presence of this element
  // proves the spec parsed and the GenUI host wired up.
  await expect(page.locator('chat-generative-ui')).toBeVisible();
});

test('c-generative-ui: filter prompt produces assistant turn', async ({ page }) => {
  await submitAndWaitForResponse(page, 'Filter to only the cancelled flights.');

  // The query_recent_disruptions tool returns data the assistant uses to
  // narrow the dashboard. Distinctive surface here is just that the
  // assistant turn finalized — the dashboard view update is internal state.
  await expect(
    page.locator('chat-message[data-role="assistant"]').last(),
  ).toBeVisible();
});
