import { BN } from '@polkadot/util'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type Address, BalanceType, type NativeBalance } from '@/state/types/ledger'

// Mock the environment variable to development and MINIMUM_AMOUNT to a value
vi.stubEnv('NEXT_PUBLIC_NODE_ENV', 'development')

// Mock config/mockData with MINIMUM_AMOUNT set
vi.mock('@/config/mockData', () => ({
  MINIMUM_AMOUNT: '100000000000', // 1 DOT in smallest units
  mockBalances: [],
  errorAddresses: [],
  syncApps: [],
  errorApps: []
}))

describe('balance utilities in development mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTransferableAndNfts in development with MINIMUM_AMOUNT', () => {
    it('should use MINIMUM_AMOUNT for native balance in development mode', async () => {
      // Import the function after mocking
      const { getTransferableAndNfts } = await import('../balance')
      
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

      // In development mode with MINIMUM_AMOUNT, should override the native amount
      expect(result.nativeAmount?.toString()).toBe('100000000000')
      expect(result.transferableAmount.toString()).toBe('950') // Should still be the original transferable
    })
  })
})