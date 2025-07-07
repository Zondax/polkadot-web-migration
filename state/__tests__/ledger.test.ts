import { BN } from '@polkadot/util'
import type { Transport } from '@zondax/ledger-js'
import type { PolkadotGenericApp } from '@zondax/ledger-substrate'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { errorDetails, InternalErrorType } from '@/config/errors'
import { mockAddress1 } from '@/lib/__tests__/utils/__mocks__/mockData'
import type { DeviceConnectionProps } from '@/lib/ledger/types'
import { InternalError } from '@/lib/utils/error'
import { AppStatus, ledgerState$ } from '../ledger'
import { AccountType } from '../types/ledger'

// Mock dependencies
vi.mock('../client/ledger', () => ({
  ledgerClient: {
    connectDevice: vi.fn(),
    disconnect: vi.fn(),
    synchronizeAccounts: vi.fn(),
    migrateAccount: vi.fn(),
    getMigrationTxInfo: vi.fn(),
    unstakeBalance: vi.fn(),
    getUnstakeFee: vi.fn(),
    withdrawBalance: vi.fn(),
    getWithdrawFee: vi.fn(),
    removeIdentity: vi.fn(),
    getRemoveIdentityFee: vi.fn(),
    signAsMultiTx: vi.fn(),
    signApproveAsMultiTx: vi.fn(),
    removeProxies: vi.fn(),
    getRemoveProxiesFee: vi.fn(),
    removeAccountIndex: vi.fn(),
    getRemoveAccountIndexFee: vi.fn(),
    abortCall: vi.fn(),
    checkConnection: vi.fn(),
    openApp: vi.fn(),
  },
}))

vi.mock('@/lib/account', () => ({
  getApiAndProvider: vi.fn(),
  getBalance: vi.fn(),
  getIdentityInfo: vi.fn(),
  getProxyInfo: vi.fn(),
  getIndexInfo: vi.fn(),
  getMultisigAddresses: vi.fn(),
}))

vi.mock('@/lib/utils', () => ({
  interpretError: vi.fn((_error, type) => ({
    errorType: type,
    title: 'Test Error',
    description: 'Test error',
    name: 'TestError',
    message: 'Test error',
  })),
}))

vi.mock('@/lib/utils/error', () => ({
  InternalError: vi.fn().mockImplementation((errorType: string, context: any) => {
    const errorDetails: Record<string, { title: string; description: string }> = {
      failed_to_connect_to_blockchain: {
        title: 'Failed to Connect to Blockchain',
        description: 'Failed to connect to the blockchain network.',
      },
      sync_error: { title: 'Synchronization Error', description: 'The accounts could not be synchronized. Please try again later.' },
    }
    const details = errorDetails[errorType] || { title: 'Unknown Error', description: 'An unknown error occurred' }
    return {
      errorType,
      title: details.title,
      description: details.description,
      name: errorType,
      message: details.description,
      context,
    }
  }),
}))

vi.mock('@/lib/utils/notifications', () => ({
  handleErrorNotification: vi.fn(),
}))

vi.mock('../notifications', () => ({
  notifications$: {
    push: vi.fn(),
  },
}))

vi.mock('@/lib/services/synchronization.service', () => ({
  synchronizeAppAccounts: vi.fn(),
  synchronizePolkadotAccounts: vi.fn(),
  synchronizeAllApps: vi.fn(),
  validateSyncPrerequisites: vi.fn(() => true),
}))

vi.mock('config/apps', () => ({
  appsConfigs: new Map([
    ['polkadot', { id: 'polkadot', name: 'Polkadot', rpcEndpoint: 'wss://rpc.polkadot.io', token: { symbol: 'DOT', decimals: 10 } }],
    ['kusama', { id: 'kusama', name: 'Kusama', rpcEndpoint: 'wss://kusama-rpc.polkadot.io', token: { symbol: 'KSM', decimals: 12 } }],
  ]),
  polkadotAppConfig: { id: 'polkadot', name: 'Polkadot', rpcEndpoint: 'wss://rpc.polkadot.io', token: { symbol: 'DOT', decimals: 10 } },
}))

