import { expect, type Page, test } from '@playwright/test'

/**
 * Main flow without a Ledger device: landing page → "Start Migration" → /migrate → "Connect". Fails on any console
 * error, uncaught exception or failed request, which is how Worker-only breakage (missing Node globals in the
 * browser bundle, unresolved modules, blocked requests) shows up.
 */
function collectProblems(page: Page) {
  const problems: string[] = []
  page.on('console', message => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`)
  })
  page.on('pageerror', error => problems.push(`pageerror: ${error.message}`))
  page.on('requestfailed', request => problems.push(`requestfailed: ${request.url()} ${request.failure()?.errorText ?? ''}`))
  return problems
}

test('landing page and the migration flow render without errors', async ({ page }) => {
  const problems = collectProblems(page)

  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page).toHaveTitle(/Polkadot Migration/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Polkadot Ledger Migration Assistant')

  await page.getByText('Start Migration', { exact: true }).first().click()
  await page.waitForURL(/\/migrate$/)
  await expect(page.getByText('Connect Your Device')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Connect', exact: true })).toBeVisible()
  await page.waitForLoadState('networkidle')

  // No device in CI: the app must report it instead of crashing.
  await page.getByRole('button', { name: 'Connect', exact: true }).click()
  await expect(page.getByText('Ledger Connection Issue')).toBeVisible()

  expect(problems).toEqual([])
})
