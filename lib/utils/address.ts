import { decodeAddress as decodeAddressPolkadot, encodeAddress as encodeAddressPolkadot } from '@polkadot/keyring'
import type { Address, MultisigAddress } from '@/state/types/ledger'

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
 * Replaces the last index in a BIP44 derivation path with a new index.
 * Typically used to generate multiple account paths from a base path.
 *
 * @param bip44Path - The base BIP44 derivation path (e.g. "m/44'/354'/0'/0'")
 * @param index - The new account index to use
 * @returns The modified BIP44 path with the new account index
 */
export const getBip44Path = (bip44Path: string, index: number) => bip44Path.replace(/\/0'$/, `/${index}'`)

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
