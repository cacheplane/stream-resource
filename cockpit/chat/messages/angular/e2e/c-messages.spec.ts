// SPDX-License-Identifier: MIT
import { test, expect } from '@playwright/test';
import { sendPromptAndWait } from '../../../../../libs/e2e-harness/src';

test('c-messages: user message and AI response both render', async ({ page }) => {
  const finalBubble = await sendPromptAndWait(page, 'Hello');

  await expect(
    page.locator('chat-message[data-role="user"]').last(),
  ).toContainText('Hello');

  await expect(finalBubble).toContainText('chat-messages capability demo');
});

test('c-messages: chat-message-list renders both turns', async ({ page }) => {
  await sendPromptAndWait(page, 'Hello');

  await expect(page.locator('chat-message-list chat-message')).toHaveCount(2);
});
