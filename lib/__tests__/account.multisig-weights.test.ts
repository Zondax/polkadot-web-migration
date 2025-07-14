import type { SubmittableExtrinsic } from '@polkadot/api/types'
import type { ISubmittableResult } from '@polkadot/types/types/extrinsic'
import { MULTISIG_WEIGHT_BUFFER } from 'config/config'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { estimateApproveAsMultiWeight, estimateAsMultiWeight, estimateCallWeight, estimateMultisigWeight } from '../account'

// Test constants with clear explanations
const MOCK_CALL_HASH = '0x1234567890abcdef' // Mock call hash for multisig operations
const MOCK_THRESHOLD_MINIMUM = 2 // Minimum threshold for multisig (2 of N)
const MOCK_SIGNATORIES_SMALL = 2 // Small number of signatories for testing
const MOCK_HEIGHT_BLOCK = 1000 // Mock block height for timepoint
const MOCK_INDEX_EXTRINSIC = 5 // Mock extrinsic index for timepoint
const MOCK_WEIGHT_BASE_APPROVE = 500_000_000 // 500ms - Base weight for approveAsMulti
const MOCK_WEIGHT_BASE_EXECUTE = 600_000_000 // 600ms - Base weight for asMulti execution
const MOCK_WEIGHT_PER_SIGNATORY_APPROVE = 50_000_000 // 50ms - Additional weight per signatory (approve)
const MOCK_WEIGHT_PER_SIGNATORY_EXECUTE = 75_000_000 // 75ms - Additional weight per signatory (execute)
const MOCK_WEIGHT_PER_THRESHOLD_APPROVE = 25_000_000 // 25ms - Additional weight per threshold unit (approve)
const MOCK_WEIGHT_PER_THRESHOLD_EXECUTE = 50_000_000 // 50ms - Additional weight per threshold unit (execute)
const MOCK_WEIGHT_TIMEPOINT_NEW = 50_000_000 // 50ms - Weight for new multisig timepoint
const MOCK_WEIGHT_TIMEPOINT_EXISTING = 100_000_000 // 100ms - Weight for existing multisig timepoint
const MOCK_WEIGHT_STORAGE_OPERATIONS = 150_000_000 // 150ms - Weight for storage operations
const MOCK_WEIGHT_CLEANUP_OPERATIONS = 200_000_000 // 200ms - Weight for storage cleanup operations
const MOCK_PROOF_SIZE_DEFAULT = 65536 // 64KB - Default proof size for Polkadot weights

// Mock addresses for multisig testing
const MOCK_ADDRESSES = [
  '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
  '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
  '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy',
  '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw',
]

// Mock types
type MockSubmittableExtrinsic = SubmittableExtrinsic<'promise', ISubmittableResult>

