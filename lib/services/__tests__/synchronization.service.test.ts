import type { AppConfig } from 'config/apps'

import { AppStatus } from 'state/ledger'
import type { Address } from 'state/types/ledger'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  scanAppWithCustomIndices,
  synchronizeAllApps,
  synchronizeAppAccounts,
  synchronizePolkadotAccounts,
} from '../synchronization.service'

// Mock dependencies
vi.mock('state/client/ledger', () => ({
  ledgerClient: {
    synchronizeAccounts: vi.fn(),
    synchronizeAccountsWithIndices: vi.fn(),
  },
}))

vi.mock('../account-processing.service', () => ({
  processAccountsForApp: vi.fn(),
}))

vi.mock('@/lib/utils/error', () => {
  class MockInternalError extends Error {
    constructor(
      public errorType: string,
      public context: any
    ) {
      super('Test error')
      this.name = errorType
      this.title = 'Test Error'
      this.description = 'Test error description'
    }

    title: string
    description: string
  }

  return {
    InternalError: MockInternalError,
    InternalErrorType: {
      SYNC_ERROR: 'sync_error',
      FAILED_TO_CONNECT_TO_BLOCKCHAIN: 'failed_to_connect_to_blockchain',
    },
  }
})

vi.mock('@/lib/utils', () => ({
  interpretError: vi.fn((error: any, type: string) => ({
    errorType: type,
    title: 'Interpreted Error',
    description: error.message || 'An error occurred',
    name: 'InterpretedError',
    message: error.message || 'An error occurred',
  })),
}))

vi.mock('config/apps', () => ({
  appsConfigs: new Map([
    [
      'polkadot',
      {
        id: 'polkadot',
        name: 'Polkadot',
        rpcEndpoints: ['wss://rpc.polkadot.io'],
        token: { symbol: 'DOT', decimals: 10 },
        bip44Path: "m/44'/354'/0'/0/0",
        ss58Prefix: 0,
      },
    ],
    [
      'kusama',
      {
        id: 'kusama',
        name: 'Kusama',
        rpcEndpoints: ['wss://kusama-rpc.polkadot.io'],
        token: { symbol: 'KSM', decimals: 12 },
        bip44Path: "m/44'/434'/0'/0/0",
        ss58Prefix: 2,
      },
    ],
  ]),
  polkadotAppConfig: {
    id: 'polkadot',
    name: 'Polkadot',
    rpcEndpoints: ['wss://rpc.polkadot.io'],
    token: { symbol: 'DOT', decimals: 10 },
    bip44Path: "m/44'/354'/0'/0/0",
    ss58Prefix: 0,
  },
}))

vi.mock('config/mockData', () => ({
  syncApps: ['polkadot', 'kusama'],
  errorApps: [],
}))

vi.mock('state/notifications', () => ({
  notifications$: {
    push: vi.fn(),
  },
}))

vi.mock('@/lib/account', () => ({
  getApiAndProvider: vi.fn().mockResolvedValue({
    api: {
      disconnect: vi.fn(),
    },
    provider: {
      disconnect: vi.fn(),
    },
  }),
}))

