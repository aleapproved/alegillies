import { test, expect } from '@playwright/test';

const PAGES = ['/', '/cv/', '/contact/', '/malaphors/', '/game/'];

for (const path of PAGES) {
  test(`${path} CSP blocks injected inline scripts at runtime`, async ({ page }) => {
    await page.goto(path);

    const wasExecuted = await page.evaluate(() => {
      delete window.__cspTestPwn;
      try {
        const script = document.createElement('script');
        script.textContent = 'window.__cspTestPwn = true;';
        document.head.appendChild(script);
      } catch {
        return false;
      }
      return window.__cspTestPwn === true;
    });

    expect(wasExecuted, `CSP failed to block inline script injection on ${path}`).toBe(false);
  });

  test(`${path} CSP declares restrictive script-src directives`, async ({ page }) => {
    await page.goto(path);

    const csp = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .first()
      .getAttribute('content');

    expect(csp, `CSP meta tag missing on ${path}`).toBeTruthy();
    // script-src must be exactly 'self' — no 'unsafe-inline' or 'unsafe-eval'
    expect(csp).toMatch(/script-src 'self';/);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'none'");
    // style-src MUST keep 'unsafe-inline' — WebKit (Safari) applies this rule
    // to JS-driven element.style mutations (Chrome/Firefox don't). Removing it
    // breaks dynamic positioning in nav-layout.js and game.js on Safari.
    // See memory: project_csp_style_src_constraint.md.
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });
}
