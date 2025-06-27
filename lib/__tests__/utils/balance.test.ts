import { type Address, type AddressBalance, BalanceType, type Native, type NativeBalance } from 'state/types/ledger'
import { describe, expect, it } from 'vitest'

import { BN } from '@polkadot/util'
import {
  canUnstake,
  getNonTransferableBalance,
  hasAddressBalance,
  hasNegativeBalance,
  hasNonTransferableBalance,
  hasStakedBalance,
  isNativeBalance,
  isNftBalance,
  isNftBalanceType,
  isUniqueBalanceType,
  validateReservedBreakdown,
} from '../../utils/balance'
import {
  mockAddress1,
  mockAddress2,
  mockAddress3,
  mockAddressNoBalance,
  mockAddressPartialBalance,
  mockAddressWithError,
  mockEmptyNativeBalance,
  mockFreeNativeBalance,
  mockFreeNativeBalanceWithNegativeValue,
  mockFrozenNativeBalance,
  mockNft1,
  mockReservedNativeBalance,
  mockUnique,
} from './__mocks__/mockData'

describe('isNativeBalance', () => {
  it('returns true for native balance', () => {
    const native = { type: BalanceType.NATIVE, balance: mockFreeNativeBalance } as AddressBalance
    expect(isNativeBalance(native)).toBe(true)
  })
  it('returns false for NFT/Unique balance', () => {
    const nft = { type: BalanceType.NFT, balance: [mockNft1] } as AddressBalance
    expect(isNativeBalance(nft)).toBe(false)
    const unique = { type: BalanceType.UNIQUE, balance: [mockUnique] } as AddressBalance
    expect(isNativeBalance(unique)).toBe(false)
  })
  it('returns false for undefined', () => {
    expect(isNativeBalance(undefined)).toBe(false)
  })
})

describe('isNftBalance', () => {
  it('returns true for NFT and Unique balances', () => {
    const nft = { type: BalanceType.NFT, balance: [mockNft1] } as AddressBalance
    const unique = { type: BalanceType.UNIQUE, balance: [mockUnique] } as AddressBalance
    expect(isNftBalance(nft)).toBe(true)
    expect(isNftBalance(unique)).toBe(true)
  })
  it('returns false for native balance', () => {
    const native = { type: BalanceType.NATIVE, balance: mockFreeNativeBalance } as AddressBalance
    expect(isNftBalance(native)).toBe(false)
  })
  it('returns false for undefined', () => {
    expect(isNftBalance(undefined)).toBe(false)
  })
})

describe('isNftBalanceType', () => {
  it('returns true only for NFT type', () => {
    const nft = { type: BalanceType.NFT, balance: [mockNft1] } as AddressBalance
    expect(isNftBalanceType(nft)).toBe(true)
    const unique = { type: BalanceType.UNIQUE, balance: [mockUnique] } as AddressBalance
    expect(isNftBalanceType(unique)).toBe(false)
    const native = { type: BalanceType.NATIVE, balance: mockFreeNativeBalance } as AddressBalance
    expect(isNftBalanceType(native)).toBe(false)
  })
  it('returns false for undefined', () => {
    expect(isNftBalanceType(undefined)).toBe(false)
  })
})

describe('isUniqueBalanceType', () => {
  it('returns true only for UNIQUE type', () => {
    const unique = { type: BalanceType.UNIQUE, balance: [mockUnique] } as AddressBalance
    expect(isUniqueBalanceType(unique)).toBe(true)
    const nft = { type: BalanceType.NFT, balance: [mockNft1] } as AddressBalance
    expect(isUniqueBalanceType(nft)).toBe(false)
    const native = { type: BalanceType.NATIVE, balance: mockFreeNativeBalance } as AddressBalance
    expect(isUniqueBalanceType(native)).toBe(false)
  })
  it('returns false for undefined', () => {
    expect(isUniqueBalanceType(undefined)).toBe(false)
  })
})

