import { describe, expect, it } from 'vitest'

import type { Address, MultisigAddress } from '@/state/types/ledger'
import { Bip44PathError, isMultisigAddress, updateBip44PathIndices } from '../../utils/address'
import { mockAddress1, mockAddress2, mockMultisigAddress1, mockMultisigAddressWithError, TEST_ADDRESSES } from './__mocks__/mockData'

describe('updateBip44PathIndices', () => {
  it('should replace address index in basic BIP44 path', () => {
    expect(updateBip44PathIndices("m/44'/354'/0'/0'/0'", { address: 1 })).toBe("m/44'/354'/0'/0'/1'")
  })

  it('should handle single-digit indices', () => {
    expect(updateBip44PathIndices("m/44'/354'/0'/0'/0'", { address: 5 })).toBe("m/44'/354'/0'/0'/5'")
  })

  it('should handle double-digit indices', () => {
    expect(updateBip44PathIndices("m/44'/354'/0'/0'/0'", { address: 10 })).toBe("m/44'/354'/0'/0'/10'")
  })

  it('should handle zero index', () => {
    expect(updateBip44PathIndices("m/44'/354'/0'/0'/0'", { address: 0 })).toBe("m/44'/354'/0'/0'/0'")
  })

  it('should work with different coin types', () => {
    expect(updateBip44PathIndices("m/44'/60'/0'/0'/0'", { address: 3 })).toBe("m/44'/60'/0'/0'/3'")
  })

  it('should handle paths with different account indices', () => {
    expect(updateBip44PathIndices("m/44'/0'/0'/0'/0'", { address: 2 })).toBe("m/44'/0'/0'/0'/2'")
  })

  it('should handle more complex paths', () => {
    expect(updateBip44PathIndices("m/44'/354'/2'/0'/0'", { address: 7 })).toBe("m/44'/354'/2'/0'/7'")
  })

  it('should update account index', () => {
    expect(updateBip44PathIndices("m/44'/354'/0'/0'/0'", { account: 5 })).toBe("m/44'/354'/5'/0'/0'")
  })

  it('should update both account and address indices', () => {
    expect(updateBip44PathIndices("m/44'/354'/0'/0'/0'", { account: 3, address: 7 })).toBe("m/44'/354'/3'/0'/7'")
  })

  it('should throw error for invalid paths', () => {
    expect(() => updateBip44PathIndices('invalid', { address: 5 })).toThrow(Bip44PathError)
    expect(() => updateBip44PathIndices("m/44'/354'/0'/0'", { address: 5 })).toThrow(Bip44PathError) // Missing component
  })

  it('should throw error for negative indices', () => {
    expect(() => updateBip44PathIndices("m/44'/354'/0'/0'/0'", { address: -1 })).toThrow(Bip44PathError)
    expect(() => updateBip44PathIndices("m/44'/354'/0'/0'/0'", { account: -1 })).toThrow(Bip44PathError)
  })
})

describe('isMultisigAddress', () => {
  describe('should return false for regular Address objects', () => {
    it('should return false for standard address from mock data', () => {
      expect(isMultisigAddress(mockAddress1)).toBe(false)
    })

    it('should return false for address with balances but no multisig properties', () => {
      expect(isMultisigAddress(mockAddress2)).toBe(false)
    })

    it('should return false for address with undefined threshold and members', () => {
      const addressWithUndefinedProps = {
        ...mockAddress1,
        threshold: undefined,
        members: undefined,
      } as Address
      expect(isMultisigAddress(addressWithUndefinedProps)).toBe(false)
    })
  })

  describe('should return true for MultisigAddress objects', () => {
    it('should return true for standard multisig address from mock data', () => {
      expect(isMultisigAddress(mockMultisigAddress1)).toBe(true)
    })

    it('should return true for multisig address with error from mock data', () => {
      expect(isMultisigAddress(mockMultisigAddressWithError)).toBe(true)
    })

    it('should return true when threshold is 0', () => {
      const multisigWithZeroThreshold: MultisigAddress = {
        ...mockMultisigAddressWithError,
        threshold: 0,
      }
      expect(isMultisigAddress(multisigWithZeroThreshold)).toBe(true)
    })

    it('should return true when members array has one element', () => {
      const multisigWithSingleMember = {
        ...mockMultisigAddressWithError,
        members: [
          {
            address: TEST_ADDRESSES.ADDRESS1,
            internal: false,
          },
        ],
      }
      expect(isMultisigAddress(multisigWithSingleMember)).toBe(true)
    })

    it('should return true when members array has multiple elements', () => {
      const multisigWithMultipleMembers = {
        ...mockMultisigAddressWithError,
        members: [
          { address: TEST_ADDRESSES.ADDRESS1, internal: true },
          { address: TEST_ADDRESSES.ADDRESS3, internal: false },
          { address: TEST_ADDRESSES.ADDRESS4, internal: false },
        ],
      }
      expect(isMultisigAddress(multisigWithMultipleMembers)).toBe(true)
    })
  })
})
