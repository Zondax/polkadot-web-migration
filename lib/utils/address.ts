import { decodeAddress as decodeAddressPolkadot, encodeAddress as encodeAddressPolkadot } from '@polkadot/keyring'
import type { Address, MultisigAddress } from '@/state/types/ledger'

/**
 * Represents the components of a BIP44 derivation path
 */
export interface Bip44Components {
  /** The purpose (typically 44 for BIP44) */
  purpose: number
  /** The coin type (e.g., 354 for Polkadot, 434 for Kusama) */
  coinType: number
  /** The account index */
  account: number
  /** The change index (typically 0 for external, 1 for internal) */
  change: number
  /** The address index */
  addressIndex: number
}

/**
 * Error types for BIP44 path operations
 */
export class Bip44PathError extends Error {
  constructor(
    message: string,
    public readonly path?: string,
    public readonly component?: string
  ) {
    super(message)
    this.name = 'Bip44PathError'
  }
}

/**
 * Options for updating BIP44 path indices
 */
export interface Bip44UpdateOptions {
  /** New account index to set */
  account?: number
  /** New address index to set */
  address?: number
}

/**
 * Converts an address from one network format to another by changing the SS58 prefix
 * @param address The source address to convert
 * @param prefix The SS58 prefix of the target network (e.g., 2 for Kusama, 0 for Polkadot)
 * @returns The address with the new network prefix
 */
export function convertSS58Format(address: string, prefix: number): string {
  // Decode the address
  const decoded = decodeAddressPolkadot(address)
  // Encode it with the provided prefix
  return encodeAddressPolkadot(decoded, prefix)
}

/**
 * Parses a BIP44 derivation path into its components
 * @param path - The BIP44 path to parse (e.g., "m/44'/354'/0'/0'/0'")
 * @returns Parsed BIP44 components
 * @throws {Bip44PathError} If the path is invalid or malformed
 */
export function parseBip44Path(path: string): Bip44Components {
  if (!path || typeof path !== 'string') {
    throw new Bip44PathError('BIP44 path must be a non-empty string', path)
  }

  // Remove any whitespace and validate basic format
  const trimmedPath = path.trim()
  if (!trimmedPath.startsWith('m/')) {
    throw new Bip44PathError('BIP44 path must start with "m/"', path)
  }

  // Split the path and validate structure
  const parts = trimmedPath.split('/')
  if (parts.length !== 6) {
    throw new Bip44PathError("BIP44 path must have exactly 6 components (m/purpose'/coinType'/account'/change'/addressIndex')", path)
  }

  // Validate and parse each component
  const [m, purposeStr, coinTypeStr, accountStr, changeStr, addressIndexStr] = parts

  if (m !== 'm') {
    throw new Bip44PathError('BIP44 path must start with "m"', path, 'purpose')
  }

  // Helper function to parse hardened index
  const parseHardenedIndex = (str: string, componentName: string): number => {
    if (!str.endsWith("'")) {
      throw new Bip44PathError(`BIP44 ${componentName} must be hardened (end with \')`, path, componentName)
    }
    const numStr = str.slice(0, -1)
    const num = Number.parseInt(numStr, 10)
    if (Number.isNaN(num) || num < 0) {
      throw new Bip44PathError(`BIP44 ${componentName} must be a non-negative integer`, path, componentName)
    }
    return num
  }

  try {
    const purpose = parseHardenedIndex(purposeStr, 'purpose')
    const coinType = parseHardenedIndex(coinTypeStr, 'coinType')
    const account = parseHardenedIndex(accountStr, 'account')
    const change = parseHardenedIndex(changeStr, 'change')
    const addressIndex = parseHardenedIndex(addressIndexStr, 'addressIndex')

    return {
      purpose,
      coinType,
      account,
      change,
      addressIndex,
    }
  } catch (error) {
    if (error instanceof Bip44PathError) {
      throw error
    }
    throw new Bip44PathError(`Failed to parse BIP44 path: ${error}`, path)
  }
}

/**
 * Builds a BIP44 derivation path from components
 * @param components - The BIP44 components to build the path from
 * @returns The formatted BIP44 path string
 * @throws {Bip44PathError} If any component is invalid
 */
export function buildBip44Path(components: Bip44Components): string {
  const { purpose, coinType, account, change, addressIndex } = components

  // Validate all components are non-negative integers
  const validateComponent = (value: number, name: string): void => {
    if (!Number.isInteger(value) || value < 0) {
      throw new Bip44PathError(`BIP44 ${name} must be a non-negative integer`, undefined, name)
    }
  }

  validateComponent(purpose, 'purpose')
  validateComponent(coinType, 'coinType')
  validateComponent(account, 'account')
  validateComponent(change, 'change')
  validateComponent(addressIndex, 'addressIndex')

  return `m/${purpose}'/${coinType}'/${account}'/${change}'/${addressIndex}'`
}

/**
 * Updates specific indices in a BIP44 path while preserving other components
 * @param path - The original BIP44 path
 * @param options - The indices to update
 * @returns The updated BIP44 path
 * @throws {Bip44PathError} If the path is invalid or options are invalid
 */
export function updateBip44PathIndices(path: string, options: Bip44UpdateOptions): string {
  const components = parseBip44Path(path)

  // Update specified indices
  if (options.account !== undefined) {
    if (!Number.isInteger(options.account) || options.account < 0) {
      throw new Bip44PathError('Account index must be a non-negative integer')
    }
    components.account = options.account
  }

  if (options.address !== undefined) {
    if (!Number.isInteger(options.address) || options.address < 0) {
      throw new Bip44PathError('Address index must be a non-negative integer')
    }
    components.addressIndex = options.address
  }

  return buildBip44Path(components)
}

/**
 * Replaces the last index in a BIP44 derivation path with a new index.
 * @param bip44Path - The base BIP44 derivation path (e.g. "m/44'/354'/0'/0'/0'")
 * @param index - The new address index to use
 * @returns The modified BIP44 path with the new address index
 */
export const getBip44Path = (bip44Path: string, index: number): string => {
  return updateBip44PathIndices(bip44Path, { address: index })
}

/**
 * Replaces the account index (3rd component) in a BIP44 derivation path.
 * @param bip44Path - The base BIP44 derivation path (e.g. "m/44'/354'/0'/0'/0'")
 * @param accountIndex - The new account index to use
 * @returns The modified BIP44 path with the new account index
 */
export const getBip44PathWithAccount = (bip44Path: string, accountIndex: number): string => {
  return updateBip44PathIndices(bip44Path, { account: accountIndex })
}

/**
 * Type guard to determine if the given account is a MultisigAddress.
 * Checks for the presence of a 'threshold' property or a non-empty 'members' array,
 * which are unique to MultisigAddress objects.
 *
 * @param account - The account object to check (can be Address or MultisigAddress)
 * @returns True if the account is a MultisigAddress, false otherwise
 */
export const isMultisigAddress = (account: Address | MultisigAddress): account is MultisigAddress =>
  (account as MultisigAddress).threshold !== undefined || (account as MultisigAddress).members?.length > 0
