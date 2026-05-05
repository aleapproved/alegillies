import { test } from '@playwright/test';
import { HtmlValidate } from 'html-validate';

const PAGES = ['/', '/cv/', '/contact/', '/malaphors/', '/game/'];

const validator = new HtmlValidate({
  extends: ['html-validate:recommended'],
  rules: {
    'doctype-style': 'off',
    'void-style': 'off',
    'no-inline-style': 'off',
    'attr-quotes': 'off',
    'long-title': 'off',
    'no-trailing-whitespace': 'off',
  },
});

for (const path of PAGES) {
  test(`${path} is valid HTML`, async ({ request, browserName }, testInfo) => {
    test.skip(
      browserName !== 'chromium' || testInfo.project.name !== 'chromium-desktop',
      'HTML validation runs once on chromium-desktop'
    );

    const response = await request.get(`http://localhost:8000${path}`);
    const html = await response.text();
    const result = await validator.validateString(html);

    if (!result.valid) {
      const errors = result.results.flatMap(r =>
        r.messages.map(m => `${m.line}:${m.column} ${m.ruleId}: ${m.message}`)
      );
      throw new Error(`HTML validation errors on ${path}:\n${errors.join('\n')}`);
    }
  });
}
