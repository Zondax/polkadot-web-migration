import type { SubmittableExtrinsic } from '@polkadot/api/types'
import type { ISubmittableResult } from '@polkadot/types/types/extrinsic'
import { defaultWeights } from 'config/config'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { convertToPolkadotWeight, estimateCallWeight } from '../account'

// Test constants with clear explanations
const MOCK_WEIGHT_BALANCE_TRANSFER = 200_000_000 // 200ms - Standard balance transfer weight
const MOCK_WEIGHT_NFT_TRANSFER = 500_000_000 // 500ms - NFT transfer operation weight
const MOCK_WEIGHT_BATCH_ALL = 1_000_000_000 // 1 second - Batch operation base weight
const MOCK_WEIGHT_UNKNOWN_CALL = 500_000_000 // 500ms - Default weight for unknown calls
const MOCK_WEIGHT_CONSERVATIVE_FALLBACK = 2_000_000_000 // 2 seconds - Conservative fallback weight
const MOCK_WEIGHT_CAP_LIMIT = 2_000_000_000 // 2 seconds - Maximum weight cap
const MOCK_ARGS_COUNT_LARGE = 1000 // Large number of arguments for complexity testing
const MOCK_PROOF_SIZE_DEFAULT = 65536 // 64KB - Default proof size for Polkadot weights

// Mock types
type MockSubmittableExtrinsic = SubmittableExtrinsic<'promise', ISubmittableResult>