describe('hasNonTransferableBalance', () => {
  it('returns true if transferable < total', () => {
    const balance = {
      type: BalanceType.NATIVE,
      balance: { ...mockFreeNativeBalance, transferable: new BN(500), total: new BN(1000) },
    } as NativeBalance
    const frozenBalance = { type: BalanceType.NATIVE, balance: mockFrozenNativeBalance } as NativeBalance
    const reservedBalance = { type: BalanceType.NATIVE, balance: mockReservedNativeBalance } as NativeBalance
    expect(hasNonTransferableBalance(balance)).toBe(true)
    expect(hasNonTransferableBalance(frozenBalance)).toBe(true)
    expect(hasNonTransferableBalance(reservedBalance)).toBe(true)
  })
  it('returns false if transferable >= total', () => {
    const balance = { type: BalanceType.NATIVE, balance: mockFreeNativeBalance } as NativeBalance
    expect(hasNonTransferableBalance(balance)).toBe(false)
  })
})

describe('hasStakedBalance', () => {
  it('returns true if staking.total > 0', () => {
    const balance = { type: BalanceType.NATIVE, balance: { ...mockFreeNativeBalance, staking: { total: new BN(100) } } } as NativeBalance
    expect(hasStakedBalance(balance)).toBe(true)
  })
  it('returns false if staking.total is 0', () => {
    const balance = { type: BalanceType.NATIVE, balance: { ...mockFreeNativeBalance, staking: { total: new BN(0) } } } as NativeBalance
    expect(hasStakedBalance(balance)).toBe(false)
  })
  it('returns false if no staking', () => {
    const balance = { type: BalanceType.NATIVE, balance: { ...mockFreeNativeBalance } } as any
    expect(hasStakedBalance(balance)).toBe(false)
  })
  it('returns false for undefined', () => {
    expect(hasStakedBalance(undefined)).toBe(false)
  })
})

describe('canUnstake', () => {
  it('returns true if canUnstake is true and active !== 0', () => {
    const balance = {
      type: BalanceType.NATIVE,
      balance: { ...mockFreeNativeBalance, staking: { canUnstake: true, active: new BN(1) } },
    } as any
    expect(canUnstake(balance)).toBe(true)
  })
  it('returns false if canUnstake is false', () => {
    const balance = {
      type: BalanceType.NATIVE,
      balance: { ...mockFreeNativeBalance, staking: { canUnstake: false, active: new BN(1) } },
    } as any
    expect(canUnstake(balance)).toBe(false)
  })
  it('returns false if active is 0', () => {
    const balance = {
      type: BalanceType.NATIVE,
      balance: { ...mockFreeNativeBalance, staking: { canUnstake: true, active: new BN(0) } },
    } as any
    expect(canUnstake(balance)).toBe(false)
  })
  it('returns false if no staking', () => {
    const balance = { type: BalanceType.NATIVE, balance: { ...mockFreeNativeBalance } } as any
    expect(canUnstake(balance)).toBe(false)
  })
  it('returns false for undefined', () => {
    expect(canUnstake(undefined)).toBe(false)
  })
})

// =========== Tests: hasBalance ===========
describe('hasBalance', () => {
  it('should return true if address has native balance', () => {
    expect(hasAddressBalance(mockAddress1)).toBe(true)
  })

  it('should return true if address has NFTs', () => {
    expect(hasAddressBalance(mockAddress2)).toBe(true)
  })

  it('should return true if address has uniques', () => {
    expect(hasAddressBalance(mockAddress3)).toBe(true)
  })

  it('should return false if address has no balance', () => {
    expect(hasAddressBalance(mockAddressNoBalance)).toBe(false)
  })

  it('should return false for address with undefined balance', () => {
    expect(hasAddressBalance(mockAddressWithError)).toBe(false)
  })

  it('should handle partial balance objects', () => {
    expect(hasAddressBalance(mockAddressPartialBalance)).toBe(false)
  })

  it('should handle balance with only uniques property', () => {
    const addressWithOnlyUniques: Address = {
      ...mockAddress1,
      balances: [
        {
          type: BalanceType.UNIQUE,
          balance: [mockUnique],
        },
      ],
    }
    expect(hasAddressBalance(addressWithOnlyUniques)).toBe(true)
  })

  it('should handle balance with only nfts property', () => {
    const addressWithOnlyNfts: Address = {
      ...mockAddress1,
      balances: [
        {
          type: BalanceType.NFT,
          balance: [mockNft1],
        },
      ],
    }
    expect(hasAddressBalance(addressWithOnlyNfts)).toBe(true)
  })

  it('should handle balance with only native property', () => {
    const addressWithOnlyNative: Address = {
      ...mockAddress1,
      balances: [
        {
          type: BalanceType.NATIVE,
          balance: mockFreeNativeBalance,
        },
      ],
    }
    expect(hasAddressBalance(addressWithOnlyNative)).toBe(true)
  })

  it('should return false for zero native balance and empty arrays', () => {
    const addressWithZeroBalances: Address = {
      ...mockAddress1,
      balances: [
        {
          type: BalanceType.NATIVE,
          balance: mockEmptyNativeBalance,
        },
        {
          type: BalanceType.NFT,
          balance: [],
        },
        {
          type: BalanceType.UNIQUE,
          balance: [],
        },
      ],
    }
    expect(hasAddressBalance(addressWithZeroBalances)).toBe(false)
  })
})

