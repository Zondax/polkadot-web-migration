import type { MockedFunction } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { convertSS58Format, parseBip44Path, buildBip44Path, updateBip44PathIndices, Bip44PathError, isMultisigAddress } from '../address'

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

  describe('New BIP44 Functions (Recommended Approach)', () => {
    describe('parseBip44Path', () => {
      it('should parse complete BIP44 path correctly', () => {
        const path = "m/44'/354'/5'/1'/10'"
        const result = parseBip44Path(path)
        expect(result).toEqual({
          purpose: 44,
          coinType: 354,
          account: 5,
          change: 1,
          addressIndex: 10,
        })
      })

      it('should parse different cryptocurrency paths', () => {
        // Polkadot
        expect(parseBip44Path("m/44'/354'/0'/0'/0'")).toEqual({
          purpose: 44,
          coinType: 354,
          account: 0,
          change: 0,
          addressIndex: 0,
        })

        // Kusama
        expect(parseBip44Path("m/44'/434'/2'/1'/5'")).toEqual({
          purpose: 44,
          coinType: 434,
          account: 2,
          change: 1,
          addressIndex: 5,
        })

        // Bitcoin
        expect(parseBip44Path("m/44'/0'/1'/0'/3'")).toEqual({
          purpose: 44,
          coinType: 0,
          account: 1,
          change: 0,
          addressIndex: 3,
        })
      })

      it('should throw detailed errors for invalid paths', () => {
        // Empty/null inputs
        expect(() => parseBip44Path('')).toThrow('BIP44 path must be a non-empty string')
        expect(() => parseBip44Path(null as any)).toThrow('BIP44 path must be a non-empty string')
        expect(() => parseBip44Path(undefined as any)).toThrow('BIP44 path must be a non-empty string')

        // Invalid format
        expect(() => parseBip44Path('invalid')).toThrow('BIP44 path must start with "m/"')
        expect(() => parseBip44Path('44/354/0/0/0')).toThrow('BIP44 path must start with "m/"')

        // Wrong number of components
        expect(() => parseBip44Path("m/44'/354'/0'")).toThrow('BIP44 path must have exactly 6 components')
        expect(() => parseBip44Path("m/44'/354'/0'/0'/0'/1'")).toThrow('BIP44 path must have exactly 6 components')

        // Missing hardened notation
        expect(() => parseBip44Path("m/44/354'/0'/0'/0'")).toThrow('BIP44 purpose must be hardened')
        expect(() => parseBip44Path("m/44'/354/0'/0'/0'")).toThrow('BIP44 coinType must be hardened')

        // Invalid numbers
        expect(() => parseBip44Path("m/44'/abc'/0'/0'/0'")).toThrow('BIP44 coinType must be a non-negative integer')
        expect(() => parseBip44Path("m/44'/354'/-1'/0'/0'")).toThrow('BIP44 account must be a non-negative integer')
      })

      it('should handle whitespace gracefully', () => {
        const result = parseBip44Path("  m/44'/354'/0'/0'/0'  ")
        expect(result.purpose).toBe(44)
        expect(result.coinType).toBe(354)
      })
    })

    describe('buildBip44Path', () => {
      it('should build correct BIP44 paths', () => {
        expect(
          buildBip44Path({
            purpose: 44,
            coinType: 354,
            account: 0,
            change: 0,
            addressIndex: 0,
          })
        ).toBe("m/44'/354'/0'/0'/0'")

        expect(
          buildBip44Path({
            purpose: 44,
            coinType: 434,
            account: 5,
            change: 1,
            addressIndex: 20,
          })
        ).toBe("m/44'/434'/5'/1'/20'")
      })

      it('should handle edge cases', () => {
        // All zeros
        expect(
          buildBip44Path({
            purpose: 0,
            coinType: 0,
            account: 0,
            change: 0,
            addressIndex: 0,
          })
        ).toBe("m/0'/0'/0'/0'/0'")

        // Large numbers
        expect(
          buildBip44Path({
            purpose: 44,
            coinType: 999999,
            account: 888888,
            change: 1,
            addressIndex: 777777,
          })
        ).toBe("m/44'/999999'/888888'/1'/777777'")
      })

      it('should validate all components', () => {
        const validBase = { purpose: 44, coinType: 354, account: 0, change: 0, addressIndex: 0 }

        // Negative values
        expect(() => buildBip44Path({ ...validBase, purpose: -1 })).toThrow('BIP44 purpose must be a non-negative integer')
        expect(() => buildBip44Path({ ...validBase, coinType: -1 })).toThrow('BIP44 coinType must be a non-negative integer')
        expect(() => buildBip44Path({ ...validBase, account: -1 })).toThrow('BIP44 account must be a non-negative integer')
        expect(() => buildBip44Path({ ...validBase, change: -1 })).toThrow('BIP44 change must be a non-negative integer')
        expect(() => buildBip44Path({ ...validBase, addressIndex: -1 })).toThrow('BIP44 addressIndex must be a non-negative integer')

        // Non-integers
        expect(() => buildBip44Path({ ...validBase, purpose: 44.5 })).toThrow('BIP44 purpose must be a non-negative integer')
        expect(() => buildBip44Path({ ...validBase, coinType: 354.1 })).toThrow('BIP44 coinType must be a non-negative integer')
      })
    })

    describe('updateBip44PathIndices', () => {
      const basePath = "m/44'/354'/0'/0'/0'"

      it('should update individual indices', () => {
        // Update only account
        expect(updateBip44PathIndices(basePath, { account: 5 })).toBe("m/44'/354'/5'/0'/0'")

        // Update only address
        expect(updateBip44PathIndices(basePath, { address: 10 })).toBe("m/44'/354'/0'/0'/10'")
      })

      it('should update multiple indices simultaneously', () => {
        expect(updateBip44PathIndices(basePath, { account: 3, address: 7 })).toBe("m/44'/354'/3'/0'/7'")

        expect(updateBip44PathIndices("m/44'/434'/1'/1'/2'", { account: 10, address: 20 })).toBe("m/44'/434'/10'/1'/20'")
      })

      it('should preserve path when no options provided', () => {
        expect(updateBip44PathIndices(basePath, {})).toBe(basePath)
      })

      it('should handle edge values', () => {
        // Zero values
        expect(updateBip44PathIndices(basePath, { account: 0, address: 0 })).toBe("m/44'/354'/0'/0'/0'")

        // Large values
        expect(updateBip44PathIndices(basePath, { account: 999999, address: 888888 })).toBe("m/44'/354'/999999'/0'/888888'")
      })

      it('should validate options', () => {
        // Negative indices
        expect(() => updateBip44PathIndices(basePath, { account: -1 })).toThrow('Account index must be a non-negative integer')
        expect(() => updateBip44PathIndices(basePath, { address: -1 })).toThrow('Address index must be a non-negative integer')

        // Non-integer indices
        expect(() => updateBip44PathIndices(basePath, { account: 5.5 })).toThrow('Account index must be a non-negative integer')
        expect(() => updateBip44PathIndices(basePath, { address: 3.14 })).toThrow('Address index must be a non-negative integer')
      })

      it('should validate input path', () => {
        expect(() => updateBip44PathIndices('invalid', { account: 1 })).toThrow(Bip44PathError)
        expect(() => updateBip44PathIndices("m/44'/354'/0'/0'", { account: 1 })).toThrow('BIP44 path must have exactly 6 components')
      })

      it('should work with complex existing paths', () => {
        const complexPath = "m/44'/434'/25'/1'/50'"
        expect(updateBip44PathIndices(complexPath, { account: 100 })).toBe("m/44'/434'/100'/1'/50'")
        expect(updateBip44PathIndices(complexPath, { address: 75 })).toBe("m/44'/434'/25'/1'/75'")
      })
    })

    describe('Integration and Round-trip Tests', () => {
      it('should parse and rebuild paths identically', () => {
        const paths = ["m/44'/354'/0'/0'/0'", "m/44'/434'/5'/1'/10'", "m/44'/0'/999'/0'/888'", "m/0'/1'/2'/1'/3'"]

        for (const originalPath of paths) {
          const parsed = parseBip44Path(originalPath)
          const rebuilt = buildBip44Path(parsed)
          expect(rebuilt).toBe(originalPath)
        }
      })

      it('should work with updateBip44PathIndices and round-trip', () => {
        const original = "m/44'/354'/0'/0'/0'"
        const updated = updateBip44PathIndices(original, { account: 5, address: 10 })
        expect(updated).toBe("m/44'/354'/5'/0'/10'")

        const parsed = parseBip44Path(updated)
        expect(parsed.account).toBe(5)
        expect(parsed.addressIndex).toBe(10)
        expect(parsed.purpose).toBe(44)
        expect(parsed.coinType).toBe(354)
        expect(parsed.change).toBe(0)

        const rebuilt = buildBip44Path(parsed)
        expect(rebuilt).toBe(updated)
      })

      it('should handle chain-specific scenarios', () => {
        // Polkadot deep scan scenario
        const polkadotBase = "m/44'/354'/0'/0'/0'"
        const polkadotScenarios = [
          { account: 0, address: 0 },
          { account: 1, address: 5 },
          { account: 10, address: 20 },
        ]

        for (const { account, address } of polkadotScenarios) {
          const result = updateBip44PathIndices(polkadotBase, { account, address })
          expect(result).toBe(`m/44'/354'/${account}'/0'/${address}'`)
        }

        // Kusama scenarios
        const kusamaBase = "m/44'/434'/0'/0'/0'"
        const kusamaResult = updateBip44PathIndices(kusamaBase, { account: 3, address: 7 })
        expect(kusamaResult).toBe("m/44'/434'/3'/0'/7'")
      })
    })

    describe('Bip44PathError', () => {
      it('should create error with proper properties', () => {
        const error = new Bip44PathError('Test message')
        expect(error.message).toBe('Test message')
        expect(error.name).toBe('Bip44PathError')
        expect(error instanceof Error).toBe(true)
        expect(error instanceof Bip44PathError).toBe(true)
      })

      it('should include path and component context', () => {
        const error = new Bip44PathError('Test message', 'test/path', 'purpose')
        expect(error.path).toBe('test/path')
        expect(error.component).toBe('purpose')
      })
    })
  })

  describe('isMultisigAddress', () => {
    describe('should return false for regular Address objects', () => {
      it('should return false for standard address from mock data', () => {
        const regularAddress = {
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          path: "m/44'/354'/0'/0'/0'",
          pubKey: '0x1234567890abcdef',
        }
        expect(isMultisigAddress(regularAddress)).toBe(false)
      })

      it('should return false for address with balances but no multisig properties', () => {
        const addressWithBalances = {
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          path: "m/44'/354'/0'/0'/1'",
          pubKey: '0xabcdef1234567890',
          balances: { free: '1000000000000', reserved: '0', frozen: '0' },
        }
        expect(isMultisigAddress(addressWithBalances)).toBe(false)
      })

      it('should return false for address with undefined threshold and members', () => {
        const addressWithUndefinedProps = {
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          path: "m/44'/354'/0'/0'/2'",
          pubKey: '0xfedcba0987654321',
          threshold: undefined,
          members: undefined,
        }
        expect(isMultisigAddress(addressWithUndefinedProps)).toBe(false)
      })
    })

    describe('should return true for MultisigAddress objects', () => {
      it('should return true for standard multisig address', () => {
        const multisigAddress = {
          address: '5EYCAe5ijiYfyeZ2JJCGq56LmPyNRAKzpG4QkoQkkQNB5e6Z',
          threshold: 2,
          members: [
            { address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', internal: true },
            { address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', internal: false },
          ],
          pendingMultisigCalls: [],
          path: "m/44'/354'/0'/0'/0'",
          pubKey: '0x1234567890abcdef',
        }
        expect(isMultisigAddress(multisigAddress)).toBe(true)
      })

      it('should return true for multisig address with error', () => {
        const multisigAddressWithError = {
          address: '5EYCAe5ijiYfyeZ2JJCGq56LmPyNRAKzpG4QkoQkkQNB5e6Z',
          threshold: 2,
          members: [{ address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', internal: true }],
          pendingMultisigCalls: [],
          path: "m/44'/354'/0'/0'/1'",
          pubKey: '0xabcdef1234567890',
          error: 'Some error occurred',
        }
        expect(isMultisigAddress(multisigAddressWithError)).toBe(true)
      })

      it('should return true when threshold is 0', () => {
        const multisigWithZeroThreshold = {
          address: '5EYCAe5ijiYfyeZ2JJCGq56LmPyNRAKzpG4QkoQkkQNB5e6Z',
          threshold: 0,
          members: [{ address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', internal: false }],
          pendingMultisigCalls: [],
          path: "m/44'/354'/0'/0'/2'",
          pubKey: '0xfedcba0987654321',
        }
        expect(isMultisigAddress(multisigWithZeroThreshold)).toBe(true)
      })

      it('should return true when members array has one element', () => {
        const multisigWithSingleMember = {
          address: '5EYCAe5ijiYfyeZ2JJCGq56LmPyNRAKzpG4QkoQkkQNB5e6Z',
          threshold: 1,
          members: [{ address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', internal: false }],
          pendingMultisigCalls: [],
          path: "m/44'/354'/0'/0'/3'",
          pubKey: '0x1111222233334444',
        }
        expect(isMultisigAddress(multisigWithSingleMember)).toBe(true)
      })

      it('should return true when members array has multiple elements', () => {
        const multisigWithMultipleMembers = {
          address: '5EYCAe5ijiYfyeZ2JJCGq56LmPyNRAKzpG4QkoQkkQNB5e6Z',
          threshold: 3,
          members: [
            { address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', internal: true },
            { address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', internal: false },
            { address: '5Dp8sTj5yCr8mAvhvnVqC5Ec8TfKDvZG8n15UUjFXxFg1eLw', internal: false },
          ],
          pendingMultisigCalls: [],
          path: "m/44'/354'/0'/0'/4'",
          pubKey: '0x5555666677778888',
        }
        expect(isMultisigAddress(multisigWithMultipleMembers)).toBe(true)
      })
    })
  })
})
