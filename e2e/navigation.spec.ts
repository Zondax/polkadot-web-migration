import { expect, test } from '@playwright/test'

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the homepage
    await page.goto('/')
  })

  test('should navigate between main sections', async ({ page }) => {
    // Check that we're on the homepage
    await expect(page).toHaveTitle(/Polkadot Migration/)

    // Find all main navigation links (adjust selector as needed)
    const navLinks = page.locator('nav a')
    const count = await navLinks.count()

    // If there are navigation links, test clicking them
    if (count > 0) {
      // Test each navigation link
      for (let i = 0; i < count; i++) {
        const _linkText = await navLinks.nth(i).textContent()
        const href = await navLinks.nth(i).getAttribute('href')

        // Skip external links
        if (href && (href.startsWith('http:') || href.startsWith('https:'))) {
          continue
        }

        // Click the navigation link
        await navLinks.nth(i).click()

        // Wait for navigation to complete
        await page.waitForLoadState('networkidle')

        // Verify navigation was successful (URL changed)
        if (href && href !== '/') {
          expect(page.url()).toContain(href)
        }

        // Go back to homepage for next test
        await page.goto('/')
      }
    }
  })

  test('should show active state for current page in navigation', async ({ page }) => {
    // Find all main navigation links
    const navLinks = page.locator('nav a')
    const count = await navLinks.count()

    if (count > 0) {
      // For each link, navigate to it and check if it gets the active state
      for (let i = 0; i < count; i++) {
        const href = await navLinks.nth(i).getAttribute('href')

        // Skip external links
        if (href && (href.startsWith('http:') || href.startsWith('https:'))) {
          continue
        }

        // Skip if it's not a page link
        if (!href || href === '#') {
          continue
        }

        // Navigate to the page
        await page.goto(href)

        // Wait for navigation to complete
        await page.waitForLoadState('networkidle')

        // Check if the current link has the active state
        // Adjust the active class/attribute according to your implementation
        const activeLink = page.locator(`nav a[href="${href}"]`)

        // Check for active state - this could be a class, aria-current, or data attribute
        // Try multiple possible active indicators
        const hasActiveClass = await activeLink.evaluate(
          el =>
            el.classList.contains('active') ||
            el.classList.contains('selected') ||
            el.getAttribute('aria-current') === 'page' ||
            el.getAttribute('data-active') === 'true'
        )

        expect(hasActiveClass).toBeTruthy()
      }
    }
  })

  test('should handle back and forward browser navigation', async ({ page }) => {
    // Start on homepage
    const homeUrl = page.url()

    // Find a navigation link to click (adjust selector as needed)
    const navLinks = page.locator('nav a')
    const count = await navLinks.count()

    if (count > 0) {
      // Get the first internal link
      for (let i = 0; i < count; i++) {
        const href = await navLinks.nth(i).getAttribute('href')

        // Skip external links and non-navigational links
        if (!href || href === '#' || href.startsWith('http:') || href.startsWith('https:')) {
          continue
        }

        // Click the link to navigate
        await navLinks.nth(i).click()
        await page.waitForLoadState('networkidle')

        // Store the second page URL
        const secondPageUrl = page.url()

        // Go back
        await page.goBack()
        await page.waitForLoadState('networkidle')

        // Check we're back at the homepage
        expect(page.url()).toBe(homeUrl)

        // Go forward
        await page.goForward()
        await page.waitForLoadState('networkidle')

        // Check we're back at the second page
        expect(page.url()).toBe(secondPageUrl)

        // Only test the first valid navigation link
        break
      }
    }
  })
})
