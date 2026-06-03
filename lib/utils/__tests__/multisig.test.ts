import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MultisigAddress, MultisigCall, MultisigMember } from '@/state/types/ledger'
import { callDataValidationMessages, canMultisigBeSelectedForMigration, getRemainingInternalSigners, validateCallData } from '../multisig'

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

  describe('canMultisigBeSelectedForMigration', () => {
    // Shared with the per-row `isMultisigNotReadyToMigrate` predicate; the
    // select-all handler also reads this so the two surfaces can't drift.
    const makeMultisig = (overrides: Partial<MultisigAddress> = {}): MultisigAddress =>
      ({
        address: 'multisig-address',
        path: '//0',
        pubKey: '0x00',
        threshold: 2,
        members: [
          { address: 'internal', internal: true, path: '//0' },
          { address: 'external', internal: false },
        ],
        pendingMultisigCalls: [],
        ...overrides,
      }) as unknown as MultisigAddress

    it('returns true when there are no pending calls', () => {
      expect(canMultisigBeSelectedForMigration(makeMultisig())).toBe(true)
    })

    it('returns true when a pending call still has an internal signer who has not approved', () => {
      const account = makeMultisig({
        pendingMultisigCalls: [
          {
            callHash: '0xcall',
            deposit: 0 as unknown as MultisigCall['deposit'],
            depositor: 'external',
            signatories: ['external'], // internal has NOT approved yet
          },
        ],
      })
      expect(canMultisigBeSelectedForMigration(account)).toBe(true)
    })

    it('returns false when all pending calls have had every internal signer approve', () => {
      const account = makeMultisig({
        pendingMultisigCalls: [
          {
            callHash: '0xcall',
            deposit: 0 as unknown as MultisigCall['deposit'],
            depositor: 'internal',
            signatories: ['internal'], // internal already signed — no internal remaining
          },
        ],
      })
      expect(canMultisigBeSelectedForMigration(account)).toBe(false)
    })

    it('returns true if at least one pending call still has a remaining internal signer', () => {
      // Two pending calls: one with the internal already signed, one not. The
      // account is still actionable on the second call.
      const account = makeMultisig({
        pendingMultisigCalls: [
          {
            callHash: '0xcall1',
            deposit: 0 as unknown as MultisigCall['deposit'],
            depositor: 'internal',
            signatories: ['internal'],
          },
          {
            callHash: '0xcall2',
            deposit: 0 as unknown as MultisigCall['deposit'],
            depositor: 'external',
            signatories: ['external'],
          },
        ],
      })
      expect(canMultisigBeSelectedForMigration(account)).toBe(true)
    })
  })
})
