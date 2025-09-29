import { encodeAddress } from '@polkadot/keyring'
import { addressCache } from '../addressCacheUtil'

describe('AddressCacheUtil', () => {
  const testPath = "m/44'/354'/0'/0'/0'"
  const testPublicKey = new Uint8Array([
    0x46, 0xeb, 0xdd, 0xef, 0x8c, 0xd9, 0xbb, 0x16, 0x7d, 0xc3, 0x08, 0x78, 0xd7, 0x11, 0x3b, 0x7e, 0x16, 0x8e, 0x6f, 0x06, 0x46, 0xbe,
    0xff, 0xd7, 0x7d, 0x69, 0xd3, 0x9b, 0xad, 0x76, 0xb4, 0x7a,
  ])

  beforeEach(() => {
    addressCache.clear()
  })

  describe('cache operations', () => {
    it('should return false for has() when cache is empty', () => {
      expect(addressCache.has(testPath)).toBe(false)
    })

    it('should return null for get() when cache is empty', () => {
      expect(addressCache.get(testPath, 0)).toBeNull()
    })

    it('should store and retrieve public keys', () => {
      addressCache.set(testPath, testPublicKey)

      expect(addressCache.has(testPath)).toBe(true)
      expect(addressCache.getStats().size).toBe(1)
      expect(addressCache.getStats().paths).toContain(testPath)
    })

    it('should clear the cache', () => {
      addressCache.set(testPath, testPublicKey)
      expect(addressCache.has(testPath)).toBe(true)

      addressCache.clear()
      expect(addressCache.has(testPath)).toBe(false)
      expect(addressCache.getStats().size).toBe(0)
    })

    it('should remove specific entries', () => {
      const anotherPath = "m/44'/354'/0'/0'/1'"
      addressCache.set(testPath, testPublicKey)
      addressCache.set(anotherPath, testPublicKey)

      expect(addressCache.getStats().size).toBe(2)

      addressCache.remove(testPath)

      expect(addressCache.has(testPath)).toBe(false)
      expect(addressCache.has(anotherPath)).toBe(true)
      expect(addressCache.getStats().size).toBe(1)
    })
  })

  describe('SS58 address conversion', () => {
    beforeEach(() => {
      addressCache.set(testPath, testPublicKey)
    })

    it('should generate Polkadot addresses (SS58=0)', () => {
      const result = addressCache.get(testPath, 0)
      const expectedAddress = encodeAddress(testPublicKey, 0)
      const expectedPubKeyHex = Buffer.from(testPublicKey).toString('hex')

      expect(result).not.toBeNull()
      expect(result?.address).toBe(expectedAddress)
      expect(result?.pubKey).toBe(expectedPubKeyHex)
      expect(result?.path).toBe(testPath)
    })

    it('should generate Kusama addresses (SS58=2)', () => {
      const result = addressCache.get(testPath, 2)
      const expectedAddress = encodeAddress(testPublicKey, 2)
      const expectedPubKeyHex = Buffer.from(testPublicKey).toString('hex')

      expect(result).not.toBeNull()
      expect(result?.address).toBe(expectedAddress)
      expect(result?.pubKey).toBe(expectedPubKeyHex)
      expect(result?.path).toBe(testPath)
    })

    it('should generate different addresses for different SS58 prefixes', () => {
      const polkadotResult = addressCache.get(testPath, 0)
      const kusamaResult = addressCache.get(testPath, 2)

      expect(polkadotResult?.address).not.toBe(kusamaResult?.address)
      expect(polkadotResult?.pubKey).toBe(kusamaResult?.pubKey)
    })

    it('should generate Generic Substrate addresses (SS58=42)', () => {
      const result = addressCache.get(testPath, 42)
      const expectedAddress = encodeAddress(testPublicKey, 42)

      expect(result).not.toBeNull()
      expect(result?.address).toBe(expectedAddress)
    })
  })

  describe('cache consistency', () => {
    it('should return the same address for multiple calls with same parameters', () => {
      addressCache.set(testPath, testPublicKey)

      const result1 = addressCache.get(testPath, 0)
      const result2 = addressCache.get(testPath, 0)

      expect(result1).toEqual(result2)
    })

    it('should handle multiple paths correctly', () => {
      const path1 = "m/44'/354'/0'/0'/0'"
      const path2 = "m/44'/354'/0'/0'/1'"
      const pubKey1 = testPublicKey
      const pubKey2 = new Uint8Array(32).fill(1) // Different key

      addressCache.set(path1, pubKey1)
      addressCache.set(path2, pubKey2)

      const result1 = addressCache.get(path1, 0)
      const result2 = addressCache.get(path2, 0)

      expect(result1?.address).not.toBe(result2?.address)
      expect(result1?.pubKey).toBe(Buffer.from(pubKey1).toString('hex'))
      expect(result2?.pubKey).toBe(Buffer.from(pubKey2).toString('hex'))
    })
  })
})
