import type { Address, AddressBalance, MultisigAddress, MultisigCall, MultisigMember } from '@/state/types/ledger'
import { ActionType, BalanceType, type NativeBalance } from '@/state/types/ledger'
import { BN } from '@polkadot/util'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildPendingActions, getPendingActions, hasPendingActions } from '../actions'

// Mock the dependencies
vi.mock('../balance', () => ({
  isNativeBalance: vi.fn((balance?: AddressBalance) => {
    return Boolean(balance && balance.type === BalanceType.NATIVE)
  }),
  hasStakedBalance: vi.fn((balance?: NativeBalance) => {
    if (!balance || !balance.balance.staking) return false
    return Boolean(balance.balance.staking?.total?.gt(new BN(0)))
  }),
  canUnstake: vi.fn((balance?: NativeBalance) => {
    if (!balance || !balance.balance.staking) return false
    return Boolean(balance.balance.staking?.canUnstake && balance.balance.staking.active?.gt(new BN(0)))
  }),
}))

vi.mock('../multisig', () => ({
  getRemainingInternalSigners: vi.fn((call: MultisigCall, members: MultisigMember[]) => {
    const existingApprovals = call.signatories
    return members.filter(member => member.internal && !existingApprovals?.includes(member.address))
  }),
  getRemainingSigners: vi.fn((call: MultisigCall, members: MultisigMember[]) => {
    const existingApprovals = call.signatories
    return members.filter(member => !existingApprovals?.includes(member.address))
  }),
  getAvailableSigners: vi.fn((call: MultisigCall, members: MultisigMember[]) => {
    const existingApprovals = call.signatories
    return members.filter(member => member.internal && !existingApprovals?.includes(member.address))
  }),
}))

vi.mock('../ui', () => ({
  getIdentityItems: vi.fn((registration, _appId) => {
    if (!registration?.identity) return []
    // Return mock items based on identity data
    const items = []
    if (registration.identity.display) items.push({ label: 'Display name', value: registration.identity.display })
    if (registration.identity.legal) items.push({ label: 'Legal name', value: registration.identity.legal })
    return items
  }),
}))

