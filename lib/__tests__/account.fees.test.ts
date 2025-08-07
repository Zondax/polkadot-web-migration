import type { SubmittableExtrinsic } from '@polkadot/api/types'
import type { RuntimeDispatchInfo } from '@polkadot/types/interfaces'
import type { ISubmittableResult } from '@polkadot/types/types/extrinsic'
import { BN } from '@polkadot/util'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTxFee } from '../account'

// Test constants with clear explanations
const MOCK_PARTIAL_FEE = '1000000000000' // 1 DOT (1 * 10^12 planck) - Standard transaction fee
const ZERO_FEE = '0' // Zero fee for testing free transactions
const LARGE_FEE = '5000000000000' // 5 DOT (5 * 10^12 planck) - Large transaction fee for testing
const CONCURRENT_REQUESTS = 5 // Number of concurrent fee requests to test parallelism
const MOCK_SENDER_ADDRESS = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' // Valid Polkadot address format

// Mock types
type MockSubmittableExtrinsic = SubmittableExtrinsic<'promise', ISubmittableResult>

describe('Account Module - Fee Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTxFee', () => {
    it('should return transaction fee as BN', async () => {
      const mockPaymentInfo: RuntimeDispatchInfo = {
        partialFee: MOCK_PARTIAL_FEE,
      } as any

      const mockTx = {
        paymentInfo: vi.fn().mockResolvedValue(mockPaymentInfo),
      } as unknown as MockSubmittableExtrinsic

      const result = await getTxFee(mockTx, MOCK_SENDER_ADDRESS)

      expect(mockTx.paymentInfo).toHaveBeenCalledWith(MOCK_SENDER_ADDRESS)
      expect(result).toBeInstanceOf(BN)
      expect(result.toString()).toBe(MOCK_PARTIAL_FEE)
    })

    it('should handle zero fee', async () => {
      const mockPaymentInfo: RuntimeDispatchInfo = {
        partialFee: ZERO_FEE,
      } as any

      const mockTx = {
        paymentInfo: vi.fn().mockResolvedValue(mockPaymentInfo),
      } as unknown as MockSubmittableExtrinsic

      const result = await getTxFee(mockTx, MOCK_SENDER_ADDRESS)

      expect(result).toBeInstanceOf(BN)
      expect(result.toString()).toBe(ZERO_FEE)
      expect(result.isZero()).toBe(true)
    })

    it('should handle large fee values', async () => {
      const mockPaymentInfo: RuntimeDispatchInfo = {
        partialFee: LARGE_FEE,
      } as any

      const mockTx = {
        paymentInfo: vi.fn().mockResolvedValue(mockPaymentInfo),
      } as unknown as MockSubmittableExtrinsic

      const result = await getTxFee(mockTx, MOCK_SENDER_ADDRESS)

      expect(result).toBeInstanceOf(BN)
      expect(result.toString()).toBe(LARGE_FEE)
    })

    it('should handle paymentInfo errors', async () => {
      const mockTx = {
        paymentInfo: vi.fn().mockRejectedValue(new Error('Payment info failed')),
      } as unknown as MockSubmittableExtrinsic

      await expect(getTxFee(mockTx, MOCK_SENDER_ADDRESS)).rejects.toThrow('Payment info failed')
    })

    it('should handle invalid sender address', async () => {
      const mockPartialFee = '1000000000000'
      const mockPaymentInfo: RuntimeDispatchInfo = {
        partialFee: mockPartialFee,
      } as any

      const mockTx = {
        paymentInfo: vi.fn().mockResolvedValue(mockPaymentInfo),
      } as unknown as MockSubmittableExtrinsic

      const invalidAddress = 'invalid-address'
      const result = await getTxFee(mockTx, invalidAddress)

      expect(mockTx.paymentInfo).toHaveBeenCalledWith(invalidAddress)
      expect(result).toBeInstanceOf(BN)
      expect(result.toString()).toBe(mockPartialFee)
    })

    it('should handle different transaction types', async () => {
      const testCases = [
        { name: 'balance transfer', fee: '200000000' },
        { name: 'NFT transfer', fee: '500000000' },
        { name: 'batch transaction', fee: '1000000000' },
        { name: 'multisig transaction', fee: '800000000' },
      ]

      for (const testCase of testCases) {
        const mockPaymentInfo: RuntimeDispatchInfo = {
          partialFee: testCase.fee,
        } as any

        const mockTx = {
          paymentInfo: vi.fn().mockResolvedValue(mockPaymentInfo),
        } as unknown as MockSubmittableExtrinsic

        const result = await getTxFee(mockTx, MOCK_SENDER_ADDRESS)

        expect(result).toBeInstanceOf(BN)
        expect(result.toString()).toBe(testCase.fee)
      }
    })

    it('should handle concurrent fee requests', async () => {
      const mockPaymentInfo: RuntimeDispatchInfo = {
        partialFee: MOCK_PARTIAL_FEE,
      } as any

      const mockTx = {
        paymentInfo: vi.fn().mockResolvedValue(mockPaymentInfo),
      } as unknown as MockSubmittableExtrinsic

      // Make multiple concurrent requests
      const promises = Array.from({ length: CONCURRENT_REQUESTS }, () => getTxFee(mockTx, MOCK_SENDER_ADDRESS))
      const results = await Promise.all(promises)

      // All results should be the same
      for (const result of results) {
        expect(result).toBeInstanceOf(BN)
        expect(result.toString()).toBe(MOCK_PARTIAL_FEE)
      }

      // paymentInfo should have been called for each concurrent request
      expect(mockTx.paymentInfo).toHaveBeenCalledTimes(CONCURRENT_REQUESTS)
    })
  })
})
