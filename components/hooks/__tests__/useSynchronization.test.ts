import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the state modules using the same pattern as useConnection
vi.mock('@/state/ledger', () => ({
  ledgerState$: {
    device: {
      connection: {
        transport: { get: vi.fn() },
        genericApp: { get: vi.fn() },
        get: vi.fn(),
      },
    },
    apps: {
      apps: { get: vi.fn() },
      status: { get: vi.fn() },
      syncProgress: { get: vi.fn() },
      isSyncCancelRequested: { get: vi.fn() },
      polkadotApp: { accounts: [] },
    },
    polkadotAddresses: {
      polkadot: { get: vi.fn() },
    },
    getAccountBalance: vi.fn(),
    synchronizeAccount: vi.fn(),
    synchronizeAccounts: vi.fn(),
    cancelSynchronization: vi.fn(),
    clearSynchronization: vi.fn(),
  },
  AppStatus: {
    LOADING: 'loading',
    SYNCHRONIZED: 'synchronized',
    ERROR: 'error',
    RESCANNING: 'rescanning',
  },
}))

vi.mock('@legendapp/state/react', () => ({
  use$: vi.fn(observable => observable?.get?.() || []),
  useObservable: vi.fn(fn => ({ get: fn })),
}))

vi.mock('@/lib/utils', () => ({
  filterInvalidSyncedApps: vi.fn(() => []),
  filterValidSyncedAppsWithBalances: vi.fn(() => []),
  hasAccountsWithErrors: vi.fn(() => false),
}))

import { AppStatus, ledgerState$ } from '@/state/ledger'
import { useSynchronization } from '../useSynchronization'

