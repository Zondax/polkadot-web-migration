import { defineConfig, devices } from '@playwright/test'

/**
 * MIGRATION_TARGET=worker runs the suite against the vinext Worker build (`pnpm preview:cf`, port 3300; build it
 * first with `pnpm build:cloudflare`). Default: the Next dev server (`pnpm dev`, port 3000).
 * PLAYWRIGHT_BASE_URL points at an already running server instead and starts nothing.
 */
const worker = process.env.MIGRATION_TARGET === 'worker'
const port = worker ? 3300 : 3000
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL
const baseURL = externalBaseURL ?? (worker ? `http://127.0.0.1:${port}` : `http://localhost:${port}`)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: worker ? 'pnpm preview:cf' : 'pnpm dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
      },
})
