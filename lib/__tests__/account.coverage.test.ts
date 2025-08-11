import type { ApiPromise } from '@polkadot/api'
import { BN } from '@polkadot/util'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Address } from '@/state/types/ledger'

// Handle unhandled promise rejections in tests to prevent CI failures
const originalHandler = process.listeners('unhandledRejection')[0]
process.removeAllListeners('unhandledRejection')
process.on('unhandledRejection', (reason, promise) => {
  // Suppress specific blockchain connection errors that are expected in tests
  if (
    reason instanceof Error &&
    (reason.message.includes('Connection failed') ||
      reason.message.includes('failed_to_connect_to_blockchain') ||
      reason.message.includes('Connection timeout'))
  ) {
    // These are expected failures in our connection retry tests
    return
  }
  // Re-throw other unexpected rejections
  if (originalHandler && typeof originalHandler === 'function') {
    originalHandler(reason, promise)
  } else {
    console.error('Unhandled Promise Rejection:', reason)
  }
})

import {
  eraToHumanTime,
  getNFTsOwnedByAccount,
  getTxFee,
  getUniquesOwnedByAccount,
  ipfsToHttpUrl,
  isReadyToWithdraw,
  prepareRemoveProxiesTransaction,
  prepareUnstakeTransaction,
  prepareWithdrawTransaction,
  processNftItem,
} from '../account'

// Mock all external modules
vi.mock('@polkadot/api')
vi.mock('config/mockData', () => ({
  mockBalances: [],
  errorAddresses: [],
}))

// Mock global fetch
vi.stubGlobal('fetch', vi.fn())

// Set test environment
process.env.NEXT_PUBLIC_NODE_ENV = 'test'