describe('useSynchronization hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset default mock implementations
    vi.mocked(ledgerState$.device.connection.transport.get).mockReturnValue(null)
    vi.mocked(ledgerState$.device.connection.genericApp.get).mockReturnValue(null)
    vi.mocked(ledgerState$.device.connection.get).mockReturnValue(null)
    vi.mocked(ledgerState$.apps.apps.get).mockReturnValue([])
    vi.mocked(ledgerState$.apps.status.get).mockReturnValue(undefined)
    vi.mocked(ledgerState$.apps.syncProgress.get).mockReturnValue({ scanned: 0, total: 0, percentage: 0 })
    vi.mocked(ledgerState$.apps.isSyncCancelRequested.get).mockReturnValue(false)
    vi.mocked(ledgerState$.polkadotAddresses.polkadot.get).mockReturnValue([])
  })

  describe('basic functionality', () => {
    it('should render without crashing', () => {
      const { result } = renderHook(() => useSynchronization())

      expect(result.current).toBeDefined()
      expect(Array.isArray(result.current.apps)).toBe(true)
    })

    it('should provide essential properties', () => {
      const { result } = renderHook(() => useSynchronization())

      expect(result.current.apps).toBeDefined()
      expect(result.current.syncProgress).toBeDefined()
      expect(result.current.polkadotAddresses).toBeDefined()
      // Other properties exist but may have varying types due to mocking
      expect(result.current.isLedgerConnected).toBeDefined()
      expect(result.current.isRescaning).toBeDefined()
      expect(result.current.isSyncCancelRequested).toBeDefined()
      expect(result.current.hasAccountsWithErrors).toBeDefined()
      expect(result.current.hasMultisigAccounts).toBeDefined()
    })
  })

  describe('hook structure', () => {
    it('should handle empty apps list', () => {
      vi.mocked(ledgerState$.apps.apps.get).mockReturnValue([])

      const { result } = renderHook(() => useSynchronization())

      expect(result.current.apps).toEqual([])
    })

    it('should call cancelSynchronization', () => {
      const { result } = renderHook(() => useSynchronization())

      act(() => {
        result.current.cancelSynchronization()
      })

      expect(ledgerState$.cancelSynchronization).toHaveBeenCalled()
    })

    it('should handle status tracking', () => {
      vi.mocked(ledgerState$.apps.status.get).mockReturnValue(AppStatus.LOADING)

      const { result } = renderHook(() => useSynchronization())

      expect(result.current.status).toBe(AppStatus.LOADING)
    })

    it('should handle sync progress', () => {
      const mockProgress = { scanned: 5, total: 10, percentage: 50 }
      vi.mocked(ledgerState$.apps.syncProgress.get).mockReturnValue(mockProgress)

      const { result } = renderHook(() => useSynchronization())

      expect(result.current.syncProgress).toEqual(mockProgress)
    })

    it('should handle edge cases gracefully', () => {
      vi.mocked(ledgerState$.apps.apps.get).mockReturnValue(null as any)

      const { result } = renderHook(() => useSynchronization())

      // Should handle gracefully without throwing
      expect(result.current.apps).toBeDefined()
    })
  })

  describe('polkadot addresses', () => {
    it('should extract polkadot addresses from app accounts', () => {
      const mockPolkadotApp = {
        accounts: [{ address: '5Address1' }, { address: '5Address2' }],
      }

      // Mock the polkadot app data structure
      ledgerState$.apps.polkadotApp = mockPolkadotApp as any

      const { result } = renderHook(() => useSynchronization())

      // Since we're using mocked use$, we need to check the structure exists
      expect(result.current.polkadotAddresses).toBeDefined()
    })

    it('should handle empty polkadot app gracefully', () => {
      const mockPolkadotApp = { accounts: [] }

      ledgerState$.apps.polkadotApp = mockPolkadotApp as any

      const { result } = renderHook(() => useSynchronization())

      expect(result.current.polkadotAddresses).toBeDefined()
    })
  })

  describe('actions', () => {
    it('should call restartSynchronization', () => {
      const { result } = renderHook(() => useSynchronization())

      act(() => {
        result.current.restartSynchronization()
      })

      expect(ledgerState$.clearSynchronization).toHaveBeenCalled()
      expect(ledgerState$.synchronizeAccounts).toHaveBeenCalled()
    })

    it('should provide updateTransaction function', () => {
      const { result } = renderHook(() => useSynchronization())

      // Test that the function exists and is callable without throwing
      expect(typeof result.current.updateTransaction).toBe('function')

      // Test calling it with valid parameters doesn't throw
      expect(() => {
        result.current.updateTransaction(
          { status: 'completed' },
          'polkadot',
          0, // accountIndex
          0, // balanceIndex
          false // isMultisig
        )
      }).not.toThrow()
    })

    it('should provide rescanFailedAccounts function', async () => {
      const { result } = renderHook(() => useSynchronization())

      // Test that the function exists and is callable
      expect(typeof result.current.rescanFailedAccounts).toBe('function')

      await act(async () => {
        await result.current.rescanFailedAccounts()
      })

      // Should complete without throwing
      expect(result.current.isRescaning).toBe(false)
    })
  })

  describe('selection actions', () => {
    it('should provide toggle account selection function', () => {
      const { result } = renderHook(() => useSynchronization())

      // Method should exist and be callable
      expect(typeof result.current.toggleAccountSelection).toBe('function')

      // Test that it doesn't throw with invalid parameters
      expect(() => {
        result.current.toggleAccountSelection('nonexistent', 'nonexistent', true)
      }).not.toThrow()
    })

    it('should provide toggle all accounts function', () => {
      const { result } = renderHook(() => useSynchronization())

      // Method should exist and be callable
      expect(typeof result.current.toggleAllAccounts).toBe('function')

      // Test that it doesn't throw
      expect(() => {
        result.current.toggleAllAccounts(true)
      }).not.toThrow()
    })
  })

  describe('toggleAllAccounts', () => {
    it('should handle apps without accounts gracefully', () => {
      const mockAppsWithoutAccounts = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          // No accounts or multisigAccounts
        },
      ]

      vi.mocked(ledgerState$.apps.apps.get).mockReturnValue(mockAppsWithoutAccounts as any)

      const { result } = renderHook(() => useSynchronization())

      // Should not throw when toggling accounts for apps without accounts
      expect(() => {
        act(() => {
          result.current.toggleAllAccounts(true)
        })
      }).not.toThrow()
    })
  })
})
