import type Transport from '@ledgerhq/hw-transport'
import type { PolkadotGenericApp } from '@zondax/ledger-substrate'

/**
 * Represents a response object from a connection request.
 */
export interface ConnectionResponse {
  error?: string
  connection?: DeviceConnectionProps
}

/**
 * Represents the properties of a device connection.
 */
export interface DeviceConnectionProps {
  transport?: Transport
  genericApp?: PolkadotGenericApp
  isAppOpen: boolean
}
