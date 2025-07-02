import type Transport from '@ledgerhq/hw-transport'
import TransportWebUSB from '@ledgerhq/hw-transport-webhid'
import { LedgerError, ResponseError } from '@zondax/ledger-js'
import { PolkadotGenericApp } from '@zondax/ledger-substrate'
import type { GenericeResponseAddress } from '@zondax/ledger-substrate/dist/common'
import type { ConnectionResponse, DeviceConnectionProps } from '@/lib/ledger/types'
import { openApp } from './openApp'

/**
 * Sanitizes error messages to prevent information disclosure
 */
function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    // Remove sensitive information from error messages
    const message = error.message
      .replace(/path:[^\s]+/gi, 'path:***') // Hide BIP44 paths
      .replace(/address:[^\s]+/gi, 'address:***') // Hide addresses
      .replace(/chainId:[^\s]+/gi, 'chainId:***') // Hide chain IDs
      .replace(/key:[^\s]+/gi, 'key:***') // Hide any keys
      .replace(/0x[a-fA-F0-9]+/g, '0x***') // Hide hex values
      .replace(/[1-9A-HJ-NP-Za-km-z]{44,48}/g, '***') // Hide SS58 addresses
    
    return message
  }
  return 'Unknown error occurred'
}

/**
 * Logs debug information while sanitizing sensitive data
 */
function debugLog(message: string, ...args: unknown[]): void {
  if (process.env.NODE_ENV === 'development') {
    // Only log in development, and sanitize any sensitive data
    const sanitizedMessage = message
      .replace(/path:[^\s]+/gi, 'path:***')
      .replace(/address:[^\s]+/gi, 'address:***')
      .replace(/chainId:[^\s]+/gi, 'chainId:***')
      .replace(/[1-9A-HJ-NP-Za-km-z]{44,48}/g, '***')
    
    console.debug(sanitizedMessage, ...args.map(arg => 
      typeof arg === 'string' ? arg.replace(/[1-9A-HJ-NP-Za-km-z]{44,48}/g, '***') : arg
    ))
  }
}

/**
 * Interface for the Ledger service that manages device interaction
 */
export interface ILedgerService {
  openApp(transport: Transport, appName: string): Promise<{ connection?: DeviceConnectionProps }>
  initializeTransport(): Promise<Transport>
  isAppOpen(genericApp: PolkadotGenericApp): Promise<boolean>
  establishDeviceConnection(): Promise<DeviceConnectionProps | undefined>
  connectDevice(): Promise<ConnectionResponse | undefined>
  getAccountAddress(bip44Path: string, ss58prefix: number, showAddrInDevice: boolean): Promise<GenericeResponseAddress | undefined>
  signTransaction(
    bip44Path: string,
    payloadBytes: Uint8Array,
    chainId: string,
    proof1: Uint8Array
  ): Promise<{ signature?: Buffer<ArrayBufferLike> }>
  clearConnection(): void
  disconnect(): void
}

/**
 * Service that handles all Ledger device interactions
 * This class is agnostic of state management libraries
 */
export class LedgerService implements ILedgerService {
  private deviceConnection: DeviceConnectionProps = {
    transport: undefined,
    genericApp: undefined,
    isAppOpen: false,
  }

  // Handles transport disconnection
  private handleDisconnect = () => {
    this.deviceConnection = {
      transport: undefined,
      genericApp: undefined,
      isAppOpen: false,
    }
    debugLog('[ledgerService] disconnecting')
  }

  /**
   * Opens the Polkadot Migration app on the connected Ledger device
   */
  async openApp(transport: Transport, appName: string): Promise<{ connection?: DeviceConnectionProps }> {
    if (!transport) {
      debugLog('[ledgerService] Transport not available')
      throw new ResponseError(LedgerError.UnknownTransportError, 'Device connection failed')
    }
    debugLog('[ledgerService] Opening app')
    try {
      await openApp(transport, appName)
      const genericApp = new PolkadotGenericApp(transport)
      const isAppOpen = await this.isAppOpen(genericApp)
      return { connection: { transport, genericApp, isAppOpen } }
    } catch (_error) {
      debugLog('[ledgerService] Failed to open app')
      throw new ResponseError(LedgerError.AppDoesNotSeemToBeOpen, 'Failed to open application on device')
    }
  }

  /**
   * Initializes the Ledger transport
   */
  async initializeTransport(onDisconnect?: () => void): Promise<Transport> {
    debugLog('[ledgerService] Initializing transport')
    try {
      const transport = await TransportWebUSB.create()
      this.deviceConnection.transport = transport

      const handleDisconnect = () => {
        this.handleDisconnect()
        onDisconnect?.()
      }

      transport?.on('disconnect', handleDisconnect)
      return transport
    } catch (_error) {
      debugLog('[ledgerService] Transport initialization failed')
      throw new ResponseError(LedgerError.UnknownTransportError, 'Failed to connect to device')
    }
  }

