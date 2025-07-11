import { act, waitFor } from '@testing-library/react'
import { expect } from 'vitest'
import type { Address } from '@/state/types/ledger'
import { TEST_PATHS, createTestAddress } from '../fixtures/addresses'

/**
 * Wait for async updates with proper act wrapper
 */
export async function waitForAsync(callback?: () => void) {
  await act(async () => {
    if (callback) callback()
    await new Promise(resolve => setTimeout(resolve, 0))
  })
}

/**
 * Create a test account with all required fields
 */
export function createTestAccount(overrides?: Partial<Address>): Address {
  const testAddress = createTestAddress()

  return {
    address: testAddress.address,
    path: testAddress.path,
    pubKey: testAddress.pubKey,
    selected: false,
    ...overrides,
  }
}

/**
 * Create multiple test accounts
 */
export function createTestAccounts(count: number): Address[] {
  // Import TEST_ADDRESSES when needed
  const { TEST_ADDRESSES } = require('../fixtures/addresses')
  const addresses = Object.values(TEST_ADDRESSES).slice(0, count)

  return addresses.map((address, index) =>
    createTestAccount({
      address: address as string,
      path: `${TEST_PATHS.DEFAULT.slice(0, -2)}${index}'`,
    })
  )
}

/**
 * Simulate user typing in an input field
 */
export async function typeInInput(element: HTMLElement, value: string, options?: { delay?: number }) {
  const input = element as HTMLInputElement

  // Clear existing value
  input.value = ''

  // Type each character
  for (const char of value) {
    await act(async () => {
      input.value += char
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))

      if (options?.delay) {
        await new Promise(resolve => setTimeout(resolve, options.delay))
      }
    })
  }
}

/**
 * Wait for loading state to complete
 */
export async function waitForLoadingToComplete(getByTestId: (id: string) => HTMLElement, loadingTestId = 'loading-spinner') {
  await waitFor(() => {
    expect(() => getByTestId(loadingTestId)).toThrow()
  })
}

/**
 * Assert element has expected classes
 */
export function expectToHaveClasses(element: HTMLElement, ...classes: string[]) {
  for (const className of classes) {
    expect(element).toHaveClass(className)
  }
}

/**
 * Assert element does not have classes
 */
export function expectNotToHaveClasses(element: HTMLElement, ...classes: string[]) {
  for (const className of classes) {
    expect(element).not.toHaveClass(className)
  }
}

/**
 * Get all elements matching a test id pattern
 */
export function getAllByTestIdPattern(container: HTMLElement, pattern: string): HTMLElement[] {
  return Array.from(container.querySelectorAll(`[data-testid*="${pattern}"]`)) as HTMLElement[]
}

/**
 * Mock successful API call
 */
export function mockSuccessfulApiCall<T>(data: T) {
  return Promise.resolve({
    ok: true,
    json: async () => data,
  })
}

/**
 * Mock failed API call
 */
export function mockFailedApiCall(error = 'API Error') {
  return Promise.reject(new Error(error))
}

/**
 * Create a mock transaction result
 */
export function createMockTransactionResult(success = true, hash = '0x123456') {
  return {
    status: {
      isFinalized: success,
      isInBlock: success,
      asFinalized: { toHex: () => hash },
    },
    events: [],
    txHash: { toHex: () => hash },
  }
}

/**
 * Assert that async function throws specific error
 */
export async function expectAsyncToThrow(asyncFn: () => Promise<any>, expectedError?: string | RegExp) {
  let error: Error | undefined

  try {
    await asyncFn()
  } catch (e) {
    error = e as Error
  }

  expect(error).toBeDefined()

  if (expectedError) {
    if (typeof expectedError === 'string') {
      expect(error?.message).toBe(expectedError)
    } else {
      expect(error?.message).toMatch(expectedError)
    }
  }
}
