import { type RenderOptions, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { vi } from 'vitest'

// Mock for window.matchMedia
export function setupMatchMedia(matches = true) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

// Mock for IntersectionObserver
export function setupIntersectionObserver() {
  const mockIntersectionObserver = vi.fn()
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  })
  window.IntersectionObserver = mockIntersectionObserver as any
}

// Mock for ResizeObserver
export function setupResizeObserver() {
  const mockResizeObserver = vi.fn()
  mockResizeObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  })
  window.ResizeObserver = mockResizeObserver as any
}

// Mock for fetch
export function setupFetchMock(response: any = {}, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    json: vi.fn().mockResolvedValue(response),
    text: vi.fn().mockResolvedValue(JSON.stringify(response)),
    status,
    ok: status >= 200 && status < 300,
  }) as any
}

// Custom render function with providers if needed
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Custom options could be added here when needed
  testId?: string // Adding a member to avoid empty interface error
}

export function customRender(ui: ReactElement, options?: CustomRenderOptions) {
  return render(ui, {
    // You can provide wrapper components here if needed
    // wrapper: ({ children }) => (
    //   <SomeProvider>{children}</SomeProvider>
    // ),
    ...options,
  })
}

// Mock localStorage
export function setupLocalStorageMock() {
  const localStorageMock = (() => {
    let store: Record<string, string> = {}
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value.toString()
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key]
      }),
      clear: vi.fn(() => {
        store = {}
      }),
      key: vi.fn((index: number) => Object.keys(store)[index] || null),
      length: Object.keys(store).length,
    }
  })()

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  })

  return localStorageMock
}

// Helper to wait for promises to resolve
export const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))
