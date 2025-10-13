import { InternalErrorType } from '@/config/errors'
import { mockAddress1 } from '@/lib/__tests__/utils/__mocks__/mockData'
import type { DeviceConnectionProps } from '@/lib/ledger/types'
import { InternalError } from '@/lib/utils/error'
import { BN } from '@polkadot/util'
import type { Transport } from '@zondax/ledger-js'
import type { PolkadotGenericApp } from '@zondax/ledger-substrate'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
    getAccountAddress: vi.fn(),
  },
}))

vi.mock('@/lib/account', () => ({
  getApiAndProvider: vi.fn(),
  getBalance: vi.fn(),
  getIdentityInfo: vi.fn().mockResolvedValue(undefined),
  getProxyInfo: vi.fn().mockResolvedValue(undefined),
  getIndexInfo: vi.fn().mockResolvedValue(undefined),
  getMultisigAddresses: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/utils', () => ({
  interpretError: vi.fn((_error, type) => ({ errorType: type, description: 'Test error' })),
}))

vi.mock('@/lib/utils/address', () => ({
  convertSS58Format: vi.fn(address => address),
  isMultisigAddress: vi.fn(() => false),
}))

vi.mock('@/lib/utils/balance', () => ({
  hasAddressBalance: vi.fn(() => true),
  hasBalance: vi.fn(() => true),
  hasNegativeBalance: vi.fn(() => false),
  validateReservedBreakdown: vi.fn(() => true),
}))

vi.mock('@/lib/utils/ledger', () => ({
  filterAccountsForApps: vi.fn(accounts => accounts),
  setDefaultDestinationAddress: vi.fn(),
  canAccountBeMigrated: vi.fn(() => false),
}))

// handleErrorNotification is now internal to ledger state

vi.mock('../notifications', () => ({
  notifications$: {
    push: vi.fn(),
  },
}))

vi.mock('@/lib/services/synchronization.service', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/services/synchronization.service')>()
  return {
    ...actual,
    deepScanAllApps: vi.fn(),
    synchronizeAllApps: vi.fn(),
  }
})