describe('Account Module - Multisig Weight Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('estimateApproveAsMultiWeight', () => {
    const mockSignatories = MOCK_ADDRESSES.slice(0, MOCK_SIGNATORIES_SMALL + 1) // +1 for current signer

    it('should calculate weight for new multisig approval', () => {
      const threshold = MOCK_THRESHOLD_MINIMUM
      const otherSignatories = mockSignatories.slice(1) // Exclude current signer

      const result = estimateApproveAsMultiWeight(MOCK_CALL_HASH, threshold, otherSignatories)

      // Should include base weight, signatories weight, threshold weight, and buffer
      expect(result).toBeGreaterThan(0)
      expect(typeof result).toBe('number')

      // Should be affected by buffer
      const baseWeight =
        MOCK_WEIGHT_BASE_APPROVE +
        otherSignatories.length * MOCK_WEIGHT_PER_SIGNATORY_APPROVE +
        threshold * MOCK_WEIGHT_PER_THRESHOLD_APPROVE +
        MOCK_WEIGHT_TIMEPOINT_NEW +
        MOCK_WEIGHT_STORAGE_OPERATIONS
      const expectedWeight = Math.floor(baseWeight * MULTISIG_WEIGHT_BUFFER)
      expect(result).toBe(expectedWeight)
    })

    it('should calculate weight for existing multisig approval', () => {
      const threshold = MOCK_THRESHOLD_MINIMUM
      const otherSignatories = mockSignatories.slice(1)
      const timepoint = { height: MOCK_HEIGHT_BLOCK, index: MOCK_INDEX_EXTRINSIC }

      const result = estimateApproveAsMultiWeight(MOCK_CALL_HASH, threshold, otherSignatories, timepoint)

      // Should include higher timepoint weight for existing multisig
      expect(result).toBeGreaterThan(0)

      const baseWeight =
        MOCK_WEIGHT_BASE_APPROVE +
        otherSignatories.length * MOCK_WEIGHT_PER_SIGNATORY_APPROVE +
        threshold * MOCK_WEIGHT_PER_THRESHOLD_APPROVE +
        MOCK_WEIGHT_TIMEPOINT_EXISTING +
        MOCK_WEIGHT_STORAGE_OPERATIONS
      const expectedWeight = Math.floor(baseWeight * MULTISIG_WEIGHT_BUFFER)
      expect(result).toBe(expectedWeight)
    })

    it('should handle different threshold values', () => {
      const otherSignatories = mockSignatories.slice(1)
      const thresholds = [1, 2, 3, 5, 10]

      let previousWeight = 0
      for (const threshold of thresholds) {
        const result = estimateApproveAsMultiWeight(MOCK_CALL_HASH, threshold, otherSignatories)

        // Higher threshold should result in higher weight
        expect(result).toBeGreaterThan(previousWeight)
        previousWeight = result
      }
    })

    it('should handle different numbers of signatories', () => {
      const threshold = 2
      const signatoryCounts = [1, 2, 3, 5, 10]

      let previousWeight = 0
      for (const count of signatoryCounts) {
        const signatories = Array.from({ length: count }, (_, i) => `5${'A'.repeat(47)}${i}`)
        const result = estimateApproveAsMultiWeight(MOCK_CALL_HASH, threshold, signatories)

        // More signatories should result in higher weight
        expect(result).toBeGreaterThan(previousWeight)
        previousWeight = result
      }
    })

    it('should handle edge cases', () => {
      // Minimum case: 1 threshold, 0 other signatories
      const minResult = estimateApproveAsMultiWeight(MOCK_CALL_HASH, 1, [])
      expect(minResult).toBeGreaterThan(0)

      // Large case: high threshold, many signatories
      const manySignatories = Array.from({ length: 100 }, (_, i) => `5${'A'.repeat(47)}${i}`)
      const maxResult = estimateApproveAsMultiWeight(MOCK_CALL_HASH, 50, manySignatories)
      expect(maxResult).toBeGreaterThan(minResult)
    })

    it('should handle null timepoint correctly', () => {
      const threshold = 2
      const otherSignatories = mockSignatories.slice(1)

      const resultWithNull = estimateApproveAsMultiWeight(MOCK_CALL_HASH, threshold, otherSignatories, null)
      const resultWithUndefined = estimateApproveAsMultiWeight(MOCK_CALL_HASH, threshold, otherSignatories, undefined)

      // Both should give same result (new multisig)
      expect(resultWithNull).toBe(resultWithUndefined)
    })
  })

  describe('estimateAsMultiWeight', () => {
    const mockSignatories = [
      '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      '5DAAnrj7VHTznn2C221g2pvCnvVy9AHbLP7RP9ueGZFg7AAW',
    ]

    const createMockCall = (section: string, method: string) =>
      ({
        method: {
          section,
          method,
          args: [],
        },
      }) as unknown as MockSubmittableExtrinsic

    it('should calculate weight for final multisig execution', () => {
      const mockCall = createMockCall('balances', 'transfer')
      const threshold = 2
      const otherSignatories = mockSignatories.slice(1)

      const result = estimateAsMultiWeight(mockCall, threshold, otherSignatories)

      // Should include underlying call weight + multisig overhead
      expect(result).toBeGreaterThan(0)
      expect(typeof result).toBe('number')

      // Should be greater than just the call weight
      const callWeight = estimateCallWeight(mockCall)
      expect(result).toBeGreaterThan(callWeight)
    })

    it('should handle different call types', () => {
      const threshold = 2
      const otherSignatories = mockSignatories.slice(1)

      const testCases = [
        { section: 'balances', method: 'transfer' },
        { section: 'nfts', method: 'transfer' },
        { section: 'utility', method: 'batchAll' },
        { section: 'staking', method: 'bond' },
      ]

      for (const testCase of testCases) {
        const mockCall = createMockCall(testCase.section, testCase.method)
        const result = estimateAsMultiWeight(mockCall, threshold, otherSignatories)

        expect(result).toBeGreaterThan(0)

        // Should include the underlying call weight
        const callWeight = estimateCallWeight(mockCall)
        expect(result).toBeGreaterThan(callWeight)
      }
    })

    it('should scale with threshold and signatories', () => {
      const mockCall = createMockCall('balances', 'transfer')

      // Test threshold scaling
      const baseSignatories = mockSignatories.slice(1)
      const thresholds = [1, 2, 3, 5]

      let previousWeight = 0
      for (const threshold of thresholds) {
        const result = estimateAsMultiWeight(mockCall, threshold, baseSignatories)
        expect(result).toBeGreaterThan(previousWeight)
        previousWeight = result
      }

      // Test signatories scaling
      const threshold = 2
      const signatoryCounts = [1, 2, 3, 5]

      previousWeight = 0
      for (const count of signatoryCounts) {
        const signatories = Array.from({ length: count }, (_, i) => `5${'A'.repeat(47)}${i}`)
        const result = estimateAsMultiWeight(mockCall, threshold, signatories)
        expect(result).toBeGreaterThan(previousWeight)
        previousWeight = result
      }
    })

    it('should apply buffer correctly', () => {
      const mockCall = createMockCall('balances', 'transfer')
      const threshold = 2
      const otherSignatories = mockSignatories.slice(1)

      const result = estimateAsMultiWeight(mockCall, threshold, otherSignatories)

      // Calculate expected weight without buffer
      const callWeight = estimateCallWeight(mockCall)
      const multisigOverhead =
        MOCK_WEIGHT_BASE_EXECUTE +
        otherSignatories.length * MOCK_WEIGHT_PER_SIGNATORY_EXECUTE +
        threshold * MOCK_WEIGHT_PER_THRESHOLD_EXECUTE +
        MOCK_WEIGHT_CLEANUP_OPERATIONS
      const totalWithoutBuffer = callWeight + multisigOverhead
      const expectedWithBuffer = Math.floor(totalWithoutBuffer * MULTISIG_WEIGHT_BUFFER)

      expect(result).toBe(expectedWithBuffer)
    })

    it('should handle complex calls with higher weights', () => {
      const complexCall = createMockCall('utility', 'batchAll')
      const simpleCall = createMockCall('balances', 'transfer')

      const threshold = 2
      const otherSignatories = mockSignatories.slice(1)

      const complexResult = estimateAsMultiWeight(complexCall, threshold, otherSignatories)
      const simpleResult = estimateAsMultiWeight(simpleCall, threshold, otherSignatories)

      // Complex call should have higher weight
      expect(complexResult).toBeGreaterThan(simpleResult)
    })
  })

  describe('estimateMultisigWeight', () => {
    const mockSignatories = ['5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty']

    const createMockCall = (section: string, method: string) =>
      ({
        method: {
          section,
          method,
          args: [],
        },
      }) as unknown as MockSubmittableExtrinsic

    it('should return asMulti weight when call is provided', () => {
      const mockCall = createMockCall('balances', 'transfer')
      const threshold = 2
      const otherSignatories = mockSignatories

      const result = estimateMultisigWeight(mockCall, threshold, otherSignatories)

      // Should return weight in Polkadot format
      expect(result).toHaveProperty('refTime')
      expect(result).toHaveProperty('proofSize')
      expect(result.refTime).toBeGreaterThan(0)
      expect(result.proofSize).toBe(MOCK_PROOF_SIZE_DEFAULT)
    })

    it('should return approveAsMulti weight when call is undefined', () => {
      const threshold = 2
      const otherSignatories = mockSignatories

      const result = estimateMultisigWeight(undefined, threshold, otherSignatories)

      // Should return weight in Polkadot format
      expect(result).toHaveProperty('refTime')
      expect(result).toHaveProperty('proofSize')
      expect(result.refTime).toBeGreaterThan(0)
      expect(result.proofSize).toBe(MOCK_PROOF_SIZE_DEFAULT)
    })

    it('should return approveAsMulti weight with timepoint', () => {
      const threshold = 2
      const otherSignatories = mockSignatories
      const timepoint = { height: 1000, index: 5 }

      const result = estimateMultisigWeight(undefined, threshold, otherSignatories, timepoint)

      expect(result).toHaveProperty('refTime')
      expect(result).toHaveProperty('proofSize')
      expect(result.refTime).toBeGreaterThan(0)
      expect(result.proofSize).toBe(MOCK_PROOF_SIZE_DEFAULT)
    })

    it('should handle different scenarios correctly', () => {
      const mockCall = createMockCall('balances', 'transfer')
      const threshold = 2
      const otherSignatories = mockSignatories

      // Test all scenarios
      const scenarios = [
        { call: mockCall, timepoint: undefined, description: 'asMulti without timepoint' },
        { call: undefined, timepoint: undefined, description: 'approveAsMulti without timepoint' },
        { call: undefined, timepoint: { height: 1000, index: 5 }, description: 'approveAsMulti with timepoint' },
      ]

      for (const scenario of scenarios) {
        const result = estimateMultisigWeight(scenario.call, threshold, otherSignatories, scenario.timepoint)

        expect(result).toHaveProperty('refTime')
        expect(result).toHaveProperty('proofSize')
        expect(result.refTime).toBeGreaterThan(0)
        expect(result.proofSize).toBe(MOCK_PROOF_SIZE_DEFAULT)
      }
    })

    it('should return higher weight for asMulti than approveAsMulti', () => {
      const mockCall = createMockCall('balances', 'transfer')
      const threshold = 2
      const otherSignatories = mockSignatories

      const asMultiResult = estimateMultisigWeight(mockCall, threshold, otherSignatories)
      const approveAsMultiResult = estimateMultisigWeight(undefined, threshold, otherSignatories)

      // asMulti should have higher weight (includes call execution)
      expect(asMultiResult.refTime).toBeGreaterThan(approveAsMultiResult.refTime)
    })

    it('should handle edge cases', () => {
      const mockCall = createMockCall('balances', 'transfer')

      // Minimum case
      const minResult = estimateMultisigWeight(mockCall, 1, [])
      expect(minResult.refTime).toBeGreaterThan(0)

      // Large case
      const manySignatories = Array.from({ length: 50 }, (_, i) => `5${'A'.repeat(47)}${i}`)
      const maxResult = estimateMultisigWeight(mockCall, 25, manySignatories)
      expect(maxResult.refTime).toBeGreaterThan(minResult.refTime)
    })
  })
})
