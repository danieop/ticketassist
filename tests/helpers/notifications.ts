import { type Page, expect } from '@playwright/test';

export async function getNotificationBadgeCount(page: Page): Promise<number> {
  const badge = page.locator('.notification-badge');
  if (await badge.isVisible({ timeout: 2000 }).catch(() => false)) {
    const text = await badge.textContent();
    return parseInt(text ?? '0', 10);
  }
  return 0;
}

export async function openNotificationDropdown(page: Page) {
  await page.locator('.notification-bell-button').click();
  await page.locator('.notification-dropdown').waitFor({ state: 'visible', timeout: 3000 });
}

export async function closeNotificationDropdown(page: Page) {
  // Click outside the dropdown
  await page.locator('.role-header').click({ position: { x: 5, y: 5 } });
  await page.locator('.notification-dropdown').waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
}

export async function waitForNotification(page: Page, titleSubstring: string, timeoutMs = 30_000) {
  await expect(page.locator('.notification-badge')).toBeVisible({ timeout: timeoutMs });
  await openNotificationDropdown(page);
  await expect(
    page.locator('.notification-item-title', { hasText: titleSubstring })
  ).toBeVisible({ timeout: 5000 });
  await closeNotificationDropdown(page);
}

export async function clickNotification(page: Page, index: number) {
  await openNotificationDropdown(page);
  const items = page.locator('.notification-item');
  await items.nth(index).click();
}

export async function getNotificationCount(page: Page): Promise<number> {
  await openNotificationDropdown(page);
  const count = await page.locator('.notification-item').count();
  await closeNotificationDropdown(page);
  return count;
}
