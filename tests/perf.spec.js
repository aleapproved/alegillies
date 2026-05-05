import { test, expect } from '@playwright/test';

const PAGES = ['/', '/cv/', '/contact/', '/malaphors/', '/game/'];

// Tight budgets — a 5-page static site on localhost should load in tens of
// milliseconds. These thresholds catch real regressions (a heavy script, an
// extra stylesheet doing significant work) while staying loose enough to
// tolerate occasional localhost noise.
const DOM_CONTENT_LOADED_MS = 200;
const LOAD_EVENT_MS = 500;

for (const path of PAGES) {
  test(`${path} loads within performance budget`, async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium-desktop',
      'Performance budget enforced once on chromium-desktop'
    );

    await page.goto(path);
    await page.waitForLoadState('load');

    const timing = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
        loadEvent: nav.loadEventEnd - nav.startTime,
      };
    });

    expect(timing.domContentLoaded, `domContentLoaded on ${path}`).toBeLessThan(DOM_CONTENT_LOADED_MS);
    expect(timing.loadEvent, `loadEvent on ${path}`).toBeLessThan(LOAD_EVENT_MS);
  });
}
