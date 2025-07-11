// Extend the expect interface with custom matchers
import { beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Check if window exists before mocking browser APIs
if (typeof window !== 'undefined') {
  // Mocking browser APIs that might not be available in the test environment
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  // Mock IntersectionObserver
  class MockIntersectionObserver {
    readonly root: Element | null = null
    readonly rootMargin: string = ''
    readonly thresholds: ReadonlyArray<number> = []

    constructor() {
      this.observe = vi.fn()
      this.unobserve = vi.fn()
      this.disconnect = vi.fn()
    }

    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  }

  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  })

  // Mock ResizeObserver
  class MockResizeObserver {
    constructor() {
      this.observe = vi.fn()
      this.unobserve = vi.fn()
      this.disconnect = vi.fn()
    }

    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  }

  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    configurable: true,
    value: MockResizeObserver,
  })

  // Mock Web Animations API
  if (typeof Element !== 'undefined' && Element?.prototype) {
    Element.prototype.animate = vi.fn().mockReturnValue({
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      updatePlaybackRate: vi.fn(),
      pause: vi.fn(),
      play: vi.fn(),
      finish: vi.fn(),
    })
  }
}

// Mock Fetch API
global.fetch = vi.fn()

// Suppress console errors during tests
const originalConsoleError = console.error
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
      args[0].includes('Warning: React.createFactory') ||
      args[0].includes('Warning: validateDOMNesting'))
  ) {
    return
  }
  originalConsoleError(...args)
}

// Add a global beforeEach to reset mocks
beforeEach(() => {
  vi.clearAllMocks()
})
