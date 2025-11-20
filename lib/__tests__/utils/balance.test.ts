import { BN } from '@polkadot/util'
import { type Address, type AddressBalance, BalanceType, type Native, type NativeBalance } from 'state/types/ledger'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the env module before importing balance functions
vi.mock('../../utils/env', () => ({
  isDevelopment: vi.fn(() => false),
}))

// Mock the mockData config
vi.mock('../../../config/mockData', () => ({
  MINIMUM_AMOUNT: undefined,
}))

import {
  cannotCoverFee,
  canUnstake,
  getAccountTransferableBalance,
  getActualTransferAmount,
  getNonTransferableBalance,
  hasAddressBalance,
  hasNegativeBalance,
  hasNonTransferableBalance,
  hasStakedBalance,
  isFullMigration,
  isNativeBalance,
  isNftBalance,
  isNftBalanceType,
  isUniqueBalanceType,
  validateReservedBreakdown,
} from '../../utils/balance'
import { isDevelopment } from '../../utils/env'
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
    expect(validateReservedBreakdown(new BN(10), new BN(20), new BN(30), new BN(0), new BN(0), new BN(60))).toBe(true)
  })

  it('returns false when the sum of components is greater than total', () => {
    expect(validateReservedBreakdown(new BN(10), new BN(20), new BN(30), new BN(2), new BN(0), new BN(61))).toBe(false)
  })

  it('returns true for all zeros', () => {
    expect(validateReservedBreakdown(new BN(0), new BN(0), new BN(0), new BN(0), new BN(0), new BN(0))).toBe(true)
  })

  it('returns false if any value is negative (identityDeposit)', () => {
    expect(validateReservedBreakdown(new BN(-10), new BN(20), new BN(0), new BN(10), new BN(0), new BN(20))).toBe(false)
  })

  it('returns false if any value is negative (multisigDeposit)', () => {
    expect(validateReservedBreakdown(new BN(10), new BN(-20), new BN(0), new BN(10), new BN(0), new BN(0))).toBe(false)
  })

  it('returns false if any value is negative (proxyDeposit)', () => {
    expect(validateReservedBreakdown(new BN(10), new BN(20), new BN(-5), new BN(25), new BN(0), new BN(50))).toBe(false)
  })

  it('returns false if any value is negative (indexDeposit)', () => {
    expect(validateReservedBreakdown(new BN(10), new BN(20), new BN(5), new BN(-35), new BN(0), new BN(0))).toBe(false)
  })

  it('returns false if any value is negative (governanceDeposit)', () => {
    expect(validateReservedBreakdown(new BN(10), new BN(20), new BN(5), new BN(0), new BN(-10), new BN(35))).toBe(false)
  })

  it('returns false if total is negative', () => {
    expect(validateReservedBreakdown(new BN(10), new BN(20), new BN(5), new BN(35), new BN(0), new BN(-70))).toBe(false)
  })

  it('returns true when governance deposit is included in the sum', () => {
    expect(validateReservedBreakdown(new BN(10), new BN(20), new BN(30), new BN(0), new BN(40), new BN(100))).toBe(true)
  })
})

describe('getAccountTransferableBalance', () => {
  it('returns the transferable balance for an account with native balance', () => {
    const account: Address = {
      ...mockAddress1,
      balances: [{ type: BalanceType.NATIVE, balance: { ...mockFreeNativeBalance, transferable: new BN(12345) } }],
    }
    expect(getAccountTransferableBalance(account).toString()).toBe('12345')
  })

  it('returns 0 for an account with no balances', () => {
    const account: Address = { ...mockAddress1, balances: undefined }
    expect(getAccountTransferableBalance(account).toString()).toBe('0')
  })

  it('returns 0 for an account with no native balance', () => {
    const account: Address = {
      ...mockAddress1,
      balances: [{ type: BalanceType.NFT, balance: [mockNft1] }],
    }
    expect(getAccountTransferableBalance(account).toString()).toBe('0')
  })
})

describe('cannotCoverFee', () => {
  it('returns true if transferable balance is less than fee', () => {
    expect(cannotCoverFee(new BN(100), new BN(200))).toBe(true)
  })
  it('returns false if transferable balance is equal to fee', () => {
    expect(cannotCoverFee(new BN(200), new BN(200))).toBe(false)
  })
  it('returns false if transferable balance is greater than fee', () => {
    expect(cannotCoverFee(new BN(300), new BN(200))).toBe(false)
  })
})

