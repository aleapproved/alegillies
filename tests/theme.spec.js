import { test, expect } from '@playwright/test';

const PAGES = ['/', '/cv/', '/contact/', '/malaphors/', '/game/'];

for (const path of PAGES) {
  test(`${path} theme toggle flips dark/light and persists across reload`, async ({ page }) => {
    await page.goto(path);
    await page.evaluate(() => localStorage.removeItem('theme'));
    await page.reload();

    const html = page.locator('html');

    const initial = await html.getAttribute('data-theme');
    const startedDark = initial === 'dark';

    await page.click('#themeToggle');
    if (startedDark) {
      await expect(html).not.toHaveAttribute('data-theme', 'dark');
    } else {
      await expect(html).toHaveAttribute('data-theme', 'dark');
    }

    await page.reload();
    if (startedDark) {
      await expect(html).not.toHaveAttribute('data-theme', 'dark');
    } else {
      await expect(html).toHaveAttribute('data-theme', 'dark');
    }

    await page.click('#themeToggle');
    if (startedDark) {
      await expect(html).toHaveAttribute('data-theme', 'dark');
    } else {
      await expect(html).not.toHaveAttribute('data-theme', 'dark');
    }
  });
}
