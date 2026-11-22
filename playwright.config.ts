import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:3146';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE },
  },
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3146',
    url: baseURL,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  },
});
