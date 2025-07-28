import type { ApiPromise } from '@polkadot/api'
import { BN } from '@polkadot/util'
import { Conviction } from 'state/types/ledger'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getConvictionVotingInfo,
  prepareRemoveVoteTransaction,
  prepareUndelegateTransaction,
  prepareUnlockConvictionTransaction,
} from '../account'

// Mock the API
vi.mock('@polkadot/api', () => ({
  ApiPromise: vi.fn(),
  WsProvider: vi.fn(),
}))

describe('Governance Functions', () => {
  let mockApi: any

  beforeEach(() => {
    mockApi = {
      query: {
        convictionVoting: {
          votingFor: vi.fn(),
          classLocksFor: vi.fn(),
        },
      },
      consts: {
        referenda: {
          tracks: [[0], [1], [2]], // Mock 3 tracks
        },
      },
      tx: {
        convictionVoting: {
          removeVote: vi.fn(),
          undelegate: vi.fn(),
          unlock: vi.fn(),
        },
      },
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getConvictionVotingInfo', () => {
    it('should return undefined if convictionVoting pallet is not available', async () => {
      mockApi.query.convictionVoting = undefined
      const result = await getConvictionVotingInfo('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', mockApi as ApiPromise)
      expect(result).toBeUndefined()
    })

    it('should return empty info when no votes or delegations exist', async () => {
      // Mock empty voting info
      mockApi.query.convictionVoting.votingFor.mockResolvedValue({
        isDelegating: false,
        isCasting: false,
      })
      mockApi.query.convictionVoting.classLocksFor.mockResolvedValue([])

      const result = await getConvictionVotingInfo('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', mockApi as ApiPromise)

      expect(result).toEqual({
        votes: [],
        delegations: [],
        locked: new BN(0),
        classLocks: [],
      })
    })

    it('should correctly parse delegation info', async () => {
      // Mock delegation for track 0
      mockApi.query.convictionVoting.votingFor.mockImplementation((_address: string, trackId: number) => {
        if (trackId === 0) {
          return Promise.resolve({
            isDelegating: true,
            isCasting: false,
            asDelegating: {
              target: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
              conviction: { toString: () => 'Locked3x' },
              balance: { toString: () => '1000000000000' },
              prior: [{ toNumber: () => 100 }],
            },
          })
        }
        return Promise.resolve({ isDelegating: false, isCasting: false })
      })

      mockApi.query.convictionVoting.classLocksFor.mockResolvedValue([[{ toNumber: () => 0 }, { toString: () => '1000000000000' }]])

      const result = await getConvictionVotingInfo('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', mockApi as ApiPromise)

      expect(result?.delegations).toHaveLength(1)
      expect(result?.delegations[0]).toEqual({
        target: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
        conviction: Conviction.Locked3x,
        balance: new BN('1000000000000'),
        lockPeriod: 100,
      })
      expect(result?.locked.toString()).toBe('1000000000000')
    })

    it('should correctly parse vote info', async () => {
      // Mock votes for track 1
      mockApi.query.convictionVoting.votingFor.mockImplementation((_address: string, trackId: number) => {
        if (trackId === 1) {
          return Promise.resolve({
            isDelegating: false,
            isCasting: true,
            asCasting: {
              votes: [
                [
                  { toNumber: () => 42 },
                  {
                    asStandard: {
                      vote: {
                        isAye: true,
                        conviction: { toString: () => 'Locked2x' },
                      },
                      balance: { toString: () => '500000000000' },
                    },
                  },
                ],
              ],
            },
          })
        }
        return Promise.resolve({ isDelegating: false, isCasting: false })
      })

      mockApi.query.convictionVoting.classLocksFor.mockResolvedValue([])

      const result = await getConvictionVotingInfo('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', mockApi as ApiPromise)

      expect(result?.votes).toHaveLength(1)
      expect(result?.votes[0]).toEqual({
        referendumIndex: 42,
        vote: {
          aye: true,
          conviction: Conviction.Locked2x,
          balance: new BN('500000000000'),
        },
      })
    })
  })

  describe('prepareRemoveVoteTransaction', () => {
    it('should prepare a remove vote transaction', async () => {
      const mockTx = { method: 'removeVote' }
      mockApi.tx.convictionVoting.removeVote.mockReturnValue(mockTx)

      const result = await prepareRemoveVoteTransaction(mockApi as ApiPromise, 1, 42)

      expect(mockApi.tx.convictionVoting.removeVote).toHaveBeenCalledWith(1, 42)
      expect(result).toBe(mockTx)
    })
  })

  describe('prepareUndelegateTransaction', () => {
    it('should prepare an undelegate transaction', async () => {
      const mockTx = { method: 'undelegate' }
      mockApi.tx.convictionVoting.undelegate.mockReturnValue(mockTx)

      const result = await prepareUndelegateTransaction(mockApi as ApiPromise, 2)

      expect(mockApi.tx.convictionVoting.undelegate).toHaveBeenCalledWith(2)
      expect(result).toBe(mockTx)
    })
  })

  describe('prepareUnlockConvictionTransaction', () => {
    it('should prepare an unlock transaction', async () => {
      const mockTx = { method: 'unlock' }
      mockApi.tx.convictionVoting.unlock.mockReturnValue(mockTx)

      const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
      const result = await prepareUnlockConvictionTransaction(mockApi as ApiPromise, address, 0)

      expect(mockApi.tx.convictionVoting.unlock).toHaveBeenCalledWith(0, address)
      expect(result).toBe(mockTx)
    })
  })
})
