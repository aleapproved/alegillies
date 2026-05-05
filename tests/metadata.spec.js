import { test, expect } from '@playwright/test';

const INDEXABLE_PAGES = [
  { path: '/', title: 'Alessandro Gillies — Product Manager' },
  { path: '/cv/', title: 'Alessandro Gillies — CV' },
  { path: '/contact/', title: 'Alessandro Gillies — Contact' },
  { path: '/malaphors/', title: 'Alessandro Gillies — Malaphors' },
];

const HIDDEN_PAGES = [
  { path: '/game/', title: 'Alessandro Gillies — Game' },
];

const ALL_PAGES = [...INDEXABLE_PAGES, ...HIDDEN_PAGES];

const BASE = 'https://alessandrogillies.com';

for (const { path, title } of ALL_PAGES) {
  test(`${path} has all social/SEO metadata`, async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium-desktop',
      'Metadata content is identical across browsers; checking once is enough'
    );

    await page.goto(path);

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBe(`${BASE}${path}`);

    // <title>, og:title, and twitter:title must all agree
    const pageTitle = await page.title();
    expect(pageTitle).toBe(title);

    expect(await ogContent(page, 'og:title')).toBe(title);
    expect(await ogContent(page, 'og:url')).toBe(`${BASE}${path}`);
    expect(await ogContent(page, 'og:image')).toBe(`${BASE}/social-card.jpg`);
    expect(await ogContent(page, 'og:type')).toBe('website');

    expect(await twitterContent(page, 'twitter:card')).toBe('summary_large_image');
    expect(await twitterContent(page, 'twitter:title')).toBe(title);
    expect(await twitterContent(page, 'twitter:image')).toBe(`${BASE}/social-card.jpg`);

    // Descriptions are intentionally omitted — we let chat previews show
    // image+title only and let Google auto-generate search snippets from
    // page content. Re-introducing a description here is a deliberate
    // editorial choice, not an accidental drift.
    await expect(page.locator('meta[name="description"]')).toHaveCount(0);
    await expect(page.locator('meta[property="og:description"]')).toHaveCount(0);
    await expect(page.locator('meta[name="twitter:description"]')).toHaveCount(0);
  });
}

test('robots.txt exists and references sitemap', async ({ request }) => {
  const res = await request.get('/robots.txt');
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain('User-agent: *');
  expect(body).toContain(`Sitemap: ${BASE}/sitemap.xml`);
});

test('sitemap.xml exists and lists indexable pages only', async ({ request }) => {
  const res = await request.get('/sitemap.xml');
  expect(res.status()).toBe(200);
  const body = await res.text();
  for (const { path } of INDEXABLE_PAGES) {
    expect(body).toContain(`${BASE}${path}`);
  }
  for (const { path } of HIDDEN_PAGES) {
    expect(body).not.toContain(`${BASE}${path}`);
  }
});

test('indexable pages do not have robots noindex', async ({ page }) => {
  for (const { path } of INDEXABLE_PAGES) {
    await page.goto(path);
    await expect(
      page.locator('meta[name="robots"][content*="noindex"]'),
      `${path} should not have noindex`
    ).toHaveCount(0);
  }
});

test('hidden pages have robots noindex', async ({ page }) => {
  for (const { path } of HIDDEN_PAGES) {
    await page.goto(path);
    await expect(
      page.locator('meta[name="robots"][content*="noindex"]'),
      `${path} should have noindex`
    ).toHaveCount(1);
  }
});

test('home page has JSON-LD Person schema', async ({ page }) => {
  await page.goto('/');
  const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(ld).toBeTruthy();
  const data = JSON.parse(ld);
  expect(data['@type']).toBe('Person');
  expect(data.name).toBe('Alessandro Gillies');
  expect(data.url).toBe(`${BASE}/`);
  expect(data.image).toBe(`${BASE}/social-card.jpg`);
});

async function ogContent(page, property) {
  return await page.locator(`meta[property="${property}"]`).getAttribute('content');
}

async function twitterContent(page, name) {
  return await page.locator(`meta[name="${name}"]`).getAttribute('content');
}
