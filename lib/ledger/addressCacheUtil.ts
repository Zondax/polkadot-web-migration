import { encodeAddress } from '@polkadot/keyring'
import type { GenericeResponseAddress } from '@zondax/ledger-substrate/dist/common'

interface CachedPublicKey {
  publicKey: Uint8Array // Raw public key from Ledger
}

/**
 * Address cache utility for Ledger public keys
 *
 * This cache stores public keys by BIP44 derivation path and generates
 * SS58-formatted addresses on demand. This eliminates redundant Ledger
 * device calls when scanning multiple blockchain applications that use
 * the same derivation paths but different SS58 prefixes.
 */
class AddressCache {
  private cache = new Map<string, CachedPublicKey>()

  /**
   * Check if an address is cached for the given path
   * @param path BIP44 derivation path
   * @returns true if cached, false otherwise
   */
  has(path: string): boolean {
    return this.cache.has(path)
  }

  /**
   * Get cached address with specific SS58 prefix
   * @param path BIP44 derivation path
   * @param ss58Prefix SS58 format prefix for the target network
   * @returns GenericeResponseAddress if cached, null if not found
   */
  get(path: string, ss58Prefix: number): GenericeResponseAddress | null {
    const cached = this.cache.get(path)
    if (!cached) return null

    // Generate address with requested SS58 prefix using cached public key
    const address = encodeAddress(cached.publicKey, ss58Prefix)
    // Convert public key back to hex string format expected by GenericeResponseAddress
    const pubKeyHex = Buffer.from(cached.publicKey).toString('hex')
    return {
      address,
      pubKey: pubKeyHex,
      path,
    } as GenericeResponseAddress
  }

  /**
   * Store public key for the given path
   * @param path BIP44 derivation path
   * @param publicKey Raw public key from Ledger device
   */
  set(path: string, publicKey: Uint8Array): void {
    this.cache.set(path, { publicKey })
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Remove specific cache entry
   * @param path BIP44 derivation path to remove
   */
  remove(path: string): void {
    this.cache.delete(path)
  }

  /**
   * Get cache statistics
   * @returns Object containing cache size and paths
   */
  getStats() {
    return {
      size: this.cache.size,
      paths: Array.from(this.cache.keys()),
    }
  }
}

// Export singleton instance
export const addressCache = new AddressCache()
