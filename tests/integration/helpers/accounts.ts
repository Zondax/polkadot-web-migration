import { BalanceType } from 'state/types/ledger'
import { vi } from 'vitest'
import { mockNativeBalance, mockNftCollections } from '../mocks/ledger'
import { mockUniquesNfts } from '../mocks/ledger'
import { mockUniquesCollections } from '../mocks/ledger'
import { mockNfts } from '../mocks/ledger'

import { mockApi, mockWsProvider } from '../mocks/api'

// Mock getApiAndProvider function
export function mockGetApiAndProvider() {
  vi.mock('lib/account', async () => {
    const actual = await vi.importActual('lib/account')
    return {
      ...actual,
      getApiAndProvider: vi.fn().mockResolvedValue({ api: mockApi, provider: mockWsProvider }),
    }
  })
}

// Mock getNativeBalance
export function mockGetNativeBalance() {
  const mod = require('@/lib/account')
  vi.spyOn(mod, 'getNativeBalance').mockResolvedValue(mockNativeBalance)
}

// Mock getUniquesOwnedByAccount
export function mockGetUniquesOwnedByAccount() {
  const mod = require('@/lib/account')
  vi.spyOn(mod, 'getUniquesOwnedByAccount').mockResolvedValue({
    nfts: mockUniquesNfts,
    collections: mockUniquesCollections,
  })
}

// Mock getNFTsOwnedByAccount
export function mockGetNFTsOwnedByAccount() {
  const mod = require('@/lib/account')
  vi.spyOn(mod, 'getNFTsOwnedByAccount').mockResolvedValue({
    nfts: mockNfts,
    collections: mockNftCollections,
  })
}

// Mock getBalance
export function mockGetBalance() {
  vi.mock('@/lib/account', async () => {
    const actual = await vi.importActual('@/lib/account')
    return {
      ...actual,
      getBalance: vi.fn().mockResolvedValue({
        balances: [{ type: BalanceType.NATIVE, balance: mockNativeBalance }],
      }),
    }
  })
}

// Mock getBalance with computing state (never resolving)
export function mockGetBalanceComputing() {
  vi.mock('@/lib/account', async () => {
    const actual = await vi.importActual('@/lib/account')
    return {
      ...actual,
      getBalance: vi.fn().mockImplementation(async () => {
        // Return a promise that never resolves to simulate computing state
        await new Promise(resolve => setTimeout(resolve, 10000)) // 10 seconds
        return {
          balances: [{ type: BalanceType.NATIVE, balance: mockNativeBalance }],
        }
      }),
    }
  })
}

// Mock getBalance with error
export function mockGetBalanceWithError() {
  const mod = require('@/lib/account')

  vi.spyOn(mod, 'getBalance').mockImplementation(async (_address, _api, _appId) => {
    return {
      balances: [],
      collections: {
        uniques: [],
        nfts: [],
      },
      error: 'Error fetching balance',
    }
  })
}
