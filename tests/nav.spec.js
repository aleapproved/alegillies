import { test, expect } from '@playwright/test';

const PAGES_WITH_NAV = ['/', '/cv/', '/contact/', '/malaphors/'];

for (const path of PAGES_WITH_NAV) {
  test(`${path} shows floating links and no rail @desktop`, async ({ page }) => {
    await page.goto(path);
    await page.waitForFunction(
      () => document.querySelectorAll('.floatingLink.ready').length > 0
    );
    await expect(page.locator('#linkRail')).toHaveCount(0);
    await expect(page.locator('.floatingLink').first()).toBeVisible();
  });

  test(`${path} collapses to bottom rail with chip styling @mobile`, async ({ page }) => {
    await page.goto(path);
    await page.waitForSelector('#linkRail');
    const chips = page.locator('#linkRail .floatingLink.chip');
    expect(await chips.count()).toBeGreaterThan(0);
    await expect(chips.first()).toBeVisible();
  });
}
