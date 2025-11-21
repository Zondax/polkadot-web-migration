import type { ApiPromise } from '@polkadot/api'
import { BN } from '@polkadot/util'
import { type AddressBalance, BalanceType } from 'state/types/ledger'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InternalErrorType } from '@/config/errors'
import { prepareTransaction } from '../account'
import {
  mockAppConfig as importedMockAppConfig,
  mockApi,
  mockFreeNativeBalance,
  mockMethod,
  mockNft1,
  mockNft2,
} from './utils/__mocks__/mockData'

vi.mock('@polkadot-api/merkleize-metadata', () => ({
  merkleizeMetadata: vi.fn(() => ({
    digest: () => 'mockDigest',
    getProofForExtrinsicPayload: () => new Uint8Array([1, 2, 3]),
  })),
}))

// Use imported mockAppConfig
const mockAppConfig = importedMockAppConfig

// Mock receiver address
const mockReceiverAddress = {
  address: 'receiver',
  path: "m/44'/354'/0'/0'/0'",
  pubKey: '0x00',
}

describe('prepareTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi.query.system.account = vi.fn(() => ({
      toHuman: () => ({ nonce: 0 }),
    }))
    mockApi.call = {
      metadata: {
        metadataAtVersion: vi.fn().mockResolvedValue({
          isNone: false,
          unwrap: () => ({
            digest: () => 'mockDigest',
            getProofForExtrinsicPayload: () => new Uint8Array([1, 2, 3]),
          }),
        }),
      },
    }
  })

  it('throws if not enough balance for amount + fee (specific native amount to transfer)', async () => {
    const api = { ...mockApi, tx: { ...mockApi.tx }, query: { ...mockApi.query } }
    // fee = 10, nativeAmount = 100, transferable = 105
    api.tx.balances.transferKeepAlive.mockReturnValue({
      method: mockMethod,
      toString: () => 'nativeTransfer:100',
      paymentInfo: vi.fn().mockResolvedValue({ partialFee: new BN(10) }),
    })
    api.tx.utility.batchAll.mockReturnValue({
      method: mockMethod,
      toString: () => 'batch:nftTransfer,uniqueTransfer,nativeTransfer:100',
      paymentInfo: vi.fn().mockResolvedValue({ partialFee: new BN(10) }),
    })
    api.tx.nfts.transfer.mockReturnValue({ method: mockMethod, toString: () => 'nftTransfer', paymentInfo: vi.fn() })
    api.tx.uniques.transfer.mockReturnValue({ method: mockMethod, toString: () => 'uniqueTransfer', paymentInfo: vi.fn() })
    const balances: AddressBalance[] = [
      {
        type: BalanceType.NATIVE,
        balance: { ...mockFreeNativeBalance, transferable: new BN(100) },
        transaction: { destinationAddress: mockReceiverAddress },
      },
      {
        type: BalanceType.NFT,
        balance: [mockNft1],
        transaction: { destinationAddress: mockReceiverAddress },
      },
      {
        type: BalanceType.UNIQUE,
        balance: [{ ...mockNft2, isUnique: true }],
        transaction: { destinationAddress: mockReceiverAddress },
      },
    ]
    await expect(prepareTransaction(api as unknown as ApiPromise, 'sender', balances, new BN(105), mockAppConfig)).rejects.toThrow(
      InternalErrorType.INSUFFICIENT_BALANCE_TO_COVER_FEE
    )
  })

  it('throws if not enough balance for fee (NFTs only)', async () => {
    const api = { ...mockApi, tx: { ...mockApi.tx }, query: { ...mockApi.query } }
    // fee = 10, transferable = 5
    api.tx.nfts.transfer.mockReturnValue({ method: mockMethod, toString: () => 'nftTransfer', paymentInfo: vi.fn() })
    api.tx.uniques.transfer.mockReturnValue({ method: mockMethod, toString: () => 'uniqueTransfer', paymentInfo: vi.fn() })
    api.tx.utility.batchAll.mockReturnValue({
      method: mockMethod,
      toString: () => 'batch:nftTransfer,uniqueTransfer',
      paymentInfo: vi.fn().mockResolvedValue({ partialFee: new BN(10) }),
    })
    const balances: AddressBalance[] = [
      {
        type: BalanceType.NFT,
        balance: [mockNft1],
        transaction: { destinationAddress: mockReceiverAddress },
      },
      {
        type: BalanceType.UNIQUE,
        balance: [{ ...mockNft2, isUnique: true }],
        transaction: { destinationAddress: mockReceiverAddress },
      },
    ]
    await expect(prepareTransaction(api as unknown as ApiPromise, 'sender', balances, new BN(5), mockAppConfig)).rejects.toThrow(
      InternalErrorType.INSUFFICIENT_BALANCE
    )
  })

  it('throws if not enough balance for fee (max native)', async () => {
    const api = { ...mockApi, tx: { ...mockApi.tx, balances: { ...mockApi.tx.balances } }, query: { ...mockApi.query } }
    // fee = 10, nativeAmount = transferable = 10 (full migration uses transferAll)
    api.tx.nfts.transfer.mockReturnValue({ method: mockMethod, toString: () => 'nftTransfer', paymentInfo: vi.fn() })
    api.tx.uniques.transfer.mockReturnValue({ method: mockMethod, toString: () => 'uniqueTransfer', paymentInfo: vi.fn() })
    api.tx.balances.transferAll.mockReturnValue({
      method: mockMethod,
      toString: () => 'transferAll:receiver',
      paymentInfo: vi.fn().mockResolvedValue({ partialFee: new BN(10) }),
    })
    api.tx.utility.batchAll.mockReturnValue({
      method: mockMethod,
      toString: () => 'batch:nftTransfer,uniqueTransfer,transferAll:receiver',
      paymentInfo: vi.fn().mockResolvedValue({ partialFee: new BN(10) }),
    })
    const balances: AddressBalance[] = [
      {
        type: BalanceType.NATIVE,
        balance: { ...mockFreeNativeBalance, transferable: new BN(10) },
        transaction: { destinationAddress: mockReceiverAddress },
      },
      {
        type: BalanceType.NFT,
        balance: [mockNft1],
        transaction: { destinationAddress: mockReceiverAddress },
      },
      {
        type: BalanceType.UNIQUE,
        balance: [{ ...mockNft2, isUnique: true }],
        transaction: { destinationAddress: mockReceiverAddress },
      },
    ]
    await expect(prepareTransaction(api as unknown as ApiPromise, 'sender', balances, new BN(10), mockAppConfig)).rejects.toThrow(
      InternalErrorType.INSUFFICIENT_BALANCE
    )
  })

  it('returns payload if enough balance for amount + fee (specific native amount to transfer)', async () => {
    const api = { ...mockApi, tx: { ...mockApi.tx }, query: { ...mockApi.query } }
    // fee = 10, nativeAmount = 100, transferable = 200
    api.tx.balances.transferKeepAlive.mockReturnValue({
      method: mockMethod,
      toString: () => 'nativeTransfer:100',
      paymentInfo: vi.fn().mockResolvedValue({ partialFee: new BN(10) }),
    })
    api.tx.utility.batchAll.mockReturnValue({
      method: mockMethod,
      toString: () => 'batch:nftTransfer,uniqueTransfer,nativeTransfer:100',
      paymentInfo: vi.fn().mockResolvedValue({ partialFee: new BN(10) }),
    })
    const balances: AddressBalance[] = [
      {
        type: BalanceType.NATIVE,
        balance: { ...mockFreeNativeBalance, transferable: new BN(100) },
        transaction: { destinationAddress: mockReceiverAddress },
      },
      {
        type: BalanceType.NFT,
        balance: [mockNft1],
        transaction: { destinationAddress: mockReceiverAddress },
      },
      {
        type: BalanceType.UNIQUE,
        balance: [{ ...mockNft2, isUnique: true }],
        transaction: { destinationAddress: mockReceiverAddress },
      },
    ]
    const result = await prepareTransaction(api as unknown as ApiPromise, 'sender', balances, new BN(200), mockAppConfig)
    expect(result).toBeDefined()
  })

  it('returns payload if enough balance for NFTs only (fee covered)', async () => {
    const api = { ...mockApi, tx: { ...mockApi.tx }, query: { ...mockApi.query } }
    // fee = 10, transferable = 100
    api.tx.nfts.transfer.mockReturnValue({ method: mockMethod, toString: () => 'nftTransfer', paymentInfo: vi.fn() })
    api.tx.uniques.transfer.mockReturnValue({ method: mockMethod, toString: () => 'uniqueTransfer', paymentInfo: vi.fn() })
    api.tx.utility.batchAll.mockReturnValue({
      method: mockMethod,
      toString: () => 'batch:nftTransfer,uniqueTransfer',
      paymentInfo: vi.fn().mockResolvedValue({ partialFee: new BN(10) }),
    })
    const balances: AddressBalance[] = [
      {
        type: BalanceType.NFT,
        balance: [mockNft1],
        transaction: { destinationAddress: mockReceiverAddress },
      },
      {
        type: BalanceType.UNIQUE,
        balance: [{ ...mockNft2, isUnique: true }],
        transaction: { destinationAddress: mockReceiverAddress },
      },
    ]
    const result = await prepareTransaction(api as unknown as ApiPromise, 'sender', balances, new BN(100), mockAppConfig)
    expect(result).toBeDefined()
  })

  it('returns payload if enough balance for max native transfer (fee covered)', async () => {
    const api = { ...mockApi, tx: { ...mockApi.tx, balances: { ...mockApi.tx.balances } }, query: { ...mockApi.query } }
    // fee = 10, nativeAmount = transferable = 110 (full migration uses transferAll)
    api.tx.nfts.transfer.mockReturnValue({ method: mockMethod, toString: () => 'nftTransfer', paymentInfo: vi.fn() })
    api.tx.uniques.transfer.mockReturnValue({ method: mockMethod, toString: () => 'uniqueTransfer', paymentInfo: vi.fn() })
    api.tx.balances.transferAll.mockReturnValue({
      method: mockMethod,
      toString: () => 'transferAll:receiver',
      paymentInfo: vi.fn().mockResolvedValue({ partialFee: 10 }),
    })
    api.tx.utility.batchAll.mockReturnValue({
      method: mockMethod,
      toString: () => 'batch:nftTransfer,uniqueTransfer,transferAll:receiver',
      paymentInfo: vi.fn().mockResolvedValue({ partialFee: 10 }),
    })
    const balances: AddressBalance[] = [
      {
        type: BalanceType.NATIVE,
        balance: { ...mockFreeNativeBalance, transferable: new BN(110) },
        transaction: { destinationAddress: mockReceiverAddress },
      },
      {
        type: BalanceType.NFT,
        balance: [mockNft1],
        transaction: { destinationAddress: mockReceiverAddress },
      },
      {
        type: BalanceType.UNIQUE,
        balance: [{ ...mockNft2, isUnique: true }],
        transaction: { destinationAddress: mockReceiverAddress },
      },
    ]
    const result = await prepareTransaction(api as unknown as ApiPromise, 'sender', balances, new BN(110), mockAppConfig)
    expect(result).toBeDefined()
  })
})
