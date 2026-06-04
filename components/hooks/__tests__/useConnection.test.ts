import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the state modules
vi.mock('@/state/ledger', () => ({
  AppStatus: {
    MIGRATED: 'migrated',
    SYNCHRONIZED: 'synchronized',
    LOADING: 'loading',
    ADDRESSES_FETCHED: 'addresses_fetched',
    ERROR: 'error',
    RESCANNING: 'rescanning',
    NO_NEED_MIGRATION: 'no_need_migration',
  },
  ledgerState$: {
    device: {
      connection: {
        transport: { get: vi.fn() },
        genericApp: { get: vi.fn() },
        get: vi.fn(),
      },
      isLoading: { get: vi.fn() },
    },
    apps: {
      status: { get: vi.fn() },
    },
    connectLedger: vi.fn(),
    disconnectLedger: vi.fn(),
    synchronizeAccounts: vi.fn(),
  },
}))

vi.mock('@/state/notifications', () => ({
  notifications$: {
    push: vi.fn(),
  },
}))

vi.mock('@legendapp/state/react', () => ({
  use$: vi.fn(observable => observable?.get?.() || false),
  useObservable: vi.fn(fn => ({ get: fn })),
}))

vi.mock('@/lib/utils', () => ({
  isSafari: vi.fn(),
}))

import { isSafari } from '@/lib/utils'
import { ledgerState$ } from '@/state/ledger'
import { notifications$ } from '@/state/notifications'
import { useConnection } from '../useConnection'

