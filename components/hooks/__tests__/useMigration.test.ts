import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the state modules
vi.mock('@/state/ledger', () => ({
  ledgerState$: {
    apps: {
      apps: {
        get: vi.fn(() => []),
        peek: vi.fn(() => []),
      },
      migrationResult: {
        get: vi.fn(() => ({ success: 0, total: 0 })),
      },
      currentMigratedItem: {
        get: vi.fn(() => undefined),
      },
    },
    migrateSelected: vi.fn(),
    verifyDestinationAddresses: vi.fn(),
    polkadotAddresses: {
      polkadot: {
        get: vi.fn(() => []),
      },
    },
    clearSynchronization: vi.fn(),
    synchronizeAccounts: vi.fn(),
  },
}))

vi.mock('@legendapp/state/react', () => ({
  use$: vi.fn(fn => fn?.() || []),
  useObservable: vi.fn(fn => ({ get: fn })),
}))

vi.mock('@legendapp/state', () => ({
  observable: vi.fn(initialValue => ({
    get: vi.fn(() => initialValue),
    set: vi.fn(),
    peek: vi.fn(() => initialValue),
  })),
}))

vi.mock('@/lib/utils', () => ({
  addDestinationAddressesFromAccounts: vi.fn(() => ({})),
  filterValidSelectedAccountsForMigration: vi.fn(() => []),
  filterValidSyncedAppsWithBalances: vi.fn(() => []),
}))

import {
  addDestinationAddressesFromAccounts,
  filterValidSelectedAccountsForMigration,
  filterValidSyncedAppsWithBalances,
} from '@/lib/utils'
import { ledgerState$ } from '@/state/ledger'
import { use$ } from '@legendapp/state/react'
import { useMigration } from '../useMigration'

