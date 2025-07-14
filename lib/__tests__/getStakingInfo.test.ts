import type { ApiPromise } from '@polkadot/api'
import type { GenericAccountId } from '@polkadot/types'
import type { AccountId32, StakingLedger } from '@polkadot/types/interfaces'
import type { u32 } from '@polkadot/types-codec'
import { BN } from '@polkadot/util'
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { getStakingInfo } from '../account'

// Helper to create mock Option
function mockOption<T>(value: T | undefined) {
  return {
    isSome: value !== undefined,
    isEmpty: value === undefined,
    unwrap: () => value as T,
    toHuman: () => value as T,
  }
}

// Minimal mock type for the parts of ApiPromise
type StakingQueryMock = {
  bonded: Mock
  ledger: Mock
  currentEra: Mock
}
type ApiPromiseMock = {
  query: {
    staking: StakingQueryMock
  }
}

describe('getStakingInfo', () => {
  let mockApi: ApiPromiseMock

  beforeEach(() => {
    mockApi = {
      query: {
        staking: {
          bonded: vi.fn(),
          ledger: vi.fn(),
          currentEra: vi.fn(),
        },
      },
    }
  })

  it('returns undefined if no controller (not bonded)', async () => {
    mockApi.query.staking.bonded.mockResolvedValue(mockOption<AccountId32>(undefined))
    const result = await getStakingInfo('address', mockApi as unknown as ApiPromise, 'polkadot')
    expect(result).toBeUndefined()
  })

  it('returns undefined if no staking ledger', async () => {
    mockApi.query.staking.bonded.mockResolvedValue(mockOption<AccountId32>('controllerAddress' as unknown as GenericAccountId))
    mockApi.query.staking.ledger.mockResolvedValue(mockOption<StakingLedger>(undefined))
    const result = await getStakingInfo('address', mockApi as unknown as ApiPromise, 'polkadot')
    expect(result).toBeUndefined()
  })

  it('returns staking info with unlocking chunks and canUnstake', async () => {
    const mockStakingInfo = {
      controller: 'controllerAddress',
      unlocking: [
        { value: 50, era: 10 },
        { value: 25, era: 12 },
      ],
      active: new BN(100),
      total: new BN(200),
    }
    mockApi.query.staking.bonded.mockResolvedValue(mockOption<AccountId32>(mockStakingInfo.controller as unknown as GenericAccountId))
    mockApi.query.staking.ledger.mockResolvedValue(
      mockOption<StakingLedger>({
        active: { toString: () => mockStakingInfo.active.toString() },
        total: { toString: () => mockStakingInfo.total.toString() },
        unlocking: mockStakingInfo.unlocking.map(chunk => ({
          value: { toString: () => chunk.value.toString() },
          era: { toString: () => chunk.era.toString() },
        })),
      } as any)
    )
    mockApi.query.staking.currentEra.mockResolvedValue(mockOption<u32>({ toString: () => '8' } as any))
    const result = await getStakingInfo('address', mockApi as unknown as ApiPromise, 'polkadot')
    expect(result).toMatchObject({
      controller: mockStakingInfo.controller,
      canUnstake: false,
      active: mockStakingInfo.active,
      total: mockStakingInfo.total,
      unlocking: mockStakingInfo.unlocking.map(chunk => ({
        value: new BN(chunk.value),
        era: chunk.era,
        timeRemaining: expect.any(String),
      })),
    })
  })

  it('sets canUnstake true if controller is the same as address', async () => {
    const mockAddress = 'address'
    mockApi.query.staking.bonded.mockResolvedValue(mockOption<AccountId32>(mockAddress as unknown as GenericAccountId))
    mockApi.query.staking.ledger.mockResolvedValue(
      mockOption<StakingLedger>({
        active: { toString: () => '1' },
        total: { toString: () => '2' },
        unlocking: [],
      } as any)
    )
    mockApi.query.staking.currentEra.mockResolvedValue(mockOption<u32>({ toString: () => '0' } as any))
    const result = await getStakingInfo(mockAddress, mockApi as unknown as ApiPromise, 'polkadot')
    expect(result?.canUnstake).toBe(true)
  })
})