describe('hasNegativeBalance', () => {
  it('should return false if balances is undefined', () => {
    expect(hasNegativeBalance(undefined)).toBe(false)
  })

  it('should return false for balances with no negative values', () => {
    const balances: AddressBalance[] = [
      {
        type: BalanceType.NATIVE,
        balance: mockFreeNativeBalance,
      },
    ]
    expect(hasNegativeBalance(balances)).toBe(false)
  })

  it('should return false for non-native balances', () => {
    const balances: AddressBalance[] = [
      {
        type: BalanceType.NFT,
        balance: [mockNft1],
      },
    ]
    expect(hasNegativeBalance(balances)).toBe(false)
  })

  // TODO: Create a mock with negative balance values to test the positive case
  it('should return true when a native balance has negative values', () => {
    const negativeBalances: AddressBalance[] = [
      {
        type: BalanceType.NATIVE,
        balance: mockFreeNativeBalanceWithNegativeValue,
      },
    ]
    expect(hasNegativeBalance(negativeBalances)).toBe(true)
  })
})

describe('getNonTransferableBalance', () => {
  it('should return 0 if accountData is undefined', () => {
    expect(getNonTransferableBalance(undefined as unknown as Native)).toStrictEqual(new BN(0))
  })

  it('should return 0 if accountData has total and transferable as 0', () => {
    expect(getNonTransferableBalance(mockEmptyNativeBalance)).toStrictEqual(new BN(0))
  })

  it('should return correct non-transferable amount (total - transferable)', () => {
    const accountData = {
      ...mockFreeNativeBalance,
      frozen: new BN(50),
      total: new BN(150),
      transferable: new BN(100),
      reserved: { total: new BN(50) },
    }
    expect(getNonTransferableBalance(accountData)).toStrictEqual(new BN(50))
  })

  it('should return 0 if total equals transferable', () => {
    const accountData = {
      ...mockFreeNativeBalance,
      frozen: new BN(50),
      total: new BN(200),
      transferable: new BN(200),
      reserved: { total: new BN(0) },
    }
    expect(getNonTransferableBalance(accountData)).toStrictEqual(new BN(0))
  })
})

describe('validateReservedBreakdown', () => {
  it('returns true when the sum of components is less than or equal to total', () => {
    expect(validateReservedBreakdown(new BN(10), new BN(20), new BN(30), new BN(0), new BN(60))).toBe(true)
  })

  it('returns false when the sum of components is greater than total', () => {
    expect(validateReservedBreakdown(new BN(10), new BN(20), new BN(30), new BN(2), new BN(61))).toBe(false)
  })

  it('returns true for all zeros', () => {
    expect(validateReservedBreakdown(new BN(0), new BN(0), new BN(0), new BN(0), new BN(0))).toBe(true)
  })

  it('returns false if any value is negative (identityDeposit)', () => {
    expect(validateReservedBreakdown(new BN(-10), new BN(20), new BN(0), new BN(10), new BN(20))).toBe(false)
  })

  it('returns false if any value is negative (multisigDeposit)', () => {
    expect(validateReservedBreakdown(new BN(10), new BN(-20), new BN(0), new BN(10), new BN(0))).toBe(false)
  })

  it('returns false if any value is negative (proxyDeposit)', () => {
    expect(validateReservedBreakdown(new BN(10), new BN(20), new BN(-5), new BN(25), new BN(50))).toBe(false)
  })

  it('returns false if any value is negative (indexDeposit)', () => {
    expect(validateReservedBreakdown(new BN(10), new BN(20), new BN(5), new BN(-35), new BN(0))).toBe(false)
  })

  it('returns false if total is negative', () => {
    expect(validateReservedBreakdown(new BN(10), new BN(20), new BN(5), new BN(35), new BN(-70))).toBe(false)
  })
})