describe('Synchronization Service', () => {
  const mockApp: AppConfig = {
    id: 'polkadot',
    name: 'Polkadot',
    rpcEndpoints: ['wss://rpc.polkadot.io'],
    token: { symbol: 'DOT', decimals: 10 },
    bip44Path: "m/44'/354'/0'/0/0",
    ss58Prefix: 0,
  }

  const mockAddress: Address = {
    address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    path: "m/44'/354'/0'/0'/0'",
    pubKey: '0x123456789abcdef',
    balances: [],
  }

  const _mockConnection = {
    isAppOpen: true,
    deviceInfo: { name: 'Test Device' },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('synchronizeAppAccounts', () => {
    it('should synchronize accounts for an app successfully', async () => {
      const { ledgerClient } = await import('state/client/ledger')
      const { processAccountsForApp } = await import('../account-processing.service')

      const mockSyncResult = {
        result: [{ address: mockAddress.address, path: mockAddress.path, pubKey: mockAddress.pubKey }],
      }

      const mockResult = {
        success: true,
        data: {
          accounts: [mockAddress],
          multisigAccounts: [],
          collections: { uniques: new Map(), nfts: new Map() },
          polkadotAddressesForApp: ['5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'],
        },
      }

      vi.mocked(ledgerClient.synchronizeAccounts).mockResolvedValueOnce(mockSyncResult)
      vi.mocked(processAccountsForApp).mockResolvedValueOnce(mockResult)

      const polkadotAddresses = ['5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty']
      const result = await synchronizeAppAccounts(mockApp, polkadotAddresses, true)

      expect(result.app.id).toBe(mockApp.id)
      expect(result.app.name).toBe(mockApp.name)
      expect(result.app.status).toBe(AppStatus.SYNCHRONIZED)
      expect(processAccountsForApp).toHaveBeenCalled()
    })

    it('should handle errors during app synchronization', async () => {
      const { ledgerClient } = await import('state/client/ledger')
      const { processAccountsForApp } = await import('../account-processing.service')

      const mockSyncResult = {
        result: [{ address: mockAddress.address, path: mockAddress.path, pubKey: mockAddress.pubKey }],
      }

      const error = new Error('Processing failed')
      vi.mocked(ledgerClient.synchronizeAccounts).mockResolvedValueOnce(mockSyncResult)
      vi.mocked(processAccountsForApp).mockRejectedValueOnce(error)

      await expect(synchronizeAppAccounts(mockApp, [], true)).rejects.toThrow()
    })

    it('should fetch addresses from ledger when not provided', async () => {
      const { ledgerClient } = await import('state/client/ledger')
      const { processAccountsForApp } = await import('../account-processing.service')

      const mockSyncResult = {
        result: [{ address: mockAddress.address, path: mockAddress.path, pubKey: mockAddress.pubKey }],
      }

      const mockProcessResult = {
        success: true,
        data: {
          accounts: [mockAddress],
          multisigAccounts: [],
          collections: { uniques: new Map(), nfts: new Map() },
          polkadotAddressesForApp: [],
        },
      }

      vi.mocked(ledgerClient.synchronizeAccounts).mockResolvedValueOnce(mockSyncResult)
      vi.mocked(processAccountsForApp).mockResolvedValueOnce(mockProcessResult)

      const result = await synchronizeAppAccounts(mockApp, [], true)

      expect(ledgerClient.synchronizeAccounts).toHaveBeenCalledWith(mockApp)
      expect(result.app.status).toBe(AppStatus.SYNCHRONIZED)
    })

    it('should handle ledger synchronization errors', async () => {
      const { ledgerClient } = await import('state/client/ledger')

      const error = new Error('Ledger sync failed')
      vi.mocked(ledgerClient.synchronizeAccounts).mockRejectedValueOnce(error)

      const result = await synchronizeAppAccounts(mockApp, [], true)
      expect(result.app.status).toBe(AppStatus.ERROR)
      expect(result.app.error).toBeDefined()
      expect(result.app.error?.description).toContain('Test error description')
    })
  })

  describe('scanAppWithCustomIndices', () => {
    it('should scan app with custom indices successfully', async () => {
      const { ledgerClient } = await import('state/client/ledger')
      const { processAccountsForApp } = await import('../account-processing.service')

      const mockSyncResult = {
        result: [{ address: mockAddress.address, path: mockAddress.path, pubKey: mockAddress.pubKey }],
      }

      const mockProcessResult = {
        success: true,
        data: {
          accounts: [mockAddress],
          multisigAccounts: [],
          collections: { uniques: new Map(), nfts: new Map() },
          polkadotAddressesForApp: [],
        },
      }

      vi.mocked(ledgerClient.synchronizeAccountsWithIndices).mockResolvedValueOnce(mockSyncResult)
      vi.mocked(processAccountsForApp).mockResolvedValueOnce(mockProcessResult)

      const polkadotAddresses = ['5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty']
      const accountIndices = [0, 1]
      const addressIndices = [0, 1, 2]

      const result = await scanAppWithCustomIndices(mockApp, polkadotAddresses, accountIndices, addressIndices, true)

      expect(result.app.id).toBe(mockApp.id)
      expect(result.app.name).toBe(mockApp.name)
      expect(result.app.status).toBe(AppStatus.SYNCHRONIZED)
      expect(result.polkadotAddressesForApp).toBeDefined()
      expect(ledgerClient.synchronizeAccountsWithIndices).toHaveBeenCalledWith(mockApp, accountIndices, addressIndices)
      expect(processAccountsForApp).toHaveBeenCalledWith(
        mockSyncResult.result,
        mockApp,
        expect.any(Object), // api
        polkadotAddresses,
        true
      )
    })

    it('should handle empty result from ledger client', async () => {
      const { ledgerClient } = await import('state/client/ledger')

      const mockSyncResult = { result: [] }

      vi.mocked(ledgerClient.synchronizeAccountsWithIndices).mockResolvedValueOnce(mockSyncResult)

      const result = await scanAppWithCustomIndices(mockApp, [], [0], [0])

      expect(result.app.id).toBe(mockApp.id)
      expect(result.app.status).toBe(AppStatus.SYNCHRONIZED)
      expect(result.app.accounts).toEqual([])
      expect(result.app.multisigAccounts).toEqual([])
      expect(result.polkadotAddressesForApp).toEqual([])
    })

    it('should handle ledger client errors gracefully', async () => {
      const { ledgerClient } = await import('state/client/ledger')

      const error = new Error('Ledger connection failed')
      vi.mocked(ledgerClient.synchronizeAccountsWithIndices).mockRejectedValueOnce(error)

      await expect(scanAppWithCustomIndices(mockApp, [], [0], [0])).rejects.toThrow()
    })

    it('should handle processing service errors', async () => {
      const { ledgerClient } = await import('state/client/ledger')
      const { processAccountsForApp } = await import('../account-processing.service')

      const mockSyncResult = {
        result: [{ address: mockAddress.address, path: mockAddress.path, pubKey: mockAddress.pubKey }],
      }

      const mockProcessResult = {
        success: false,
        error: { description: 'Processing failed' },
      }

      vi.mocked(ledgerClient.synchronizeAccountsWithIndices).mockResolvedValueOnce(mockSyncResult)
      vi.mocked(processAccountsForApp).mockResolvedValueOnce(mockProcessResult)

      const result = await scanAppWithCustomIndices(mockApp, [], [0], [0])

      expect(result.app.status).toBe(AppStatus.ERROR)
      expect(result.app.error?.description).toContain('Test error description')
      expect(result.polkadotAddressesForApp).toEqual([])
    })

    it('should handle missing RPC endpoints', async () => {
      const { ledgerClient } = await import('state/client/ledger')

      const mockSyncResult = {
        result: [{ address: mockAddress.address, path: mockAddress.path, pubKey: mockAddress.pubKey }],
      }

      const appConfigWithoutRpc = {
        ...mockApp,
        rpcEndpoints: [],
      }

      vi.mocked(ledgerClient.synchronizeAccountsWithIndices).mockResolvedValueOnce(mockSyncResult)

      const result = await scanAppWithCustomIndices(appConfigWithoutRpc, [], [0], [0])

      expect(result.app.status).toBe(AppStatus.ERROR)
      expect(result.app.error?.description).toContain('Test error description')
      expect(result.polkadotAddressesForApp).toEqual([])
    })
  })

  describe('synchronizePolkadotAccounts', () => {
    it('should synchronize Polkadot accounts successfully', async () => {
      const { processAccountsForApp } = await import('../account-processing.service')
      const { ledgerClient } = await import('state/client/ledger')

      const mockSyncResult = {
        result: [{ address: mockAddress.address, path: mockAddress.path, pubKey: mockAddress.pubKey }],
      }

      const mockProcessResult = {
        success: true,
        data: {
          accounts: [mockAddress],
          multisigAccounts: [],
          collections: { uniques: new Map(), nfts: new Map() },
          polkadotAddressesForApp: [],
        },
      }

      vi.mocked(ledgerClient.synchronizeAccounts).mockResolvedValueOnce(mockSyncResult)
      vi.mocked(processAccountsForApp).mockResolvedValueOnce(mockProcessResult)

      const result = await synchronizePolkadotAccounts()

      expect(result.id).toBe('polkadot')
      expect(result.name).toBe('Polkadot')
      expect(result.status).toBe(AppStatus.SYNCHRONIZED)
      expect(ledgerClient.synchronizeAccounts).toHaveBeenCalledWith(mockApp)
    })

    it('should handle errors during Polkadot synchronization', async () => {
      const { ledgerClient } = await import('state/client/ledger')

      const error = new Error('Polkadot sync failed')
      vi.mocked(ledgerClient.synchronizeAccounts).mockRejectedValueOnce(error)

      await expect(synchronizePolkadotAccounts()).rejects.toThrow()
    })
  })

  describe('synchronizeAllApps', () => {
    it('should synchronize all apps successfully', async () => {
      const { processAccountsForApp } = await import('../account-processing.service')
      const { ledgerClient } = await import('state/client/ledger')

      const mockSyncResult = {
        result: [{ address: mockAddress.address, path: mockAddress.path, pubKey: mockAddress.pubKey }],
      }

      const mockProcessResult = {
        success: true,
        data: {
          accounts: [mockAddress],
          multisigAccounts: [],
          collections: { uniques: new Map(), nfts: new Map() },
          polkadotAddressesForApp: [],
        },
      }

      vi.mocked(ledgerClient.synchronizeAccounts).mockResolvedValue(mockSyncResult)
      vi.mocked(processAccountsForApp).mockResolvedValue(mockProcessResult)

      const progressCallback = vi.fn()
      const cancelCallback = vi.fn().mockReturnValue(false)
      const appStartCallback = vi.fn()
      const appCompleteCallback = vi.fn()

      const result = await synchronizeAllApps(progressCallback, cancelCallback, appStartCallback, appCompleteCallback)

      expect(result.success).toBe(true)
      expect(result.apps).toHaveLength(2) // polkadot and kusama
      expect(result.polkadotApp).toBeDefined()
      expect(progressCallback).toHaveBeenCalled()
      expect(appStartCallback).toHaveBeenCalled()
      expect(appCompleteCallback).toHaveBeenCalled()
    })

    it('should handle cancellation during synchronization', async () => {
      const { processAccountsForApp } = await import('../account-processing.service')
      const { ledgerClient } = await import('state/client/ledger')

      const mockSyncResult = {
        result: [{ address: mockAddress.address, path: mockAddress.path, pubKey: mockAddress.pubKey }],
      }

      const mockProcessResult = {
        success: true,
        data: {
          accounts: [mockAddress],
          multisigAccounts: [],
          collections: { uniques: new Map(), nfts: new Map() },
          polkadotAddressesForApp: [],
        },
      }

      vi.mocked(ledgerClient.synchronizeAccounts).mockResolvedValue(mockSyncResult)
      vi.mocked(processAccountsForApp).mockResolvedValue(mockProcessResult)

      const progressCallback = vi.fn()
      const cancelCallback = vi.fn().mockReturnValue(true) // Cancel after first app
      const appStartCallback = vi.fn()
      const appCompleteCallback = vi.fn()

      const result = await synchronizeAllApps(progressCallback, cancelCallback, appStartCallback, appCompleteCallback)

      expect(result.success).toBe(true) // Still successful even with cancellation
      expect(cancelCallback).toHaveBeenCalled()
    })

    it('should handle errors during synchronization', async () => {
      const { ledgerClient } = await import('state/client/ledger')

      const error = new Error('Sync failed')
      vi.mocked(ledgerClient.synchronizeAccounts).mockRejectedValue(error)

      const progressCallback = vi.fn()
      const cancelCallback = vi.fn().mockReturnValue(false)
      const appStartCallback = vi.fn()
      const appCompleteCallback = vi.fn()

      const result = await synchronizeAllApps(progressCallback, cancelCallback, appStartCallback, appCompleteCallback)

      expect(result.success).toBe(false)
      expect(result.apps).toEqual([])
      expect(result.error).toBeDefined()
    })
  })
})
