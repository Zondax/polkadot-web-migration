import type { AppId } from '@/config/apps'
import type { App } from '@/state/ledger'
import type { Address, MultisigAddress } from '@/state/types/ledger'
import { observable } from '@legendapp/state'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the ledger state
vi.mock('@/state/ledger', () => {
  const mockApps = observable<App[]>([])

  return {
    ledgerState$: {
      device: {
        connection: {
          transport: { get: vi.fn() },
          genericApp: { get: vi.fn() },
          get: vi.fn(),
        },
      },
      apps: {
        apps: mockApps,
        migrationResult: observable({
          success: 0,
          total: 0,
        }),
        currentMigratedItem: observable(undefined),
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
  }
})

// Import after mock to avoid hoisting issues
import { ledgerState$ } from '@/state/ledger'
import { useSynchronization } from '../hooks/useSynchronization'

describe('useSynchronization hook', () => {
  beforeEach(() => {
    // Reset the apps state before each test
    ledgerState$.apps.apps.set([])
  })

  describe('toggleAccountSelection', () => {
    it('should toggle selection state of a regular account', () => {
      // Setup initial state with a test app and account
      const testApp: Partial<App> = {
        id: 'polkadot' as AppId,
        name: 'Polkadot',
        accounts: [
          {
            address: 'test-address-1',
            path: '//0',
            pubKey: '0x123',
            selected: false,
          } as Address,
        ],
        error: undefined,
      }

      ledgerState$.apps.apps.set([testApp as App])

      // Render the hook
      const { result } = renderHook(() => useSynchronization())

      // Toggle the account selection
      act(() => {
        result.current.toggleAccountSelection('polkadot', 'test-address-1')
      })

      // Verify the account is now selected
      expect(ledgerState$.apps.apps[0].accounts[0].selected.get()).toBe(true)

      // Toggle it back to false
      act(() => {
        result.current.toggleAccountSelection('polkadot', 'test-address-1')
      })

      // Verify the account is now unselected
      expect(ledgerState$.apps.apps[0].accounts[0].selected.get()).toBe(false)
    })

    it('should toggle selection state of a multisig account', () => {
      // Setup initial state with a test app and multisig account
      const testApp: Partial<App> = {
        id: 'polkadot' as AppId,
        name: 'Polkadot',
        multisigAccounts: [
          {
            address: 'test-multisig-1',
            path: '//0',
            pubKey: '0x456',
            selected: false,
          } as MultisigAddress,
        ],
        error: undefined,
      }

      ledgerState$.apps.apps.set([testApp as App])

      // Render the hook
      const { result } = renderHook(() => useSynchronization())

      // Toggle the multisig account selection
      act(() => {
        result.current.toggleAccountSelection('polkadot', 'test-multisig-1')
      })

      // Verify the multisig account is now selected
      expect(ledgerState$.apps.apps[0].multisigAccounts[0].selected.get()).toBe(true)
    })

    it('should explicitly set selection state when provided', () => {
      // Setup initial state with a test app and account
      const testApp: Partial<App> = {
        id: 'polkadot' as AppId,
        name: 'Polkadot',
        accounts: [
          {
            address: 'test-address-1',
            path: '//0',
            pubKey: '0x123',
            selected: true,
          } as Address,
        ],
        error: undefined,
      }

      ledgerState$.apps.apps.set([testApp as App])

      // Render the hook
      const { result } = renderHook(() => useSynchronization())

      // Set the account selection explicitly to false
      act(() => {
        result.current.toggleAccountSelection('polkadot', 'test-address-1', false)
      })

      // Verify the account is now unselected
      expect(ledgerState$.apps.apps[0].accounts[0].selected.get()).toBe(false)
    })
  })

  describe('toggleAllAccounts', () => {
    it('should select all accounts when checked is true', () => {
      // Setup initial state with multiple apps and accounts
      const testApps: Partial<App>[] = [
        {
          id: 'polkadot' as AppId,
          name: 'Polkadot',
          accounts: [
            { address: 'test-address-1', path: '//0', pubKey: '0x123', selected: false } as Address,
            { address: 'test-address-2', path: '//1', pubKey: '0x456', selected: false } as Address,
          ],
          multisigAccounts: [{ address: 'test-multisig-1', path: '//0', pubKey: '0x789', selected: false } as MultisigAddress],
          error: undefined,
        },
        {
          id: 'kusama' as AppId,
          name: 'Kusama',
          accounts: [{ address: 'test-address-3', path: '//0', pubKey: '0xabc', selected: false } as Address],
          error: undefined,
        },
      ]

      ledgerState$.apps.apps.set(testApps as App[])

      // Render the hook
      const { result } = renderHook(() => useSynchronization())

      // Select all accounts
      act(() => {
        result.current.toggleAllAccounts(true)
      })

      // Verify all accounts are selected
      expect(ledgerState$.apps.apps[0].accounts[0].selected.get()).toBe(true)
      expect(ledgerState$.apps.apps[0].accounts[1].selected.get()).toBe(true)
      expect(ledgerState$.apps.apps[0].multisigAccounts[0].selected.get()).toBe(true)
      expect(ledgerState$.apps.apps[1].accounts[0].selected.get()).toBe(true)
    })

    it('should deselect all accounts when checked is false', () => {
      // Setup initial state with multiple apps and accounts (all selected)
      const testApps: Partial<App>[] = [
        {
          id: 'polkadot' as AppId,
          name: 'Polkadot',
          accounts: [
            { address: 'test-address-1', path: '//0', pubKey: '0x123', selected: true } as Address,
            { address: 'test-address-2', path: '//1', pubKey: '0x456', selected: true } as Address,
          ],
          error: undefined,
        },
      ]

      ledgerState$.apps.apps.set(testApps as App[])

      // Render the hook
      const { result } = renderHook(() => useSynchronization())

      // Deselect all accounts
      act(() => {
        result.current.toggleAllAccounts(false)
      })

      // Verify all accounts are deselected
      expect(ledgerState$.apps.apps[0].accounts[0].selected.get()).toBe(false)
      expect(ledgerState$.apps.apps[0].accounts[1].selected.get()).toBe(false)
    })

    it('should skip apps with errors', () => {
      // Setup initial state with one app with error and one without
      const testApps: Partial<App>[] = [
        {
          id: 'polkadot' as AppId,
          name: 'Polkadot',
          accounts: [{ address: 'test-address-1', path: '//0', pubKey: '0x123', selected: false } as Address],
          error: { source: 'synchronization', description: 'Test error' },
        },
        {
          id: 'kusama' as AppId,
          name: 'Kusama',
          accounts: [{ address: 'test-address-2', path: '//0', pubKey: '0x456', selected: false } as Address],
          error: undefined,
        },
      ]

      ledgerState$.apps.apps.set(testApps as App[])

      // Render the hook
      const { result } = renderHook(() => useSynchronization())

      // Select all accounts
      act(() => {
        result.current.toggleAllAccounts(true)
      })

      // Verify only accounts from apps without errors are selected
      expect(ledgerState$.apps.apps[0].accounts[0].selected.get()).toBe(false) // Should remain false due to app error
      expect(ledgerState$.apps.apps[1].accounts[0].selected.get()).toBe(true)
    })
  })
})