  /**
   * Checks if the app is open on the Ledger device
   */
  async isAppOpen(genericApp: PolkadotGenericApp): Promise<boolean> {
    try {
      debugLog('[ledgerService] Checking if app is open')
      const version = await genericApp.getVersion()
      return Boolean(version)
    } catch (_error) {
      debugLog('[ledgerService] App not open')
      return false
    }
  }

  /**
   * Establishes a connection to the Ledger device
   */
  async establishDeviceConnection(onDisconnect?: () => void): Promise<DeviceConnectionProps | undefined> {
    debugLog('[ledgerService] Establishing device connection')
    try {
      const transport = this.deviceConnection.transport || (await this.initializeTransport(onDisconnect))
      const genericApp = this.deviceConnection.genericApp || new PolkadotGenericApp(transport)
      const isOpen = await this.isAppOpen(genericApp)

      if (!isOpen) {
        debugLog('[ledgerService] App not open, attempting to open')
        await this.openApp(transport, 'Polkadot Migration')
        return { transport, genericApp, isAppOpen: false }
      }

      const connection = { transport, genericApp, isAppOpen: true }
      this.deviceConnection = connection
      return connection
    } catch (_error) {
      debugLog('[ledgerService] Failed to establish connection')
      throw new ResponseError(LedgerError.UnknownTransportError, 'Device connection failed')
    }
  }

  /**
   * Connects to the Ledger device
   */
  async connectDevice(onDisconnect?: () => void): Promise<ConnectionResponse | undefined> {
    debugLog('[ledgerService] Attempting to connect device...')
    try {
      const connection = await this.establishDeviceConnection(onDisconnect)
      if (!connection) {
        debugLog('[ledgerService] Failed to establish device connection')
        throw new ResponseError(LedgerError.UnknownTransportError, 'Device connection failed')
      }

      debugLog(`[ledgerService] Device connected successfully, app status: ${connection.isAppOpen ? 'ready' : 'pending'}`)
      return { connection }
    } catch (error) {
      debugLog('[ledgerService] Device connection failed')
      throw new ResponseError(LedgerError.UnknownTransportError, sanitizeError(error))
    }
  }

  /**
   * Gets an account address from the Ledger device
   */
  async getAccountAddress(bip44Path: string, ss58prefix: number, showAddrInDevice: boolean): Promise<GenericeResponseAddress | undefined> {
    if (!this.deviceConnection?.genericApp) {
      throw new ResponseError(LedgerError.AppDoesNotSeemToBeOpen, 'Application not ready')
    }

    debugLog('[ledgerService] Getting address for derivation path')
    try {
      const genericApp = this.deviceConnection.genericApp as unknown as PolkadotGenericApp
      const address = await genericApp.getAddress(bip44Path, ss58prefix, showAddrInDevice)
      debugLog('[ledgerService] Address retrieved successfully')
      return address
    } catch (_error) {
      debugLog('[ledgerService] Failed to get address')
      throw new ResponseError(LedgerError.UnknownError, 'Failed to retrieve account address')
    }
  }

  /**
   * Migrates an account
   */
  async signTransaction(
    bip44Path: string,
    payloadBytes: Uint8Array,
    chainId: string,
    proof1: Uint8Array
  ): Promise<{ signature?: Buffer<ArrayBufferLike> }> {
    if (!this.deviceConnection?.genericApp) {
      throw new ResponseError(LedgerError.AppDoesNotSeemToBeOpen, 'Application not ready')
    }

    debugLog('[ledgerService] Signing transaction for derivation path and chain')
    try {
      const genericApp = this.deviceConnection.genericApp as unknown as PolkadotGenericApp

      genericApp.txMetadataChainId = chainId
      const { signature } = await genericApp.signWithMetadataEd25519(bip44Path, Buffer.from(payloadBytes), Buffer.from(proof1))
      debugLog('[ledgerService] Transaction signed successfully')
      return { signature }
    } catch (_error) {
      debugLog('[ledgerService] Transaction signing failed')
      throw new ResponseError(LedgerError.UnknownError, 'Failed to sign transaction')
    }
  }

  /**
   * Clears the connection
   */
  clearConnection() {
    debugLog('[ledgerService] Clearing connection')
    this.deviceConnection = {
      transport: undefined,
      genericApp: undefined,
      isAppOpen: false,
    }
  }

  /**
   * Disconnects from the Ledger device
   */
  disconnect() {
    debugLog('[ledgerService] Disconnecting device')
    try {
      if (this.deviceConnection?.transport) {
        this.deviceConnection.transport.close()
        this.deviceConnection.transport.emit('disconnect')
      }
    } catch (_error) {
      debugLog('[ledgerService] Error during disconnect')
      // Don't throw on disconnect errors
    }
  }
}

// Export a singleton instance
export const ledgerService = new LedgerService()
