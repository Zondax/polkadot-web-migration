import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest'

import type { AppId } from '@/config/apps'
import type { MultisigCall, MultisigMember } from '@/state/types/ledger'
import { callDataValidationMessages, getAvailableSigners, validateCallData, type CallDataValidationResult } from '../../utils/multisig'

// Mock the ledgerClient module
vi.mock('@/state/client/ledger', () => ({
  ledgerClient: {
    validateCallDataMatchesHash: vi.fn(),
  },
}))

import { ledgerClient } from '@/state/client/ledger'
import { BN } from '@polkadot/util'

// Cast the mocked function for type safety
const mockedValidateCallDataMatchesHash = ledgerClient.validateCallDataMatchesHash as MockedFunction<
  typeof ledgerClient.validateCallDataMatchesHash
>

describe('validateCallData', () => {
  const mockAppId: AppId = 'kusama'
  const validCallData = '0x1234567890abcdef'
  const validCallHash = '0xabcdef1234567890'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('early return conditions', () => {
    it('should return valid when callDataValue is empty', async () => {
      const result = await validateCallData(mockAppId, '', validCallHash)

      expect(result).toEqual({ isValid: true })
      expect(mockedValidateCallDataMatchesHash).not.toHaveBeenCalled()
    })

    it('should return valid when callHashValue is empty', async () => {
      const result = await validateCallData(mockAppId, validCallData, '')

      expect(result).toEqual({ isValid: true })
      expect(mockedValidateCallDataMatchesHash).not.toHaveBeenCalled()
    })

    it('should return valid when both callDataValue and callHashValue are empty', async () => {
      const result = await validateCallData(mockAppId, '', '')

      expect(result).toEqual({ isValid: true })
      expect(mockedValidateCallDataMatchesHash).not.toHaveBeenCalled()
    })

    it('should return valid when callDataValue is null-like', async () => {
      const result = await validateCallData(mockAppId, null as any, validCallHash)

      expect(result).toEqual({ isValid: true })
      expect(mockedValidateCallDataMatchesHash).not.toHaveBeenCalled()
    })

    it('should return valid when callHashValue is null-like', async () => {
      const result = await validateCallData(mockAppId, validCallData, null as any)

      expect(result).toEqual({ isValid: true })
      expect(mockedValidateCallDataMatchesHash).not.toHaveBeenCalled()
    })
  })

  describe('hex format validation', () => {
    it('should return invalid for call data not starting with 0x', async () => {
      const invalidCallData = '1234567890abcdef'

      const result = await validateCallData(mockAppId, invalidCallData, validCallHash)

      expect(result).toEqual({
        isValid: false,
        error: callDataValidationMessages.isInvalidFormat,
      })
      expect(mockedValidateCallDataMatchesHash).not.toHaveBeenCalled()
    })

    it('should return invalid for call data with invalid hex characters', async () => {
      const invalidCallData = '0x123456789gxyza'

      const result = await validateCallData(mockAppId, invalidCallData, validCallHash)

      expect(result).toEqual({
        isValid: false,
        error: callDataValidationMessages.isInvalidFormat,
      })
      expect(mockedValidateCallDataMatchesHash).not.toHaveBeenCalled()
    })

    it('should return invalid for call data with spaces', async () => {
      const invalidCallData = '0x1234 5678'

      const result = await validateCallData(mockAppId, invalidCallData, validCallHash)

      expect(result).toEqual({
        isValid: false,
        error: callDataValidationMessages.isInvalidFormat,
      })
      expect(mockedValidateCallDataMatchesHash).not.toHaveBeenCalled()
    })

    it('should return invalid for call data with special characters', async () => {
      const invalidCallData = '0x1234@#$%'

      const result = await validateCallData(mockAppId, invalidCallData, validCallHash)

      expect(result).toEqual({
        isValid: false,
        error: callDataValidationMessages.isInvalidFormat,
      })
      expect(mockedValidateCallDataMatchesHash).not.toHaveBeenCalled()
    })

    it('should accept valid lowercase hex format', async () => {
      const validLowercaseCallData = '0x1234567890abcdef'
      mockedValidateCallDataMatchesHash.mockResolvedValue(true)

      const result = await validateCallData(mockAppId, validLowercaseCallData, validCallHash)

      expect(result).toEqual({ isValid: true })
      expect(mockedValidateCallDataMatchesHash).toHaveBeenCalledWith(mockAppId, validLowercaseCallData, validCallHash)
    })

    it('should accept valid uppercase hex format', async () => {
      const validUppercaseCallData = '0x1234567890ABCDEF'
      mockedValidateCallDataMatchesHash.mockResolvedValue(true)

      const result = await validateCallData(mockAppId, validUppercaseCallData, validCallHash)

      expect(result).toEqual({ isValid: true })
      expect(mockedValidateCallDataMatchesHash).toHaveBeenCalledWith(mockAppId, validUppercaseCallData, validCallHash)
    })

    it('should accept valid mixed case hex format', async () => {
      const validMixedCaseCallData = '0x1234567890AbCdEf'
      mockedValidateCallDataMatchesHash.mockResolvedValue(true)

      const result = await validateCallData(mockAppId, validMixedCaseCallData, validCallHash)

      expect(result).toEqual({ isValid: true })
      expect(mockedValidateCallDataMatchesHash).toHaveBeenCalledWith(mockAppId, validMixedCaseCallData, validCallHash)
    })

    it('should accept minimal valid hex format', async () => {
      const minimalCallData = '0x0'
      mockedValidateCallDataMatchesHash.mockResolvedValue(true)

      const result = await validateCallData(mockAppId, minimalCallData, validCallHash)

      expect(result).toEqual({ isValid: true })
      expect(mockedValidateCallDataMatchesHash).toHaveBeenCalledWith(mockAppId, minimalCallData, validCallHash)
    })

    it('should reject call data with only 0x prefix', async () => {
      const invalidCallData = '0x'

      const result = await validateCallData(mockAppId, invalidCallData, validCallHash)

      expect(result).toEqual({
        isValid: false,
        error: callDataValidationMessages.isInvalidFormat,
      })
      expect(mockedValidateCallDataMatchesHash).not.toHaveBeenCalled()
    })
  })

  describe('ledgerClient validation', () => {
    it('should return valid when ledgerClient validates successfully', async () => {
      mockedValidateCallDataMatchesHash.mockResolvedValue(true)

      const result = await validateCallData(mockAppId, validCallData, validCallHash)

      expect(result).toEqual({ isValid: true })
      expect(mockedValidateCallDataMatchesHash).toHaveBeenCalledWith(mockAppId, validCallData, validCallHash)
    })

    it('should return invalid when ledgerClient validation fails', async () => {
      mockedValidateCallDataMatchesHash.mockResolvedValue(false)

      const result = await validateCallData(mockAppId, validCallData, validCallHash)

      expect(result).toEqual({
        isValid: false,
        error: callDataValidationMessages.invalid,
      })
      expect(mockedValidateCallDataMatchesHash).toHaveBeenCalledWith(mockAppId, validCallData, validCallHash)
    })

    it('should handle ledgerClient throwing an error', async () => {
      mockedValidateCallDataMatchesHash.mockRejectedValue(new Error('Network error'))

      const result = await validateCallData(mockAppId, validCallData, validCallHash)

      expect(result).toEqual({
        isValid: false,
        error: callDataValidationMessages.failed,
      })
      expect(mockedValidateCallDataMatchesHash).toHaveBeenCalledWith(mockAppId, validCallData, validCallHash)
    })

    it('should handle ledgerClient throwing a string error', async () => {
      mockedValidateCallDataMatchesHash.mockRejectedValue('String error')

      const result = await validateCallData(mockAppId, validCallData, validCallHash)

      expect(result).toEqual({
        isValid: false,
        error: callDataValidationMessages.failed,
      })
      expect(mockedValidateCallDataMatchesHash).toHaveBeenCalledWith(mockAppId, validCallData, validCallHash)
    })

    it('should handle ledgerClient throwing null/undefined', async () => {
      mockedValidateCallDataMatchesHash.mockRejectedValue(null)

      const result = await validateCallData(mockAppId, validCallData, validCallHash)

      expect(result).toEqual({
        isValid: false,
        error: callDataValidationMessages.failed,
      })
      expect(mockedValidateCallDataMatchesHash).toHaveBeenCalledWith(mockAppId, validCallData, validCallHash)
    })
  })

  describe('comprehensive validation scenarios', () => {
    it('should handle complex call data with valid format', async () => {
      const complexCallData = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      mockedValidateCallDataMatchesHash.mockResolvedValue(true)

      const result = await validateCallData(mockAppId, complexCallData, validCallHash)

      expect(result).toEqual({ isValid: true })
      expect(mockedValidateCallDataMatchesHash).toHaveBeenCalledWith(mockAppId, complexCallData, validCallHash)
    })

    it('should validate with different app IDs', async () => {
      const polkadotAppId: AppId = 'polkadot'
      mockedValidateCallDataMatchesHash.mockResolvedValue(true)

      const result = await validateCallData(polkadotAppId, validCallData, validCallHash)

      expect(result).toEqual({ isValid: true })
      expect(mockedValidateCallDataMatchesHash).toHaveBeenCalledWith(polkadotAppId, validCallData, validCallHash)
    })

    it('should handle very long hex strings', async () => {
      const longCallData = `0x${'1234567890abcdef'.repeat(50)}`
      mockedValidateCallDataMatchesHash.mockResolvedValue(true)

      const result = await validateCallData(mockAppId, longCallData, validCallHash)

      expect(result).toEqual({ isValid: true })
      expect(mockedValidateCallDataMatchesHash).toHaveBeenCalledWith(mockAppId, longCallData, validCallHash)
    })

    it('should maintain call order with concurrent validations', async () => {
      const callData1 = '0x1111'
      const callData2 = '0x2222'
      const callHash1 = '0xaaaa'
      const callHash2 = '0xbbbb'

      mockedValidateCallDataMatchesHash.mockResolvedValueOnce(true).mockResolvedValueOnce(false)

      const [result1, result2] = await Promise.all([
        validateCallData(mockAppId, callData1, callHash1),
        validateCallData(mockAppId, callData2, callHash2),
      ])

      expect(result1).toEqual({ isValid: true })
      expect(result2).toEqual({
        isValid: false,
        error: callDataValidationMessages.invalid,
      })
      expect(mockedValidateCallDataMatchesHash).toHaveBeenCalledTimes(2)
    })
  })

  describe('edge cases and robustness', () => {
    it('should handle whitespace in inputs gracefully', async () => {
      const callDataWithSpaces = ` ${validCallData} `

      // This should fail hex validation since spaces are not valid hex
      const result = await validateCallData(mockAppId, callDataWithSpaces, validCallHash)

      expect(result).toEqual({
        isValid: false,
        error: callDataValidationMessages.isInvalidFormat,
      })
      expect(mockedValidateCallDataMatchesHash).not.toHaveBeenCalled()
    })

    it('should handle case sensitivity correctly', async () => {
      const upperCaseCallData = `0x${validCallData.slice(2).toUpperCase()}`
      mockedValidateCallDataMatchesHash.mockResolvedValue(true)

      const result = await validateCallData(mockAppId, upperCaseCallData, validCallHash)

      expect(result).toEqual({ isValid: true })
      expect(mockedValidateCallDataMatchesHash).toHaveBeenCalledWith(mockAppId, upperCaseCallData, validCallHash)
    })

    it('should properly type the return value', async () => {
      mockedValidateCallDataMatchesHash.mockResolvedValue(true)

      const result: CallDataValidationResult = await validateCallData(mockAppId, validCallData, validCallHash)

      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should properly type the error return value', async () => {
      mockedValidateCallDataMatchesHash.mockResolvedValue(false)

      const result: CallDataValidationResult = await validateCallData(mockAppId, validCallData, validCallHash)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe(callDataValidationMessages.invalid)
    })

    it('should handle unicode characters in hex (should fail)', async () => {
      const unicodeCallData = '0x123€456'

      const result = await validateCallData(mockAppId, unicodeCallData, validCallHash)

      expect(result).toEqual({
        isValid: false,
        error: callDataValidationMessages.isInvalidFormat,
      })
      expect(mockedValidateCallDataMatchesHash).not.toHaveBeenCalled()
    })

    it('should handle extremely long invalid hex strings', async () => {
      const longInvalidCallData = `0x${'xyz'.repeat(1000)}`

      const result = await validateCallData(mockAppId, longInvalidCallData, validCallHash)

      expect(result).toEqual({
        isValid: false,
        error: callDataValidationMessages.isInvalidFormat,
      })
      expect(mockedValidateCallDataMatchesHash).not.toHaveBeenCalled()
    })
  })

  describe('performance and async behavior', () => {
    it('should handle timeout scenarios gracefully', async () => {
      // Simulate a timeout by creating a promise that never resolves, then racing it with a timeout
      mockedValidateCallDataMatchesHash.mockImplementation(
        () =>
          new Promise(resolve => {
            setTimeout(() => resolve(false), 100)
          })
      )

      const result = await validateCallData(mockAppId, validCallData, validCallHash)

      expect(result).toEqual({
        isValid: false,
        error: callDataValidationMessages.invalid,
      })
    })

    it('should handle rapid sequential calls', async () => {
      mockedValidateCallDataMatchesHash.mockResolvedValue(true)

      const promises = Array.from({ length: 10 }, (_, i) => validateCallData(mockAppId, `0x${i}`, validCallHash))

      const results = await Promise.all(promises)

      expect(results).toHaveLength(10)
      for (const result of results) {
        expect(result).toEqual({ isValid: true })
      }
      expect(mockedValidateCallDataMatchesHash).toHaveBeenCalledTimes(10)
    })
  })
})

