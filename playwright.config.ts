import { defineConfig, devices } from '@playwright/test';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4321);
const repository = process.env.GITHUB_REPOSITORY ?? '';
const [owner = '', repo = ''] = repository.split('/');
const isUserSite = repo === `${owner}.github.io`;
const base = repo && !isUserSite ? `/${repo}/` : '/';
const previewUrl = new URL(base, `http://127.0.0.1:${port}`).href;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: previewUrl,
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${port} --strict-port`,
    url: previewUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
