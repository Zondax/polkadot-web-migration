import type Transport from '@ledgerhq/hw-transport'
import TransportWebUSB from '@ledgerhq/hw-transport-webhid'
import { LedgerError, processErrorResponse, ResponseError } from '@zondax/ledger-js'
import { PolkadotGenericApp } from '@zondax/ledger-substrate'
import type { GenericeResponseAddress } from '@zondax/ledger-substrate/dist/common'
import type { ConnectionResponse, DeviceConnectionProps } from '@/lib/ledger/types'
import { openApp } from './openApp'

/**
 * Interface for the Ledger service that manages device interaction
 */
export interface ILedgerService {
  openApp(appName: string): Promise<{ connection?: DeviceConnectionProps }>
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
  isConnected(): boolean
  abortPendingCall(): void
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

  private pendingCall: (reason?: any) => void = () => {}

  // Handles transport disconnection
  private handleDisconnect = () => {
    this.deviceConnection = {
      transport: undefined,
      genericApp: undefined,
      isAppOpen: false,
    }

    this.pendingCall()
    console.debug('[ledgerService] disconnecting')
  }

  /**
   * Aborts all pending calls to the Ledger device
   */
  abortPendingCall(): void {
    console.debug('[ledgerService] Aborting all pending calls')
    this.pendingCall()
  }

  /**
   * Opens the Polkadot Migration app on the connected Ledger device
   */
  async openApp(appName: string): Promise<{ connection?: DeviceConnectionProps }> {
    if (!this.deviceConnection.transport) {
      console.debug('[ledgerService] Transport not available')
      throw new ResponseError(LedgerError.UnknownTransportError, 'Transport not available')
    }
    console.debug(`[ledgerService] Opening ${appName} app`)
    await openApp(this.deviceConnection.transport, appName)
    const genericApp = new PolkadotGenericApp(this.deviceConnection.transport)
    const isAppOpen = await this.isAppOpen(genericApp)
    return { connection: { transport: this.deviceConnection.transport, genericApp, isAppOpen } }
  }

  /**
   * Initializes the Ledger transport
   *
   * This method creates a WebUSB transport connection to a Ledger device.
   * It sets up the transport in the device connection object and registers
   * a disconnect handler.
   *
   * @param onDisconnect - Optional callback function that will be called when the device disconnects
   * @returns A promise that resolves to the initialized Transport instance
   * @throws {ResponseError} If the transport initialization fails
   */
  async initializeTransport(onDisconnect?: () => void): Promise<Transport> {
    try {
      console.debug('[ledgerService] Initializing transport')
      const transport = await TransportWebUSB.create()
      this.deviceConnection.transport = transport

      const handleDisconnect = () => {
        this.handleDisconnect()
        onDisconnect?.()
      }

      transport?.on('disconnect', handleDisconnect)
      return transport
    } catch (e) {
      const error = processErrorResponse(e)
      throw error // Propagate
    }
  }

  /**
   * Checks if the app is open on the Ledger device
   */
  async isAppOpen(genericApp: PolkadotGenericApp): Promise<boolean> {
    console.debug('[ledgerService] Checking if app is open')
    const version = await genericApp.getVersion()
    console.debug('[ledgerService] App version:', version)
    return Boolean(version)
  }

  /**
   * Establishes a connection to the Ledger device
   *
   * This method attempts to connect to a Ledger hardware device using WebUSB.
   * It will initialize the transport if not already available and create a generic
   * Polkadot app instance to communicate with the device.
   *
   * @param onDisconnect - Optional callback function that will be called when the device disconnects
   * @returns A promise that resolves to a DeviceConnectionProps object containing transport, genericApp, and isAppOpen properties
   * @throws {ResponseError} If the device is not found or connection fails
   */
  async establishDeviceConnection(onDisconnect?: () => void): Promise<DeviceConnectionProps | undefined> {
    console.debug('[ledgerService] Establishing device connection')
    const transport = this.deviceConnection.transport || (await this.initializeTransport(onDisconnect))
    const genericApp = this.deviceConnection.genericApp || new PolkadotGenericApp(transport)

    // Safely check if app is open, with fallback to false if there's an error
    let isAppOpen = false
    try {
      isAppOpen = await this.isAppOpen(genericApp)

      // If app is not open, try to open it automatically
      if (!isAppOpen && transport) {
        console.debug('[ledgerService] App not open, attempting to open automatically')
        try {
          openApp(transport, 'Polkadot Migration')
          // Check again if app is open after attempting to open it
          isAppOpen = await this.isAppOpen(genericApp)
        } catch (openAppError) {
          console.debug('[ledgerService] Failed to automatically open app:', openAppError)
          // Continue with isAppOpen as false
        }
      }
    } catch (error) {
      console.debug('[ledgerService] Error checking if app is open during connection:', error)
      // Continue with isAppOpen as false
    }

    const connection = { transport, genericApp, isAppOpen }
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
      throw new ResponseError(LedgerError.UnknownTransportError, 'Transport not available')
    }

    console.debug(`[ledgerService] Device connected successfully, the app is ${connection.isAppOpen ? 'open' : 'closed'}`)
    return { connection }
  }

  /**
   * Gets an account address from the Ledger device
   * @param bip44Path - The BIP44 derivation path for the account
   * @param ss58prefix - The SS58 address format prefix to use
   * @param showAddrInDevice - Whether to display the address on the Ledger device for verification
   * @returns A promise that resolves to a GenericeResponseAddress object containing the address
   * @throws {ResponseError} If transport is not available or app is not open
   */
  async getAccountAddress(bip44Path: string, ss58prefix: number, showAddrInDevice: boolean): Promise<GenericeResponseAddress | undefined> {
    if (!this.deviceConnection?.transport) {
      throw new ResponseError(LedgerError.UnknownTransportError, 'Transport not available')
    }

    if (!this.deviceConnection?.genericApp) {
      throw new ResponseError(LedgerError.AppDoesNotSeemToBeOpen, 'App not open')
    }

    const genericApp = this.deviceConnection.genericApp as unknown as PolkadotGenericApp

    let rejectFn: (reason?: any) => void = () => {}
    const abortablePromise = new Promise<GenericeResponseAddress>((resolve, reject) => {
      rejectFn = reject
      genericApp.getAddress(bip44Path, ss58prefix, showAddrInDevice).then(resolve).catch(reject)
    })

    // Store the reject function
    this.pendingCall = rejectFn

    try {
      console.debug(`[ledgerService] Getting address for path: ${bip44Path}`)
      const address = await abortablePromise
      console.debug(`[ledgerService] Found address: ${address.address} for path: ${bip44Path}`)
      return address
    } finally {
      // Remove the reject function after completion
      this.pendingCall = () => {}
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
      throw new ResponseError(LedgerError.AppDoesNotSeemToBeOpen, 'App not open')
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

  /**
   * Checks if there is an active connection to the Ledger device
   */
  isConnected(): boolean {
    return Boolean(this.deviceConnection?.transport && this.deviceConnection?.genericApp)
  }

  /**
   * Checks if the device is connected and the app is open
   */
  async checkConnection(): Promise<boolean> {
    const isConnected = this.isConnected() // checks transport and genericApp objects
    console.debug('[ledgerService] Checking transport and app objects:', isConnected)
    if (!isConnected) {
      return false
    }

    const genericApp = this.deviceConnection.genericApp as unknown as PolkadotGenericApp
    const isAppOpen = await this.isAppOpen(genericApp)
    return isConnected && isAppOpen
  }
}

// Export a singleton instance
export const ledgerService = new LedgerService()
