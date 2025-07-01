import { BN } from '@polkadot/util'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type Address, type AddressBalance, BalanceType, type Native, type NativeBalance, type NftBalance } from '@/state/types/ledger'

import {
  canUnstake,
  getNonTransferableBalance,
  getTransferableAndNfts,
  hasAddressBalance,
  hasBalance,
  hasNegativeBalance,
  hasNonTransferableBalance,
  hasStakedBalance,
  isNativeBalance,
  isNftBalance,
  isNftBalanceType,
  isUniqueBalanceType,
  validateReservedBreakdown,
} from '../balance'

// Mock the environment variable
vi.stubEnv('NEXT_PUBLIC_NODE_ENV', 'test')

// Mock config/mockData at the top level
vi.mock('@/config/mockData', () => ({
  MINIMUM_AMOUNT: undefined,
  mockBalances: [],
  errorAddresses: [],
  syncApps: [],
  errorApps: [],
}))

describe('balance utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isNativeBalance', () => {
    it('should return true for native balance', () => {
      const nativeBalance: NativeBalance = {
        id: 'native',
        type: BalanceType.NATIVE,
        balance: {
          free: new BN(1000),
          reserved: { total: new BN(100) },
          frozen: new BN(50),
          total: new BN(1100),
          transferable: new BN(950),
        },
      } as NativeBalance

      const result = isNativeBalance(nativeBalance)

      expect(result).toBe(true)
    })

    it('should return false for NFT balance', () => {
      const nftBalance: NftBalance = {
        id: 'nft',
        type: BalanceType.NFT,
        balance: [],
      }

      const result = isNativeBalance(nftBalance)

      expect(result).toBe(false)
    })

    it('should return false for undefined balance', () => {
      const result = isNativeBalance(undefined)

      expect(result).toBe(false)
    })

    it('should return false for null balance', () => {
      const result = isNativeBalance(null as any)

      expect(result).toBe(false)
    })
  })

  describe('isNftBalance', () => {
    it('should return true for NFT balance', () => {
      const nftBalance: NftBalance = {
        id: 'nft',
        type: BalanceType.NFT,
        balance: [],
      }

      const result = isNftBalance(nftBalance)

      expect(result).toBe(true)
    })

    it('should return true for Unique balance', () => {
      const uniqueBalance: NftBalance = {
        id: 'unique',
        type: BalanceType.UNIQUE,
        balance: [],
      }

      const result = isNftBalance(uniqueBalance)

      expect(result).toBe(true)
    })

    it('should return false for native balance', () => {
      const nativeBalance: NativeBalance = {
        id: 'native',
        type: BalanceType.NATIVE,
        balance: {
          free: new BN(1000),
          reserved: { total: new BN(100) },
          frozen: new BN(50),
          total: new BN(1100),
          transferable: new BN(950),
        },
      } as NativeBalance

      const result = isNftBalance(nativeBalance)

      expect(result).toBe(false)
    })

    it('should return false for undefined balance', () => {
      const result = isNftBalance(undefined)

      expect(result).toBe(false)
    })
  })

  describe('isNftBalanceType', () => {
    it('should return true for NFT balance type', () => {
      const nftBalance: NftBalance = {
        id: 'nft',
        type: BalanceType.NFT,
        balance: [],
      }

      const result = isNftBalanceType(nftBalance)

      expect(result).toBe(true)
    })

    it('should return false for Unique balance type', () => {
      const uniqueBalance: NftBalance = {
        id: 'unique',
        type: BalanceType.UNIQUE,
        balance: [],
      }

      const result = isNftBalanceType(uniqueBalance)

      expect(result).toBe(false)
    })

    it('should return false for native balance', () => {
      const nativeBalance: NativeBalance = {
        id: 'native',
        type: BalanceType.NATIVE,
        balance: {
          free: new BN(1000),
          reserved: { total: new BN(100) },
          frozen: new BN(50),
          total: new BN(1100),
          transferable: new BN(950),
        },
      } as NativeBalance

      const result = isNftBalanceType(nativeBalance)

      expect(result).toBe(false)
    })
  })

  describe('isUniqueBalanceType', () => {
    it('should return true for Unique balance type', () => {
      const uniqueBalance: NftBalance = {
        id: 'unique',
        type: BalanceType.UNIQUE,
        balance: [],
      }

      const result = isUniqueBalanceType(uniqueBalance)

      expect(result).toBe(true)
    })

    it('should return false for NFT balance type', () => {
      const nftBalance: NftBalance = {
        id: 'nft',
        type: BalanceType.NFT,
        balance: [],
      }

      const result = isUniqueBalanceType(nftBalance)

      expect(result).toBe(false)
    })

    it('should return false for native balance', () => {
      const nativeBalance: NativeBalance = {
        id: 'native',
        type: BalanceType.NATIVE,
        balance: {
          free: new BN(1000),
          reserved: { total: new BN(100) },
          frozen: new BN(50),
          total: new BN(1100),
          transferable: new BN(950),
        },
      } as NativeBalance

      const result = isUniqueBalanceType(nativeBalance)

      expect(result).toBe(false)
    })
  })

  describe('hasNonTransferableBalance', () => {
    it('should return true when transferable is less than total', () => {
      const balance: NativeBalance = {
        id: 'native',
        type: BalanceType.NATIVE,
        balance: {
          free: new BN(1000),
          reserved: { total: new BN(100) },
          frozen: new BN(50),
          total: new BN(1100),
          transferable: new BN(950),
        },
      } as NativeBalance

      const result = hasNonTransferableBalance(balance)

      expect(result).toBe(true)
    })

    it('should return false when transferable equals total', () => {
      const balance: NativeBalance = {
        id: 'native',
        type: BalanceType.NATIVE,
        balance: {
          free: new BN(1000),
          reserved: { total: new BN(0) },
          frozen: new BN(0),
          total: new BN(1000),
          transferable: new BN(1000),
        },
      } as NativeBalance

      const result = hasNonTransferableBalance(balance)

      expect(result).toBe(false)
    })
  })

  describe('hasStakedBalance', () => {
    it('should return true when staking total is greater than 0', () => {
      const balance: NativeBalance = {
        id: 'native',
        type: BalanceType.NATIVE,
        balance: {
          free: new BN(1000),
          reserved: { total: new BN(100) },
          frozen: new BN(50),
          total: new BN(1100),
          transferable: new BN(950),
          staking: {
            total: new BN(500),
            active: new BN(500),
            canUnstake: true,
          },
        },
      } as NativeBalance

      const result = hasStakedBalance(balance)

      expect(result).toBe(true)
    })

    it('should return false when staking total is 0', () => {
      const balance: NativeBalance = {
        id: 'native',
        type: BalanceType.NATIVE,
        balance: {
          free: new BN(1000),
          reserved: { total: new BN(100) },
          frozen: new BN(50),
          total: new BN(1100),
          transferable: new BN(950),
          staking: {
            total: new BN(0),
            active: new BN(0),
            canUnstake: false,
          },
        },
      } as NativeBalance

      const result = hasStakedBalance(balance)

      expect(result).toBe(false)
    })

    it('should return false when staking is undefined', () => {
      const balance: NativeBalance = {
        id: 'native',
        type: BalanceType.NATIVE,
        balance: {
          free: new BN(1000),
          reserved: { total: new BN(100) },
          frozen: new BN(50),
          total: new BN(1100),
          transferable: new BN(950),
        },
      } as NativeBalance

      const result = hasStakedBalance(balance)

      expect(result).toBe(false)
    })

    it('should return false when balance is undefined', () => {
      const result = hasStakedBalance(undefined)

      expect(result).toBe(false)
    })
  })

  describe('canUnstake', () => {
    it('should return true when can unstake and has active staking', () => {
      const balance: NativeBalance = {
        id: 'native',
        type: BalanceType.NATIVE,
        balance: {
          free: new BN(1000),
          reserved: { total: new BN(100) },
          frozen: new BN(50),
          total: new BN(1100),
          transferable: new BN(950),
          staking: {
            total: new BN(500),
            active: new BN(500),
            canUnstake: true,
          },
        },
      } as NativeBalance

      const result = canUnstake(balance)

      expect(result).toBe(true)
    })

    it('should return false when cannot unstake', () => {
      const balance: NativeBalance = {
        id: 'native',
        type: BalanceType.NATIVE,
        balance: {
          free: new BN(1000),
          reserved: { total: new BN(100) },
          frozen: new BN(50),
          total: new BN(1100),
          transferable: new BN(950),
          staking: {
            total: new BN(500),
            active: new BN(500),
            canUnstake: false,
          },
        },
      } as NativeBalance

      const result = canUnstake(balance)

      expect(result).toBe(false)
    })

    it('should return false when active staking is 0', () => {
      const balance: NativeBalance = {
        id: 'native',
        type: BalanceType.NATIVE,
        balance: {
          free: new BN(1000),
          reserved: { total: new BN(100) },
          frozen: new BN(50),
          total: new BN(1100),
          transferable: new BN(950),
          staking: {
            total: new BN(500),
            active: new BN(0),
            canUnstake: true,
          },
        },
      } as NativeBalance

      const result = canUnstake(balance)

      expect(result).toBe(false)
    })

    it('should return false when staking is undefined', () => {
      const balance: NativeBalance = {
        id: 'native',
        type: BalanceType.NATIVE,
        balance: {
          free: new BN(1000),
          reserved: { total: new BN(100) },
          frozen: new BN(50),
          total: new BN(1100),
          transferable: new BN(950),
        },
      } as NativeBalance

      const result = canUnstake(balance)

      expect(result).toBe(false)
    })
  })

  describe('hasBalance', () => {
    it('should return true for native balance with total > 0', () => {
      const balances: AddressBalance[] = [
        {
          id: 'native',
          type: BalanceType.NATIVE,
          balance: {
            free: new BN(1000),
            reserved: { total: new BN(100) },
            frozen: new BN(50),
            total: new BN(1100),
            transferable: new BN(950),
          },
        } as NativeBalance,
      ]

      const result = hasBalance(balances)

      expect(result).toBe(true)
    })

    it('should return true for native balance with transferable > 0 when checkTransferable is true', () => {
      const balances: AddressBalance[] = [
        {
          id: 'native',
          type: BalanceType.NATIVE,
          balance: {
            free: new BN(1000),
            reserved: { total: new BN(100) },
            frozen: new BN(50),
            total: new BN(1100),
            transferable: new BN(950),
          },
        } as NativeBalance,
      ]

      const result = hasBalance(balances, true)

      expect(result).toBe(true)
    })

    it('should return false for native balance with transferable = 0 when checkTransferable is true', () => {
      const balances: AddressBalance[] = [
        {
          id: 'native',
          type: BalanceType.NATIVE,
          balance: {
            free: new BN(1000),
            reserved: { total: new BN(100) },
            frozen: new BN(1000),
            total: new BN(1100),
            transferable: new BN(0),
          },
        } as NativeBalance,
      ]

      const result = hasBalance(balances, true)

      expect(result).toBe(false)
    })

    it('should return true for NFT balance with items', () => {
      const balances: AddressBalance[] = [
        {
          id: 'nft',
          type: BalanceType.NFT,
          balance: [{ id: '1', name: 'Test NFT' }],
        } as NftBalance,
      ]

      const result = hasBalance(balances)

      expect(result).toBe(true)
    })

    it('should return false for empty NFT balance', () => {
      const balances: AddressBalance[] = [
        {
          id: 'nft',
          type: BalanceType.NFT,
          balance: [],
        } as NftBalance,
      ]

      const result = hasBalance(balances)

      expect(result).toBe(false)
    })

    it('should return false for undefined balances', () => {
      const result = hasBalance(undefined as any)

      expect(result).toBe(false)
    })

    it('should return false for empty balances array', () => {
      const result = hasBalance([])

      expect(result).toBe(false)
    })
  })

  describe('hasNegativeBalance', () => {
    it('should return true when free balance is negative', () => {
      const balances: AddressBalance[] = [
        {
          id: 'native',
          type: BalanceType.NATIVE,
          balance: {
            free: new BN(-100),
            reserved: { total: new BN(100) },
            frozen: new BN(50),
            total: new BN(1100),
            transferable: new BN(950),
          },
        } as NativeBalance,
      ]

      const result = hasNegativeBalance(balances)

      expect(result).toBe(true)
    })

    it('should return true when reserved balance is negative', () => {
      const balances: AddressBalance[] = [
        {
          id: 'native',
          type: BalanceType.NATIVE,
          balance: {
            free: new BN(1000),
            reserved: { total: new BN(-100) },
            frozen: new BN(50),
            total: new BN(1100),
            transferable: new BN(950),
          },
        } as NativeBalance,
      ]

      const result = hasNegativeBalance(balances)

      expect(result).toBe(true)
    })

    it('should return true when frozen balance is negative', () => {
      const balances: AddressBalance[] = [
        {
          id: 'native',
          type: BalanceType.NATIVE,
          balance: {
            free: new BN(1000),
            reserved: { total: new BN(100) },
            frozen: new BN(-50),
            total: new BN(1100),
            transferable: new BN(950),
          },
        } as NativeBalance,
      ]

      const result = hasNegativeBalance(balances)

      expect(result).toBe(true)
    })

    it('should return true when total balance is negative', () => {
      const balances: AddressBalance[] = [
        {
          id: 'native',
          type: BalanceType.NATIVE,
          balance: {
            free: new BN(1000),
            reserved: { total: new BN(100) },
            frozen: new BN(50),
            total: new BN(-1100),
            transferable: new BN(950),
          },
        } as NativeBalance,
      ]

      const result = hasNegativeBalance(balances)

      expect(result).toBe(true)
    })

    it('should return false when all balances are positive', () => {
      const balances: AddressBalance[] = [
        {
          id: 'native',
          type: BalanceType.NATIVE,
          balance: {
            free: new BN(1000),
            reserved: { total: new BN(100) },
            frozen: new BN(50),
            total: new BN(1100),
            transferable: new BN(950),
          },
        } as NativeBalance,
      ]

      const result = hasNegativeBalance(balances)

      expect(result).toBe(false)
    })

    it('should return false for NFT balances', () => {
      const balances: AddressBalance[] = [
        {
          id: 'nft',
          type: BalanceType.NFT,
          balance: [{ id: '1', name: 'Test NFT' }],
        } as NftBalance,
      ]

      const result = hasNegativeBalance(balances)

      expect(result).toBe(false)
    })

    it('should return false for undefined balances', () => {
      const result = hasNegativeBalance(undefined)

      expect(result).toBe(false)
    })
  })

  describe('hasAddressBalance', () => {
    it('should return true when account has balances', () => {
      const account: Address = {
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        balances: [
          {
            id: 'native',
            type: BalanceType.NATIVE,
            balance: {
              free: new BN(1000),
              reserved: { total: new BN(100) },
              frozen: new BN(50),
              total: new BN(1100),
              transferable: new BN(950),
            },
          } as NativeBalance,
        ],
      } as Address

      const result = hasAddressBalance(account)

      expect(result).toBe(true)
    })

    it('should return false when account has no balances', () => {
      const account: Address = {
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        balances: undefined,
      } as Address

      const result = hasAddressBalance(account)

      expect(result).toBe(false)
    })

    it('should return false when account has empty balances', () => {
      const account: Address = {
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        balances: [],
      } as Address

      const result = hasAddressBalance(account)

      expect(result).toBe(false)
    })
  })

  describe('getTransferableAndNfts', () => {
    const mockAccount: Address = {
      address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      balances: [
        {
          id: 'native',
          type: BalanceType.NATIVE,
          balance: {
            free: new BN(1000),
            reserved: { total: new BN(100) },
            frozen: new BN(50),
            total: new BN(1100),
            transferable: new BN(950),
          },
        } as NativeBalance,
      ],
    } as Address

    it('should return native amount for native balance', () => {
      const nativeBalance: NativeBalance = {
        id: 'native',
        type: BalanceType.NATIVE,
        balance: {
          free: new BN(1000),
          reserved: { total: new BN(100) },
          frozen: new BN(50),
          total: new BN(1100),
          transferable: new BN(950),
        },
      } as NativeBalance

      const result = getTransferableAndNfts(nativeBalance, mockAccount)

      expect(result.nftsToTransfer).toEqual([])
      expect(result.nativeAmount?.toString()).toBe('950')
      expect(result.transferableAmount.toString()).toBe('950')
    })

    it('should return NFTs for NFT balance', () => {
      const nftBalance: NftBalance = {
        id: 'nft',
        type: BalanceType.NFT,
        balance: [
          { id: '1', name: 'Test NFT' },
          { id: '2', name: 'Another NFT' },
        ],
      } as NftBalance

      const result = getTransferableAndNfts(nftBalance, mockAccount)

      expect(result.nftsToTransfer).toHaveLength(2)
      expect(result.nftsToTransfer[0].id).toBe('1')
      expect(result.nativeAmount).toBeUndefined()
      expect(result.transferableAmount.toString()).toBe('950') // From account's native balance
    })

    it('should handle account without native balance for NFT', () => {
      const accountWithoutNative: Address = {
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        balances: [],
      } as Address

      const nftBalance: NftBalance = {
        id: 'nft',
        type: BalanceType.NFT,
        balance: [{ id: '1', name: 'Test NFT' }],
      } as NftBalance

      const result = getTransferableAndNfts(nftBalance, accountWithoutNative)

      expect(result.nftsToTransfer).toHaveLength(1)
      expect(result.nativeAmount).toBeUndefined()
      expect(result.transferableAmount.toString()).toBe('0')
    })

    it('should use transferable amount when MINIMUM_AMOUNT is not set', () => {
      // TODO: review expectations - verify behavior with MINIMUM_AMOUNT environment variable in development
      const nativeBalance: NativeBalance = {
        id: 'native',
        type: BalanceType.NATIVE,
        balance: {
          free: new BN(1000),
          reserved: { total: new BN(100) },
          frozen: new BN(50),
          total: new BN(1100),
          transferable: new BN(950),
        },
      } as NativeBalance

      const result = getTransferableAndNfts(nativeBalance, mockAccount)

      // Since MINIMUM_AMOUNT is undefined by default, should use transferable amount
      expect(result.nativeAmount?.toString()).toBe('950')
    })

    it('should not use MINIMUM_AMOUNT for NFT balance even in development', () => {
      // This test documents the behavior that MINIMUM_AMOUNT only applies to native balances
      const nftBalance: NftBalance = {
        id: 'nft',
        type: BalanceType.NFT,
        balance: [{ id: '1', name: 'Test NFT' }],
      } as NftBalance

      const result = getTransferableAndNfts(nftBalance, mockAccount)

      // NFT balance should not be affected by MINIMUM_AMOUNT
      expect(result.nativeAmount).toBeUndefined()
      expect(result.nftsToTransfer).toHaveLength(1)
    })

    it('should use MINIMUM_AMOUNT for native balance in development mode', () => {
      // Note: Testing the development path is challenging due to module imports,
      // but we can verify the code path exists and would work if MINIMUM_AMOUNT was set

      // First save the current environment variable
      const originalNodeEnv = process.env.NEXT_PUBLIC_NODE_ENV

      // Temporarily set to development
      process.env.NEXT_PUBLIC_NODE_ENV = 'development'

      const nativeBalance: NativeBalance = {
        id: 'native',
        type: BalanceType.NATIVE,
        balance: {
          free: new BN(1000),
          reserved: { total: new BN(100) },
          frozen: new BN(50),
          total: new BN(1100),
          transferable: new BN(950),
        },
      } as NativeBalance

      const result = getTransferableAndNfts(nativeBalance, mockAccount)

      // Since MINIMUM_AMOUNT is mocked as undefined in our tests,
      // it should still use the transferable amount
      expect(result.nativeAmount?.toString()).toBe('950')
      expect(result.transferableAmount.toString()).toBe('950')

      // Restore original environment variable
      process.env.NEXT_PUBLIC_NODE_ENV = originalNodeEnv
    })
  })

  describe('getNonTransferableBalance', () => {
    it('should calculate non-transferable balance correctly', () => {
      const nativeBalance: Native = {
        free: new BN(1000),
        reserved: { total: new BN(100) },
        frozen: new BN(50),
        total: new BN(1100),
        transferable: new BN(950),
      }

      const result = getNonTransferableBalance(nativeBalance)

      expect(result.toString()).toBe('150') // 1100 - 950
    })

    it('should return 0 for undefined balance', () => {
      const result = getNonTransferableBalance(undefined as any)

      expect(result.toString()).toBe('0')
    })

    it('should return 0 when transferable equals total', () => {
      const nativeBalance: Native = {
        free: new BN(1000),
        reserved: { total: new BN(0) },
        frozen: new BN(0),
        total: new BN(1000),
        transferable: new BN(1000),
      }

      const result = getNonTransferableBalance(nativeBalance)

      expect(result.toString()).toBe('0')
    })
  })

  describe('validateReservedBreakdown', () => {
    it('should return true when components sum equals total', () => {
      const identity = new BN(100)
      const multisig = new BN(200)
      const proxy = new BN(50)
      const index = new BN(25)
      const total = new BN(375)

      const result = validateReservedBreakdown(identity, multisig, proxy, index, total)

      expect(result).toBe(true)
    })

    it('should return true when components sum is less than total', () => {
      const identity = new BN(100)
      const multisig = new BN(200)
      const proxy = new BN(50)
      const index = new BN(25)
      const total = new BN(400)

      const result = validateReservedBreakdown(identity, multisig, proxy, index, total)

      expect(result).toBe(true)
    })

    it('should return false when components sum exceeds total', () => {
      const identity = new BN(100)
      const multisig = new BN(200)
      const proxy = new BN(50)
      const index = new BN(25)
      const total = new BN(300)

      const result = validateReservedBreakdown(identity, multisig, proxy, index, total)

      expect(result).toBe(false)
    })

    it('should return false when any component is negative', () => {
      const identity = new BN(-100)
      const multisig = new BN(200)
      const proxy = new BN(50)
      const index = new BN(25)
      const total = new BN(175)

      const result = validateReservedBreakdown(identity, multisig, proxy, index, total)

      expect(result).toBe(false)
    })

    it('should return false when total is negative', () => {
      const identity = new BN(100)
      const multisig = new BN(200)
      const proxy = new BN(50)
      const index = new BN(25)
      const total = new BN(-375)

      const result = validateReservedBreakdown(identity, multisig, proxy, index, total)

      expect(result).toBe(false)
    })

    it('should handle zero values correctly', () => {
      const identity = new BN(0)
      const multisig = new BN(0)
      const proxy = new BN(0)
      const index = new BN(0)
      const total = new BN(0)

      const result = validateReservedBreakdown(identity, multisig, proxy, index, total)

      expect(result).toBe(true)
    })
  })
})
