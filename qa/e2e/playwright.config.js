import { defineConfig, devices } from '@playwright/test';

// Tests système (E2E) — l'application doit tourner : frontend :5173, backend :8081, PostgreSQL :5433
export default defineConfig({
  testDir: './specs',
  globalSetup: './global-setup.js',
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: '../results/playwright-report', open: 'never' }],
    ['json', { outputFile: '../results/playwright.json' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'fr-FR',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, grepInvert: /@mobile/ },
    { name: 'chromium-mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
});
