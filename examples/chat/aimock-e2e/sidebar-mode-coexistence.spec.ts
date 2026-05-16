// SPDX-License-Identifier: MIT
import { test, expect } from '@playwright/test';

test.describe('chat-debug × chat-sidebar coexistence', () => {
  test('sidebar launcher remains reachable while chat-debug is open', async ({ page }) => {
    await page.goto('/sidebar');
    // Open chat-debug via the floating top-right launcher.
    await page.locator('.launcher').click();
    // Debug should auto-pick bottom dock when sidebar mode is active.
    const debugPanel = page.locator('.panel.panel--bottom');
    await expect(debugPanel).toBeVisible();
    // Sidebar launcher must still be present and clickable.
    const sidebarLauncher = page.locator('.chat-sidebar__launcher');
    await expect(sidebarLauncher).toBeVisible();
    await sidebarLauncher.click();
    // Sidebar panel slides in.
    const sidebarPanel = page.locator('.chat-sidebar__panel[data-open="true"]');
    await expect(sidebarPanel).toBeVisible();
    // No overlap: the bottom panel's right edge must end before the
    // sidebar's left edge (sidebar is 28rem = 448px wide).
    const sidebarBox = await sidebarPanel.boundingBox();
    const debugBox = await debugPanel.boundingBox();
    expect(sidebarBox).not.toBeNull();
    expect(debugBox).not.toBeNull();
    // debug right edge <= sidebar left edge (within 1px tolerance)
    expect(debugBox!.x + debugBox!.width).toBeLessThanOrEqual(sidebarBox!.x + 1);
  });

  test('user override survives mode switch: explicit right-dock stays right', async ({ page }) => {
    await page.goto('/embed');
    await page.locator('.launcher').click();
    // Click right-dock explicitly (the existing dock-btn 'is-active' selector confirms it's right by default,
    // but click it anyway to set the override flag).
    await page.locator('.panel__dock-btn').nth(2).click(); // 0=left, 1=bottom, 2=right per template
    // Switch to sidebar mode via the debug palette's Mode segmented control.
    await page.locator('.segmented__btn', { hasText: 'Sidebar' }).click();
    // Debug should still be right-docked, not auto-flipped to bottom.
    await expect(page.locator('.panel.panel--right')).toBeVisible();
    await expect(page.locator('.panel.panel--bottom')).not.toBeVisible();
  });
});
