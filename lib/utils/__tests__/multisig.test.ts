import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MultisigCall, MultisigMember } from '@/state/types/ledger'
import { callDataValidationMessages, getRemainingInternalSigners, validateCallData } from '../multisig'

// Mock the ledger client
vi.mock('@/state/client/ledger', () => ({
  ledgerClient: {
    validateCallDataMatchesHash: vi.fn(),
  },
}))

describe('Multisig Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('callDataValidationMessages', () => {
    it('should have all required validation messages', () => {
      expect(callDataValidationMessages.correct).toBe('Call data matches the expected hash ✓')
      expect(callDataValidationMessages.invalid).toBe('Call data does not match the expected hash ✗')
      expect(callDataValidationMessages.validating).toBe('Validating...')
      expect(callDataValidationMessages.failed).toBe('Failed to validate call data')
      expect(callDataValidationMessages.isRequired).toBe('Call data is required')
      expect(callDataValidationMessages.isInvalidFormat).toBe('Call data must be a valid hex string starting with 0x')
    })
  })

  describe('validateCallData', () => {
    it('should return valid for empty call data', async () => {
      const result = await validateCallData('polkadot', '', '0x123')
      expect(result).toEqual({ isValid: true })
    })

    it('should return valid for empty call hash', async () => {
      const result = await validateCallData('polkadot', '0x123', '')
      expect(result).toEqual({ isValid: true })
    })

    it('should return valid for both empty values', async () => {
      const result = await validateCallData('polkadot', '', '')
      expect(result).toEqual({ isValid: true })
    })

    it('should return invalid for call data not starting with 0x', async () => {
      const result = await validateCallData('polkadot', '123abc', '0x456def')
      expect(result).toEqual({
        isValid: false,
        error: callDataValidationMessages.isInvalidFormat,
      })
    })

    it('should return invalid for call data with invalid hex characters', async () => {
      const result = await validateCallData('polkadot', '0x123xyz', '0x456def')
      expect(result).toEqual({
        isValid: false,
        error: callDataValidationMessages.isInvalidFormat,
      })
    })

    it('should return valid when ledger client validates successfully', async () => {
      const { ledgerClient } = await import('@/state/client/ledger')
      vi.mocked(ledgerClient.validateCallDataMatchesHash).mockResolvedValueOnce(true)

      const result = await validateCallData('polkadot', '0x123abc', '0x456def')

      expect(ledgerClient.validateCallDataMatchesHash).toHaveBeenCalledWith('polkadot', '0x123abc', '0x456def')
      expect(result).toEqual({ isValid: true })
    })

    it('should return invalid when ledger client validation fails', async () => {
      const { ledgerClient } = await import('@/state/client/ledger')
      vi.mocked(ledgerClient.validateCallDataMatchesHash).mockResolvedValueOnce(false)

      const result = await validateCallData('polkadot', '0x123abc', '0x456def')

      expect(result).toEqual({
        isValid: false,
        error: callDataValidationMessages.invalid,
      })
    })

    it('should return error when ledger client throws exception', async () => {
      const { ledgerClient } = await import('@/state/client/ledger')
      vi.mocked(ledgerClient.validateCallDataMatchesHash).mockRejectedValueOnce(new Error('Network error'))

      const result = await validateCallData('polkadot', '0x123abc', '0x456def')

      expect(result).toEqual({
        isValid: false,
        error: callDataValidationMessages.failed,
      })
    })

    it('should handle different app IDs', async () => {
      const { ledgerClient } = await import('@/state/client/ledger')
      vi.mocked(ledgerClient.validateCallDataMatchesHash).mockResolvedValueOnce(true)

      await validateCallData('kusama', '0x123abc', '0x456def')

      expect(ledgerClient.validateCallDataMatchesHash).toHaveBeenCalledWith('kusama', '0x123abc', '0x456def')
    })

    it('should handle uppercase hex characters', async () => {
      const { ledgerClient } = await import('@/state/client/ledger')
      vi.mocked(ledgerClient.validateCallDataMatchesHash).mockResolvedValueOnce(true)

      const result = await validateCallData('polkadot', '0x123ABC', '0x456DEF')

      expect(result).toEqual({ isValid: true })
    })

    it('should handle mixed case hex characters', async () => {
      const { ledgerClient } = await import('@/state/client/ledger')
      vi.mocked(ledgerClient.validateCallDataMatchesHash).mockResolvedValueOnce(true)

      const result = await validateCallData('polkadot', '0x123aBc', '0x456dEf')

      expect(result).toEqual({ isValid: true })
    })

    it('should handle very long hex strings', async () => {
      const { ledgerClient } = await import('@/state/client/ledger')
      vi.mocked(ledgerClient.validateCallDataMatchesHash).mockResolvedValueOnce(true)

      const longHex = `0x${'a'.repeat(1000)}`
      const result = await validateCallData('polkadot', longHex, '0x456def')

      expect(result).toEqual({ isValid: true })
    })
  })

  describe('getRemainingInternalSigners', () => {
    const createMultisigMember = (address: string, internal: boolean): MultisigMember => ({
      address,
      internal,
    })

    const createMultisigCall = (signatories: string[]): MultisigCall => ({
      signatories,
      callHash: '0x123',
      callData: '',
      threshold: 2,
      when: { height: 1000, index: 1 },
      depositor: 'depositor',
      deposit: '1000',
      approvals: [],
    })

    it('should return internal members who have not signed', () => {
      const members: MultisigMember[] = [
        createMultisigMember('alice', true),
        createMultisigMember('bob', true),
        createMultisigMember('charlie', false),
        createMultisigMember('dave', true),
      ]

      const pendingCall = createMultisigCall(['alice'])

      const result = getRemainingInternalSigners(pendingCall, members)

      expect(result).toEqual([createMultisigMember('bob', true), createMultisigMember('dave', true)])
    })

    it('should return empty array when all internal members have signed', () => {
      const members: MultisigMember[] = [
        createMultisigMember('alice', true),
        createMultisigMember('bob', true),
        createMultisigMember('charlie', false),
      ]

      const pendingCall = createMultisigCall(['alice', 'bob'])

      const result = getRemainingInternalSigners(pendingCall, members)

      expect(result).toEqual([])
    })

    it('should return all internal members when no one has signed', () => {
      const members: MultisigMember[] = [
        createMultisigMember('alice', true),
        createMultisigMember('bob', true),
        createMultisigMember('charlie', false),
        createMultisigMember('dave', true),
      ]

      const pendingCall = createMultisigCall([])

      const result = getRemainingInternalSigners(pendingCall, members)

      expect(result).toEqual([createMultisigMember('alice', true), createMultisigMember('bob', true), createMultisigMember('dave', true)])
    })

    it('should handle empty members array', () => {
      const members: MultisigMember[] = []
      const pendingCall = createMultisigCall(['alice'])

      const result = getRemainingInternalSigners(pendingCall, members)

      expect(result).toEqual([])
    })

    it('should handle undefined signatories', () => {
      const members: MultisigMember[] = [createMultisigMember('alice', true), createMultisigMember('bob', true)]

      const pendingCall: MultisigCall = {
        signatories: undefined as any,
        callHash: '0x123',
        callData: '',
        threshold: 2,
        when: { height: 1000, index: 1 },
        depositor: 'depositor',
        deposit: '1000',
        approvals: [],
      }

      const result = getRemainingInternalSigners(pendingCall, members)

      expect(result).toEqual([createMultisigMember('alice', true), createMultisigMember('bob', true)])
    })

    it('should exclude external members even if they have not signed', () => {
      const members: MultisigMember[] = [
        createMultisigMember('alice', true),
        createMultisigMember('bob', false), // External member
        createMultisigMember('charlie', true),
      ]

      const pendingCall = createMultisigCall([])

      const result = getRemainingInternalSigners(pendingCall, members)

      expect(result).toEqual([createMultisigMember('alice', true), createMultisigMember('charlie', true)])
    })

    it('should handle partial address matches correctly', () => {
      const members: MultisigMember[] = [
        createMultisigMember('alice123', true),
        createMultisigMember('alice', true),
        createMultisigMember('bob', true),
      ]

      const pendingCall = createMultisigCall(['alice'])

      const result = getRemainingInternalSigners(pendingCall, members)

      expect(result).toEqual([createMultisigMember('alice123', true), createMultisigMember('bob', true)])
    })

    it('should be case sensitive for addresses', () => {
      const members: MultisigMember[] = [
        createMultisigMember('Alice', true),
        createMultisigMember('alice', true),
        createMultisigMember('bob', true),
      ]

      const pendingCall = createMultisigCall(['alice'])

      const result = getRemainingInternalSigners(pendingCall, members)

      expect(result).toEqual([createMultisigMember('Alice', true), createMultisigMember('bob', true)])
    })
  })
})
