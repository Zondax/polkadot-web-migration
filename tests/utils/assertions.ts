import { BN } from '@polkadot/util'
import { expect } from 'vitest'
import type { Address, Native, Staking } from '@/state/types/ledger'

/**
 * Custom assertions for balance-related tests
 */

export function assertBalanceEquals(actual: BN | string, expected: BN | string, message?: string) {
  const actualBN = typeof actual === 'string' ? new BN(actual) : actual
  const expectedBN = typeof expected === 'string' ? new BN(expected) : expected

  expect(actualBN.toString()).toBe(expectedBN.toString())

  if (message && !actualBN.eq(expectedBN)) {
    throw new Error(message)
  }
}

export function assertBalanceGreaterThan(actual: BN, minimum: BN, message?: string) {
  const errorMsg = message || `Expected ${actual.toString()} to be greater than ${minimum.toString()}`
  expect(actual.gt(minimum)).toBe(true)
  if (!actual.gt(minimum)) {
    throw new Error(errorMsg)
  }
}

export function assertBalanceLessThan(actual: BN, maximum: BN, message?: string) {
  const errorMsg = message || `Expected ${actual.toString()} to be less than ${maximum.toString()}`
  expect(actual.lt(maximum)).toBe(true)
  if (!actual.lt(maximum)) {
    throw new Error(errorMsg)
  }
}

/**
 * Assert native balance structure
 */
export function assertNativeBalance(balance: Native, expected: Partial<Native>) {
  if (expected.free !== undefined) {
    assertBalanceEquals(balance.free, expected.free, 'Free balance mismatch')
  }

  if (expected.reserved !== undefined) {
    assertBalanceEquals(balance.reserved.total, expected.reserved.total, 'Reserved balance mismatch')
  }

  if (expected.frozen !== undefined) {
    assertBalanceEquals(balance.frozen, expected.frozen, 'Frozen balance mismatch')
  }
}

/**
 * Assert staking balance structure
 */
export function assertStakingBalance(
  staking: Staking | undefined,
  expected: {
    isStaking?: boolean
    total?: BN | string
    active?: BN | string
    unlockingCount?: number
    canUnstake?: boolean
  }
) {
  if (expected.isStaking !== undefined) {
    expect(!!staking).toBe(expected.isStaking)
  }

  if (!staking) return

  if (expected.total !== undefined && staking && staking.total) {
    assertBalanceEquals(staking.total, expected.total, 'Total staking mismatch')
  }

  if (expected.active !== undefined && staking && staking.active) {
    assertBalanceEquals(staking.active, expected.active, 'Active staking mismatch')
  }

  if (expected.unlockingCount !== undefined && staking.unlocking) {
    expect(staking.unlocking).toHaveLength(expected.unlockingCount)
  }

  if (expected.canUnstake !== undefined) {
    expect(staking.canUnstake).toBe(expected.canUnstake)
  }
}

/**
 * Assert account structure
 */
export function assertAccount(
  account: Address,
  expected: {
    address?: string
    path?: string
    hasBalance?: boolean
    hasStaking?: boolean
    hasIdentity?: boolean
    hasProxy?: boolean
    hasMultisig?: boolean
  }
) {
  if (expected.address !== undefined) {
    expect(account.address).toBe(expected.address)
  }

  if (expected.path !== undefined) {
    expect(account.path).toBe(expected.path)
  }

  if (expected.hasBalance !== undefined) {
    const nativeBalance = account.balances?.find(b => b.type === 'native') as any
    const hasBalance = nativeBalance?.balance && (nativeBalance.balance.free.gtn(0) || nativeBalance.balance.reserved.total.gtn(0))
    expect(!!hasBalance).toBe(expected.hasBalance)
  }

  if (expected.hasStaking !== undefined) {
    const nativeBalance = account.balances?.find(b => b.type === 'native') as any
    expect(!!nativeBalance?.balance?.staking).toBe(expected.hasStaking)
  }

  if (expected.hasIdentity !== undefined) {
    expect(!!account.registration).toBe(expected.hasIdentity)
  }

  if (expected.hasProxy !== undefined) {
    expect(!!account.proxy).toBe(expected.hasProxy)
  }

  if (expected.hasMultisig !== undefined) {
    expect(!!account.memberMultisigAddresses?.length).toBe(expected.hasMultisig)
  }
}

/**
 * Assert transaction fee is reasonable
 */
export function assertReasonableFee(fee: BN, maxFeeInDOT = 1) {
  const maxFee = new BN(maxFeeInDOT * 10_000_000_000) // Convert DOT to planck
  assertBalanceLessThan(fee, maxFee, `Fee ${fee.toString()} exceeds maximum reasonable fee of ${maxFeeInDOT} DOT`)

  // Also check it's not zero (unless explicitly testing zero fees)
  if (!fee.isZero()) {
    assertBalanceGreaterThan(
      fee,
      new BN(1_000_000), // Minimum fee should be at least 0.0001 DOT
      'Fee seems unreasonably low'
    )
  }
}

/**
 * Assert element is visible and enabled
 */
export function assertInteractable(element: HTMLElement) {
  expect(element).toBeInTheDocument()
  expect(element).toBeVisible()
  expect(element).toBeEnabled()
  expect(element).not.toHaveAttribute('aria-disabled', 'true')
}

/**
 * Assert element is visible but disabled
 */
export function assertDisabled(element: HTMLElement) {
  expect(element).toBeInTheDocument()
  expect(element).toBeVisible()
  expect(element).toBeDisabled()
}

/**
 * Assert error message is displayed
 */
export function assertErrorMessage(container: HTMLElement, errorPattern: string | RegExp) {
  const errorElement = container.querySelector('[role="alert"], [data-testid*="error"]')
  expect(errorElement).toBeInTheDocument()

  if (typeof errorPattern === 'string') {
    expect(errorElement).toHaveTextContent(errorPattern)
  } else {
    expect(errorElement?.textContent).toMatch(errorPattern)
  }
}

/**
 * Assert loading state
 */
export function assertLoadingState(container: HTMLElement, isLoading = true) {
  const loadingElements = container.querySelectorAll('[data-testid*="loading"], [data-testid*="spinner"], .animate-pulse')

  if (isLoading) {
    expect(loadingElements.length).toBeGreaterThan(0)
  } else {
    expect(loadingElements.length).toBe(0)
  }
}
