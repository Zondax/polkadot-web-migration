import type { BN } from '@polkadot/util'
import { Conviction } from 'state/types/ledger'

/**
 * Maps conviction enum to multiplier value
 */
export const CONVICTION_MULTIPLIERS: Record<Conviction, number> = {
  [Conviction.None]: 0.1,
  [Conviction.Locked1x]: 1,
  [Conviction.Locked2x]: 2,
  [Conviction.Locked3x]: 3,
  [Conviction.Locked4x]: 4,
  [Conviction.Locked5x]: 5,
  [Conviction.Locked6x]: 6,
}

/**
 * Maps conviction enum to lock periods (in number of enactment periods)
 */
export const CONVICTION_LOCK_PERIODS: Record<Conviction, number> = {
  [Conviction.None]: 0,
  [Conviction.Locked1x]: 1,
  [Conviction.Locked2x]: 2,
  [Conviction.Locked3x]: 4,
  [Conviction.Locked4x]: 8,
  [Conviction.Locked5x]: 16,
  [Conviction.Locked6x]: 32,
}

/**
 * Calculates the effective voting power based on conviction
 * @param balance The balance amount
 * @param conviction The conviction level
 * @returns The effective voting power
 */
export function calculateVotingPower(balance: BN, conviction: Conviction): BN {
  const multiplier = CONVICTION_MULTIPLIERS[conviction]
  return balance.muln(multiplier * 10).divn(10) // Handle decimal multiplier
}

/**
 * Gets a human-readable description of the conviction lock period
 * @param conviction The conviction level
 * @param enactmentPeriodDays The number of days in an enactment period
 * @returns Human-readable lock period description
 */
export function getConvictionLockDescription(conviction: Conviction, enactmentPeriodDays = 28): string {
  const lockPeriods = CONVICTION_LOCK_PERIODS[conviction]

  if (lockPeriods === 0) {
    return 'No lock period'
  }

  const totalDays = lockPeriods * enactmentPeriodDays

  if (totalDays < 30) {
    return `${totalDays} days`
  }
  if (totalDays < 365) {
    const months = Math.round(totalDays / 30)
    return `~${months} month${months > 1 ? 's' : ''}`
  }
  const years = Math.round(totalDays / 365)
  return `~${years} year${years > 1 ? 's' : ''}`
}

/**
 * Checks if a conviction lock has expired
 * @param unlockAt The block number when the lock expires
 * @param currentBlock The current block number
 * @returns True if the lock has expired
 */
export function isConvictionLockExpired(unlockAt: number, currentBlock: number): boolean {
  return currentBlock >= unlockAt
}

/**
 * Groups votes by track ID for easier processing
 * @param votes Array of vote information
 * @returns Map of track ID to votes
 */
export function groupVotesByTrack(votes: Array<{ referendumIndex: number; trackId?: number }>) {
  const votesByTrack = new Map<number, number[]>()

  for (const vote of votes) {
    const trackId = vote.trackId || 0 // Default to track 0 if not specified
    if (!votesByTrack.has(trackId)) {
      votesByTrack.set(trackId, [])
    }
    votesByTrack.get(trackId)?.push(vote.referendumIndex)
  }

  return votesByTrack
}
