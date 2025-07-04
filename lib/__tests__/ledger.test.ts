import { MockTransport } from '@ledgerhq/hw-transport-mocker'
import TransportWebUSB from '@ledgerhq/hw-transport-webhid'
import { LedgerError, ResponseError } from '@zondax/ledger-js'
import { PolkadotGenericApp } from '@zondax/ledger-substrate'
import type { GenericeResponseAddress } from '@zondax/ledger-substrate/dist/common'
import { describe, expect, it, vi } from 'vitest'
import { LedgerService } from '@/lib/ledger/ledgerService'

// Constants for error handling
const TRANSPORT_NOT_AVAILABLE_ERROR = new ResponseError(LedgerError.UnknownTransportError, 'Transport not available')
const POLKADOT_MIGRATION_APP = 'Polkadot Migration'

// Helper function to create mock responses
const createMockResponse = (statusCode: number) =>
  Buffer.concat([
    Buffer.from([]), // Empty data
    Buffer.from([statusCode >> 8, statusCode & 0xff]), // Status code
  ])

// Mock PolkadotGenericApp with required methods
const createMockGenericApp = (overrides: Partial<PolkadotGenericApp> = {}) =>
  ({
    getVersion: vi.fn(),
    ...overrides,
  }) as unknown as PolkadotGenericApp

