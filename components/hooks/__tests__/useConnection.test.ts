import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the state modules
vi.mock('@/state/ledger', () => ({
  ledgerState$: {
    device: {
      connection: {
        transport: { get: vi.fn() },
        genericApp: { get: vi.fn() },
        get: vi.fn(),
      },
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
    })

    it('should return connected state when transport and app are available', () => {
      // Mock connected state
      vi.mocked(ledgerState$.device.connection.transport.get).mockReturnValue({ id: 'transport' })
      vi.mocked(ledgerState$.device.connection.genericApp.get).mockReturnValue({ id: 'app' })
      vi.mocked(ledgerState$.device.connection.get).mockReturnValue({ isAppOpen: true })

      const { result } = renderHook(() => useConnection())

      expect(result.current.isLedgerConnected).toBe(true)
      expect(result.current.isAppOpen).toBe(true)
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
