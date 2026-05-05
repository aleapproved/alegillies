import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = ['/', '/cv/', '/contact/', '/malaphors/', '/game/'];

for (const path of PAGES) {
  test(`${path} has no critical or serious accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).analyze();

    const blockers = results.violations.filter(v =>
      ['critical', 'serious'].includes(v.impact)
    );

    expect(
      blockers,
      'axe violations:\n' + JSON.stringify(blockers.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.length,
      })), null, 2)
    ).toEqual([]);
  });
}