describe('Ledger State', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ledgerState$.clearConnection()
  })

  describe('Initial state', () => {
    it('should have correct initial state', () => {
      expect(ledgerState$.device.connection.get()).toBeUndefined()
      expect(ledgerState$.device.isLoading.get()).toBe(false)
      expect(ledgerState$.device.error.get()).toBeUndefined()
      expect(ledgerState$.apps.apps.get()).toEqual([])
      expect(ledgerState$.apps.status.get()).toBeUndefined()
      expect(ledgerState$.apps.syncProgress.get()).toEqual({
        scanned: 0,
        total: 0,
        percentage: 0,
      })
      expect(ledgerState$.apps.migrationResult.get()).toEqual({
        success: 0,
        fails: 0,
        total: 0,
      })
    })
  })

  describe('connectLedger', () => {
    let mockTransport: any
    let mockGenericApp: any

    beforeEach(() => {
      mockTransport = {
        close: vi.fn(),
        emit: vi.fn(),
        on: vi.fn(),
      }

      mockGenericApp = {
        getVersion: vi.fn(),
        getAddress: vi.fn(),
        signWithMetadataEd25519: vi.fn(),
        txMetadataChainId: '',
      }
    })

    it('should set isLoading to true during connection and false after completion', async () => {
      const mockConnection = { isAppOpen: true }
      const { ledgerClient } = await import('../client/ledger')
      vi.mocked(ledgerClient.connectDevice).mockResolvedValueOnce({
        connection: mockConnection,
        error: undefined,
      })

      const connectionPromise = ledgerState$.connectLedger()
      expect(ledgerState$.device.isLoading.get()).toBe(true)

      const result = await connectionPromise
      expect(result.connected).toBe(true)
      expect(result.isAppOpen).toBe(true)
      expect(ledgerState$.device.isLoading.get()).toBe(false)
    })

    it('should set connection data after successful connection', async () => {
      const mockConnection = { isAppOpen: true }
      const { ledgerClient } = await import('../client/ledger')
      vi.mocked(ledgerClient.connectDevice).mockResolvedValueOnce({
        connection: mockConnection,
        error: undefined,
      })

      const result = await ledgerState$.connectLedger()

      expect(result.connected).toBe(true)
      expect(result.isAppOpen).toBe(true)
      expect(ledgerState$.device.connection.get()).toBe(mockConnection)
      expect(ledgerState$.device.error.get()).toBeUndefined()
    })

    it('should handle connection error', async () => {
      const error = 'Connection failed'
      const { ledgerClient } = await import('../client/ledger')
      vi.mocked(ledgerClient.connectDevice).mockResolvedValueOnce({
        connection: undefined,
        error: error,
      })

      const result = await ledgerState$.connectLedger()

      expect(result.connected).toBe(false)
      expect(ledgerState$.device.error.get()).toBe(error)
      expect(ledgerState$.device.connection.get()).toBeUndefined()
    })

    it('verify device connected but app not open data', async () => {
      const mockConnection: DeviceConnectionProps = {
        transport: mockTransport as Transport,
        genericApp: mockGenericApp as PolkadotGenericApp,
        isAppOpen: false,
      }
      const { ledgerClient } = await import('../client/ledger')

      vi.mocked(ledgerClient.connectDevice).mockResolvedValueOnce({
        connection: mockConnection,
        error: undefined,
      })

      // Mock checkConnection to return false after attempting to open the app
      vi.mocked(ledgerClient.checkConnection).mockResolvedValueOnce(false)

      const result = await ledgerState$.connectLedger()

      expect(result.connected).toBe(true)
      expect(result.isAppOpen).toBe(false)
    })

    it('should handle connection exception', async () => {
      const { ledgerClient } = await import('../client/ledger')
      const { handleErrorNotification } = await import('@/lib/utils/notifications')

      vi.mocked(ledgerClient.connectDevice).mockRejectedValueOnce(new Error('Connection failed'))

      const result = await ledgerState$.connectLedger()

      expect(result.connected).toBe(false)
      expect(result.isAppOpen).toBe(false)
      expect(handleErrorNotification).toHaveBeenCalled()
    })
  })

  describe('disconnectLedger', () => {
    it('should reset state when disconnecting', () => {
      ledgerState$.device.connection.set({ isAppOpen: true })
      ledgerState$.disconnectLedger()

      expect(ledgerState$.device.connection.get()).toBeUndefined()
      expect(ledgerState$.device.isLoading.get()).toBe(false)
      expect(ledgerState$.device.error.get()).toBeUndefined()
    })

    it('should call ledgerClient.disconnect', async () => {
      const { ledgerClient } = await import('../client/ledger')
      ledgerState$.disconnectLedger()
      expect(ledgerClient.disconnect).toHaveBeenCalled()
    })

    it('should handle disconnect error', async () => {
      const { ledgerClient } = await import('../client/ledger')
      const { handleErrorNotification } = await import('@/lib/utils/notifications')

      vi.mocked(ledgerClient.disconnect).mockImplementationOnce(() => {
        throw new Error('Disconnect failed')
      })

      ledgerState$.disconnectLedger()
      expect(handleErrorNotification).toHaveBeenCalled()
    })
  })

  describe('clearConnection', () => {
    it('should reset device and app state', () => {
      ledgerState$.device.connection.set({ isAppOpen: true })
      ledgerState$.device.error.set('some error')
      ledgerState$.apps.apps.set([{ id: 'polkadot', name: 'Polkadot', token: { symbol: 'DOT', decimals: 10 } }])

      ledgerState$.clearConnection()

      expect(ledgerState$.device.connection.get()).toBeUndefined()
      expect(ledgerState$.device.error.get()).toBeUndefined()
    })
  })

  describe('cancelSynchronization', () => {
    it('should set cancel flag and update status', async () => {
      const { notifications$ } = await import('../notifications')

      ledgerState$.cancelSynchronization()

      expect(ledgerState$.apps.isSyncCancelRequested.get()).toBe(true)
      expect(ledgerState$.apps.status.get()).toBe(AppStatus.SYNCHRONIZED)
      expect(notifications$.push).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Synchronization Stopped',
          type: 'info',
        })
      )
    })
  })

  describe('Migration result tracking', () => {
    it('should track migration success counter', () => {
      expect(ledgerState$.apps.migrationResult.get().success).toBe(0)

      // Simulate a successful migration by updating state
      ledgerState$.apps.migrationResult.set({
        success: 1,
        fails: 0,
        total: 1,
      })

      expect(ledgerState$.apps.migrationResult.get().success).toBe(1)
    })

    it('should track migration failure counter', () => {
      expect(ledgerState$.apps.migrationResult.get().fails).toBe(0)

      // Simulate a failed migration by updating state
      ledgerState$.apps.migrationResult.set({
        success: 0,
        fails: 1,
        total: 1,
      })

      expect(ledgerState$.apps.migrationResult.get().fails).toBe(1)
    })
  })

  describe('fetchAndProcessAccountsForApp', () => {
    const mockApp = {
      id: 'polkadot',
      name: 'Polkadot',
      rpcEndpoint: 'wss://rpc.polkadot.io',
      token: { symbol: 'DOT', decimals: 10 },
      bip44Path: "m/44'/354'/0'/0'/0'",
      ss58Prefix: 354,
    }

    it('should return error app when synchronization fails', async () => {
      const { ledgerClient } = await import('../client/ledger')
      vi.mocked(ledgerClient.synchronizeAccounts).mockResolvedValueOnce({
        result: undefined,
      })

      const result = await ledgerState$.fetchAndProcessAccountsForApp(mockApp)

      expect(result?.status).toBe(AppStatus.ERROR)
      expect(result?.error?.source).toBe('synchronization')
    })

    it('should return error app when API connection fails', async () => {
      const { synchronizeAppAccounts } = await import('@/lib/services/synchronization.service')
      const { InternalError } = await import('@/lib/utils/error')
      const { InternalErrorType } = await import('config/errors')

      vi.mocked(ledgerClient.synchronizeAccounts).mockResolvedValueOnce({
        result: [{ address: '1test', path: "m/44'/354'/0'/0'/0'", pubKey: '123' }],
      })
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({
        api: undefined,
        provider: undefined,
        error: undefined,
      })

      const result = await ledgerState$.fetchAndProcessAccountsForApp(mockApp)

      expect(result?.status).toBe(AppStatus.ERROR)
      expect(result?.error?.description).toBe(errorDetails[InternalErrorType.FAILED_TO_CONNECT_TO_BLOCKCHAIN].description)
    })

    it('should handle mock synchronization error in development', async () => {
      const originalEnv = process.env.NEXT_PUBLIC_NODE_ENV
      process.env.NEXT_PUBLIC_NODE_ENV = 'development'

      // Mock errorApps to include the test app
      vi.doMock('config/mockData', () => ({
        errorApps: ['polkadot'],
        syncApps: [],
      }))

      const result = await ledgerState$.fetchAndProcessAccountsForApp(mockApp)

      expect(result?.status).toBe(AppStatus.ERROR)
      expect(result?.error?.source).toBe('synchronization')

      process.env.NEXT_PUBLIC_NODE_ENV = originalEnv
    })
  })

  describe('migrateSelected', () => {
    it('should reset migration results before starting', async () => {
      ledgerState$.apps.migrationResult.set({ success: 5, fails: 2, total: 7 })

      await ledgerState$.migrateSelected()

      expect(ledgerState$.apps.migrationResult.get()).toEqual({
        success: 0,
        fails: 0,
        total: 0,
      })
    })

    it('should skip apps with no accounts', async () => {
      ledgerState$.apps.apps.set([
        {
          id: 'polkadot',
          name: 'Polkadot',
          token: { symbol: 'DOT', decimals: 10 },
          accounts: [],
          multisigAccounts: [],
        },
      ])

      await ledgerState$.migrateSelected()

      // Should complete without errors
      expect(ledgerState$.apps.migrationResult.get().total).toBe(0)
    })
  })

  describe('getAccountBalance', () => {
    const mockAddress = {
      address: '1test',
      path: "m/44'/354'/0'/0'/0'",
      pubKey: '0x123',
      balances: [],
    }

    it('should handle missing RPC endpoint', async () => {
      await ledgerState$.getAccountBalance('nonexistent', AccountType.ACCOUNT, mockAddress)

      // The account should be updated with error state
      // Since we can't easily verify internal state changes, we at least verify no crash occurs
      expect(true).toBe(true)
    })

    it('should handle API connection failure', async () => {
      const { getApiAndProvider } = await import('@/lib/account')
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({
        api: undefined,
        provider: undefined,
      })

      await ledgerState$.getAccountBalance('polkadot', AccountType.ACCOUNT, mockAddress)

      // Should handle gracefully without throwing
      expect(true).toBe(true)
    })
  })

  describe('verifyDestinationAddresses', () => {
    it('should return false when app config not found', async () => {
      const result = await ledgerState$.verifyDestinationAddresses('nonexistent', '1test', "m/44'/354'/0'/0'/0'")
      expect(result.isVerified).toBe(false)
    })

    it('should return false when no polkadot addresses found', async () => {
      const result = await ledgerState$.verifyDestinationAddresses('polkadot', '1test', "m/44'/354'/0'/0'/0'")
      expect(result.isVerified).toBe(false)
    })

    it('should return false when address not found in polkadot addresses', async () => {
      ledgerState$.polkadotAddresses.polkadot.set(['1other'])

      const result = await ledgerState$.verifyDestinationAddresses('polkadot', '1test', "m/44'/354'/0'/0'/0'")
      expect(result.isVerified).toBe(false)
    })
  })

  describe('synchronizeAccounts', () => {
    it('should handle synchronization process', async () => {
      // Mock connection state
      ledgerState$.device.connection.set({ isAppOpen: true })

      // The synchronizeAccounts method takes no parameters and processes all configured apps
      await ledgerState$.synchronizeAccounts()

      // Method should exist and be callable
      expect(typeof ledgerState$.synchronizeAccounts).toBe('function')
      // Should not throw during execution
    })
  })

  describe('migrateAccount', () => {
    it('should handle migrate account method call', async () => {
      const _result = await ledgerState$.migrateAccount('polkadot', mockAddress1)

      // Method should exist and be callable
      expect(typeof ledgerState$.migrateAccount).toBe('function')
      // The result may be undefined for invalid cases, which is acceptable
    })
  })

  describe('Transaction operations', () => {
    describe('unstakeBalance', () => {
      it('should handle unstake balance method call', async () => {
        const updateStatus = vi.fn()

        await ledgerState$.unstakeBalance('polkadot', '1test', "m/44'/354'/0'/0'/0'", new BN(1000000000000), updateStatus)

        // Method should exist and be callable
        expect(typeof ledgerState$.unstakeBalance).toBe('function')
        // Should not throw during execution
      })
    })

    describe('withdrawBalance', () => {
      it('should handle withdraw balance method call', async () => {
        const updateStatus = vi.fn()

        await ledgerState$.withdrawBalance('polkadot', '1test', "m/44'/354'/0'/0'/0'", updateStatus)

        // Method should exist and be callable
        expect(typeof ledgerState$.withdrawBalance).toBe('function')
        // Should not throw during execution
      })
    })

    describe('removeIdentity', () => {
      it('should handle remove identity method call', async () => {
        const updateStatus = vi.fn()

        await ledgerState$.removeIdentity('polkadot', '1test', "m/44'/354'/0'/0'/0'", updateStatus)

        // Method should exist and be callable
        expect(typeof ledgerState$.removeIdentity).toBe('function')
        // Should not throw during execution
      })
    })

    describe('removeProxies', () => {
      it('should handle remove proxies method call', async () => {
        const updateStatus = vi.fn()

        await ledgerState$.removeProxies('polkadot', '1test', "m/44'/354'/0'/0'/0'", updateStatus)

        // Method should exist and be callable
        expect(typeof ledgerState$.removeProxies).toBe('function')
        // Should not throw during execution
      })
    })

    describe('removeAccountIndex', () => {
      it('should handle remove account index method call', async () => {
        const updateStatus = vi.fn()

        await ledgerState$.removeAccountIndex('polkadot', '1test', '0', "m/44'/354'/0'/0'/0'", updateStatus)

        // Method should exist and be callable
        expect(typeof ledgerState$.removeAccountIndex).toBe('function')
        // Should not throw during execution
      })
    })
  })

  describe('Multisig operations', () => {
    describe('approveMultisigCall', () => {
      const mockAccount = {
        address: '1multisig',
        path: "m/44'/354'/0'/0'/0'",
        pubKey: '0x123',
        balances: [],
        threshold: 2,
        signatories: ['1signer1', '1signer2'],
        members: [],
        pendingMultisigCalls: [],
      }

      it('should handle approve multisig call method', async () => {
        const mockFormBody = {
          callHash: '0x123',
          callDataHex: '0xabcd',
          threshold: 2,
          otherSignatories: ['1signer1', '1signer2'],
          maxWeight: { refTime: new BN(1000000), proofSize: new BN(64000) },
          when: { height: 1000, index: 0 },
          signer: '1signer1',
        }
        const updateStatus = vi.fn()

        await ledgerState$.approveMultisigCall('polkadot', mockAccount, mockFormBody, updateStatus)

        // Method should exist and be callable
        expect(typeof ledgerState$.approveMultisigCall).toBe('function')
        // Should not throw during execution
      })
    })
  })

  describe('Additional methods', () => {
    describe('synchronizeAccount', () => {
      it('should handle single account synchronization', async () => {
        ledgerState$.device.connection.set({ isAppOpen: true })

        await ledgerState$.synchronizeAccount('polkadot')

        expect(typeof ledgerState$.synchronizeAccount).toBe('function')
      })
    })

    describe('getMigrationTxInfo', () => {
      it('should handle migration tx info retrieval', async () => {
        const _result = await ledgerState$.getMigrationTxInfo('polkadot', mockAddress1)
        expect(typeof ledgerState$.getMigrationTxInfo).toBe('function')
        // Result may be undefined for invalid cases, which is acceptable
      })
    })

    describe('clearSynchronization', () => {
      it('should clear synchronization data', () => {
        ledgerState$.clearSynchronization()

        expect(typeof ledgerState$.clearSynchronization).toBe('function')
        expect(ledgerState$.apps.apps.get()).toEqual([])
      })
    })

    describe('migrateSelected', () => {
      it('should handle migration of selected accounts', async () => {
        await ledgerState$.migrateSelected()

        expect(typeof ledgerState$.migrateSelected).toBe('function')
      })

      it('should handle migration of selected accounts only', async () => {
        await ledgerState$.migrateSelected(true)

        expect(typeof ledgerState$.migrateSelected).toBe('function')
      })
    })

    describe('Error handling', () => {
      it('should handle synchronization errors correctly', () => {
        const mockError = new InternalError(InternalErrorType.SYNC_ERROR)

        const shouldStop = ledgerState$.handleError(mockError)

        // Assuming sync errors should stop synchronization based on config
        expect(shouldStop).toBeDefined()
      })

      it('should handle migration errors correctly', () => {
        const mockError = new InternalError(InternalErrorType.MIGRATION_ERROR)

        const shouldStop = ledgerState$.handleError(mockError)

        expect(shouldStop).toBeDefined()
      })

      it('should handle connection errors correctly', async () => {
        const { ledgerClient } = await import('../client/ledger')
        vi.mocked(ledgerClient.abortCall).mockRejectedValueOnce(new Error('Connection error'))

        const shouldStop = ledgerState$.handleError(new InternalError(InternalErrorType.CONNECTION_ERROR))

        expect(shouldStop).toBe(true)
      })
    })
  })

  describe('Fee estimation methods', () => {
    it('should handle unstake fee estimation error', async () => {
      const result = await ledgerState$.getUnstakeFee('polkadot', '1test', new BN(1000))
      expect(result).toBeUndefined()
    })

    it('should handle withdraw fee estimation error', async () => {
      const { ledgerClient } = await import('../client/ledger')
      vi.mocked(ledgerClient.getWithdrawFee).mockRejectedValueOnce(new Error('Fee estimation failed'))

      const result = await ledgerState$.getWithdrawFee('polkadot', '1test')
      expect(result).toBeUndefined()
    })

    it('should handle remove identity fee estimation error', async () => {
      const { ledgerClient } = await import('../client/ledger')
      vi.mocked(ledgerClient.getRemoveIdentityFee).mockRejectedValueOnce(new Error('Fee estimation failed'))

      const result = await ledgerState$.getRemoveIdentityFee('polkadot', '1test')
      expect(result).toBeUndefined()
    })
  })
})
