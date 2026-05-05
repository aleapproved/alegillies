import { test, expect } from '@playwright/test';

test('404 page is served for non-existent URLs', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium-desktop',
    '404 behaviour is identical across browsers — checking once is enough'
  );

  const response = await page.goto('/some-nonexistent-page/');
  expect(response.status()).toBe(404);

  // The 404 page should announce itself.
  await expect(page.locator('h1')).toHaveText('404');

  // It must not be indexable.
  await expect(
    page.locator('meta[name="robots"][content*="noindex"]')
  ).toHaveCount(1);

  // The body should announce that the page doesn't exist.
  await expect(page.locator('main p')).toHaveText("Alas, this page doesn't exist.");
});