describe('actions utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPendingActions', () => {
    const createNativeBalance = (overrides?: Partial<NativeBalance>): NativeBalance => ({
      type: BalanceType.NATIVE,
      balance: {
        free: new BN(1000),
        reserved: { total: new BN(100) },
        frozen: new BN(50),
        total: new BN(1100),
        transferable: new BN(950),
      },
      ...overrides,
    })

    const createAddress = (overrides?: Partial<Address>): Address => ({
      address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      path: '//0',
      pubKey: '0x000',
      balances: [],
      ...overrides,
    })

    const createMultisigAddress = (overrides?: Partial<MultisigAddress>): MultisigAddress => ({
      address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      path: '//0',
      pubKey: '0x000',
      balances: [],
      members: [],
      threshold: 2,
      pendingMultisigCalls: [],
      ...overrides,
    })

    describe('unstake action', () => {
      it('should add unstake action when account has staked balance and can unstake', () => {
        const balance = createNativeBalance({
          balance: {
            free: new BN(1000),
            reserved: { total: new BN(100) },
            frozen: new BN(50),
            total: new BN(1100),
            transferable: new BN(950),
            staking: {
              total: new BN(500),
              active: new BN(500),
              canUnstake: true,
            },
          },
        })

        const account = createAddress({
          balances: [balance],
        })

        const actionTypes = getPendingActions({ account, appId: 'polkadot' })
        expect(actionTypes).toContain(ActionType.UNSTAKE)

        const actions = buildPendingActions(actionTypes, { account, appId: 'polkadot' })
        const unstakeAction = actions.find(a => a.type === ActionType.UNSTAKE)
        expect(unstakeAction).toBeDefined()
        expect(unstakeAction?.disabled).toBe(false)
        expect(unstakeAction?.label).toBe('Unstake')
        expect(unstakeAction?.tooltip).toBe('Unlock your staked assets')
      })

      it('should add disabled unstake action when account has staked balance but cannot unstake', () => {
        const balance = createNativeBalance({
          balance: {
            free: new BN(1000),
            reserved: { total: new BN(100) },
            frozen: new BN(50),
            total: new BN(1100),
            transferable: new BN(950),
            staking: {
              total: new BN(500),
              active: new BN(500),
              canUnstake: false,
            },
          },
        })

        const account = createAddress({
          balances: [balance],
        })

        const actionTypes = getPendingActions({ account, appId: 'polkadot' })
        expect(actionTypes).toContain(ActionType.UNSTAKE)

        const actions = buildPendingActions(actionTypes, { account, appId: 'polkadot' })
        const unstakeAction = actions.find(a => a.type === ActionType.UNSTAKE)
        expect(unstakeAction).toBeDefined()
        expect(unstakeAction?.disabled).toBe(true)
        expect(unstakeAction?.tooltip).toBe('Only the controller address can unstake this balance')
      })

      it('should not add unstake action when account has no staked balance', () => {
        const balance = createNativeBalance()
        const account = createAddress({
          balances: [balance],
        })

        const actionTypes = getPendingActions({ account, appId: 'polkadot' })
        expect(actionTypes).not.toContain(ActionType.UNSTAKE)
      })

      it('should not add unstake action when balance is undefined', () => {
        const account = createAddress()
        const actionTypes = getPendingActions({ account, appId: 'polkadot' })
        expect(actionTypes).not.toContain(ActionType.UNSTAKE)
      })
    })

    describe('withdraw action', () => {
      it('should add withdraw action when account has unlocking funds that can be withdrawn', () => {
        const balance = createNativeBalance({
          balance: {
            free: new BN(1000),
            reserved: { total: new BN(100) },
            frozen: new BN(50),
            total: new BN(1100),
            transferable: new BN(950),
            staking: {
              canUnstake: false,
              unlocking: [{ value: new BN(100), era: 10, timeRemaining: '1 day', canWithdraw: true }],
            },
          },
        })

        const account = createAddress({
          balances: [balance],
        })

        const actionTypes = getPendingActions({ account, appId: 'polkadot' })
        expect(actionTypes).toContain(ActionType.WITHDRAW)

        const actions = buildPendingActions(actionTypes, { account, appId: 'polkadot' })
        const withdrawAction = actions.find(a => a.type === ActionType.WITHDRAW)
        expect(withdrawAction).toBeDefined()
        expect(withdrawAction?.disabled).toBe(false)
        expect(withdrawAction?.label).toBe('Withdraw')
        expect(withdrawAction?.tooltip).toBe('Move your unstaked assets to your available balance')
      })

      it('should not add withdraw action when unlocking funds cannot be withdrawn yet', () => {
        const balance = createNativeBalance({
          balance: {
            free: new BN(1000),
            reserved: { total: new BN(100) },
            frozen: new BN(50),
            total: new BN(1100),
            transferable: new BN(950),
            staking: {
              canUnstake: false,
              unlocking: [{ value: new BN(100), era: 10, timeRemaining: '1 day', canWithdraw: false }],
            },
          },
        })

        const account = createAddress({
          balances: [balance],
        })

        const actionTypes = getPendingActions({ account, appId: 'polkadot' })
        expect(actionTypes).not.toContain(ActionType.WITHDRAW)
      })

      it('should not add withdraw action when there are no unlocking funds', () => {
        const balance = createNativeBalance()
        const account = createAddress({
          balances: [balance],
        })

        const actionTypes = getPendingActions({ account, appId: 'polkadot' })
        expect(actionTypes).not.toContain(ActionType.WITHDRAW)
      })
    })

    describe('identity action', () => {
      it('should add identity action when account has identity and can remove it', () => {
        const balance = createNativeBalance()
        const account = createAddress({
          balances: [balance],
          registration: {
            canRemove: true,
            identity: {
              display: 'Alice',
            },
          },
        })

        const actionTypes = getPendingActions({ account, appId: 'polkadot' })
        expect(actionTypes).toContain(ActionType.IDENTITY)

        const actions = buildPendingActions(actionTypes, { account, appId: 'polkadot' })
        const identityAction = actions.find(a => a.type === ActionType.IDENTITY)
        expect(identityAction).toBeDefined()
        expect(identityAction?.disabled).toBe(false)
        expect(identityAction?.label).toBe('Identity')
        expect(identityAction?.tooltip).toBe('Remove account identity')
      })

      it('should add disabled identity action when account has identity but cannot remove it', () => {
        const balance = createNativeBalance()
        const account = createAddress({
          balances: [balance],
          registration: {
            canRemove: false,
            identity: {
              display: 'Alice',
            },
          },
        })

        const actionTypes = getPendingActions({ account, appId: 'polkadot' })
        expect(actionTypes).toContain(ActionType.IDENTITY)

        const actions = buildPendingActions(actionTypes, { account, appId: 'polkadot' })
        const identityAction = actions.find(a => a.type === ActionType.IDENTITY)
        expect(identityAction).toBeDefined()
        expect(identityAction?.disabled).toBe(true)
        expect(identityAction?.tooltip).toBe('Account identity cannot be removed because it has a parent account')
      })

      it('should not add identity action when account has no identity', () => {
        const balance = createNativeBalance()
        const account = createAddress({
          balances: [balance],
        })

        const actionTypes = getPendingActions({ account, appId: 'polkadot' })
        expect(actionTypes).not.toContain(ActionType.IDENTITY)
      })

      it('should not add identity action when identity has no items', () => {
        const balance = createNativeBalance()
        const account = createAddress({
          balances: [balance],
          registration: {
            canRemove: true,
            identity: {},
          },
        })

        const actionTypes = getPendingActions({ account, appId: 'polkadot' })
        expect(actionTypes).not.toContain(ActionType.IDENTITY)
      })
    })

    describe('multisig-call action', () => {
      it('should add multisig-call action when multisig has pending calls', () => {
        const multisig = createMultisigAddress({
          members: [
            { address: 'alice', internal: true },
            { address: 'bob', internal: false },
          ],
          pendingMultisigCalls: [
            {
              callHash: 'hash1',
              depositor: 'alice',
              signatories: ['alice'],
              deposit: new BN(100),
            },
          ],
        })

        const actionTypes = getPendingActions({ account: multisig, appId: 'polkadot', isMultisigAddress: true })
        expect(actionTypes).toContain(ActionType.MULTISIG_CALL)

        const actions = buildPendingActions(actionTypes, { account: multisig, appId: 'polkadot', isMultisigAddress: true })
        const multisigCallAction = actions.find(a => a.type === ActionType.MULTISIG_CALL)
        expect(multisigCallAction).toBeDefined()
        expect(multisigCallAction?.disabled).toBe(false)
        expect(multisigCallAction?.label).toBe('Multisig Call')
        expect(multisigCallAction?.tooltip).toBe('Approve multisig pending calls')
      })

      it('should not add multisig-call action when multisig has no pending calls', () => {
        const multisig = createMultisigAddress({
          pendingMultisigCalls: [],
        })

        const actionTypes = getPendingActions({ account: multisig, appId: 'polkadot', isMultisigAddress: true })
        expect(actionTypes).not.toContain(ActionType.MULTISIG_CALL)
      })

      it('should not add multisig-call action for non-multisig addresses', () => {
        const account = createAddress()
        const actionTypes = getPendingActions({ account, appId: 'polkadot', isMultisigAddress: false })
        expect(actionTypes).not.toContain(ActionType.MULTISIG_CALL)
      })
    })

    describe('account-index action', () => {
      it('should add account-index action when account has an index', () => {
        const account = createAddress({
          index: {
            index: 'ABC',
            deposit: new BN(100),
          },
        })

        const actionTypes = getPendingActions({ account, appId: 'polkadot' })
        expect(actionTypes).toContain(ActionType.ACCOUNT_INDEX)

        const actions = buildPendingActions(actionTypes, { account, appId: 'polkadot' })
        const indexAction = actions.find(a => a.type === ActionType.ACCOUNT_INDEX)
        expect(indexAction).toBeDefined()
        expect(indexAction?.disabled).toBe(false)
        expect(indexAction?.label).toBe('Account Index')
        expect(indexAction?.tooltip).toBe('Remove account index')
      })

      it('should not add account-index action when account has no index', () => {
        const account = createAddress()
        const actionTypes = getPendingActions({ account, appId: 'polkadot' })
        expect(actionTypes).not.toContain(ActionType.ACCOUNT_INDEX)
      })

      it('should not add account-index action when index is empty string', () => {
        const account = createAddress({
          index: {
            index: '',
            deposit: new BN(100),
          },
        })

        const actionTypes = getPendingActions({ account, appId: 'polkadot' })
        expect(actionTypes).not.toContain(ActionType.ACCOUNT_INDEX)
      })
    })

    describe('proxy action', () => {
      it('should add proxy action when account has proxies', () => {
        const account = createAddress({
          proxy: {
            proxies: [{ address: 'alice', type: 'Any', delay: 0 }],
            deposit: new BN(100),
          },
        })

        const actionTypes = getPendingActions({ account, appId: 'polkadot' })
        expect(actionTypes).toContain(ActionType.PROXY)

        const actions = buildPendingActions(actionTypes, { account, appId: 'polkadot' })
        const proxyAction = actions.find(a => a.type === ActionType.PROXY)
        expect(proxyAction).toBeDefined()
        expect(proxyAction?.disabled).toBe(false)
        expect(proxyAction?.label).toBe('Proxy')
        expect(proxyAction?.tooltip).toBe('Remove proxy')
      })

      it('should not add proxy action when account has no proxies', () => {
        const account = createAddress()
        const actionTypes = getPendingActions({ account, appId: 'polkadot' })
        expect(actionTypes).not.toContain(ActionType.PROXY)
      })

      it('should not add proxy action when proxy array is empty', () => {
        const account = createAddress({
          proxy: {
            proxies: [],
            deposit: new BN(100),
          },
        })

        const actionTypes = getPendingActions({ account, appId: 'polkadot' })
        expect(actionTypes).not.toContain(ActionType.PROXY)
      })

      it('should add proxy action when account has multiple proxies', () => {
        const account = createAddress({
          proxy: {
            proxies: [
              { address: 'alice', type: 'Any', delay: 0 },
              { address: 'bob', type: 'Staking', delay: 0 },
            ],
            deposit: new BN(100),
          },
        })

        const actionTypes = getPendingActions({ account, appId: 'polkadot' })
        expect(actionTypes).toContain(ActionType.PROXY)
      })
    })

    describe('governance action', () => {
      it('should add governance action with unlock label when there are unlockable tokens', () => {
        const balance = createNativeBalance({
          balance: {
            free: new BN(1000),
            reserved: { total: new BN(100) },
            frozen: new BN(50),
            total: new BN(1100),
            transferable: new BN(950),
            convictionVoting: {
              votes: [],
              delegations: [],
              unlockableAmount: new BN(500),
              totalLocked: new BN(500),
            },
          },
        })

        const account = createAddress({
          balances: [balance],
        })

        const actionTypes = getPendingActions({ account, appId: 'polkadot' })
        expect(actionTypes).toContain(ActionType.GOVERNANCE)

        const actions = buildPendingActions(actionTypes, { account, appId: 'polkadot' })
        const govAction = actions.find(a => a.type === ActionType.GOVERNANCE)
        expect(govAction).toBeDefined()
        expect(govAction?.disabled).toBe(false)
        expect(govAction?.label).toBe('Gov Unlock')
        expect(govAction?.tooltip).toBe('Unlock conviction-locked tokens')
      })

      it('should add governance action with delegation label when there are delegations', () => {
        const balance = createNativeBalance({
          balance: {
            free: new BN(1000),
            reserved: { total: new BN(100) },
            frozen: new BN(50),
            total: new BN(1100),
            transferable: new BN(950),
            convictionVoting: {
              votes: [],
              delegations: [{ target: 'alice', conviction: 'Locked1x' as any, balance: new BN(1000), trackId: 0, canUndelegate: true }],
              unlockableAmount: new BN(0),
              totalLocked: new BN(500),
            },
          },
        })

        const account = createAddress({
          balances: [balance],
        })

        const actionTypes = getPendingActions({ account, appId: 'polkadot' })
        expect(actionTypes).toContain(ActionType.GOVERNANCE)

        const actions = buildPendingActions(actionTypes, { account, appId: 'polkadot' })
        const govAction = actions.find(a => a.type === ActionType.GOVERNANCE)
        expect(govAction).toBeDefined()
        expect(govAction?.label).toBe('Remove Delegation')
        expect(govAction?.tooltip).toBe('Remove delegation')
      })

      it('should add governance action with remove vote label when there are ongoing votes', () => {
        const balance = createNativeBalance({
          balance: {
            free: new BN(1000),
            reserved: { total: new BN(100) },
            frozen: new BN(50),
            total: new BN(1100),
            transferable: new BN(950),
            convictionVoting: {
              votes: [
                {
                  trackId: 0,
                  referendumIndex: 1,
                  vote: { aye: true, conviction: 'Locked1x' as any, balance: new BN(100) },
                  referendumStatus: 'ongoing',
                  canRemoveVote: true,
                },
              ],
              delegations: [],
              unlockableAmount: new BN(0),
              totalLocked: new BN(500),
            },
          },
        })

        const account = createAddress({
          balances: [balance],
        })

        const actionTypes = getPendingActions({ account, appId: 'polkadot' })
        expect(actionTypes).toContain(ActionType.GOVERNANCE)

        const actions = buildPendingActions(actionTypes, { account, appId: 'polkadot' })
        const govAction = actions.find(a => a.type === ActionType.GOVERNANCE)
        expect(govAction).toBeDefined()
        expect(govAction?.label).toBe('Remove Vote')
        expect(govAction?.tooltip).toBe('Remove Votes (Ongoing Referenda)')
      })

      it('should not add governance action when there are no governance locks', () => {
        const balance = createNativeBalance({
          balance: {
            free: new BN(1000),
            reserved: { total: new BN(100) },
            frozen: new BN(50),
            total: new BN(1100),
            transferable: new BN(950),
            convictionVoting: {
              votes: [],
              delegations: [],
              unlockableAmount: new BN(0),
              totalLocked: new BN(0),
            },
          },
        })

        const account = createAddress({
          balances: [balance],
        })

        const actionTypes = getPendingActions({ account, appId: 'polkadot' })
        expect(actionTypes).not.toContain(ActionType.GOVERNANCE)
      })

      it('should not add governance action when convictionVoting is not provided', () => {
        const balance = createNativeBalance()
        const account = createAddress({
          balances: [balance],
        })

        const actionTypes = getPendingActions({ account, appId: 'polkadot' })
        expect(actionTypes).not.toContain(ActionType.GOVERNANCE)
      })
    })

    describe('complex scenarios', () => {
      it('should return empty array when account has no pending actions', () => {
        const account = createAddress()
        const actionTypes = getPendingActions({ account, appId: 'polkadot' })
        expect(actionTypes).toEqual([])
      })

      it('should return multiple pending actions when account has multiple issues', () => {
        const balance = createNativeBalance({
          balance: {
            free: new BN(1000),
            reserved: { total: new BN(100) },
            frozen: new BN(50),
            total: new BN(1100),
            transferable: new BN(950),
            staking: {
              total: new BN(500),
              active: new BN(500),
              canUnstake: true,
              unlocking: [{ value: new BN(100), era: 10, timeRemaining: '1 day', canWithdraw: true }],
            },
            convictionVoting: {
              votes: [],
              delegations: [],
              unlockableAmount: new BN(500),
              totalLocked: new BN(500),
            },
          },
        })

        const account = createAddress({
          balances: [balance],
          registration: {
            canRemove: true,
            identity: { display: 'Alice' },
          },
          index: {
            index: 'ABC',
            deposit: new BN(100),
          },
          proxy: {
            proxies: [{ address: 'alice', type: 'Any', delay: 0 }],
            deposit: new BN(100),
          },
        })

        const actionTypes = getPendingActions({ account, appId: 'polkadot' })
        expect(actionTypes).toContain(ActionType.UNSTAKE)
        expect(actionTypes).toContain(ActionType.WITHDRAW)
        expect(actionTypes).toContain(ActionType.IDENTITY)
        expect(actionTypes).toContain(ActionType.ACCOUNT_INDEX)
        expect(actionTypes).toContain(ActionType.PROXY)
        expect(actionTypes).toContain(ActionType.GOVERNANCE)
      })
    })
  })

  describe('hasPendingActions', () => {
    it('should return false when there are no pending actions', () => {
      const result = hasPendingActions([])
      expect(result).toBe(false)
    })

    it('should return false when pendingActions is undefined', () => {
      const result = hasPendingActions(undefined)
      expect(result).toBe(false)
    })

    it('should return true when there are pending actions', () => {
      const result = hasPendingActions([ActionType.UNSTAKE])
      expect(result).toBe(true)
    })

    it('should return true when there are multiple pending actions', () => {
      const result = hasPendingActions([ActionType.UNSTAKE, ActionType.WITHDRAW, ActionType.GOVERNANCE])
      expect(result).toBe(true)
    })
  })
})