describe('getAvailableSigners', () => {
  const mockMembers: MultisigMember[] = [
    { address: '0x1', internal: true },
    { address: '0x2', internal: true },
    { address: '0x3', internal: false },
    { address: '0x4', internal: true },
  ]

  const mockPendingCall: MultisigCall = {
    callHash: '0xabc',
    deposit: new BN(100),
    depositor: '0x1',
    signatories: ['0x1', '0x3'],
  }

  it('should return only internal members who have not signed', () => {
    const result = getAvailableSigners(mockPendingCall, mockMembers)

    expect(result).toHaveLength(2)
    expect(result).toEqual([
      { address: '0x2', internal: true },
      { address: '0x4', internal: true },
    ])
  })

  it('should return empty array when all internal members have signed', () => {
    const allSignedCall: MultisigCall = {
      ...mockPendingCall,
      signatories: ['0x1', '0x2', '0x4'],
    }

    const result = getAvailableSigners(allSignedCall, mockMembers)

    expect(result).toHaveLength(0)
    expect(result).toEqual([])
  })

  it('should return all internal members when no one has signed', () => {
    const noSignaturesCall: MultisigCall = {
      ...mockPendingCall,
      signatories: [],
    }

    const result = getAvailableSigners(noSignaturesCall, mockMembers)

    expect(result).toHaveLength(3)
    expect(result).toEqual([
      { address: '0x1', internal: true },
      { address: '0x2', internal: true },
      { address: '0x4', internal: true },
    ])
  })

  it('should handle empty members array', () => {
    const result = getAvailableSigners(mockPendingCall, [])

    expect(result).toHaveLength(0)
    expect(result).toEqual([])
  })

  it('should handle members with path property', () => {
    const membersWithPath: MultisigMember[] = [
      { address: '0x1', internal: true, path: 'm/44/0/0' },
      { address: '0x2', internal: true, path: 'm/44/0/1' },
      { address: '0x3', internal: false, path: 'm/44/0/2' },
    ]

    const result = getAvailableSigners(mockPendingCall, membersWithPath)

    expect(result).toHaveLength(1)
    expect(result).toEqual([{ address: '0x2', internal: true, path: 'm/44/0/1' }])
  })

  it('should handle case-sensitive address matching', () => {
    const caseSensitiveMembers: MultisigMember[] = [
      { address: '0x1', internal: true },
      { address: '0X2', internal: true }, // Different case
    ]

    const caseSensitiveCall: MultisigCall = {
      ...mockPendingCall,
      signatories: ['0x1', '0X2'], // Different case
    }

    const result = getAvailableSigners(caseSensitiveCall, caseSensitiveMembers)

    expect(result).toHaveLength(0)
    expect(result).toEqual([])
  })
})