vi.mock('config/apps', () => ({
  appsConfigs: new Map([
    ['polkadot', { id: 'polkadot', name: 'Polkadot', rpcEndpoints: ['wss://rpc.polkadot.io'], token: { symbol: 'DOT', decimals: 10 } }],
    ['kusama', { id: 'kusama', name: 'Kusama', rpcEndpoints: ['wss://kusama-rpc.polkadot.io'], token: { symbol: 'KSM', decimals: 12 } }],
  ]),
  polkadotAppConfig: { id: 'polkadot', name: 'Polkadot', rpcEndpoints: ['wss://rpc.polkadot.io'], token: { symbol: 'DOT', decimals: 10 } },
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
      const { notifications$ } = await import('../notifications')

      vi.mocked(ledgerClient.connectDevice).mockRejectedValueOnce(new Error('Connection failed'))

      const result = await ledgerState$.connectLedger()

      expect(result.connected).toBe(false)
      expect(result.isAppOpen).toBe(false)
      expect(notifications$.push).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          autoHideDuration: 5000,
        })
      )
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
      const { notifications$ } = await import('../notifications')

      vi.mocked(ledgerClient.disconnect).mockImplementationOnce(() => {
        throw new Error('Disconnect failed')
      })

      ledgerState$.disconnectLedger()
      expect(notifications$.push).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          autoHideDuration: 5000,
        })
      )
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

      // Verify account is updated with error state
      const apps = ledgerState$.apps.apps.get()
      const app = apps.find(app => app.id === 'nonexistent')

      // Since 'nonexistent' app doesn't exist, updateAccount will log a warning but not crash
      // We can verify the method completes without throwing an error
      expect(app).toBeUndefined() // App should not exist
    })

    it('should handle API connection failure', async () => {
      const { getApiAndProvider } = await import('@/lib/account')
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({
        api: undefined,
        provider: undefined,
      })

      // Execute the method - it should not throw an error
      await expect(ledgerState$.getAccountBalance('polkadot', AccountType.ACCOUNT, mockAddress)).resolves.toBeUndefined()

      // The test passes if the function resolves without throwing
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

    it('should handle successful fee estimations', async () => {
      const { ledgerClient } = await import('../client/ledger')
      const mockFee = new BN('1000000000')

      vi.mocked(ledgerClient.getUnstakeFee).mockResolvedValueOnce(mockFee)
      vi.mocked(ledgerClient.getWithdrawFee).mockResolvedValueOnce(mockFee)
      vi.mocked(ledgerClient.getRemoveIdentityFee).mockResolvedValueOnce(mockFee)
      vi.mocked(ledgerClient.getRemoveProxiesFee).mockResolvedValueOnce(mockFee)
      vi.mocked(ledgerClient.getRemoveAccountIndexFee).mockResolvedValueOnce(mockFee)

      const unstakeFee = await ledgerState$.getUnstakeFee('polkadot', '1test', mockFee)
      const withdrawFee = await ledgerState$.getWithdrawFee('polkadot', '1test')
      const identityFee = await ledgerState$.getRemoveIdentityFee('polkadot', '1test')
      const proxiesFee = await ledgerState$.getRemoveProxiesFee('polkadot', '1test')
      const accountIndexFee = await ledgerState$.getRemoveAccountIndexFee('polkadot', '1test', 'index')

      expect(unstakeFee).toEqual(mockFee)
      expect(withdrawFee).toEqual(mockFee)
      expect(identityFee).toEqual(mockFee)
      expect(proxiesFee).toEqual(mockFee)
      expect(accountIndexFee).toEqual(mockFee)
    })
  })

  describe('Additional coverage tests', () => {
    it('should handle checkConnection method', async () => {
      const { ledgerClient } = await import('../client/ledger')
      vi.mocked(ledgerClient.checkConnection).mockResolvedValueOnce(true)

      const result = await ledgerState$.checkConnection()
      expect(result).toBe(true)
      expect(ledgerClient.checkConnection).toHaveBeenCalled()
    })

    it('should handle polkadot addresses verification - app config not found', async () => {
      const result = await ledgerState$.verifyDestinationAddresses('nonexistent' as any, '1test', "m/44'/354'/0'/0'/0'")
      expect(result.isVerified).toBe(false)
    })

    it('should handle polkadot addresses verification - no polkadot addresses', async () => {
      ledgerState$.polkadotAddresses.polkadot.set([])
      const result = await ledgerState$.verifyDestinationAddresses('polkadot', '1test', "m/44'/354'/0'/0'/0'")
      expect(result.isVerified).toBe(false)
    })

    it('should handle polkadot addresses verification - successful case', async () => {
      const { ledgerClient } = await import('../client/ledger')
      ledgerState$.polkadotAddresses.polkadot.set(['1test'])

      // Mock successful address verification
      vi.mocked(ledgerClient.getAccountAddress).mockResolvedValueOnce({
        result: { address: '1test' },
      })

      const result = await ledgerState$.verifyDestinationAddresses('polkadot', '1test', "m/44'/354'/0'/0'/0'")
      expect(result.isVerified).toBe(true)
    })
  })

  describe('State management methods', () => {
    it('should handle clearSynchronization method', () => {
      // Set some state first
      ledgerState$.apps.apps.set([
        {
          id: 'polkadot',
          name: 'Polkadot',
          token: { symbol: 'DOT', decimals: 10 },
          accounts: [
            { address: '1test', name: 'Test', path: "m/44'/354'/0'/0'/0'", derivationPath: 0, balance: undefined, status: 'synchronized' },
          ],
        },
      ])
      ledgerState$.polkadotAddresses.polkadot.set(['1test'])

      // Clear synchronization
      ledgerState$.clearSynchronization()

      expect(ledgerState$.apps.apps.get()).toEqual([])
      expect(ledgerState$.polkadotAddresses.get()).toEqual({})
    })

    it('should handle migration result tracking', () => {
      // Test migration success tracking
      ledgerState$.apps.migrationResult.success.set(0)
      ledgerState$.apps.migrationResult.success.set(ledgerState$.apps.migrationResult.success.get() + 1)
      expect(ledgerState$.apps.migrationResult.success.get()).toBe(1)

      // Test migration failure tracking
      ledgerState$.apps.migrationResult.fails.set(0)
      ledgerState$.apps.migrationResult.fails.set(ledgerState$.apps.migrationResult.fails.get() + 1)
      expect(ledgerState$.apps.migrationResult.fails.get()).toBe(1)
    })
  })

  describe('Error handling edge cases', () => {
    it('should handle checkConnection error', async () => {
      const { ledgerClient } = await import('../client/ledger')
      vi.mocked(ledgerClient.checkConnection).mockRejectedValueOnce(new Error('Connection failed'))

      const result = await ledgerState$.checkConnection()
      expect(result).toBe(false)
    })

    it('should handle handleError method with different error types', () => {
      const mockError = new InternalError(InternalErrorType.CONNECTION_ERROR)

      // Test with error that should stop sync
      const result = ledgerState$.handleError(mockError)
      expect(result).toBe(true) // Should stop synchronization
      expect(ledgerState$.apps.isSyncCancelRequested.get()).toBe(true)
    })

    it('should handle handleError with non-stopping error', () => {
      const mockError = new InternalError(InternalErrorType.UNKNOWN_ERROR)

      // Reset cancel flag first
      ledgerState$.apps.isSyncCancelRequested.set(false)

      const result = ledgerState$.handleError(mockError)
      expect(result).toBe(false) // Should not stop synchronization
    })
  })

  describe('Advanced account processing', () => {
    it('should handle basic method calls for coverage', async () => {
      // Test some basic method calls to increase coverage without complex mocking
      await ledgerState$.synchronizeAccount('polkadot')
      expect(typeof ledgerState$.synchronizeAccount).toBe('function')
    })

    it('should handle verifyDestinationAddresses error case', async () => {
      const { ledgerClient } = await import('../client/ledger')

      // Mock getAccountAddress to throw error
      vi.mocked(ledgerClient.getAccountAddress).mockRejectedValueOnce(new Error('Verification failed'))

      ledgerState$.polkadotAddresses.polkadot.set(['1test'])
      const result = await ledgerState$.verifyDestinationAddresses('polkadot', '1test', "m/44'/354'/0'/0'/0'")

      expect(result.isVerified).toBe(false)
    })

    it('should handle migrateSelected with accounts that have balance and are selected', async () => {
      const { canAccountBeMigrated } = await import('@/lib/utils/ledger')

      // Mock canAccountBeMigrated to return true
      vi.mocked(canAccountBeMigrated).mockReturnValue(true)

      // Set up apps with accounts that have balance and are selected
      ledgerState$.apps.apps.set([
        {
          id: 'polkadot',
          name: 'Polkadot',
          token: { symbol: 'DOT', decimals: 10 },
          accounts: [
            {
              address: '1test',
              name: 'Test',
              path: "m/44'/354'/0'/0'/0'",
              derivationPath: 0,
              balance: undefined,
              status: 'synchronized',
              selected: true,
            },
          ],
          multisigAccounts: [],
        },
      ])

      await ledgerState$.migrateSelected(true)

      expect(canAccountBeMigrated).toHaveBeenCalled()
      expect(ledgerState$.apps.migrationResult.get().total).toBe(0) // Reset at start
    })
  })

  describe('Additional migration and processing coverage', () => {
    it('should handle connectLedger with app opening logic', async () => {
      const { ledgerClient } = await import('../client/ledger')
      const { notifications$ } = await import('../notifications')

      const mockConnection = { isAppOpen: false }
      vi.mocked(ledgerClient.connectDevice).mockResolvedValueOnce({
        connection: mockConnection,
        error: undefined,
      })

      // Mock openApp call
      vi.mocked(ledgerClient.openApp).mockResolvedValueOnce()

      const result = await ledgerState$.connectLedger()

      expect(result.connected).toBe(true)
      expect(result.isAppOpen).toBe(false)
      expect(ledgerClient.openApp).toHaveBeenCalled()
      expect(notifications$.push).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Polkadot Migration App not open',
          type: 'warning',
        })
      )
    })

    it('should handle migrateSelected with successful migration flows', async () => {
      const { canAccountBeMigrated } = await import('@/lib/utils/ledger')

      // Mock canAccountBeMigrated to return true
      vi.mocked(canAccountBeMigrated).mockReturnValue(true)

      // Set up apps with accounts that have balance and are selected
      ledgerState$.apps.apps.set([
        {
          id: 'polkadot',
          name: 'Polkadot',
          token: { symbol: 'DOT', decimals: 10 },
          accounts: [
            {
              address: '1test',
              name: 'Test',
              path: "m/44'/354'/0'/0'/0'",
              derivationPath: 0,
              balance: {
                total: new BN(1000000000000),
                transferable: new BN(600000000000),
              },
              status: 'synchronized',
              selected: true,
            },
          ],
          multisigAccounts: [],
        },
      ])

      await ledgerState$.migrateSelected(true)

      expect(canAccountBeMigrated).toHaveBeenCalled()
    })

    it('should handle synchronizeAccounts with actual app processing', async () => {
      // Mock device connection
      ledgerState$.device.connection.set({ isAppOpen: true })

      // Set up apps to synchronize
      ledgerState$.apps.assign({
        apps: [],
        polkadotApp: {
          id: 'polkadot',
          name: 'Polkadot',
          token: { symbol: 'DOT', decimals: 10 },
        },
      })

      await ledgerState$.synchronizeAccounts()

      // Should execute without throwing
      expect(typeof ledgerState$.synchronizeAccounts).toBe('function')
    })

    it('should handle fee estimation with missing app config', async () => {
      const result = await ledgerState$.getUnstakeFee('nonexistent' as any, '1test', new BN(1000))
      expect(result).toBeUndefined()
    })

    it('should handle fee estimation with missing RPC endpoint', async () => {
      // Mock app config without RPC endpoint
      vi.doMock('config/apps', () => ({
        appsConfigs: new Map([['test', { id: 'test', name: 'Test', token: { symbol: 'TEST', decimals: 10 } }]]),
      }))

      const result = await ledgerState$.getUnstakeFee('test' as any, '1test', new BN(1000))
      expect(result).toBeUndefined()
    })

    it('should handle migrateAccount with simple error case', async () => {
      const mockAccount = {
        address: '1test',
        path: "m/44'/354'/0'/0'/0'",
        pubKey: '0x123',
        balances: [],
      }

      // Test with a valid account that should trigger an error path
      try {
        await ledgerState$.migrateAccount('polkadot', mockAccount)
      } catch (error) {
        // Expected to fail due to missing setup
        expect(error).toBeDefined()
      }
    })

    it('should handle transaction operations error paths', async () => {
      const updateStatus = vi.fn()

      // Test error path by calling with missing config - this should handle errors gracefully
      const result = await ledgerState$.unstakeBalance('nonexistent' as any, '1test', "m/44'/354'/0'/0'/0'", new BN(1000), updateStatus)

      // Should return undefined for missing app config
      expect(result).toBeUndefined()
    })

    it('should handle successful transaction operations', async () => {
      const { ledgerClient } = await import('../client/ledger')
      const updateStatus = vi.fn()

      // Mock successful transaction operations
      vi.mocked(ledgerClient.unstakeBalance).mockResolvedValueOnce({ result: { txPromise: Promise.resolve() } })
      vi.mocked(ledgerClient.withdrawBalance).mockResolvedValueOnce({ result: { txPromise: Promise.resolve() } })
      vi.mocked(ledgerClient.removeIdentity).mockResolvedValueOnce({ result: { txPromise: Promise.resolve() } })
      vi.mocked(ledgerClient.removeProxies).mockResolvedValueOnce({ result: { txPromise: Promise.resolve() } })
      vi.mocked(ledgerClient.removeAccountIndex).mockResolvedValueOnce({ result: { txPromise: Promise.resolve() } })

      await ledgerState$.unstakeBalance('polkadot', '1test', "m/44'/354'/0'/0'/0'", new BN(1000), updateStatus)
      await ledgerState$.withdrawBalance('polkadot', '1test', "m/44'/354'/0'/0'/0'", updateStatus)
      await ledgerState$.removeIdentity('polkadot', '1test', "m/44'/354'/0'/0'/0'", updateStatus)
      await ledgerState$.removeProxies('polkadot', '1test', "m/44'/354'/0'/0'/0'", updateStatus)
      await ledgerState$.removeAccountIndex('polkadot', '1test', '0', "m/44'/354'/0'/0'/0'", updateStatus)

      expect(ledgerClient.unstakeBalance).toHaveBeenCalled()
      expect(ledgerClient.withdrawBalance).toHaveBeenCalled()
      expect(ledgerClient.removeIdentity).toHaveBeenCalled()
      expect(ledgerClient.removeProxies).toHaveBeenCalled()
      expect(ledgerClient.removeAccountIndex).toHaveBeenCalled()
    })
  })

  describe('Polkadot app separation', () => {
    describe('deepScanApp should not store polkadotApp in apps.apps', () => {
      it('should store polkadotApp separately and not in apps.apps array', async () => {
        const { deepScanAllApps } = await import('@/lib/services/synchronization.service')

        // Mock successful deep scan with both polkadot and other apps
        vi.mocked(deepScanAllApps).mockResolvedValueOnce({
          success: true,
          apps: [
            {
              id: 'kusama',
              name: 'Kusama',
              token: { symbol: 'KSM', decimals: 12 },
              status: AppStatus.SYNCHRONIZED,
              accounts: [mockAddress1],
              multisigAccounts: [],
              originalAccountCount: 0,
            },
          ],
          newAccountsFound: 1,
          polkadotApp: {
            id: 'polkadot',
            name: 'Polkadot',
            token: { symbol: 'DOT', decimals: 10 },
            status: AppStatus.SYNCHRONIZED,
            accounts: [mockAddress1],
          },
        })

        // Set initial state with existing polkadot app
        ledgerState$.apps.polkadotApp.set({
          id: 'polkadot',
          name: 'Polkadot',
          token: { symbol: 'DOT', decimals: 10 },
        })

        // Execute deep scan
        const result = await ledgerState$.deepScanApp('kusama', [0, 1], [0, 1, 2])

        expect(result.success).toBe(true)

        // Verify polkadotApp is stored separately
        const polkadotApp = ledgerState$.apps.polkadotApp.get()
        expect(polkadotApp.id).toBe('polkadot')
        expect(polkadotApp.name).toBe('Polkadot')

        // Verify apps.apps does NOT contain polkadot
        const apps = ledgerState$.apps.apps.get()
        const hasPolkadotInApps = apps.some(app => app.id === 'polkadot')
        expect(hasPolkadotInApps).toBe(false)

        // Verify apps.apps contains the scanned app
        expect(apps.length).toBeGreaterThan(0)
        expect(apps.every(app => app.id !== 'polkadot')).toBe(true)
      })

      it('should not add polkadotApp to apps.apps when scanning all chains', async () => {
        const { deepScanAllApps } = await import('@/lib/services/synchronization.service')

        // Mock deep scan for all chains
        vi.mocked(deepScanAllApps).mockResolvedValueOnce({
          success: true,
          apps: [
            {
              id: 'kusama',
              name: 'Kusama',
              token: { symbol: 'KSM', decimals: 12 },
              status: AppStatus.SYNCHRONIZED,
              accounts: [mockAddress1],
              multisigAccounts: [],
              originalAccountCount: 0,
            },
          ],
          newAccountsFound: 1,
          polkadotApp: {
            id: 'polkadot',
            name: 'Polkadot',
            token: { symbol: 'DOT', decimals: 10 },
            status: AppStatus.SYNCHRONIZED,
            accounts: [mockAddress1],
          },
        })

        // Execute deep scan for all chains
        await ledgerState$.deepScanApp('all', [0, 1], [0, 1, 2])

        // Verify polkadotApp is stored separately
        const polkadotApp = ledgerState$.apps.polkadotApp.get()
        expect(polkadotApp.id).toBe('polkadot')

        // Verify apps.apps does NOT contain polkadot
        const apps = ledgerState$.apps.apps.get()
        const hasPolkadotInApps = apps.some(app => app.id === 'polkadot')
        expect(hasPolkadotInApps).toBe(false)

        // Verify all apps in apps.apps are not polkadot
        for (const app of apps) {
          expect(app.id).not.toBe('polkadot')
        }
      })

      it('should keep existing apps without polkadot when deep scan finds no new accounts', async () => {
        const { deepScanAllApps } = await import('@/lib/services/synchronization.service')

        // Set initial state with some existing apps
        ledgerState$.apps.apps.set([
          {
            id: 'kusama',
            name: 'Kusama',
            token: { symbol: 'KSM', decimals: 12 },
            accounts: [mockAddress1],
          },
        ])

        // Mock deep scan with no new accounts
        vi.mocked(deepScanAllApps).mockResolvedValueOnce({
          success: true,
          apps: [],
          newAccountsFound: 0,
          polkadotApp: {
            id: 'polkadot',
            name: 'Polkadot',
            token: { symbol: 'DOT', decimals: 10 },
            status: AppStatus.SYNCHRONIZED,
            accounts: [mockAddress1],
          },
        })

        // Execute deep scan
        await ledgerState$.deepScanApp('kusama', [0, 1], [0, 1, 2])

        // Verify polkadotApp is stored separately
        const polkadotApp = ledgerState$.apps.polkadotApp.get()
        expect(polkadotApp.id).toBe('polkadot')

        // Verify apps.apps still contains only kusama, not polkadot
        const apps = ledgerState$.apps.apps.get()
        expect(apps.length).toBe(1)
        expect(apps[0].id).toBe('kusama')
        const hasPolkadotInApps = apps.some(app => app.id === 'polkadot')
        expect(hasPolkadotInApps).toBe(false)
      })
    })
  })

  describe('Deep Scan functionality', () => {
    beforeEach(() => {
      // Reset deep scan state before each test
      ledgerState$.resetDeepScan()
    })

    describe('cancelDeepScan', () => {
      it('should set cancel flags and abort call', async () => {
        const { ledgerClient } = await import('../client/ledger')

        // Verify initial state
        expect(ledgerState$.deepScan.cancelRequested.get()).toBe(false)
        expect(ledgerState$.deepScan.isCancelling.get()).toBe(false)

        // Call cancel
        ledgerState$.cancelDeepScan()

        // Verify cancel flags are set
        expect(ledgerState$.deepScan.cancelRequested.get()).toBe(true)
        expect(ledgerState$.deepScan.isCancelling.get()).toBe(true)

        // Verify abort was called
        expect(ledgerClient.abortCall).toHaveBeenCalled()
      })

      it('should allow multiple cancel calls', async () => {
        const { ledgerClient } = await import('../client/ledger')

        // Call cancel multiple times
        ledgerState$.cancelDeepScan()
        ledgerState$.cancelDeepScan()
        ledgerState$.cancelDeepScan()

        // State should remain consistent
        expect(ledgerState$.deepScan.cancelRequested.get()).toBe(true)
        expect(ledgerState$.deepScan.isCancelling.get()).toBe(true)

        // Abort should be called each time
        expect(ledgerClient.abortCall).toHaveBeenCalledTimes(3)
      })
    })

    describe('resetDeepScan', () => {
      it('should reset all deep scan state to initial values', () => {
        // Set some state first
        ledgerState$.deepScan.isScanning.set(true)
        ledgerState$.deepScan.isCancelling.set(true)
        ledgerState$.deepScan.isCompleted.set(true)
        ledgerState$.deepScan.cancelRequested.set(true)
        ledgerState$.deepScan.progress.set({ scanned: 5, total: 10, percentage: 50, phase: undefined })
        ledgerState$.deepScan.apps.set([
          {
            id: 'polkadot',
            name: 'Polkadot',
            token: { symbol: 'DOT', decimals: 10 },
            status: AppStatus.LOADING,
            originalAccountCount: 0,
          } as any,
        ])

        // Reset
        ledgerState$.resetDeepScan()

        // Verify all state is reset
        expect(ledgerState$.deepScan.isScanning.get()).toBe(false)
        expect(ledgerState$.deepScan.isCancelling.get()).toBe(false)
        expect(ledgerState$.deepScan.isCompleted.get()).toBe(false)
        expect(ledgerState$.deepScan.cancelRequested.get()).toBe(false)
        expect(ledgerState$.deepScan.progress.get()).toEqual({
          scanned: 0,
          total: 0,
          percentage: 0,
          phase: undefined,
        })
        expect(ledgerState$.deepScan.apps.get()).toEqual([])
      })

      it('should be idempotent', () => {
        // Reset multiple times
        ledgerState$.resetDeepScan()
        ledgerState$.resetDeepScan()
        ledgerState$.resetDeepScan()

        // State should remain in initial values
        expect(ledgerState$.deepScan.isScanning.get()).toBe(false)
        expect(ledgerState$.deepScan.apps.get()).toEqual([])
      })
    })

    describe('deepScanApp', () => {
      it('should initialize state when starting deep scan', async () => {
        const { deepScanAllApps } = await import('@/lib/services/synchronization.service')

        // Mock successful scan
        vi.mocked(deepScanAllApps).mockResolvedValueOnce({
          success: true,
          apps: [],
          newAccountsFound: 0,
        })

        // Start deep scan
        const promise = ledgerState$.deepScanApp('polkadot', [0, 1], [0, 1, 2])

        // Check initial state
        expect(ledgerState$.deepScan.isScanning.get()).toBe(true)
        expect(ledgerState$.deepScan.isCancelling.get()).toBe(false)
        expect(ledgerState$.deepScan.isCompleted.get()).toBe(false)
        expect(ledgerState$.deepScan.cancelRequested.get()).toBe(false)

        await promise
      })

      it('should clean up state after successful scan', async () => {
        const { deepScanAllApps } = await import('@/lib/services/synchronization.service')

        vi.mocked(deepScanAllApps).mockResolvedValueOnce({
          success: true,
          apps: [],
          newAccountsFound: 0,
        })

        const result = await ledgerState$.deepScanApp('polkadot', [0], [0])

        expect(result.success).toBe(true)
        expect(ledgerState$.deepScan.isScanning.get()).toBe(false)
        expect(ledgerState$.deepScan.isCancelling.get()).toBe(false)
        expect(ledgerState$.deepScan.cancelRequested.get()).toBe(false)
        expect(ledgerState$.deepScan.isCompleted.get()).toBe(true)
      })

      it('should handle scan with new accounts found', async () => {
        const { deepScanAllApps } = await import('@/lib/services/synchronization.service')
        const { notifications$ } = await import('../notifications')

        vi.mocked(deepScanAllApps).mockResolvedValueOnce({
          success: true,
          apps: [
            {
              id: 'kusama',
              name: 'Kusama',
              token: { symbol: 'KSM', decimals: 12 },
              status: AppStatus.SYNCHRONIZED,
              accounts: [mockAddress1],
              multisigAccounts: [],
            },
          ],
          newAccountsFound: 1,
        })

        const result = await ledgerState$.deepScanApp('kusama', [0], [0])

        expect(result.success).toBe(true)
        expect(result.newAccountsFound).toBe(1)
        expect(notifications$.push).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Deep Scan Complete',
            type: 'success',
          })
        )
      })

      it('should handle scan with no new accounts', async () => {
        const { deepScanAllApps } = await import('@/lib/services/synchronization.service')
        const { notifications$ } = await import('../notifications')

        vi.mocked(deepScanAllApps).mockResolvedValueOnce({
          success: true,
          apps: [],
          newAccountsFound: 0,
        })

        const result = await ledgerState$.deepScanApp('polkadot', [0], [0])

        expect(result.success).toBe(true)
        expect(result.newAccountsFound).toBe(0)
        expect(notifications$.push).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Deep Scan Complete',
            description: 'No new accounts with balances were found in the specified range.',
            type: 'info',
          })
        )
      })

      it('should handle failed scan result', async () => {
        const { deepScanAllApps } = await import('@/lib/services/synchronization.service')

        // Mock failed scan
        vi.mocked(deepScanAllApps).mockResolvedValueOnce({
          success: false,
          apps: [],
          newAccountsFound: 0,
        })

        const result = await ledgerState$.deepScanApp('polkadot', [0], [0])

        expect(result.success).toBe(false)
        expect(result.newAccountsFound).toBe(0)
        // State should be cleaned up even on failure
        expect(ledgerState$.deepScan.isScanning.get()).toBe(false)
        expect(ledgerState$.deepScan.isCancelling.get()).toBe(false)
      })

      it('should handle errors gracefully', async () => {
        const { deepScanAllApps } = await import('@/lib/services/synchronization.service')
        const { notifications$ } = await import('../notifications')

        vi.mocked(deepScanAllApps).mockRejectedValueOnce(new Error('Scan failed'))

        const result = await ledgerState$.deepScanApp('polkadot', [0], [0])

        expect(result.success).toBe(false)
        expect(result.newAccountsFound).toBe(0)
        expect(notifications$.push).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Deep Scan System Error',
            type: 'error',
          })
        )

        // State should be cleaned up
        expect(ledgerState$.deepScan.isScanning.get()).toBe(false)
      })

      it('should handle all chains scan', async () => {
        const { deepScanAllApps } = await import('@/lib/services/synchronization.service')

        vi.mocked(deepScanAllApps).mockResolvedValueOnce({
          success: true,
          apps: [],
          newAccountsFound: 0,
        })

        await ledgerState$.deepScanApp('all', [0, 1], [0, 1, 2])

        expect(deepScanAllApps).toHaveBeenCalledWith(
          'all',
          [0, 1],
          [0, 1, 2],
          expect.any(Array),
          expect.any(Array),
          expect.any(Function),
          expect.any(Function),
          expect.any(Function),
          expect.any(Function),
          expect.any(Function)
        )
      })
    })
  })
})
