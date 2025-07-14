import { describe, expect, it } from 'vitest'

import type { Address, MultisigAddress } from '@/state/types/ledger'
import { getBip44Path, isMultisigAddress } from '../../utils/address'
import { mockAddress1, mockAddress2, mockMultisigAddress1, mockMultisigAddressWithError, TEST_ADDRESSES } from './__mocks__/mockData'

describe('getBip44Path', () => {
  it('should replace last index in basic BIP44 path', () => {
    expect(getBip44Path("m/44'/354'/0'/0'", 1)).toBe("m/44'/354'/0'/1'")
  })

  it('should handle single-digit indices', () => {
    expect(getBip44Path("m/44'/354'/0'/0'", 5)).toBe("m/44'/354'/0'/5'")
  })

  it('should handle double-digit indices', () => {
    expect(getBip44Path("m/44'/354'/0'/0'", 10)).toBe("m/44'/354'/0'/10'")
  })

  it('should handle zero index', () => {
    expect(getBip44Path("m/44'/354'/0'/0'", 0)).toBe("m/44'/354'/0'/0'")
  })

  it('should work with different account paths', () => {
    expect(getBip44Path("m/44'/60'/0'/0'", 3)).toBe("m/44'/60'/0'/3'")
  })

  it('should handle paths with hardened indices', () => {
    expect(getBip44Path("m/44'/0'/0'/0'", 2)).toBe("m/44'/0'/0'/2'")
  })

  it('should handle more complex paths', () => {
    expect(getBip44Path("m/44'/354'/2'/0'", 7)).toBe("m/44'/354'/2'/7'")
  })

  it('should correctly replace only the last index', () => {
    const complexPath = "m/44'/0'/0'/0'/0'"
    expect(getBip44Path(complexPath, 9)).toBe("m/44'/0'/0'/0'/9'")
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
