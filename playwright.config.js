import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
      grepInvert: /@mobile/,
    },
    {
      name: 'firefox-desktop',
      use: { ...devices['Desktop Firefox'] },
      grepInvert: /@mobile/,
    },
    {
      name: 'webkit-desktop',
      use: { ...devices['Desktop Safari'] },
      grepInvert: /@mobile/,
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 7'] },
      grepInvert: /@desktop/,
    },
    {
      name: 'webkit-mobile',
      use: { ...devices['iPhone 14'] },
      grepInvert: /@desktop/,
    },
  ],
  webServer: {
    command: 'npm run serve',
    url: 'http://localhost:8000',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
