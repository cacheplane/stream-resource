// SPDX-License-Identifier: MIT
import { test, expect } from '@playwright/test';

// Note: c-messages uses raw ChatInputComponent/ChatMessageListComponent
// primitives rather than the composed <chat> component. With aimock's
// near-instant chunked response (~30ms), the `isLoading()` signal flips
// false before Playwright can observe the conditional "Stop generating"
// button — so the shared `sendPromptAndWait` helper times out here.
// Wait directly on the durable end-state signal instead:
// `chat-message[data-role="assistant"][data-streaming="false"]`.

const PROMPT = 'Hello';
const RESPONSE_SUBSTRING = 'chat-messages capability demo';

async function submitAndWaitForResponse(page: import('@playwright/test').Page) {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: /message|prompt/i });
  await input.fill(PROMPT);
  await page.getByRole('button', { name: /send message/i }).click();
  const finalAssistant = page
    .locator('chat-message[data-role="assistant"][data-streaming="false"]')
    .last();
  await expect(finalAssistant).toBeAttached({ timeout: 30_000 });
  return finalAssistant;
}

test('c-messages: user message and AI response both render', async ({ page }) => {
  const finalBubble = await submitAndWaitForResponse(page);

  await expect(
    page.locator('chat-message[data-role="user"]').last(),
  ).toContainText(PROMPT);

  await expect(finalBubble).toContainText(RESPONSE_SUBSTRING);
});

test('c-messages: chat-message-list renders both turns', async ({ page }) => {
  await submitAndWaitForResponse(page);

  await expect(page.locator('chat-message-list chat-message')).toHaveCount(2);
});
