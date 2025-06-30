import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ledgerState$ } from '../ledger'

// Mock any external dependencies
vi.mock('@/lib/client/ledger', () => ({
  ledgerClient: {
    connectDevice: vi.fn(),
    disconnect: vi.fn(),
  },
}))

describe('Ledger State', () => {
  beforeEach(() => {
    // Reset state before each test
    ledgerState$.clearConnection()
  })

  describe('Initial state', () => {
    it('should have correct initial state', () => {
      expect(ledgerState$.device.connection.get()).toBeUndefined()
      expect(ledgerState$.device.isLoading.get()).toBe(false)
      expect(ledgerState$.device.error.get()).toBeUndefined()
    })
  })

  describe('connectLedger', () => {
    it.skip('should set isLoading to true during connection', async () => {
      // TODO: review expectations - this test is skipped, unclear if timeout behavior is correct
      // Mock implementation to control the flow
      const mockConnection = { isAppOpen: true }
      vi.mocked(require('@/lib/client/ledger').ledgerClient.connectDevice).mockImplementationOnce(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({ connection: mockConnection, error: undefined })
          }, 10)
        })
      })

      // Start connection but don't await it
      const connectionPromise = ledgerState$.connectLedger()
      expect(ledgerState$.device.isLoading.get()).toBe(true)

      // Wait for connection to complete
      await connectionPromise
    })

    it.skip('should set connection data after successful connection', async () => {
      // TODO: review expectations - skipped test, verify return value structure matches actual implementation
      // Mock successful connection
      const mockConnection = { isAppOpen: true }
      vi.mocked(require('@/lib/client/ledger').ledgerClient.connectDevice).mockResolvedValueOnce({
        connection: mockConnection,
        error: undefined,
      })

      const result = await ledgerState$.connectLedger()

      expect(result.connected).toBe(true)
      expect(result.isAppOpen).toBe(true)
      expect(ledgerState$.device.isLoading.get()).toBe(false)
      expect(ledgerState$.device.error.get()).toBeUndefined()
      expect(ledgerState$.device.connection.get()).toBe(mockConnection)
    })

    it.skip('should set error state when connection fails', async () => {
      // Mock failed connection
      const error = 'Connection failed'
      vi.mocked(require('@/lib/client/ledger').ledgerClient.connectDevice).mockResolvedValueOnce({
        connection: undefined,
        error: error,
      })

      const result = await ledgerState$.connectLedger()

      expect(result.connected).toBe(false)
      expect(ledgerState$.device.isLoading.get()).toBe(false)
      expect(ledgerState$.device.error.get()).toBe(error)
      expect(ledgerState$.device.connection.get()).toBeUndefined()
    })
  })

  describe('disconnectLedger', () => {
    it('should reset state when disconnecting', () => {
      // First set some connection data
      ledgerState$.device.connection.set({ isAppOpen: true })

      // Then disconnect
      ledgerState$.disconnectLedger()

      expect(ledgerState$.device.connection.get()).toBeUndefined()
      expect(ledgerState$.device.isLoading.get()).toBe(false)
      expect(ledgerState$.device.error.get()).toBeUndefined()
    })

    it.skip('should call ledgerClient.disconnect when disconnecting', () => {
      // TODO: review expectations - skipped test, verify if ledgerClient.disconnect should be called automatically
      // Setup for test
      const disconnectMock = vi.mocked(require('@/lib/client/ledger').ledgerClient.disconnect)

      // Set some connection data
      ledgerState$.device.connection.set({ isAppOpen: true })

      // Disconnect
      ledgerState$.disconnectLedger()

      expect(disconnectMock).toHaveBeenCalled()
    })
  })
})
