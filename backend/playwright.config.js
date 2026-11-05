const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node src/index.js',
      cwd: __dirname,
      url: 'http://127.0.0.1:3000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        ...process.env,
        NODE_ENV: 'e2e',
        PORT: '3000',
      },
    },
    {
      command: 'python3 -m http.server 4173 --directory ../frontend/pages',
      cwd: __dirname,
      url: 'http://127.0.0.1:4173/index.html',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
