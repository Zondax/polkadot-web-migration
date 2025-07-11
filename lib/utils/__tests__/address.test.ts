import type { MockedFunction } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { convertSS58Format, getBip44Path, isMultisigAddress } from '../address'

// Mock @polkadot/keyring
vi.mock('@polkadot/keyring', () => ({
  decodeAddress: vi.fn(),
  encodeAddress: vi.fn(),
}))

// Import mocked functions
import { decodeAddress, encodeAddress } from '@polkadot/keyring'

const mockDecodeAddress = decodeAddress as MockedFunction<typeof decodeAddress>
const mockEncodeAddress = encodeAddress as MockedFunction<typeof encodeAddress>

describe('address utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('convertSS58Format', () => {
    it('should convert address to new SS58 format', () => {
      const sourceAddress = '15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5'
      const targetPrefix = 2
      const mockDecodedAddress = new Uint8Array([1, 2, 3, 4, 5])
      const expectedAddress = 'EaG2CRhJWPb7qmdcJvy3LiWdh26Jreu9Dx6R1rXxPmYXoDk'

      mockDecodeAddress.mockReturnValue(mockDecodedAddress)
      mockEncodeAddress.mockReturnValue(expectedAddress)

      const result = convertSS58Format(sourceAddress, targetPrefix)

      expect(mockDecodeAddress).toHaveBeenCalledWith(sourceAddress)
      expect(mockEncodeAddress).toHaveBeenCalledWith(mockDecodedAddress, targetPrefix)
      expect(result).toBe(expectedAddress)
    })

    it('should handle Polkadot to Kusama conversion', () => {
      const polkadotAddress = '15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5'
      const kusamaPrefix = 2
      const mockDecodedAddress = new Uint8Array([1, 2, 3, 4, 5])
      const expectedKusamaAddress = 'EaG2CRhJWPb7qmdcJvy3LiWdh26Jreu9Dx6R1rXxPmYXoDk'

      mockDecodeAddress.mockReturnValue(mockDecodedAddress)
      mockEncodeAddress.mockReturnValue(expectedKusamaAddress)

      const result = convertSS58Format(polkadotAddress, kusamaPrefix)

      expect(result).toBe(expectedKusamaAddress)
    })

    it('should handle errors from polkadot keyring', () => {
      const invalidAddress = 'invalid-address'
      const targetPrefix = 0
      const decodingError = new Error('Invalid address format')

      mockDecodeAddress.mockImplementation(() => {
        throw decodingError
      })

      expect(() => convertSS58Format(invalidAddress, targetPrefix)).toThrow(decodingError)
    })

    it('should handle different SS58 prefixes', () => {
      const address = '15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5'
      const mockDecodedAddress = new Uint8Array([1, 2, 3, 4, 5])

      mockDecodeAddress.mockReturnValue(mockDecodedAddress)
      mockEncodeAddress.mockReturnValue('converted-address')

      // Test different network prefixes
      convertSS58Format(address, 0) // Polkadot
      convertSS58Format(address, 2) // Kusama
      convertSS58Format(address, 42) // Generic Substrate

      expect(mockEncodeAddress).toHaveBeenCalledWith(mockDecodedAddress, 0)
      expect(mockEncodeAddress).toHaveBeenCalledWith(mockDecodedAddress, 2)
      expect(mockEncodeAddress).toHaveBeenCalledWith(mockDecodedAddress, 42)
    })
  })

  describe('getBip44Path', () => {
    it('should replace the last index in BIP44 path', () => {
      const basePath = "m/44'/354'/0'/0'"
      const newIndex = 5
      const expectedPath = "m/44'/354'/0'/5'"

      const result = getBip44Path(basePath, newIndex)

      expect(result).toBe(expectedPath)
    })

    it('should handle different account indices', () => {
      const basePath = "m/44'/354'/0'/0'"

      expect(getBip44Path(basePath, 0)).toBe("m/44'/354'/0'/0'")
      expect(getBip44Path(basePath, 1)).toBe("m/44'/354'/0'/1'")
      expect(getBip44Path(basePath, 10)).toBe("m/44'/354'/0'/10'")
      expect(getBip44Path(basePath, 999)).toBe("m/44'/354'/0'/999'")
    })

    it('should handle different network coin types', () => {
      const dotPath = "m/44'/354'/0'/0'"
      const ksmPath = "m/44'/434'/0'/0'"

      expect(getBip44Path(dotPath, 5)).toBe("m/44'/354'/0'/5'")
      expect(getBip44Path(ksmPath, 5)).toBe("m/44'/434'/0'/5'")
    })

    it('should only replace the final index', () => {
      const pathWithMultipleZeros = "m/44'/0'/0'/0'"
      const result = getBip44Path(pathWithMultipleZeros, 7)

      expect(result).toBe("m/44'/0'/0'/7'")
    })

    it('should handle edge case with no trailing index', () => {
      // TODO: review expectations - verify behavior when path doesn't end with /0'
      const pathWithoutTrailingIndex = "m/44'/354'/0'"
      const result = getBip44Path(pathWithoutTrailingIndex, 5)

      // The regex replaces /0' with /5' even if it's not at the very end
      expect(result).toBe("m/44'/354'/5'")
    })
  })

  describe('isMultisigAddress', () => {
    it('should return true for address with threshold property', () => {
      const multisigAddress = {
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        threshold: 2,
        members: ['5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'],
      }

      const result = isMultisigAddress(multisigAddress)

      expect(result).toBe(true)
    })

    it('should return true for address with non-empty members array', () => {
      const multisigAddress = {
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        members: ['5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'],
      }

      const result = isMultisigAddress(multisigAddress)

      expect(result).toBe(true)
    })

    it('should return true when both threshold and members are present', () => {
      const multisigAddress = {
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        threshold: 2,
        members: ['5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'],
      }

      const result = isMultisigAddress(multisigAddress)

      expect(result).toBe(true)
    })

    it('should return false for regular address without multisig properties', () => {
      const regularAddress = {
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        name: 'Test Account',
      }

      const result = isMultisigAddress(regularAddress)

      expect(result).toBe(false)
    })

    it('should return false for address with empty members array and no threshold', () => {
      const addressWithEmptyMembers = {
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        members: [],
      }

      const result = isMultisigAddress(addressWithEmptyMembers)

      expect(result).toBe(false)
    })

    it('should return false for address with undefined members and no threshold', () => {
      const addressWithUndefinedMembers = {
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        members: undefined,
      }

      const result = isMultisigAddress(addressWithUndefinedMembers)

      expect(result).toBe(false)
    })

    it('should return true for threshold of 0', () => {
      // TODO: review expectations - verify if threshold 0 is valid for multisig
      const zeroThresholdAddress = {
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        threshold: 0,
        members: ['5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'],
      }

      const result = isMultisigAddress(zeroThresholdAddress)

      expect(result).toBe(true)
    })

    it('should handle type narrowing correctly', () => {
      const account = {
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        threshold: 2,
        members: ['5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'],
      }

      if (isMultisigAddress(account)) {
        // TypeScript should now know this is a MultisigAddress
        expect(account.threshold).toBe(2)
        expect(account.members).toHaveLength(1)
      }
    })
  })
})