describe('LedgerService', () => {
  describe('openApp', () => {
    it('should successfully open app and return connection', async () => {
      // Mock TransportWebUSB.create to return our mock transport
      const mockTransport = new MockTransport(createMockResponse(0x9000))
      vi.spyOn(TransportWebUSB, 'create').mockResolvedValue(mockTransport as any)

      // Mock the openApp function
      vi.mock('@/lib/ledger/openApp', () => ({
        openApp: vi.fn().mockResolvedValue(undefined),
      }))

      // Mock PolkadotGenericApp.getVersion to return a valid response
      vi.spyOn(PolkadotGenericApp.prototype, 'getVersion').mockResolvedValue({
        testMode: false,
        major: 1,
        minor: 0,
        patch: 0,
        deviceLocked: false,
        targetId: '0x00000000',
      })

      const ledgerService = new LedgerService()

      const onDisconnect = vi.fn()
      const transport = await ledgerService.initializeTransport(onDisconnect)

      const result = await ledgerService.openApp(POLKADOT_MIGRATION_APP)
      expect(result).toEqual({
        connection: {
          transport,
          genericApp: expect.any(PolkadotGenericApp),
          isAppOpen: true,
        },
      })
    })

    it('should throw TransportStatusError when transport is undefined', async () => {
      const ledgerService = new LedgerService()
      await expect(ledgerService.openApp(POLKADOT_MIGRATION_APP)).rejects.toThrow(TRANSPORT_NOT_AVAILABLE_ERROR)
    })
  })

  describe('initializeTransport', () => {
    it('should initialize transport and set up disconnect handler', async () => {
      // Mock TransportWebUSB.create to return our mock transport
      const mockTransport = new MockTransport(createMockResponse(0x9000))
      vi.spyOn(TransportWebUSB, 'create').mockResolvedValue(mockTransport as any)

      const ledgerService = new LedgerService()
      const onDisconnect = vi.fn()

      // Spy on handleDisconnect to verify it's called
      const handleDisconnectSpy = vi.spyOn(ledgerService as any, 'handleDisconnect')

      const transport = await ledgerService.initializeTransport(onDisconnect)

      // Verify transport is returned
      expect(transport).toBe(mockTransport)

      // Verify transport is stored in deviceConnection
      expect(ledgerService.deviceConnection.transport).toBe(mockTransport)

      // Simulate disconnect
      transport.emit('disconnect')

      // Verify both handlers are called
      expect(handleDisconnectSpy).toHaveBeenCalled()
      expect(onDisconnect).toHaveBeenCalled()
    })

    it('should handle transport creation failure', async () => {
      // Mock TransportWebUSB.create to throw an error
      vi.spyOn(TransportWebUSB, 'create').mockRejectedValue(TRANSPORT_NOT_AVAILABLE_ERROR)

      const ledgerService = new LedgerService()

      // Verify the error is thrown
      await expect(ledgerService.initializeTransport()).rejects.toThrow(ResponseError)

      // Verify deviceConnection is not modified
      expect(ledgerService.deviceConnection.transport).toBeUndefined()
    })
  })

  describe('isConnected', () => {
    it('should return true when transport and genericApp are available', () => {
      const ledgerService = new LedgerService()
      const mockTransport = new MockTransport(createMockResponse(0x9000))
      const mockGenericApp = createMockGenericApp()

      // Set up device connection
      ledgerService.deviceConnection = {
        transport: mockTransport,
        genericApp: mockGenericApp,
        isAppOpen: true,
      }

      expect(ledgerService.isConnected()).toBe(true)
    })

    it('should return false when transport is missing', () => {
      const ledgerService = new LedgerService()
      const mockGenericApp = createMockGenericApp()

      // Set up device connection without transport
      ledgerService.deviceConnection = {
        transport: undefined,
        genericApp: mockGenericApp,
        isAppOpen: true,
      }

      expect(ledgerService.isConnected()).toBe(false)
    })

    it('should return false when genericApp is missing', () => {
      const ledgerService = new LedgerService()
      const mockTransport = new MockTransport(createMockResponse(0x9000))

      // Set up device connection without genericApp
      ledgerService.deviceConnection = {
        transport: mockTransport,
        genericApp: undefined,
        isAppOpen: true,
      }

      expect(ledgerService.isConnected()).toBe(false)
    })
  })

  describe('establishDeviceConnection', () => {
    it('should reuse existing transport and genericApp if available', async () => {
      const ledgerService = new LedgerService()
      const mockTransport = new MockTransport(createMockResponse(0x9000))
      const mockGenericApp = createMockGenericApp({
        getVersion: vi.fn().mockResolvedValue('1.0.0'),
      })

      // Set up existing device connection
      ledgerService.deviceConnection = {
        transport: mockTransport,
        genericApp: mockGenericApp,
        isAppOpen: true,
      }

      const result = await ledgerService.establishDeviceConnection()

      expect(result).toEqual({
        transport: mockTransport,
        genericApp: mockGenericApp,
        isAppOpen: true,
      })
      expect(mockGenericApp.getVersion).toHaveBeenCalled()
    })
  })

  describe('connectDevice', () => {
    it('should connect device successfully when app is open', async () => {
      const ledgerService = new LedgerService()
      const mockTransport = new MockTransport(createMockResponse(0x9000))
      const mockGenericApp = createMockGenericApp()

      // Mock establishDeviceConnection to return a successful connection
      vi.spyOn(ledgerService, 'establishDeviceConnection').mockResolvedValue({
        transport: mockTransport,
        genericApp: mockGenericApp,
        isAppOpen: true,
      })

      const result = await ledgerService.connectDevice()

      expect(result).toEqual({
        connection: {
          transport: mockTransport,
          genericApp: mockGenericApp,
          isAppOpen: true,
        },
      })
    })

    it('should connect device successfully when app is closed', async () => {
      const ledgerService = new LedgerService()
      const mockTransport = new MockTransport(createMockResponse(0x9000))
      const mockGenericApp = createMockGenericApp()

      // Mock establishDeviceConnection to return a connection with closed app
      vi.spyOn(ledgerService, 'establishDeviceConnection').mockResolvedValue({
        transport: mockTransport,
        genericApp: mockGenericApp,
        isAppOpen: false,
      })

      const result = await ledgerService.connectDevice()

      expect(result).toEqual({
        connection: {
          transport: mockTransport,
          genericApp: mockGenericApp,
          isAppOpen: false,
        },
      })
    })

    it('should throw error when connection fails', async () => {
      const ledgerService = new LedgerService()

      // Mock establishDeviceConnection to return undefined (failed connection)
      vi.spyOn(ledgerService, 'establishDeviceConnection').mockResolvedValue(undefined)

      await expect(ledgerService.connectDevice()).rejects.toThrow('Transport not available')
    })
  })

  describe('getAccountAddress', () => {
    it('should get account address successfully when app is open', async () => {
      const ledgerService = new LedgerService()
      const mockAddress: GenericeResponseAddress = {
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        pubKey: 'mockPubKey',
      }

      const mockGenericApp = createMockGenericApp({
        getAddress: vi.fn().mockResolvedValue(mockAddress),
      })

      // Set up device connection
      ledgerService.deviceConnection = {
        transport: new MockTransport(createMockResponse(0x9000)),
        genericApp: mockGenericApp,
        isAppOpen: true,
      }

      const bip44Path = "m/44'/354'/0'/0/0'" // Valid Polkadot BIP44 path
      const result = await ledgerService.getAccountAddress(bip44Path, 0, true)

      expect(result).toEqual(mockAddress)
      expect(mockGenericApp.getAddress).toHaveBeenCalledWith(bip44Path, 0, true)
    })

    it('should throw error when app is not open', async () => {
      const ledgerService = new LedgerService()

      // Set up device connection with no genericApp
      ledgerService.deviceConnection = {
        transport: new MockTransport(createMockResponse(0x9000)),
        genericApp: undefined,
        isAppOpen: false,
      }

      const bip44Path = "m/44'/354'/0'/0/0'" // Valid Polkadot BIP44 path
      await expect(ledgerService.getAccountAddress(bip44Path, 0, true)).rejects.toThrow('App not open')
    })

    it('should handle errors from getAddress call', async () => {
      const ledgerService = new LedgerService()
      const error = new Error('Failed to get address')

      const mockGenericApp = createMockGenericApp({
        getAddress: vi.fn().mockRejectedValue(error),
      })

      // Set up device connection
      ledgerService.deviceConnection = {
        transport: new MockTransport(createMockResponse(0x9000)),
        genericApp: mockGenericApp,
        isAppOpen: true,
      }

      const bip44Path = "m/44'/354'/0'/0/0'" // Valid Polkadot BIP44 path
      await expect(ledgerService.getAccountAddress(bip44Path, 0, true)).rejects.toThrow('Failed to get address')
    })
  })

  describe('signTransaction', () => {
    it('should sign transaction successfully when app is open', async () => {
      const ledgerService = new LedgerService()
      const mockSignature = Buffer.from('mockSignature')

      const mockGenericApp = createMockGenericApp({
        signWithMetadataEd25519: vi.fn().mockResolvedValue({ signature: mockSignature }),
      })

      // Set up device connection
      ledgerService.deviceConnection = {
        transport: new MockTransport(createMockResponse(0x9000)),
        genericApp: mockGenericApp,
        isAppOpen: true,
      }

      const bip44Path = "m/44'/354'/0'/0/0'"
      const payloadBytes = new Uint8Array([1, 2, 3])
      const chainId = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3'
      const proof1 = new Uint8Array([4, 5, 6])

      const result = await ledgerService.signTransaction(bip44Path, payloadBytes, chainId, proof1)

      expect(result).toEqual({ signature: mockSignature })
      expect(mockGenericApp.signWithMetadataEd25519).toHaveBeenCalledWith(bip44Path, Buffer.from(payloadBytes), Buffer.from(proof1))
      expect(mockGenericApp.txMetadataChainId).toBe(chainId)
    })

    it('should throw error when app is not open', async () => {
      const ledgerService = new LedgerService()
      const mockGenericApp = createMockGenericApp({
        signWithMetadataEd25519: vi.fn().mockRejectedValue(new Error('28161')),
      })

      // Set up device connection with closed app
      ledgerService.deviceConnection = {
        transport: new MockTransport(createMockResponse(0x9000)),
        genericApp: mockGenericApp,
        isAppOpen: false,
      }

      const bip44Path = "m/44'/354'/0'/0/0'"
      const payloadBytes = new Uint8Array([1, 2, 3])
      const chainId = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3'
      const proof1 = new Uint8Array([4, 5, 6])

      await expect(ledgerService.signTransaction(bip44Path, payloadBytes, chainId, proof1)).rejects.toThrow('28161')
    })

    it('should handle errors from signWithMetadataEd25519 call', async () => {
      const ledgerService = new LedgerService()
      const error = new Error('Failed to sign transaction')

      const mockGenericApp = createMockGenericApp({
        signWithMetadataEd25519: vi.fn().mockRejectedValue(error),
      })

      // Set up device connection
      ledgerService.deviceConnection = {
        transport: new MockTransport(createMockResponse(0x9000)),
        genericApp: mockGenericApp,
        isAppOpen: true,
      }

      const bip44Path = "m/44'/354'/0'/0/0'"
      const payloadBytes = new Uint8Array([1, 2, 3])
      const chainId = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3'
      const proof1 = new Uint8Array([4, 5, 6])

      await expect(ledgerService.signTransaction(bip44Path, payloadBytes, chainId, proof1)).rejects.toThrow('Failed to sign transaction')
    })

    it('should handle empty payload and proof', async () => {
      const ledgerService = new LedgerService()
      const mockSignature = Buffer.from('mockSignature')

      const mockGenericApp = createMockGenericApp({
        signWithMetadataEd25519: vi.fn().mockResolvedValue({ signature: mockSignature }),
      })

      // Set up device connection
      ledgerService.deviceConnection = {
        transport: new MockTransport(createMockResponse(0x9000)),
        genericApp: mockGenericApp,
        isAppOpen: true,
      }

      const bip44Path = "m/44'/354'/0'/0/0'"
      const payloadBytes = new Uint8Array([])
      const chainId = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3'
      const proof1 = new Uint8Array([])

      const result = await ledgerService.signTransaction(bip44Path, payloadBytes, chainId, proof1)

      expect(result).toEqual({ signature: mockSignature })
      expect(mockGenericApp.signWithMetadataEd25519).toHaveBeenCalledWith(bip44Path, Buffer.from(payloadBytes), Buffer.from(proof1))
    })
  })

  describe('clearConnection', () => {
    it('should clear the connection', () => {
      const ledgerService = new LedgerService()
      const mockTransport = new MockTransport(createMockResponse(0x9000))
      const mockGenericApp = createMockGenericApp()

      // Set up initial connection state
      ledgerService.deviceConnection = {
        transport: mockTransport,
        genericApp: mockGenericApp,
        isAppOpen: true,
      }

      // Verify connection exists before clearing
      expect(ledgerService.deviceConnection.transport).toBe(mockTransport)
      expect(ledgerService.deviceConnection.genericApp).toBe(mockGenericApp)

      ledgerService.clearConnection()

      // Verify connection is cleared
      expect(ledgerService.deviceConnection.transport).toBeUndefined()
      expect(ledgerService.deviceConnection.genericApp).toBeUndefined()
      expect(ledgerService.deviceConnection.isAppOpen).toBe(false)
    })
  })

  describe('disconnect', () => {
    it('should close transport and emit disconnect event', () => {
      const ledgerService = new LedgerService()
      const mockTransport = new MockTransport(createMockResponse(0x9000))

      // Set up spies
      const closeSpy = vi.spyOn(mockTransport, 'close').mockImplementation(() => Promise.resolve())
      const emitSpy = vi.spyOn(mockTransport, 'emit')

      // Set up initial connection state
      ledgerService.deviceConnection = {
        transport: mockTransport,
        genericApp: createMockGenericApp(),
        isAppOpen: false,
      }

      ledgerService.disconnect()

      // Verify transport is closed and disconnect event is emitted
      expect(closeSpy).toHaveBeenCalled()
      expect(emitSpy).toHaveBeenCalledWith('disconnect')
    })

    it('should not throw error when transport is undefined', () => {
      const ledgerService = new LedgerService()

      // Set empty connection state
      ledgerService.deviceConnection = {
        transport: undefined,
        genericApp: undefined,
        isAppOpen: false,
      }

      // Should not throw an error
      expect(() => ledgerService.disconnect()).not.toThrow()
    })
  })

  describe('handleDisconnect', () => {
    it('should clear device connection', () => {
      const ledgerService = new LedgerService()
      const mockTransport = new MockTransport(createMockResponse(0x9000))
      const mockGenericApp = createMockGenericApp()

      // Set up initial connection state
      ledgerService.deviceConnection = {
        transport: mockTransport,
        genericApp: mockGenericApp,
        isAppOpen: true,
      }

      // Call private method using bracket notation
      ledgerService.handleDisconnect()

      // Verify connection is cleared
      expect(ledgerService.deviceConnection.transport).toBeUndefined()
      expect(ledgerService.deviceConnection.genericApp).toBeUndefined()
      expect(ledgerService.deviceConnection.isAppOpen).toBe(false)
    })
  })
})
