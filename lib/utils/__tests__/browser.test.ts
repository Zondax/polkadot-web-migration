import { beforeEach, describe, expect, it, vi } from 'vitest'

import { isSafari } from '../browser'

// Mock global objects
const mockNavigator = {
  userAgent: '',
}

const mockWindow = {}

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  configurable: true,
})

Object.defineProperty(global, 'window', {
  value: mockWindow,
  configurable: true,
})

describe('browser utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset navigator userAgent
    mockNavigator.userAgent = ''
  })

  describe('isSafari', () => {
    it('should return false when window is undefined', () => {
      // @ts-expect-error Testing undefined window
      delete global.window

      const result = isSafari()

      expect(result).toBe(false)

      // Restore window
      Object.defineProperty(global, 'window', {
        value: mockWindow,
        configurable: true,
      })
    })

    it('should return false when navigator is undefined', () => {
      // @ts-expect-error Testing undefined navigator
      delete global.navigator

      const result = isSafari()

      expect(result).toBe(false)

      // Restore navigator
      Object.defineProperty(global, 'navigator', {
        value: mockNavigator,
        configurable: true,
      })
    })

    it('should return true for Safari on macOS', () => {
      mockNavigator.userAgent =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'

      const result = isSafari()

      expect(result).toBe(true)
    })

    it('should return true for Safari on iOS', () => {
      mockNavigator.userAgent =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1'

      const result = isSafari()

      expect(result).toBe(true)
    })

    it('should return true for Firefox on iOS (FxiOS)', () => {
      mockNavigator.userAgent =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/35.0.0 Mobile/15E148 Safari/605.1.15'

      const result = isSafari()

      expect(result).toBe(true)
    })

    it('should return false for Chrome', () => {
      mockNavigator.userAgent =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'

      const result = isSafari()

      expect(result).toBe(false)
    })

    it('should return false for Chrome on Android', () => {
      mockNavigator.userAgent =
        'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'

      const result = isSafari()

      expect(result).toBe(false)
    })

    it('should return false for Chromium', () => {
      mockNavigator.userAgent =
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/91.0.4472.124 Chrome/91.0.4472.124 Safari/537.36'

      const result = isSafari()

      expect(result).toBe(false)
    })

    it('should return false for Edge', () => {
      mockNavigator.userAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59'

      const result = isSafari()

      expect(result).toBe(false)
    })

    it('should return false for Opera', () => {
      mockNavigator.userAgent =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 OPR/77.0.4054.172'

      const result = isSafari()

      expect(result).toBe(false)
    })

    it('should return false for Firefox on desktop', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0'

      const result = isSafari()

      expect(result).toBe(false)
    })

    it('should return false for empty user agent', () => {
      mockNavigator.userAgent = ''

      const result = isSafari()

      expect(result).toBe(false)
    })

    it('should handle edge case with Safari in user agent but also Chrome', () => {
      // This shouldn't happen in real browsers but testing the logic
      mockNavigator.userAgent =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'

      const result = isSafari()

      expect(result).toBe(false)
    })

    it('should handle malformed user agent strings gracefully', () => {
      // TODO: review expectations - verify behavior with unusual user agent strings
      mockNavigator.userAgent = 'invalid-user-agent-string'

      const result = isSafari()

      expect(result).toBe(false)
    })
  })
})
