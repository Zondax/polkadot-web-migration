import { TransportError } from '@ledgerhq/hw-transport'
import { LedgerError, ResponseError } from '@zondax/ledger-js'
import { PolkadotGenericApp } from '@zondax/ledger-substrate'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LEDGER_USB_VENDOR_ID, LedgerService } from '../ledgerService'

// Mock external dependencies
vi.mock('@ledgerhq/hw-transport-webhid', () => ({
  default: {
    create: vi.fn(),
  },
}))

vi.mock('@zondax/ledger-substrate', () => ({
  PolkadotGenericApp: vi.fn(),
}))

vi.mock('../openApp', () => ({
  openApp: vi.fn(),
}))

// Mock console.debug to avoid noise in tests
vi.spyOn(console, 'debug').mockImplementation(() => {})

describe('LedgerService', () => {
  let ledgerService: LedgerService
  let mockTransport: any
  let mockGenericApp: any

  beforeEach(() => {
    vi.clearAllMocks()
    ledgerService = new LedgerService()

    // Create mock transport
    mockTransport = {
      close: vi.fn(),
      emit: vi.fn(),
      on: vi.fn(),
    }

    // Create mock generic app
    mockGenericApp = {
      getVersion: vi.fn(),
      getAddress: vi.fn(),
      signWithMetadataEd25519: vi.fn(),
      txMetadataChainId: '',
    }

    vi.mocked(PolkadotGenericApp).mockImplementation(() => mockGenericApp)
  })

  describe('openApp', () => {
    it('should throw error when transport is not available', async () => {
      await expect(ledgerService.openApp('Polkadot Migration')).rejects.toThrow('Transport not available')
    })

    it('should successfully open app when transport is available', async () => {
      const { openApp } = await import('../openApp')
      vi.mocked(openApp).mockResolvedValueOnce(undefined)
      vi.mocked(mockGenericApp.getVersion).mockResolvedValueOnce('1.0.0')

      const TransportWebUSB = await import('@ledgerhq/hw-transport-webhid')
      vi.mocked(TransportWebUSB.default.create).mockResolvedValueOnce(mockTransport)

      await ledgerService.initializeTransport()

      const result = await ledgerService.openApp('Polkadot Migration')

      expect(openApp).toHaveBeenCalledWith(mockTransport, 'Polkadot Migration')
      expect(PolkadotGenericApp).toHaveBeenCalledWith(mockTransport)
      expect(result.connection).toEqual({
        transport: mockTransport,
        genericApp: mockGenericApp,
        isAppOpen: true,
      })
    })

    it('should throw an error when app version check fails', async () => {
      const { openApp } = await import('../openApp')
      vi.mocked(openApp).mockResolvedValueOnce(undefined)
      vi.mocked(mockGenericApp.getVersion).mockRejectedValueOnce(new Error('App not open'))

      await expect(ledgerService.openApp('Polkadot Migration')).rejects.toThrow(
        new ResponseError(LedgerError.UnknownTransportError, 'Transport not available')
      )
    })
  })

  describe('initializeTransport', () => {
    it('should successfully initialize transport', async () => {
      const TransportWebUSB = await import('@ledgerhq/hw-transport-webhid')
      vi.mocked(TransportWebUSB.default.create).mockResolvedValueOnce(mockTransport)

      const result = await ledgerService.initializeTransport()

      expect(TransportWebUSB.default.create).toHaveBeenCalled()
      expect(mockTransport.on).toHaveBeenCalledWith('disconnect', expect.any(Function))
      expect(result).toBe(mockTransport)
    })

    it('should call onDisconnect callback when transport disconnects (no HID api available)', async () => {
      const TransportWebUSB = await import('@ledgerhq/hw-transport-webhid')
      const onDisconnectCallback = vi.fn()
      vi.mocked(TransportWebUSB.default.create).mockResolvedValueOnce(mockTransport)

      // Ensure navigator.hid is not available in this test (default in jsdom)
      const navWithHid = navigator as Navigator & { hid?: unknown }
      const originalHid = navWithHid.hid
      // @ts-expect-error — intentionally clear hid
      delete navWithHid.hid

      try {
        await ledgerService.initializeTransport(onDisconnectCallback)

        // Simulate transport disconnect
        const disconnectHandler = vi.mocked(mockTransport.on).mock.calls[0][1] as () => Promise<void>
        await disconnectHandler()

        // After the 500ms debounce completes, with no HID api to consult, the
        // handler falls through and calls onDisconnect.
        expect(onDisconnectCallback).toHaveBeenCalled()
      } finally {
        if (originalHid !== undefined) navWithHid.hid = originalHid
      }
    })

    it('should handle transport initialization failure', async () => {
      const TransportWebUSB = await import('@ledgerhq/hw-transport-webhid')
      vi.mocked(TransportWebUSB.default.create).mockRejectedValueOnce(
        new TransportError(TransportWebUSB.default.ErrorMessage_NoDeviceFound, 'NoDeviceFound')
      )

      await expect(ledgerService.initializeTransport()).rejects.toThrow(ResponseError)
    })

    describe('disconnect handler — app-switch vs real unplug', () => {
      // Ledger transports fire `disconnect` on both real unplugs AND on device
      // app-switches (the device reboots between dashboard and an app, which
      // re-enumerates HID). The handler must distinguish them via
      // `navigator.hid.getDevices()` so we don't wipe `device.connection` on
      // every app-switch.

      const stubHid = (devices: Array<{ vendorId: number }>) => {
        const navWithHid = navigator as Navigator & { hid?: { getDevices: () => Promise<unknown> } }
        const originalHid = navWithHid.hid
        navWithHid.hid = { getDevices: vi.fn().mockResolvedValue(devices) }
        return () => {
          if (originalHid === undefined) {
            // @ts-expect-error — restore by deleting
            delete navWithHid.hid
          } else {
            navWithHid.hid = originalHid
          }
        }
      }

      it('does NOT call onDisconnect when the Ledger is still listed (app-switch reboot)', async () => {
        const TransportWebUSB = await import('@ledgerhq/hw-transport-webhid')
        const onDisconnectCallback = vi.fn()
        vi.mocked(TransportWebUSB.default.create).mockResolvedValueOnce(mockTransport)

        const restoreHid = stubHid([{ vendorId: LEDGER_USB_VENDOR_ID }])
        try {
          await ledgerService.initializeTransport(onDisconnectCallback)

          const disconnectHandler = vi.mocked(mockTransport.on).mock.calls[0][1] as () => Promise<void>
          await disconnectHandler()

          expect(onDisconnectCallback).not.toHaveBeenCalled()
        } finally {
          restoreHid()
        }
      })

      it('calls onDisconnect when the Ledger is gone from the HID list (real unplug)', async () => {
        const TransportWebUSB = await import('@ledgerhq/hw-transport-webhid')
        const onDisconnectCallback = vi.fn()
        vi.mocked(TransportWebUSB.default.create).mockResolvedValueOnce(mockTransport)

        // Empty device list = no Ledger present anymore
        const restoreHid = stubHid([])
        try {
          await ledgerService.initializeTransport(onDisconnectCallback)

          const disconnectHandler = vi.mocked(mockTransport.on).mock.calls[0][1] as () => Promise<void>
          await disconnectHandler()

          expect(onDisconnectCallback).toHaveBeenCalled()
        } finally {
          restoreHid()
        }
      })

      it('ignores a non-Ledger HID device when deciding whether to clear', async () => {
        const TransportWebUSB = await import('@ledgerhq/hw-transport-webhid')
        const onDisconnectCallback = vi.fn()
        vi.mocked(TransportWebUSB.default.create).mockResolvedValueOnce(mockTransport)

        // Only some other vendor still attached
        const restoreHid = stubHid([{ vendorId: 0x1234 }])
        try {
          await ledgerService.initializeTransport(onDisconnectCallback)

          const disconnectHandler = vi.mocked(mockTransport.on).mock.calls[0][1] as () => Promise<void>
          await disconnectHandler()

          expect(onDisconnectCallback).toHaveBeenCalled()
        } finally {
          restoreHid()
        }
      })

      it('falls through to onDisconnect if navigator.hid.getDevices throws', async () => {
        const TransportWebUSB = await import('@ledgerhq/hw-transport-webhid')
        const onDisconnectCallback = vi.fn()
        vi.mocked(TransportWebUSB.default.create).mockResolvedValueOnce(mockTransport)

        const navWithHid = navigator as Navigator & { hid?: { getDevices: () => Promise<unknown> } }
        const originalHid = navWithHid.hid
        navWithHid.hid = { getDevices: vi.fn().mockRejectedValue(new Error('HID error')) }

        try {
          await ledgerService.initializeTransport(onDisconnectCallback)

          const disconnectHandler = vi.mocked(mockTransport.on).mock.calls[0][1] as () => Promise<void>
          await disconnectHandler()

          expect(onDisconnectCallback).toHaveBeenCalled()
        } finally {
          if (originalHid === undefined) {
            // @ts-expect-error — restore by deleting
            delete navWithHid.hid
          } else {
            navWithHid.hid = originalHid
          }
        }
      })
    })
  })

  describe('isAppOpen', () => {
    it('should return true when app version is successfully retrieved', async () => {
      vi.mocked(mockGenericApp.getVersion).mockResolvedValueOnce('1.0.0')

      const result = await ledgerService.isAppOpen(mockGenericApp)

      expect(result).toBe(true)
      expect(mockGenericApp.getVersion).toHaveBeenCalled()
    })

    it('should return false when app version retrieval fails', async () => {
      vi.mocked(mockGenericApp.getVersion).mockRejectedValueOnce(new ResponseError(LedgerError.AppDoesNotSeemToBeOpen, 'App not open'))

      await expect(ledgerService.isAppOpen(mockGenericApp)).rejects.toThrow(ResponseError)
    })

    it('should return false when app version is falsy', async () => {
      vi.mocked(mockGenericApp.getVersion).mockResolvedValueOnce(null)

      const result = await ledgerService.isAppOpen(mockGenericApp)

      expect(result).toBe(false)
    })
  })

  describe('establishDeviceConnection', () => {
    it('should use existing transport when available', async () => {
      // Set up existing connection
      const _existingConnection = {
        transport: mockTransport,
        genericApp: mockGenericApp,
        isAppOpen: false,
      }

      // Simulate existing connection by calling initializeTransport first
      const TransportWebUSB = await import('@ledgerhq/hw-transport-webhid')
      vi.mocked(TransportWebUSB.default.create).mockResolvedValueOnce(mockTransport)
      await ledgerService.initializeTransport()

      vi.mocked(mockGenericApp.getVersion).mockResolvedValueOnce('1.0.0')

      const result = await ledgerService.establishDeviceConnection()

      expect(result).toEqual({
        transport: mockTransport,
        genericApp: expect.any(Object),
        isAppOpen: true,
      })
    })

    it('should initialize new transport when not available', async () => {
      const TransportWebUSB = await import('@ledgerhq/hw-transport-webhid')
      vi.mocked(TransportWebUSB.default.create).mockResolvedValueOnce(mockTransport)
      vi.mocked(mockGenericApp.getVersion).mockResolvedValueOnce('1.0.0')

      const result = await ledgerService.establishDeviceConnection()

      expect(TransportWebUSB.default.create).toHaveBeenCalled()
      expect(result?.isAppOpen).toBe(true)
    })

    it('should attempt to open app when not open', async () => {
      const TransportWebUSB = await import('@ledgerhq/hw-transport-webhid')
      const { openApp } = await import('../openApp')

      vi.mocked(TransportWebUSB.default.create).mockResolvedValueOnce(mockTransport)
      vi.mocked(mockGenericApp.getVersion).mockResolvedValueOnce(null) // App not open
      vi.mocked(openApp).mockResolvedValueOnce(undefined)

      const result = await ledgerService.establishDeviceConnection()

      expect(result?.isAppOpen).toBe(false)
    })

    it('should handle transport initialization failure', async () => {
      const TransportWebUSB = await import('@ledgerhq/hw-transport-webhid')
      vi.mocked(TransportWebUSB.default.create).mockRejectedValueOnce(
        new TransportError(TransportWebUSB.default.ErrorMessage_NoDeviceFound, 'NoDeviceFound')
      )

      await expect(ledgerService.establishDeviceConnection()).rejects.toThrow(ResponseError)
    })
  })

  describe('connectDevice', () => {
    it('should successfully connect device', async () => {
      const TransportWebUSB = await import('@ledgerhq/hw-transport-webhid')
      vi.mocked(TransportWebUSB.default.create).mockResolvedValueOnce(mockTransport)
      vi.mocked(mockGenericApp.getVersion).mockResolvedValueOnce('1.0.0')

      const result = await ledgerService.connectDevice()

      expect(result).toEqual({
        connection: {
          transport: mockTransport,
          genericApp: expect.any(Object),
          isAppOpen: true,
        },
      })
    })

    it('should throw error when connection establishment fails', async () => {
      // Mock establishDeviceConnection to return undefined
      const originalEstablish = ledgerService.establishDeviceConnection
      ledgerService.establishDeviceConnection = vi.fn().mockResolvedValueOnce(undefined)

      await expect(ledgerService.connectDevice()).rejects.toThrow('Transport not available')

      // Restore original method
      ledgerService.establishDeviceConnection = originalEstablish
    })

    it('should pass onDisconnect callback to establishDeviceConnection', async () => {
      const TransportWebUSB = await import('@ledgerhq/hw-transport-webhid')
      const onDisconnectCallback = vi.fn()

      vi.mocked(TransportWebUSB.default.create).mockResolvedValueOnce(mockTransport)
      vi.mocked(mockGenericApp.getVersion).mockResolvedValueOnce('1.0.0')

      // Ensure no navigator.hid api so the handler falls through to onDisconnect
      const navWithHid = navigator as Navigator & { hid?: unknown }
      const originalHid = navWithHid.hid
      // @ts-expect-error — intentionally clear hid
      delete navWithHid.hid

      try {
        await ledgerService.connectDevice(onDisconnectCallback)

        // Verify the callback was passed through by simulating a disconnect.
        // The handler is now async (500ms debounce + HID check), so await it.
        const disconnectHandler = vi.mocked(mockTransport.on).mock.calls[0][1] as () => Promise<void>
        await disconnectHandler()

        expect(onDisconnectCallback).toHaveBeenCalled()
      } finally {
        if (originalHid !== undefined) navWithHid.hid = originalHid
      }
    })
  })

  describe('getAccountAddress', () => {
    beforeEach(async () => {
      // Set up a connected device
      const TransportWebUSB = await import('@ledgerhq/hw-transport-webhid')
      vi.mocked(TransportWebUSB.default.create).mockResolvedValueOnce(mockTransport)
      vi.mocked(mockGenericApp.getVersion).mockResolvedValueOnce('1.0.0')
      await ledgerService.connectDevice()
    })

    it('should successfully get account address', async () => {
      const mockAddress = {
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        publicKey: new Uint8Array([1, 2, 3]),
      }
      vi.mocked(mockGenericApp.getAddress).mockResolvedValueOnce(mockAddress)

      const result = await ledgerService.getAccountAddress("m/44'/354'/0'/0'/0'", 0, false)

      expect(mockGenericApp.getAddress).toHaveBeenCalledWith("m/44'/354'/0'/0'/0'", 0, false)
      expect(result).toEqual(mockAddress)
    })

    it('should throw error when app is not open', async () => {
      // Clear the connection
      ledgerService.clearConnection()

      await expect(ledgerService.getAccountAddress("m/44'/354'/0'/0'/0'", 0, false)).rejects.toThrow(
        new ResponseError(LedgerError.UnknownTransportError, 'Transport not available')
      )
    })

    it('should handle address retrieval failure', async () => {
      vi.mocked(mockGenericApp.getAddress).mockRejectedValueOnce(new Error('Address retrieval failed'))

      await expect(ledgerService.getAccountAddress("m/44'/354'/0'/0'/0'", 0, false)).rejects.toThrow('Address retrieval failed')
    })

    it('should work with different BIP44 paths and prefixes', async () => {
      const mockAddress = {
        address: 'CxDDSH8gS7jecsxaRL9Txf8H5kqesLXAEAEgp76Yz632J9M',
        publicKey: new Uint8Array([4, 5, 6]),
      }
      vi.mocked(mockGenericApp.getAddress).mockResolvedValueOnce(mockAddress)

      const result = await ledgerService.getAccountAddress("m/44'/354'/1'/0'/5'", 2, true)

      expect(mockGenericApp.getAddress).toHaveBeenCalledWith("m/44'/354'/1'/0'/5'", 2, true)
      expect(result).toEqual(mockAddress)
    })
  })

  describe('signTransaction', () => {
    beforeEach(async () => {
      // Set up a connected device
      const TransportWebUSB = await import('@ledgerhq/hw-transport-webhid')
      vi.mocked(TransportWebUSB.default.create).mockResolvedValueOnce(mockTransport)
      vi.mocked(mockGenericApp.getVersion).mockResolvedValueOnce('1.0.0')
      await ledgerService.connectDevice()
    })

    it('should successfully sign transaction', async () => {
      const mockSignature = Buffer.from([7, 8, 9])
      vi.mocked(mockGenericApp.signWithMetadataEd25519).mockResolvedValueOnce({
        signature: mockSignature,
      })

      const payloadBytes = new Uint8Array([1, 2, 3])
      const proof1 = new Uint8Array([4, 5, 6])
      const chainId = 'polkadot'
      const bip44Path = "m/44'/354'/0'/0'/0'"

      const result = await ledgerService.signTransaction(bip44Path, payloadBytes, chainId, proof1)

      expect(mockGenericApp.txMetadataChainId).toBe(chainId)
      expect(mockGenericApp.signWithMetadataEd25519).toHaveBeenCalledWith(bip44Path, Buffer.from(payloadBytes), Buffer.from(proof1))
      expect(result).toEqual({ signature: mockSignature })
    })

    it('should throw error when app is not open', async () => {
      // Clear the connection
      ledgerService.clearConnection()

      const payloadBytes = new Uint8Array([1, 2, 3])
      const proof1 = new Uint8Array([4, 5, 6])

      await expect(ledgerService.signTransaction("m/44'/354'/0'/0'/0'", payloadBytes, 'polkadot', proof1)).rejects.toThrow('App not open')
    })

    it('should handle signing failure', async () => {
      vi.mocked(mockGenericApp.signWithMetadataEd25519).mockRejectedValueOnce(new Error('Signing failed'))

      const payloadBytes = new Uint8Array([1, 2, 3])
      const proof1 = new Uint8Array([4, 5, 6])

      await expect(ledgerService.signTransaction("m/44'/354'/0'/0'/0'", payloadBytes, 'polkadot', proof1)).rejects.toThrow('Signing failed')
    })

    it('should work with different chain IDs', async () => {
      const mockSignature = Buffer.from([10, 11, 12])
      vi.mocked(mockGenericApp.signWithMetadataEd25519).mockResolvedValueOnce({
        signature: mockSignature,
      })

      const payloadBytes = new Uint8Array([1, 2, 3])
      const proof1 = new Uint8Array([4, 5, 6])

      await ledgerService.signTransaction("m/44'/354'/0'/0'/0'", payloadBytes, 'kusama', proof1)

      expect(mockGenericApp.txMetadataChainId).toBe('kusama')
    })
  })

  describe('clearConnection', () => {
    it('should reset device connection to initial state', async () => {
      // First establish a connection
      const TransportWebUSB = await import('@ledgerhq/hw-transport-webhid')
      vi.mocked(TransportWebUSB.default.create).mockResolvedValueOnce(mockTransport)
      vi.mocked(mockGenericApp.getVersion).mockResolvedValueOnce('1.0.0')
      await ledgerService.connectDevice()

      // Clear the connection
      ledgerService.clearConnection()

      // Verify connection is cleared by trying to get an address (should fail)
      await expect(ledgerService.getAccountAddress("m/44'/354'/0'/0'/0'", 0, false)).rejects.toThrow(
        new ResponseError(LedgerError.UnknownTransportError, 'Transport not available')
      )
    })

    it('should be safe to call multiple times', () => {
      expect(() => {
        ledgerService.clearConnection()
        ledgerService.clearConnection()
        ledgerService.clearConnection()
      }).not.toThrow()
    })
  })

  describe('disconnect', () => {
    it('should close transport and emit disconnect when transport exists', async () => {
      // Set up a connected device
      const TransportWebUSB = await import('@ledgerhq/hw-transport-webhid')
      vi.mocked(TransportWebUSB.default.create).mockResolvedValueOnce(mockTransport)
      vi.mocked(mockGenericApp.getVersion).mockResolvedValueOnce('1.0.0')
      await ledgerService.connectDevice()

      ledgerService.disconnect()

      expect(mockTransport.close).toHaveBeenCalled()
      expect(mockTransport.emit).toHaveBeenCalledWith('disconnect')
    })

    it('should be safe to call when no transport exists', () => {
      expect(() => {
        ledgerService.disconnect()
      }).not.toThrow()
    })

    it('should be safe to call multiple times', async () => {
      // Set up a connected device
      const TransportWebUSB = await import('@ledgerhq/hw-transport-webhid')
      vi.mocked(TransportWebUSB.default.create).mockResolvedValueOnce(mockTransport)
      vi.mocked(mockGenericApp.getVersion).mockResolvedValueOnce('1.0.0')
      await ledgerService.connectDevice()

      expect(() => {
        ledgerService.disconnect()
        ledgerService.disconnect()
        ledgerService.disconnect()
      }).not.toThrow()

      // Each call should attempt to close and emit (the transport reference doesn't get cleared in disconnect)
      expect(mockTransport.close).toHaveBeenCalledTimes(3)
      expect(mockTransport.emit).toHaveBeenCalledTimes(3)
    })
  })

  describe('private handleDisconnect', () => {
    it('should reset device connection when called', async () => {
      // Set up a connected device
      const TransportWebUSB = await import('@ledgerhq/hw-transport-webhid')
      vi.mocked(TransportWebUSB.default.create).mockResolvedValueOnce(mockTransport)
      vi.mocked(mockGenericApp.getVersion).mockResolvedValueOnce('1.0.0')
      await ledgerService.connectDevice()

      // Ensure no navigator.hid api so the debounced handler falls through
      const navWithHid = navigator as Navigator & { hid?: unknown }
      const originalHid = navWithHid.hid
      // @ts-expect-error — intentionally clear hid
      delete navWithHid.hid

      try {
        // Simulate transport disconnect event — handler is async (500ms debounce)
        const disconnectHandler = vi.mocked(mockTransport.on).mock.calls[0][1] as () => Promise<void>
        await disconnectHandler()

        // Verify connection is cleared by trying to get an address (should fail)
        await expect(ledgerService.getAccountAddress("m/44'/354'/0'/0'/0'", 0, false)).rejects.toThrow(
          new ResponseError(LedgerError.UnknownTransportError, 'Transport not available')
        )
      } finally {
        if (originalHid !== undefined) navWithHid.hid = originalHid
      }
    })
  })

  describe('error handling', () => {
    it('should handle ResponseError correctly', async () => {
      const _responseError = new ResponseError(LedgerError.AppDoesNotSeemToBeOpen, 'Test error')

      await expect(ledgerService.openApp('Polkadot Migration')).rejects.toThrow(ResponseError)
    })

    it('should handle LedgerError correctly', async () => {
      vi.mocked(mockGenericApp.getAddress).mockRejectedValueOnce(new ResponseError(LedgerError.UserRefusedOnDevice, 'User rejected'))

      // Set up connection first
      const TransportWebUSB = await import('@ledgerhq/hw-transport-webhid')
      vi.mocked(TransportWebUSB.default.create).mockResolvedValueOnce(mockTransport)
      vi.mocked(mockGenericApp.getVersion).mockResolvedValueOnce('1.0.0')
      await ledgerService.connectDevice()

      await expect(ledgerService.getAccountAddress("m/44'/354'/0'/0'/0'", 0, false)).rejects.toThrow('User rejected')
    })
  })

  describe('edge cases', () => {
    it('should handle undefined transport in disconnect', () => {
      const service = new LedgerService()
      expect(() => service.disconnect()).not.toThrow()
    })

    it('should handle transport creation with undefined result', async () => {
      const TransportWebUSB = await import('@ledgerhq/hw-transport-webhid')
      vi.mocked(TransportWebUSB.default.create).mockResolvedValueOnce(undefined as any)

      const result = await ledgerService.initializeTransport()
      expect(result).toBeUndefined()
    })

    it('should handle generic app creation with null transport', () => {
      expect(() => new PolkadotGenericApp(null as any)).not.toThrow()
    })
  })
})