describe('Account Module - Coverage Tests', () => {
  const mockAddress: Address = {
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    path: "m/44'/354'/0'/0'/0'",
    pubKey: '0x1234567890123456789012345678901234567890',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('prepareTransactionPayload', () => {
    it('should return undefined when metadata v15 is not available', async () => {
      const mockTransfer = {
        method: { toHex: () => '0x1234' },
      } as any

      const mockApi = {
        query: {
          system: { account: vi.fn().mockResolvedValue({ toHuman: () => ({ nonce: 0 }) }) },
        },
        call: {
          metadata: {
            metadataAtVersion: vi.fn().mockResolvedValue({ isNone: true }),
          },
        },
      } as unknown as ApiPromise

      const { prepareTransactionPayload } = await import('../account')
      const result = await prepareTransactionPayload(
        mockApi,
        mockAddress.address,
        { id: 'polkadot', name: 'Polkadot', token: { symbol: 'DOT', decimals: 10 } } as any,
        mockTransfer
      )

      expect(result).toBeUndefined()
    })

    it('should handle nonce query errors', async () => {
      const mockTransfer = {
        method: { toHex: () => '0x1234' },
      } as any

      const mockApi = {
        query: {
          system: { account: vi.fn().mockRejectedValue(new Error('Nonce query failed')) },
        },
      } as unknown as ApiPromise

      const { prepareTransactionPayload } = await import('../account')

      await expect(
        prepareTransactionPayload(
          mockApi,
          mockAddress.address,
          { id: 'polkadot', name: 'Polkadot', token: { symbol: 'DOT', decimals: 10 } } as any,
          mockTransfer
        )
      ).rejects.toThrow('Nonce query failed')
    })
  })

  describe('Transaction preparation functions', () => {
    it('should prepare unstake transaction', async () => {
      const mockSubmittableExtrinsic = {
        signAndSend: vi.fn(),
        paymentInfo: vi.fn(),
      }

      const mockApi = {
        tx: {
          staking: {
            unbond: vi.fn().mockReturnValue(mockSubmittableExtrinsic),
          },
        },
      } as unknown as ApiPromise

      const amount = new BN('1000000000000')
      const result = await prepareUnstakeTransaction(mockApi, amount)

      expect(mockApi.tx.staking.unbond).toHaveBeenCalledWith(amount)
      expect(result).toBe(mockSubmittableExtrinsic)
    })

    it('should prepare withdraw transaction', async () => {
      const mockSubmittableExtrinsic = {
        signAndSend: vi.fn(),
        paymentInfo: vi.fn(),
      }

      const mockApi = {
        tx: {
          staking: {
            withdrawUnbonded: vi.fn().mockReturnValue(mockSubmittableExtrinsic),
          },
        },
      } as unknown as ApiPromise

      const result = await prepareWithdrawTransaction(mockApi)

      expect(mockApi.tx.staking.withdrawUnbonded).toHaveBeenCalledWith(0)
      expect(result).toBe(mockSubmittableExtrinsic)
    })

    it('should prepare remove proxies transaction', async () => {
      const mockSubmittableExtrinsic = {
        signAndSend: vi.fn(),
        paymentInfo: vi.fn(),
      }

      const mockApi = {
        tx: {
          proxy: {
            removeProxies: vi.fn().mockReturnValue(mockSubmittableExtrinsic),
          },
        },
      } as unknown as ApiPromise

      const result = await prepareRemoveProxiesTransaction(mockApi)

      expect(mockApi.tx.proxy.removeProxies).toHaveBeenCalled()
      expect(result).toBe(mockSubmittableExtrinsic)
    })
  })

  describe('getTxFee', () => {
    it('should calculate transaction fee', async () => {
      const mockTx = {
        paymentInfo: vi.fn().mockResolvedValue({
          partialFee: new BN('1000000000'),
        }),
      }

      const result = await getTxFee(mockTx as any, '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')

      expect(result).toBeInstanceOf(BN)
      expect(mockTx.paymentInfo).toHaveBeenCalledWith('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')
    })
  })

  describe('NFT functions', () => {
    it('should get NFTs owned by account', async () => {
      const mockNftEntries = [[{ args: [{ toString: () => '1' }, { toString: () => '1' }] }, {}]]

      const mockApi = {
        query: {
          nfts: {
            account: {
              entries: vi.fn().mockResolvedValue(mockNftEntries),
            },
            collection: vi.fn().mockResolvedValue({
              unwrapOr: () => ({ items: 1 }),
            }),
            item: {
              entries: vi.fn().mockResolvedValue([]),
            },
          },
        },
      } as unknown as ApiPromise

      const result = await getNFTsOwnedByAccount('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', mockApi)

      expect(result).toBeDefined()
      expect(result.nfts).toBeInstanceOf(Array)
    })

    it('should get uniques owned by account', async () => {
      const mockUniqueEntries = [[{ args: [{ toString: () => '1' }, { toString: () => '1' }] }, {}]]

      const mockApi = {
        query: {
          uniques: {
            account: {
              entries: vi.fn().mockResolvedValue(mockUniqueEntries),
            },
            class: vi.fn().mockResolvedValue({
              unwrapOr: () => ({ items: 1 }),
            }),
            asset: {
              entries: vi.fn().mockResolvedValue([]),
            },
          },
        },
      } as unknown as ApiPromise

      const result = await getUniquesOwnedByAccount('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', mockApi)

      expect(result).toBeDefined()
      expect(result.nfts).toBeInstanceOf(Array)
    })
  })

  describe('processNftItem', () => {
    it('should process NFT item with complete information', () => {
      const nftItem = {
        ids: {
          collectionId: '1',
          itemId: '101',
        },
        itemInfo: {
          deposit: {
            account: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          },
          owner: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
          isFrozen: true,
          approved: '5DAAnrj7VHTznn2C221g2pvCnvVy9AHbLP7RP9ueGZFg7AAW',
        },
      }

      const result = processNftItem(nftItem)

      expect(result).toEqual({
        collectionId: 1,
        itemId: 101,
        creator: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        owner: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
        isFrozen: true,
        isUnique: false,
        approved: '5DAAnrj7VHTznn2C221g2pvCnvVy9AHbLP7RP9ueGZFg7AAW',
      })
    })

    it('should process NFT item with minimal information', () => {
      const nftItem = {
        ids: {
          collectionId: 2,
          itemId: 202,
        },
        itemInfo: {},
      }

      const result = processNftItem(nftItem)

      expect(result).toEqual({
        collectionId: 2,
        itemId: 202,
        creator: '',
        owner: '',
        isFrozen: false,
        isUnique: false,
      })
    })

    it('should process uniques item correctly', () => {
      const uniqueItem = {
        ids: {
          collectionId: '3',
          itemId: '303',
        },
        itemInfo: {
          owner: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        },
      }

      const result = processNftItem(uniqueItem, true)

      expect(result).toEqual({
        collectionId: 3,
        itemId: 303,
        creator: '',
        owner: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        isFrozen: false,
        isUnique: true,
      })
    })
  })

  describe('ipfsToHttpUrl', () => {
    it('should convert ipfs:// to the default gateway', () => {
      expect(ipfsToHttpUrl('ipfs://QmHash')).toBe('https://ipfs.io/ipfs/QmHash')
    })

    it('should convert ipfs://ipfs/ to the default gateway', () => {
      expect(ipfsToHttpUrl('ipfs://ipfs/QmHash')).toBe('https://ipfs.io/ipfs/QmHash')
    })

    it('should return http URLs unchanged', () => {
      expect(ipfsToHttpUrl('https://example.com/file.json')).toBe('https://example.com/file.json')
    })

    it('should return non-string input unchanged', () => {
      expect(ipfsToHttpUrl(undefined as unknown as string)).toBe(undefined)
      expect(ipfsToHttpUrl(123 as unknown as string)).toBe(123)
    })

    it('should return empty string unchanged', () => {
      expect(ipfsToHttpUrl('')).toBe('')
    })
  })

  describe('eraToHumanTime', () => {
    it('should return hours when less than 24 hours remaining', () => {
      expect(eraToHumanTime(101, 100, 6)).toBe('6 hours')
    })

    it('should return days and hours when more than 24 hours remaining', () => {
      expect(eraToHumanTime(105, 100, 6)).toBe('1 day and 6 hours')
    })

    it('should handle zero values', () => {
      expect(eraToHumanTime(0, 0, 6)).toBe('0 hours')
      expect(eraToHumanTime(1, 0, 6)).toBe('6 hours')
      expect(eraToHumanTime(4, 0, 6)).toBe('1 day')
    })

    it('should handle default Polkadot era time (24h)', () => {
      expect(eraToHumanTime(101, 100, 24)).toBe('1 day')
      expect(eraToHumanTime(105, 100, 24)).toBe('5 days')
    })

    it('should handle Kusama era time (4h)', () => {
      expect(eraToHumanTime(101, 100, 4)).toBe('4 hours')
      expect(eraToHumanTime(105, 100, 4)).toBe('20 hours')
      expect(eraToHumanTime(110, 100, 4)).toBe('1 day and 16 hours')
    })

    it('should handle era in the past or current', () => {
      // When chunk era is in the past, it shows 0 hours
      expect(eraToHumanTime(5, 10, 24)).toBe('0 hours')
      expect(eraToHumanTime(10, 10, 24)).toBe('0 hours')
    })
  })

  describe('isReadyToWithdraw', () => {
    it('should return true when chunk era is past current era', () => {
      expect(isReadyToWithdraw(5, 10)).toBe(true)
    })

    it('should return true when chunk era equals current era', () => {
      expect(isReadyToWithdraw(10, 10)).toBe(true)
    })

    it('should return false when chunk era is in future', () => {
      expect(isReadyToWithdraw(15, 10)).toBe(false)
    })

    it('should handle negative eras', () => {
      expect(isReadyToWithdraw(-1, 0)).toBe(true)
      expect(isReadyToWithdraw(0, -1)).toBe(false)
    })
  })
})
