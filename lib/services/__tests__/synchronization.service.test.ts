import type { AppConfig } from 'config/apps'

import { AppStatus } from 'state/ledger'
import type { Address } from 'state/types/ledger'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getAppsToSync,
  getValidApps,
  isValidApp,
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

vi.mock('@/lib/utils/env', () => ({
  isDevelopment: vi.fn(() => false),
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

      expect(ledgerClient.synchronizeAccounts).toHaveBeenCalledWith(mockApp, undefined)
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
      expect(ledgerClient.synchronizeAccounts).toHaveBeenCalledWith(mockApp, undefined)
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

  describe('App Validation Functions', () => {
    describe('isValidApp', () => {
      it('should return true for valid app config with RPC endpoints', () => {
        const validApp: AppConfig = {
          id: 'polkadot',
          name: 'Polkadot',
          rpcEndpoints: ['wss://rpc.polkadot.io'],
          token: { symbol: 'DOT', decimals: 10 },
          bip44Path: "m/44'/354'/0'/0/0",
          ss58Prefix: 0,
        }
        expect(isValidApp(validApp)).toBe(true)
      })

      it('should return false for app config without RPC endpoints', () => {
        const invalidApp: AppConfig = {
          id: 'test',
          name: 'Test',
          rpcEndpoints: [],
          token: { symbol: 'TEST', decimals: 10 },
          bip44Path: "m/44'/0'/0'/0/0",
          ss58Prefix: 0,
        }
        expect(isValidApp(invalidApp)).toBe(false)
      })

      it('should return false for undefined app config', () => {
        expect(isValidApp(undefined)).toBe(false)
      })

      it('should return false for app config with null RPC endpoints', () => {
        const invalidApp = {
          id: 'test',
          name: 'Test',
          rpcEndpoints: null,
          token: { symbol: 'TEST', decimals: 10 },
          bip44Path: "m/44'/0'/0'/0/0",
          ss58Prefix: 0,
        } as any
        expect(isValidApp(invalidApp)).toBe(false)
      })
    })

    describe('getValidApps', () => {
      it('should return all apps with valid RPC endpoints', () => {
        const validApps = getValidApps()
        expect(validApps).toHaveLength(2) // polkadot and kusama from mock
        expect(validApps.every(app => app.rpcEndpoints && app.rpcEndpoints.length > 0)).toBe(true)
      })

      it('should filter out apps without RPC endpoints', () => {
        const validApps = getValidApps()
        expect(validApps.every(app => isValidApp(app))).toBe(true)
      })

      it('should only return apps from appsConfigs', () => {
        const validApps = getValidApps()
        // All returned apps should be from the mocked appsConfigs
        expect(validApps.every(app => ['polkadot', 'kusama'].includes(app.id))).toBe(true)
      })
    })

    describe('getAppsToSync', () => {
      it('should return all valid apps in production mode', async () => {
        const { isDevelopment } = await import('@/lib/utils/env')
        vi.mocked(isDevelopment).mockReturnValue(false)

        const appsToSync = getAppsToSync()
        expect(appsToSync).toHaveLength(2) // polkadot and kusama
        expect(appsToSync.every(app => isValidApp(app))).toBe(true)
      })

      it('should return only specified apps in development mode', async () => {
        const { isDevelopment } = await import('@/lib/utils/env')
        vi.mocked(isDevelopment).mockReturnValue(true)

        const appsToSync = getAppsToSync()
        expect(appsToSync).toHaveLength(2) // Based on syncApps mock ['polkadot', 'kusama']
        expect(appsToSync.every(app => isValidApp(app))).toBe(true)
      })

      it('should filter out invalid apps', () => {
        const appsToSync = getAppsToSync()
        // All returned apps should have valid configurations
        expect(appsToSync.every(app => isValidApp(app))).toBe(true)
      })

      it('should only return configured apps', () => {
        const appsToSync = getAppsToSync()
        // Should only return apps that are in the config
        expect(appsToSync.every(app => ['polkadot', 'kusama'].includes(app.id))).toBe(true)
        expect(appsToSync.length).toBeGreaterThan(0)
      })
    })
  })
})
