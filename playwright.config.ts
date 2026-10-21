import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.ts',
  reporter: 'list',
  use: { baseURL: 'http://localhost:8080' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npm run build && npm start',
    url: 'http://localhost:8080/api/health',
    reuseExistingServer: false,
    env: { NODE_ENV: 'production', GEMINI_API_KEY: '' },
    timeout: 120_000,
  },
});
