import { test, expect } from '@playwright/test';

const PAGES = ['/', '/cv/', '/contact/', '/malaphors/', '/game/'];

for (const path of PAGES) {
  test(`${path} loads with no console errors`, async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    const response = await page.goto(path);
    expect(response.status()).toBe(200);

    await page.waitForLoadState('networkidle');

    expect(errors, `console errors on ${path}:\n${errors.join('\n')}`).toEqual([]);
  });
}
