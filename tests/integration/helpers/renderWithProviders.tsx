import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { vi } from 'vitest'

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

//Add here any mock providers

export function renderWithProviders(ui: ReactElement) {
  return render(ui)
}