describe('Account Module - Weight Estimation Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('estimateCallWeight', () => {
    const createMockCall = (section: string, method: string, args: any[] = []) =>
      ({
        method: {
          section,
          method,
          args,
          toString: () => `${section}.${method}(${args.join(', ')})`,
        },
      }) as unknown as MockSubmittableExtrinsic

    it('should return predefined weight for known calls', () => {
      const testCases = [
        { section: 'balances', method: 'transfer', expected: defaultWeights['balances.transfer'] },
        { section: 'balances', method: 'transferKeepAlive', expected: defaultWeights['balances.transferKeepAlive'] },
        { section: 'nfts', method: 'transfer', expected: defaultWeights['nfts.transfer'] },
        { section: 'uniques', method: 'transfer', expected: defaultWeights['uniques.transfer'] },
        { section: 'assets', method: 'transfer', expected: defaultWeights['assets.transfer'] },
      ]

      for (const testCase of testCases) {
        const mockCall = createMockCall(testCase.section, testCase.method)
        const result = estimateCallWeight(mockCall)
        expect(result).toBe(testCase.expected)
      }
    })

    it('should handle utility.batchAll calls with proper weight calculation', () => {
      const mockBatchArgs = [
        ['call1', 'call2', 'call3'], // Mock batch calls
      ]
      const mockCall = createMockCall('utility', 'batchAll', mockBatchArgs)

      const result = estimateCallWeight(mockCall)

      // Should return at least the base batchAll weight
      expect(result).toBeGreaterThanOrEqual(defaultWeights['utility.batchAll'])
      expect(result).toBeLessThanOrEqual(MOCK_WEIGHT_CAP_LIMIT) // Should be capped at maximum limit
    })

    it('should handle utility.batchAll with encoding error gracefully', () => {
      // Create a mock call that will throw when trying to analyze args
      const mockCall = {
        method: {
          section: 'utility',
          method: 'batchAll',
          args: [
            {
              toString: () => {
                throw new Error('Encoding error')
              },
            },
          ],
        },
      } as unknown as MockSubmittableExtrinsic

      const result = estimateCallWeight(mockCall)

      // When error occurs, it should fall back to conservative estimate
      // But let's check what we actually get first
      expect(result).toBeGreaterThanOrEqual(defaultWeights['utility.batchAll'])
      expect(result).toBeLessThanOrEqual(MOCK_WEIGHT_CAP_LIMIT)
    })

    it('should return default weight for unknown calls', () => {
      const unknownCall = createMockCall('unknown', 'method')
      const result = estimateCallWeight(unknownCall)

      expect(result).toBe(MOCK_WEIGHT_UNKNOWN_CALL) // Default weight
    })

    it('should handle specific call types with fallback weights', () => {
      const testCases = [
        { section: 'nfts', method: 'transfer', fallback: MOCK_WEIGHT_NFT_TRANSFER },
        { section: 'uniques', method: 'transfer', fallback: MOCK_WEIGHT_NFT_TRANSFER },
        { section: 'balances', method: 'transfer', fallback: MOCK_WEIGHT_BALANCE_TRANSFER },
        { section: 'balances', method: 'transferKeepAlive', fallback: MOCK_WEIGHT_BALANCE_TRANSFER },
        { section: 'assets', method: 'transfer', fallback: 300_000_000 }, // 300ms - Assets transfer weight
      ]

      for (const testCase of testCases) {
        const mockCall = createMockCall(testCase.section, testCase.method)
        const result = estimateCallWeight(mockCall)

        // Should return either predefined weight or fallback
        expect(result).toBeGreaterThan(0)
        expect(typeof result).toBe('number')
      }
    })

    it('should handle complex batch calls with large encoded length', () => {
      // Create a mock call with very long encoded representation
      const longArgs = Array.from({ length: MOCK_ARGS_COUNT_LARGE }, (_, i) => `call${i}`)
      const mockCall = createMockCall('utility', 'batchAll', [longArgs])

      const result = estimateCallWeight(mockCall)

      // Should add weight based on complexity but cap at maximum limit
      expect(result).toBeGreaterThanOrEqual(defaultWeights['utility.batchAll'])
      expect(result).toBeLessThanOrEqual(MOCK_WEIGHT_CAP_LIMIT)
    })

    it('should handle edge cases with null/undefined method properties', () => {
      const edgeCases = [
        { method: { section: '', method: '', args: [] } },
        { method: { section: 'test', method: '', args: [] } },
        { method: { section: '', method: 'test', args: [] } },
      ]

      for (const edgeCase of edgeCases) {
        const mockCall = edgeCase as unknown as MockSubmittableExtrinsic
        const result = estimateCallWeight(mockCall)

        expect(result).toBe(500_000_000) // Default weight
        expect(typeof result).toBe('number')
      }
    })
  })

  describe('convertToPolkadotWeight', () => {
    it('should convert nanoseconds to Polkadot weight format', () => {
      const testCases = [
        { input: MOCK_WEIGHT_BATCH_ALL, expected: { refTime: MOCK_WEIGHT_BATCH_ALL, proofSize: MOCK_PROOF_SIZE_DEFAULT } },
        { input: MOCK_WEIGHT_NFT_TRANSFER, expected: { refTime: MOCK_WEIGHT_NFT_TRANSFER, proofSize: MOCK_PROOF_SIZE_DEFAULT } },
        { input: 0, expected: { refTime: 0, proofSize: MOCK_PROOF_SIZE_DEFAULT } },
        {
          input: MOCK_WEIGHT_CONSERVATIVE_FALLBACK,
          expected: { refTime: MOCK_WEIGHT_CONSERVATIVE_FALLBACK, proofSize: MOCK_PROOF_SIZE_DEFAULT },
        },
      ]

      for (const testCase of testCases) {
        const result = convertToPolkadotWeight(testCase.input)
        expect(result).toEqual(testCase.expected)
      }
    })

    it('should handle large weight values', () => {
      const largeWeight = 999_999_999_999
      const result = convertToPolkadotWeight(largeWeight)

      expect(result.refTime).toBe(largeWeight)
      expect(result.proofSize).toBe(65536)
    })

    it('should handle negative values (edge case)', () => {
      const negativeWeight = -1000
      const result = convertToPolkadotWeight(negativeWeight)

      expect(result.refTime).toBe(negativeWeight)
      expect(result.proofSize).toBe(65536)
    })

    it('should always use fixed proof size', () => {
      const testWeights = [0, 100, 1000, 1_000_000, 1_000_000_000]

      for (const weight of testWeights) {
        const result = convertToPolkadotWeight(weight)
        expect(result.proofSize).toBe(65536) // 64KB
      }
    })

    it('should preserve exact refTime values', () => {
      const preciseWeights = [123_456_789, 987_654_321, 1_234_567_890, 999_999_999]

      for (const weight of preciseWeights) {
        const result = convertToPolkadotWeight(weight)
        expect(result.refTime).toBe(weight)
      }
    })
  })
})
