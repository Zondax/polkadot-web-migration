import { BN } from '@polkadot/util'
import { describe, expect, it } from 'vitest'
import { Conviction } from 'state/types/ledger'
import {
  CONVICTION_LOCK_PERIODS,
  CONVICTION_MULTIPLIERS,
  calculateVotingPower,
  getConvictionLockDescription,
  groupVotesByTrack,
  isConvictionLockExpired,
} from '../governance'

describe('Governance Utilities', () => {
  describe('CONVICTION_MULTIPLIERS', () => {
    it('should have correct multiplier values', () => {
      expect(CONVICTION_MULTIPLIERS[Conviction.None]).toBe(0.1)
      expect(CONVICTION_MULTIPLIERS[Conviction.Locked1x]).toBe(1)
      expect(CONVICTION_MULTIPLIERS[Conviction.Locked2x]).toBe(2)
      expect(CONVICTION_MULTIPLIERS[Conviction.Locked3x]).toBe(3)
      expect(CONVICTION_MULTIPLIERS[Conviction.Locked4x]).toBe(4)
      expect(CONVICTION_MULTIPLIERS[Conviction.Locked5x]).toBe(5)
      expect(CONVICTION_MULTIPLIERS[Conviction.Locked6x]).toBe(6)
    })
  })

  describe('CONVICTION_LOCK_PERIODS', () => {
    it('should have correct lock period values', () => {
      expect(CONVICTION_LOCK_PERIODS[Conviction.None]).toBe(0)
      expect(CONVICTION_LOCK_PERIODS[Conviction.Locked1x]).toBe(1)
      expect(CONVICTION_LOCK_PERIODS[Conviction.Locked2x]).toBe(2)
      expect(CONVICTION_LOCK_PERIODS[Conviction.Locked3x]).toBe(4)
      expect(CONVICTION_LOCK_PERIODS[Conviction.Locked4x]).toBe(8)
      expect(CONVICTION_LOCK_PERIODS[Conviction.Locked5x]).toBe(16)
      expect(CONVICTION_LOCK_PERIODS[Conviction.Locked6x]).toBe(32)
    })
  })

  describe('calculateVotingPower', () => {
    it('should calculate voting power correctly for None conviction', () => {
      const balance = new BN('1000000000000') // 1000 tokens
      const power = calculateVotingPower(balance, Conviction.None)
      expect(power.toString()).toBe('100000000000') // 0.1x
    })

    it('should calculate voting power correctly for Locked1x conviction', () => {
      const balance = new BN('1000000000000')
      const power = calculateVotingPower(balance, Conviction.Locked1x)
      expect(power.toString()).toBe('1000000000000') // 1x
    })

    it('should calculate voting power correctly for Locked6x conviction', () => {
      const balance = new BN('1000000000000')
      const power = calculateVotingPower(balance, Conviction.Locked6x)
      expect(power.toString()).toBe('6000000000000') // 6x
    })
  })

  describe('getConvictionLockDescription', () => {
    it('should return "No lock period" for None conviction', () => {
      expect(getConvictionLockDescription(Conviction.None)).toBe('No lock period')
    })

    it('should return days for short lock periods', () => {
      expect(getConvictionLockDescription(Conviction.Locked1x)).toBe('28 days')
    })

    it('should return months for medium lock periods', () => {
      expect(getConvictionLockDescription(Conviction.Locked2x)).toBe('~2 months')
      expect(getConvictionLockDescription(Conviction.Locked3x)).toBe('~4 months')
    })

    it('should return years for long lock periods', () => {
      expect(getConvictionLockDescription(Conviction.Locked5x)).toBe('~1 year')
      expect(getConvictionLockDescription(Conviction.Locked6x)).toBe('~2 years')
    })

    it('should use custom enactment period', () => {
      expect(getConvictionLockDescription(Conviction.Locked1x, 7)).toBe('7 days')
      expect(getConvictionLockDescription(Conviction.Locked2x, 7)).toBe('14 days')
    })
  })

  describe('isConvictionLockExpired', () => {
    it('should return true when current block is past unlock block', () => {
      expect(isConvictionLockExpired(1000, 1001)).toBe(true)
      expect(isConvictionLockExpired(1000, 1000)).toBe(true)
    })

    it('should return false when current block is before unlock block', () => {
      expect(isConvictionLockExpired(1000, 999)).toBe(false)
    })
  })

  describe('groupVotesByTrack', () => {
    it('should group votes by track ID', () => {
      const votes = [
        { referendumIndex: 1, trackId: 0 },
        { referendumIndex: 2, trackId: 0 },
        { referendumIndex: 3, trackId: 1 },
        { referendumIndex: 4, trackId: 2 },
        { referendumIndex: 5, trackId: 1 },
      ]

      const grouped = groupVotesByTrack(votes)

      expect(grouped.get(0)).toEqual([1, 2])
      expect(grouped.get(1)).toEqual([3, 5])
      expect(grouped.get(2)).toEqual([4])
    })

    it('should default to track 0 when trackId is not specified', () => {
      const votes = [
        { referendumIndex: 1 },
        { referendumIndex: 2, trackId: 1 },
        { referendumIndex: 3 },
      ]

      const grouped = groupVotesByTrack(votes)

      expect(grouped.get(0)).toEqual([1, 3])
      expect(grouped.get(1)).toEqual([2])
    })
  })
})