describe('getActualTransferAmount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Production mode', () => {
    beforeEach(() => {
      vi.mocked(isDevelopment).mockReturnValue(false)
    })

    it('returns full transferable balance in production mode', () => {
      const balance: NativeBalance = {
        type: BalanceType.NATIVE,
        balance: { ...mockFreeNativeBalance, transferable: new BN(1000000) },
      }
      const result = getActualTransferAmount(balance)
      expect(result.toString()).toBe('1000000')
    })

    it('returns full transferable balance with different amounts', () => {
      const balance: NativeBalance = {
        type: BalanceType.NATIVE,
        balance: { ...mockFreeNativeBalance, transferable: new BN(5000000) },
      }
      const result = getActualTransferAmount(balance)
      expect(result.toString()).toBe('5000000')
    })

    it('returns full transferable balance even when MINIMUM_AMOUNT might be set', () => {
      // In production, MINIMUM_AMOUNT is ignored
      const balance: NativeBalance = {
        type: BalanceType.NATIVE,
        balance: { ...mockFreeNativeBalance, transferable: new BN(2000000) },
      }
      const result = getActualTransferAmount(balance)
      expect(result.toString()).toBe('2000000')
    })
  })

  describe('Development mode', () => {
    it('returns full transferable balance when isDevelopment is true but MINIMUM_AMOUNT is undefined', () => {
      vi.mocked(isDevelopment).mockReturnValue(true)
      const balance: NativeBalance = {
        type: BalanceType.NATIVE,
        balance: { ...mockFreeNativeBalance, transferable: new BN(3000000) },
      }
      const result = getActualTransferAmount(balance)
      // Since MINIMUM_AMOUNT is mocked as undefined, should return full transferable
      expect(result.toString()).toBe('3000000')
    })
  })

  describe('Edge cases', () => {
    beforeEach(() => {
      vi.mocked(isDevelopment).mockReturnValue(false)
    })

    it('handles zero transferable balance', () => {
      const balance: NativeBalance = {
        type: BalanceType.NATIVE,
        balance: { ...mockFreeNativeBalance, transferable: new BN(0) },
      }
      const result = getActualTransferAmount(balance)
      expect(result.toString()).toBe('0')
    })

    it('handles very large transferable balance', () => {
      const largeAmount = '999999999999999999999999'
      const balance: NativeBalance = {
        type: BalanceType.NATIVE,
        balance: { ...mockFreeNativeBalance, transferable: new BN(largeAmount) },
      }
      const result = getActualTransferAmount(balance)
      expect(result.toString()).toBe(largeAmount)
    })
  })
})

describe('isFullMigration', () => {
  describe('Equal amounts', () => {
    it('returns true when both amounts are equal and positive', () => {
      expect(isFullMigration(new BN(1000), new BN(1000))).toBe(true)
    })

    it('returns true when both amounts are zero', () => {
      expect(isFullMigration(new BN(0), new BN(0))).toBe(true)
    })

    it('returns true when both amounts are very large and equal', () => {
      const largeAmount = new BN('999999999999999999999999')
      expect(isFullMigration(largeAmount, largeAmount)).toBe(true)
    })
  })

  describe('Different amounts', () => {
    it('returns false when nativeTransferAmount is less than transferableBalance', () => {
      expect(isFullMigration(new BN(500), new BN(1000))).toBe(false)
    })

    it('returns false when nativeTransferAmount is greater than transferableBalance', () => {
      expect(isFullMigration(new BN(1500), new BN(1000))).toBe(false)
    })

    it('returns false when one amount is zero and the other is not', () => {
      expect(isFullMigration(new BN(0), new BN(1000))).toBe(false)
      expect(isFullMigration(new BN(1000), new BN(0))).toBe(false)
    })

    it('returns false when amounts differ by 1', () => {
      expect(isFullMigration(new BN(999), new BN(1000))).toBe(false)
      expect(isFullMigration(new BN(1001), new BN(1000))).toBe(false)
    })
  })

  describe('Edge cases', () => {
    it('returns false when nativeTransferAmount is undefined', () => {
      expect(isFullMigration(undefined as unknown as BN, new BN(1000))).toBe(false)
    })

    it('returns false when transferableBalance is undefined', () => {
      expect(isFullMigration(new BN(1000), undefined as unknown as BN)).toBe(false)
    })

    it('returns false when both amounts are undefined', () => {
      expect(isFullMigration(undefined as unknown as BN, undefined as unknown as BN)).toBe(false)
    })

    it('returns false when nativeTransferAmount is null', () => {
      expect(isFullMigration(null as unknown as BN, new BN(1000))).toBe(false)
    })

    it('returns false when transferableBalance is null', () => {
      expect(isFullMigration(new BN(1000), null as unknown as BN)).toBe(false)
    })
  })

  describe('Real-world scenarios', () => {
    it('returns true for typical full migration scenario', () => {
      // Typical balance: 10 DOT (10 decimals)
      const fullBalance = new BN('100000000000')
      expect(isFullMigration(fullBalance, fullBalance)).toBe(true)
    })

    it('returns false for partial migration with MINIMUM_AMOUNT in development', () => {
      // Full balance: 10 DOT, but sending only MINIMUM_AMOUNT for testing
      const transferableBalance = new BN('100000000000') // 10 DOT
      const minimumAmount = new BN('1000000000') // 0.1 DOT
      expect(isFullMigration(minimumAmount, transferableBalance)).toBe(false)
    })

    it('returns false when leaving existential deposit', () => {
      // Transferable: 10.1 DOT, Sending: 10 DOT (keeping 0.1 DOT as ED)
      const transferableBalance = new BN('101000000000')
      const sendingAmount = new BN('100000000000')
      expect(isFullMigration(sendingAmount, transferableBalance)).toBe(false)
    })

    it('returns true when sending all after fee calculation', () => {
      // Scenario: User has exact transferable balance and wants to migrate all
      const transferableBalance = new BN('5000000000000') // 500 KSM
      const nativeAmount = transferableBalance.clone()
      expect(isFullMigration(nativeAmount, transferableBalance)).toBe(true)
    })
  })
})
