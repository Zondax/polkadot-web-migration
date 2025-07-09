import type { AppConfig } from 'config/apps'

import type { Address, MultisigAddress } from 'state/types/ledger'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { filterAccountsWithBalance, hasValidBalance, processAccountsForApp } from '../account-processing.service'

// Mock dependencies
vi.mock('@/lib/account', () => ({
  getBalance: vi.fn(),
  getIdentityInfo: vi.fn(),
  getProxyInfo: vi.fn(),
  getIndexInfo: vi.fn(),
  getMultisigAddresses: vi.fn(),
}))

vi.mock('@/lib/utils/error', () => ({
  InternalError: vi.fn().mockImplementation((errorType: string, context: any) => ({
    errorType,
    title: 'Test Error',
    description: 'Test error description',
    name: errorType,
    message: 'Test error',
    context,
  })),
}))

vi.mock('@/lib/utils/balance', () => ({
  hasAddressBalance: vi.fn(),
  hasBalance: vi.fn(),
}))

vi.mock('@/lib/utils/address', () => ({
  convertSS58Format: vi.fn((address: string) => address),
}))

vi.mock('config/mockData', () => ({
  errorApps: [],
}))

describe('Account Processing Service', () => {
  const mockApp: AppConfig = {
    id: 'polkadot',
    name: 'Polkadot',
    rpcEndpoint: 'wss://rpc.polkadot.io',
    token: { symbol: 'DOT', decimals: 10 },
    bip44Path: "m/44'/354'/0'/0/0",
    ss58Prefix: 0,
  }

  const mockApi = {
    query: {},
    registry: { chainDecimals: [10], chainTokens: ['DOT'] },
  } as any

  const mockAddress: Address = {
    address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    path: "m/44'/354'/0'/0'/0'",
    pubKey: '0x123456789abcdef',
    balances: [],
  }

  const mockMultisigAddress: MultisigAddress = {
    address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    path: "m/44'/354'/0'/0'/0'",
    pubKey: '0x123456789abcdef',
    balances: [],
    members: [],
    threshold: 1,
    pendingMultisigCalls: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('processAccountsForApp', () => {
    it('should process accounts for an app successfully', async () => {
      const { getBalance, getIdentityInfo, getProxyInfo, getIndexInfo, getMultisigAddresses } = await import('@/lib/account')

      const mockBalance = {
        balances: [],
        collections: { uniques: [], nfts: [] },
        error: undefined,
      }

      vi.mocked(getBalance).mockResolvedValue(mockBalance)
      vi.mocked(getIdentityInfo).mockResolvedValue(undefined)
      vi.mocked(getProxyInfo).mockResolvedValue(undefined)
      vi.mocked(getIndexInfo).mockResolvedValue(undefined)
      vi.mocked(getMultisigAddresses).mockResolvedValue([])

      const addresses = [mockAddress]
      const polkadotAddresses = ['5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty']

      const result = await processAccountsForApp(addresses, mockApp, mockApi, polkadotAddresses, true)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.accounts).toBeDefined()
      expect(result.data?.multisigAccounts).toBeDefined()
      expect(result.data?.collections).toBeDefined()

      expect(getBalance).toHaveBeenCalled()
      expect(getIdentityInfo).toHaveBeenCalled()
      expect(getProxyInfo).toHaveBeenCalled()
      expect(getIndexInfo).toHaveBeenCalled()
    })

    it('should handle API errors and throw error', async () => {
      const { getBalance } = await import('@/lib/account')

      const error = new Error('API connection failed')
      vi.mocked(getBalance).mockRejectedValue(error)

      const addresses = [mockAddress]
      const polkadotAddresses = ['5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty']

      await expect(processAccountsForApp(addresses, mockApp, mockApi, polkadotAddresses, true)).rejects.toThrow()
    })

    it('should handle development mode error simulation', async () => {
      const originalEnv = process.env.NEXT_PUBLIC_NODE_ENV
      process.env.NEXT_PUBLIC_NODE_ENV = 'development'

      // Mock errorApps to include polkadot
      vi.doMock('config/mockData', () => ({
        errorApps: ['polkadot'],
      }))

      const addresses = [mockAddress]
      const polkadotAddresses = ['5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty']

      await expect(processAccountsForApp(addresses, mockApp, mockApi, polkadotAddresses, true)).rejects.toThrow()

      process.env.NEXT_PUBLIC_NODE_ENV = originalEnv
    })
  })

  describe('hasValidBalance', () => {
    it('should return true for account with valid balance', async () => {
      const { hasAddressBalance } = await import('@/lib/utils/balance')
      vi.mocked(hasAddressBalance).mockReturnValue(true)

      const result = hasValidBalance(mockAddress)

      expect(result).toBe(true)
      expect(hasAddressBalance).toHaveBeenCalledWith(mockAddress)
    })

    it('should return false for account without valid balance', async () => {
      const { hasAddressBalance } = await import('@/lib/utils/balance')
      vi.mocked(hasAddressBalance).mockReturnValue(false)

      const result = hasValidBalance(mockAddress)

      expect(result).toBe(false)
      expect(hasAddressBalance).toHaveBeenCalledWith(mockAddress)
    })

    it('should work with multisig addresses', async () => {
      const { hasAddressBalance } = await import('@/lib/utils/balance')
      vi.mocked(hasAddressBalance).mockReturnValue(true)

      const result = hasValidBalance(mockMultisigAddress)

      expect(result).toBe(true)
      expect(hasAddressBalance).toHaveBeenCalledWith(mockMultisigAddress)
    })
  })

  describe('filterAccountsWithBalance', () => {
    it('should filter accounts with valid balance', async () => {
      const { hasAddressBalance } = await import('@/lib/utils/balance')

      const accountWithBalance = { ...mockAddress, address: 'addr1' }
      const accountWithoutBalance = { ...mockAddress, address: 'addr2' }

      vi.mocked(hasAddressBalance)
        .mockReturnValueOnce(true) // First account has balance
        .mockReturnValueOnce(false) // Second account has no balance

      const accounts = [accountWithBalance, accountWithoutBalance]
      const result = filterAccountsWithBalance(accounts)

      expect(result).toHaveLength(1)
      expect(result[0].address).toBe('addr1')
    })

    it('should return empty array when no accounts have balance', async () => {
      const { hasAddressBalance } = await import('@/lib/utils/balance')
      vi.mocked(hasAddressBalance).mockReturnValue(false)

      const accounts = [mockAddress]
      const result = filterAccountsWithBalance(accounts)

      expect(result).toHaveLength(0)
    })

    it('should return all accounts when all have balance', async () => {
      const { hasAddressBalance } = await import('@/lib/utils/balance')
      vi.mocked(hasAddressBalance).mockReturnValue(true)

      const accounts = [mockAddress, mockMultisigAddress]
      const result = filterAccountsWithBalance(accounts)

      expect(result).toHaveLength(2)
    })

    it('should handle empty accounts array', () => {
      const result = filterAccountsWithBalance([])

      expect(result).toEqual([])
    })

    it('should work with mixed account types', async () => {
      const { hasAddressBalance } = await import('@/lib/utils/balance')

      vi.mocked(hasAddressBalance)
        .mockReturnValueOnce(true) // Regular account has balance
        .mockReturnValueOnce(false) // Multisig account has no balance

      const accounts = [mockAddress, mockMultisigAddress]
      const result = filterAccountsWithBalance(accounts)

      expect(result).toHaveLength(1)
      expect(result[0]).toBe(mockAddress)
    })
  })
})
