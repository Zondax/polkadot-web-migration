import { observable } from '@legendapp/state'
import { encodeAddress } from '@polkadot/keyring'
import type { GenericeResponseAddress } from '@zondax/ledger-substrate/dist/common'

/**
 * Cached public key data structure
 * Stored in observable state for reactivity
 */
interface CachedPublicKey {
  publicKey: Uint8Array // Keep as Uint8Array for performance
  cachedAt: number // Timestamp for potential TTL in future
}

/**
 * Address cache state interface
 */
interface AddressCacheState {
  cache: Record<string, CachedPublicKey>
}

/**
 * Observable address cache for Ledger public keys
 *
 * This cache stores public keys by BIP44 derivation path and generates
 * SS58-formatted addresses on demand. It uses Legend State observables
 * for consistency with the rest of the application state management.
 *
 * Features:
 * - Reactive state updates
 * - Type-safe operations
 * - Consistent with app architecture
 * - Same performance as original Map-based approach
 */
export const addressCache$ = observable<AddressCacheState>({
  cache: {},
})

/**
 * Address cache utility functions
 * Provides a clean API over the observable state
 */
export const addressCacheActions = {
  /**
   * Get cached address with specific SS58 prefix
   * @param path BIP44 derivation path
   * @param ss58Prefix SS58 format prefix for the target network
   * @returns GenericeResponseAddress if cached, null if not found
   */
  get(path: string, ss58Prefix: number): GenericeResponseAddress | null {
    const cached = addressCache$.cache[path].peek()
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
  },

  /**
   * Store public key for the given path
   * @param path BIP44 derivation path
   * @param publicKey Raw public key from Ledger device
   */
  set(path: string, publicKey: Uint8Array): void {
    addressCache$.cache[path].set({
      publicKey,
      cachedAt: Date.now(),
    })
  },

  /**
   * Check if an address is cached for the given path
   * @param path BIP44 derivation path
   * @returns true if cached, false otherwise
   */
  has(path: string): boolean {
    return Boolean(addressCache$.cache[path].peek())
  },

  /**
   * Clear entire cache
   */
  clear(): void {
    addressCache$.cache.set({})
  },

  /**
   * Remove specific cache entry
   * @param path BIP44 derivation path to remove
   */
  remove(path: string): void {
    addressCache$.cache[path].delete()
  },

  /**
   * Get cache statistics
   * @returns Object containing cache size and paths
   */
  getStats(): { size: number; paths: string[] } {
    const cache = addressCache$.cache.peek()
    const paths = Object.keys(cache)
    return {
      size: paths.length,
      paths,
    }
  },
}

/**
 * Compatibility wrapper to match current API
 * Provides singleton-like access using Legend State observables
 */
export class AddressCacheAdapter {
  get(path: string, ss58Prefix: number) {
    return addressCacheActions.get(path, ss58Prefix)
  }

  set(path: string, publicKey: Uint8Array) {
    addressCacheActions.set(path, publicKey)
  }

  has(path: string) {
    return addressCacheActions.has(path)
  }

  clear() {
    addressCacheActions.clear()
  }

  remove(path: string) {
    addressCacheActions.remove(path)
  }

  getStats() {
    return addressCacheActions.getStats()
  }
}

/**
 * Singleton instance for backward compatibility
 * Can be imported directly by ledgerService
 */
export const addressCache = new AddressCacheAdapter()

/**
 * React hook for components that need reactive cache access
 *
 * Example usage:
 * ```tsx
 * function CacheStats() {
 *   const { size, paths } = useAddressCache()
 *   return <div>Cache has {size} entries</div>
 * }
 * ```
 */
export const useAddressCache = () => {
  return {
    // Reactive state access
    cache: addressCache$.cache,

    // Actions
    ...addressCacheActions,

    // Computed reactive values (using peek for non-reactive access in hook)
    get size() {
      const cache = addressCache$.cache.peek()
      return Object.keys(cache).length
    },
    get paths() {
      const cache = addressCache$.cache.peek()
      return Object.keys(cache)
    },
  }
}
