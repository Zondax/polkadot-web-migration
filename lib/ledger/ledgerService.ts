import type Transport from '@ledgerhq/hw-transport'
import TransportWebUSB from '@ledgerhq/hw-transport-webhid'
import { PolkadotGenericApp } from '@zondax/ledger-substrate'
import type { GenericeResponseAddress } from '@zondax/ledger-substrate/dist/common'

import type { ConnectionResponse, DeviceConnectionProps } from '@/lib/ledger/types'

import { InternalErrorType } from '@/config/errors'
import { InternalError } from '@/lib/utils/error'
import { openApp } from './openApp'

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
    console.debug('[ledgerService] disconnecting')
  }

  /**
   * Opens the Polkadot Migration app on the connected Ledger device
   */
  async openApp(transport: Transport, appName: string): Promise<{ connection?: DeviceConnectionProps }> {
    if (!transport) {
      console.debug('[ledgerService] Transport not available')
      throw new InternalError(InternalErrorType.TRANSPORT_ERROR)
    }
    console.debug(`[ledgerService] Opening ${appName} app`)
    await openApp(transport, appName)
    const genericApp = new PolkadotGenericApp(transport)
    const isAppOpen = await this.isAppOpen(genericApp)
    return { connection: { transport, genericApp, isAppOpen } }
  }

  /**
   * Initializes the Ledger transport
   */
  async initializeTransport(onDisconnect?: () => void): Promise<Transport> {
    console.debug('[ledgerService] Initializing transport')
    const transport = await TransportWebUSB.create()
    this.deviceConnection.transport = transport

    const handleDisconnect = () => {
      this.handleDisconnect()
      onDisconnect?.()
    }

    transport?.on('disconnect', handleDisconnect)
    return transport
  }

  /**
   * Checks if the app is open on the Ledger device
   */
  async isAppOpen(genericApp: PolkadotGenericApp): Promise<boolean> {
    try {
      console.debug('[ledgerService] Checking if app is open')
      const version = await genericApp.getVersion()
      return Boolean(version)
    } catch (error) {
      console.debug('[ledgerService] App not open:', error)
      return false
    }
  }

  /**
   * Establishes a connection to the Ledger device
   */
  async establishDeviceConnection(onDisconnect?: () => void): Promise<DeviceConnectionProps | undefined> {
    console.debug('[ledgerService] Establishing device connection')
    const transport = this.deviceConnection.transport || (await this.initializeTransport(onDisconnect))
    const genericApp = this.deviceConnection.genericApp || new PolkadotGenericApp(transport)
    const isOpen = await this.isAppOpen(genericApp)

    if (!isOpen) {
      console.debug('[ledgerService] App not open, attempting to open')
      this.openApp(transport, 'Polkadot Migration')
      return { transport, genericApp, isAppOpen: false }
    }

    const connection = { transport, genericApp, isAppOpen: true }
    this.deviceConnection = connection
    return connection
  }

  /**
   * Connects to the Ledger device
   */
  async connectDevice(onDisconnect?: () => void): Promise<ConnectionResponse | undefined> {
    console.debug('[ledgerService] Attempting to connect device...')
    const connection = await this.establishDeviceConnection(onDisconnect)
    if (!connection) {
      console.debug('[ledgerService] Failed to establish device connection')
      throw new InternalError(InternalErrorType.CONNECTION_ERROR)
    }

    console.debug(`[ledgerService] Device connected successfully, the app is ${connection.isAppOpen ? 'open' : 'closed'}`)
    return { connection }
  }

  /**
   * Gets an account address from the Ledger device
   */
  async getAccountAddress(bip44Path: string, ss58prefix: number, showAddrInDevice: boolean): Promise<GenericeResponseAddress | undefined> {
    if (!this.deviceConnection?.genericApp) {
      throw new InternalError(InternalErrorType.APP_NOT_OPEN)
    }

    const genericApp = this.deviceConnection.genericApp as unknown as PolkadotGenericApp
    const address = await genericApp.getAddress(bip44Path, ss58prefix, showAddrInDevice)
    return address
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
      throw new InternalError(InternalErrorType.APP_NOT_OPEN)
    }

    console.debug(`[ledgerService] Signing transaction for path: ${bip44Path}, chainId: ${chainId}`)
    const genericApp = this.deviceConnection.genericApp as unknown as PolkadotGenericApp

    genericApp.txMetadataChainId = chainId
    const { signature } = await genericApp.signWithMetadataEd25519(bip44Path, Buffer.from(payloadBytes), Buffer.from(proof1))
    console.debug('[ledgerService] Transaction signed successfully')
    return { signature }
  }

  /**
   * Clears the connection
   */
  clearConnection() {
    console.debug('[ledgerService] Clearing connection')
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
    console.debug('[ledgerService] Disconnecting device')
    if (this.deviceConnection?.transport) {
      this.deviceConnection.transport.close()
      this.deviceConnection.transport.emit('disconnect')
    }
  }
}

// Export a singleton instance
export const ledgerService = new LedgerService()