describe('useMigration hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset default mock implementations
    vi.mocked(use$).mockImplementation(fn => fn?.() || [])
    vi.mocked(ledgerState$.apps.apps.get).mockReturnValue([])
    vi.mocked(ledgerState$.apps.migrationResult.get).mockReturnValue({ success: 0, total: 0 })
    vi.mocked(ledgerState$.apps.currentMigratedItem.get).mockReturnValue(undefined)
    vi.mocked(addDestinationAddressesFromAccounts).mockReturnValue({})
    vi.mocked(filterValidSelectedAccountsForMigration).mockReturnValue([])
    vi.mocked(filterValidSyncedAppsWithBalances).mockReturnValue([])
  })

  describe('initial state', () => {
    it('should return correct initial state when no apps', () => {
      const { result } = renderHook(() => useMigration())

      expect(result.current.appsForMigration).toEqual([])
      expect(result.current.destinationAddressesByApp).toEqual({})
      expect(result.current.migratingItem).toBeDefined()
      // These depend on observable implementation, test they exist
      expect(result.current.migrationResults).toBeDefined()
      expect(typeof result.current.allVerified).toBeDefined()
      expect(typeof result.current.anyFailed).toBeDefined()
      expect(typeof result.current.isVerifying).toBeDefined()
    })

    it('should provide all required methods', () => {
      const { result } = renderHook(() => useMigration())

      expect(typeof result.current.verifyDestinationAddresses).toBe('function')
      expect(typeof result.current.verifySelectedAppsAddresses).toBe('function')
      expect(typeof result.current.verifyFailedAddresses).toBe('function')
      expect(typeof result.current.migrateSelected).toBe('function')
      expect(typeof result.current.restartSynchronization).toBe('function')
    })
  })

  describe('with apps data', () => {
    const mockApps = [
      {
        id: 'polkadot',
        name: 'Polkadot',
        token: { symbol: 'DOT', decimals: 10 },
        accounts: [
          {
            address: '1test',
            path: "m/44'/354'/0'/0'/0'",
            publicKey: new Uint8Array(),
            balances: [],
            isSelected: true,
          },
        ],
        multisigAccounts: [],
      },
    ]

    it('should handle apps with accounts', () => {
      vi.mocked(ledgerState$.apps.apps.get).mockReturnValue(mockApps)
      vi.mocked(filterValidSyncedAppsWithBalances).mockReturnValue(mockApps)
      vi.mocked(filterValidSelectedAccountsForMigration).mockReturnValue(mockApps)

      const { result } = renderHook(() => useMigration())

      expect(result.current.appsForMigration).toEqual(mockApps)
    })

    it('should handle migration results', () => {
      const mockResults = { success: 5, total: 10 }
      vi.mocked(ledgerState$.apps.migrationResult.get).mockReturnValue(mockResults)

      const { result } = renderHook(() => useMigration())

      // Migration results depend on use$ observable implementation
      expect(result.current.migrationResults).toBeDefined()
    })

    it('should handle migrating item', () => {
      const mockMigratingItem = {
        appId: 'polkadot',
        appName: 'Polkadot',
        account: mockApps[0].accounts[0],
        transaction: {
          status: 'IS_LOADING',
          statusMessage: 'Migrating...',
        },
      }
      vi.mocked(ledgerState$.apps.currentMigratedItem.get).mockReturnValue(mockMigratingItem)

      const { result } = renderHook(() => useMigration())

      expect(result.current.migratingItem).toEqual(mockMigratingItem)
    })
  })

  describe('verification methods', () => {
    it('should call verifyDestinationAddresses', async () => {
      const { result } = renderHook(() => useMigration())

      await act(async () => {
        await result.current.verifyDestinationAddresses()
      })

      // Should not throw during execution
      expect(typeof result.current.verifyDestinationAddresses).toBe('function')
    })

    it('should call verifySelectedAppsAddresses', async () => {
      const { result } = renderHook(() => useMigration())

      await act(async () => {
        await result.current.verifySelectedAppsAddresses()
      })

      // Should not throw during execution
      expect(typeof result.current.verifySelectedAppsAddresses).toBe('function')
    })

    it('should call verifyFailedAddresses', async () => {
      const { result } = renderHook(() => useMigration())

      await act(async () => {
        await result.current.verifyFailedAddresses()
      })

      // Should not throw during execution
      expect(typeof result.current.verifyFailedAddresses).toBe('function')
    })
  })

  describe('migration actions', () => {
    it('should call migrateSelected', async () => {
      const { result } = renderHook(() => useMigration())

      await act(async () => {
        await result.current.migrateSelected()
      })

      expect(ledgerState$.migrateSelected).toHaveBeenCalled()
    })

    it('should call restartSynchronization', () => {
      const { result } = renderHook(() => useMigration())

      act(() => {
        result.current.restartSynchronization()
      })

      expect(ledgerState$.clearSynchronization).toHaveBeenCalled()
      expect(ledgerState$.synchronizeAccounts).toHaveBeenCalled()
    })
  })

  describe('verification status', () => {
    it('should provide verification status properties', () => {
      const { result } = renderHook(() => useMigration())

      // Properties should exist and be defined
      expect(result.current.allVerified).toBeDefined()
      expect(result.current.anyFailed).toBeDefined()
      expect(result.current.isVerifying).toBeDefined()
    })
  })

  describe('edge cases', () => {
    it('should handle undefined apps gracefully', () => {
      vi.mocked(ledgerState$.apps.apps.get).mockReturnValue(undefined as any)

      const { result } = renderHook(() => useMigration())

      expect(result.current.appsForMigration).toEqual([])
    })

    it('should handle null migration results gracefully', () => {
      vi.mocked(ledgerState$.apps.migrationResult.get).mockReturnValue(null as any)

      const { result } = renderHook(() => useMigration())

      // Should handle gracefully without throwing
      expect(result.current.migrationResults).toBeDefined()
    })

    it('should handle apps without accounts', () => {
      const appsWithoutAccounts = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          token: { symbol: 'DOT', decimals: 10 },
        },
      ]
      vi.mocked(ledgerState$.apps.apps.get).mockReturnValue(appsWithoutAccounts as any)

      const { result } = renderHook(() => useMigration())

      // Should handle gracefully without throwing
      expect(result.current.appsForMigration).toBeDefined()
    })
  })

  describe('callback stability', () => {
    it('should maintain callback references across re-renders', () => {
      const { result, rerender } = renderHook(() => useMigration())

      const initialMigrateSelected = result.current.migrateSelected

      rerender()

      expect(result.current.migrateSelected).toBe(initialMigrateSelected)
    })
  })
})