describe('useConnection hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset default mock implementations
    vi.mocked(ledgerState$.device.connection.transport.get).mockReturnValue(null)
    vi.mocked(ledgerState$.device.connection.genericApp.get).mockReturnValue(null)
    vi.mocked(ledgerState$.device.connection.get).mockReturnValue(null)
    vi.mocked(isSafari).mockReturnValue(false)
  })

  describe('initial state', () => {
    it('should return correct initial connection state when not connected', () => {
      const { result } = renderHook(() => useConnection())

      expect(result.current.isLedgerConnected).toBe(false)
      expect(result.current.isAppOpen).toBe(false)
      expect(typeof result.current.connectDevice).toBe('function')
      expect(typeof result.current.disconnectDevice).toBe('function')
      expect(result.current.isConnecting).toBe(false)
    })

    it('should return connected state when transport and app are available', () => {
      // Mock connected state
      vi.mocked(ledgerState$.device.connection.transport.get).mockReturnValue({ id: 'transport' })
      vi.mocked(ledgerState$.device.connection.genericApp.get).mockReturnValue({ id: 'app' })
      vi.mocked(ledgerState$.device.connection.get).mockReturnValue({
        transport: { id: 'transport' },
        genericApp: { id: 'app' },
        isAppOpen: true,
      })

      const { result } = renderHook(() => useConnection())

      expect(result.current.isLedgerConnected).toBe(true)
      expect(result.current.isAppOpen).toBe(true)
    })

    it('derives isLedgerConnected/isAppOpen from the whole connection object (subscribes via use$)', () => {
      // Regression: useConnection previously read nested observables through
      // optional chaining (`connection?.transport.get()`). When `connection`
      // was undefined, `?.` short-circuited before .get() was reached, so no
      // subscription was ever registered on the parent path and disconnects
      // never propagated. Now we subscribe to `connection` itself.
      vi.mocked(ledgerState$.device.connection.get).mockReturnValue({
        transport: { id: 't' },
        genericApp: { id: 'a' },
        isAppOpen: true,
      })

      const { result } = renderHook(() => useConnection())

      expect(result.current.isLedgerConnected).toBe(true)
      expect(result.current.isAppOpen).toBe(true)

      // Simulate the connection observable transitioning to undefined.
      vi.mocked(ledgerState$.device.connection.get).mockReturnValue(undefined)
      const { result: result2 } = renderHook(() => useConnection())

      expect(result2.current.isLedgerConnected).toBe(false)
      expect(result2.current.isAppOpen).toBe(false)
    })
  })

  describe('connectDevice', () => {
    it('should show Safari warning and return false when using Safari', async () => {
      vi.mocked(isSafari).mockReturnValue(true)

      const { result } = renderHook(() => useConnection())

      const connected = await act(async () => {
        return await result.current.connectDevice()
      })

      expect(connected).toBe(false)
      expect(notifications$.push).toHaveBeenCalledWith({
        title: 'Safari Not Supported',
        description: expect.stringContaining('Safari due to browser limitations'),
        type: 'warning',
        autoHideDuration: 6000,
      })
      expect(ledgerState$.connectLedger).not.toHaveBeenCalled()
    })

    it('should connect device and synchronize accounts when successful and app is open', async () => {
      vi.mocked(ledgerState$.connectLedger).mockResolvedValue({
        connected: true,
        isAppOpen: true,
      })

      const { result } = renderHook(() => useConnection())

      const connected = await act(async () => {
        return await result.current.connectDevice()
      })

      expect(connected).toBe(true)
      expect(ledgerState$.connectLedger).toHaveBeenCalled()
      expect(ledgerState$.synchronizeAccounts).toHaveBeenCalled()
      expect(notifications$.push).not.toHaveBeenCalled()
    })

    it('should return false when connection fails', async () => {
      vi.mocked(ledgerState$.connectLedger).mockResolvedValue({
        connected: false,
        isAppOpen: false,
      })

      const { result } = renderHook(() => useConnection())

      const connected = await act(async () => {
        return await result.current.connectDevice()
      })

      expect(connected).toBe(false)
      expect(ledgerState$.connectLedger).toHaveBeenCalled()
      expect(ledgerState$.synchronizeAccounts).not.toHaveBeenCalled()
    })

    it('should return false when connected but app is not open', async () => {
      // TODO: review expectations - verify behavior when device connected but app closed
      vi.mocked(ledgerState$.connectLedger).mockResolvedValue({
        connected: true,
        isAppOpen: false,
      })

      const { result } = renderHook(() => useConnection())

      const connected = await act(async () => {
        return await result.current.connectDevice()
      })

      expect(connected).toBe(false)
      expect(ledgerState$.connectLedger).toHaveBeenCalled()
      expect(ledgerState$.synchronizeAccounts).not.toHaveBeenCalled()
    })

    describe('re-entry guard', () => {
      // Guard prevents a second connect attempt while a connect/sync is in flight.
      // Without it, clicking Connect twice quickly produces "we can't connect with
      // the ledger device" because the transport is busy from the first call.

      it('skips connectLedger when device.isLoading is true', async () => {
        vi.mocked(ledgerState$.device.isLoading.get).mockReturnValue(true)

        const { result } = renderHook(() => useConnection())

        const connected = await act(async () => {
          return await result.current.connectDevice()
        })

        expect(connected).toBe(false)
        expect(ledgerState$.connectLedger).not.toHaveBeenCalled()
        expect(ledgerState$.synchronizeAccounts).not.toHaveBeenCalled()
      })

      it('skips connectLedger when apps.status is LOADING', async () => {
        vi.mocked(ledgerState$.apps.status.get).mockReturnValue('loading')

        const { result } = renderHook(() => useConnection())

        const connected = await act(async () => {
          return await result.current.connectDevice()
        })

        expect(connected).toBe(false)
        expect(ledgerState$.connectLedger).not.toHaveBeenCalled()
      })

      it('skips connectLedger when apps.status is ADDRESSES_FETCHED', async () => {
        vi.mocked(ledgerState$.apps.status.get).mockReturnValue('addresses_fetched')

        const { result } = renderHook(() => useConnection())

        const connected = await act(async () => {
          return await result.current.connectDevice()
        })

        expect(connected).toBe(false)
        expect(ledgerState$.connectLedger).not.toHaveBeenCalled()
      })
    })
  })

  describe('disconnectDevice', () => {
    it('should call ledgerState disconnectLedger', () => {
      const { result } = renderHook(() => useConnection())

      act(() => {
        result.current.disconnectDevice()
      })

      expect(ledgerState$.disconnectLedger).toHaveBeenCalled()
    })
  })

  describe('connection state reactivity', () => {
    it('should handle null connection gracefully', () => {
      vi.mocked(ledgerState$.device.connection.get).mockReturnValue(null)

      const { result } = renderHook(() => useConnection())

      expect(result.current.isAppOpen).toBe(false)
    })

    it('should handle undefined connection isAppOpen property', () => {
      // TODO: review expectations - verify fallback behavior for missing isAppOpen property
      vi.mocked(ledgerState$.device.connection.get).mockReturnValue({})

      const { result } = renderHook(() => useConnection())

      expect(result.current.isAppOpen).toBe(false)
    })
  })
})
