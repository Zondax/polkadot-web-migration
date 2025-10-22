import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BN } from '@polkadot/util'
import type { Address, AddressBalance, MultisigAddress, MultisigCall, MultisigMember } from '@/state/types/ledger'
import { BalanceType, type NativeBalance } from '@/state/types/ledger'
import { getPendingActions, hasPendingActions, type GovernanceActivity, type PendingAction } from '../actions'

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
      id: 'native',
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
      balances: [],
      ...overrides,
    })

    const createMultisigAddress = (overrides?: Partial<MultisigAddress>): MultisigAddress => ({
      address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      balances: [],
      members: [],
      threshold: 2,
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

        const account = createAddress()
        const actions = getPendingActions({
          account,
          balance,
          appId: 'polkadot',
        })

        const unstakeAction = actions.find(a => a.type === 'unstake')
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

        const account = createAddress()
        const actions = getPendingActions({
          account,
          balance,
          appId: 'polkadot',
        })

        const unstakeAction = actions.find(a => a.type === 'unstake')
        expect(unstakeAction).toBeDefined()
        expect(unstakeAction?.disabled).toBe(true)
        expect(unstakeAction?.tooltip).toBe('Only the controller address can unstake this balance')
      })

      it('should not add unstake action when account has no staked balance', () => {
        const balance = createNativeBalance()
        const account = createAddress()

        const actions = getPendingActions({
          account,
          balance,
          appId: 'polkadot',
        })

        const unstakeAction = actions.find(a => a.type === 'unstake')
        expect(unstakeAction).toBeUndefined()
      })

      it('should not add unstake action when balance is undefined', () => {
        const account = createAddress()

        const actions = getPendingActions({
          account,
          appId: 'polkadot',
        })

        const unstakeAction = actions.find(a => a.type === 'unstake')
        expect(unstakeAction).toBeUndefined()
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
              total: new BN(500),
              active: new BN(500),
              canUnstake: true,
              unlocking: [
                {
                  value: new BN(100),
                  era: 100,
                  canWithdraw: true,
                },
              ],
            },
          },
        })

        const account = createAddress()
        const actions = getPendingActions({
          account,
          balance,
          appId: 'polkadot',
        })

        const withdrawAction = actions.find(a => a.type === 'withdraw')
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
              total: new BN(500),
              active: new BN(500),
              canUnstake: true,
              unlocking: [
                {
                  value: new BN(100),
                  era: 100,
                  canWithdraw: false,
                },
              ],
            },
          },
        })

        const account = createAddress()
        const actions = getPendingActions({
          account,
          balance,
          appId: 'polkadot',
        })

        const withdrawAction = actions.find(a => a.type === 'withdraw')
        expect(withdrawAction).toBeUndefined()
      })

      it('should not add withdraw action when there are no unlocking funds', () => {
        const balance = createNativeBalance()
        const account = createAddress()

        const actions = getPendingActions({
          account,
          balance,
          appId: 'polkadot',
        })

        const withdrawAction = actions.find(a => a.type === 'withdraw')
        expect(withdrawAction).toBeUndefined()
      })
    })

    describe('identity action', () => {
      it('should add identity action when account has identity and can remove it', () => {
        const account = createAddress({
          registration: {
            identity: {
              display: 'Test User',
              legal: 'Test Legal Name',
            },
            canRemove: true,
          },
        })

        const actions = getPendingActions({
          account,
          appId: 'polkadot',
        })

        const identityAction = actions.find(a => a.type === 'identity')
        expect(identityAction).toBeDefined()
        expect(identityAction?.disabled).toBe(false)
        expect(identityAction?.label).toBe('Identity')
        expect(identityAction?.tooltip).toBe('Remove account identity')
      })

      it('should add disabled identity action when account has identity but cannot remove it', () => {
        const account = createAddress({
          registration: {
            identity: {
              display: 'Test User',
              parent: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
            },
            canRemove: false,
          },
        })

        const actions = getPendingActions({
          account,
          appId: 'polkadot',
        })

        const identityAction = actions.find(a => a.type === 'identity')
        expect(identityAction).toBeDefined()
        expect(identityAction?.disabled).toBe(true)
        expect(identityAction?.tooltip).toBe('Account identity cannot be removed because it has a parent account')
      })

      it('should not add identity action when account has no identity', () => {
        const account = createAddress()

        const actions = getPendingActions({
          account,
          appId: 'polkadot',
        })

        const identityAction = actions.find(a => a.type === 'identity')
        expect(identityAction).toBeUndefined()
      })

      it('should not add identity action when identity has no items', () => {
        const account = createAddress({
          registration: {
            identity: {},
            canRemove: true,
          },
        })

        const actions = getPendingActions({
          account,
          appId: 'polkadot',
        })

        const identityAction = actions.find(a => a.type === 'identity')
        expect(identityAction).toBeUndefined()
      })
    })

    describe('multisig-call action', () => {
      const createMultisigCall = (overrides?: Partial<MultisigCall>): MultisigCall => ({
        signatories: [],
        callHash: '0x123',
        callData: '',
        threshold: 2,
        when: { height: 1000, index: 1 },
        depositor: 'depositor',
        deposit: '1000',
        approvals: [],
        ...overrides,
      })

      const createMember = (address: string, internal: boolean): MultisigMember => ({
        address,
        internal,
      })

      it('should add multisig-call action when multisig has pending calls', () => {
        const members = [createMember('alice', true), createMember('bob', true), createMember('charlie', false)]

        const account = createMultisigAddress({
          members,
          pendingMultisigCalls: [createMultisigCall({ signatories: ['alice'] })],
        })

        const actions = getPendingActions({
          account,
          appId: 'polkadot',
          isMultisigAddress: true,
        })

        const multisigCallAction = actions.find(a => a.type === 'multisig-call')
        expect(multisigCallAction).toBeDefined()
        expect(multisigCallAction?.disabled).toBe(false)
        expect(multisigCallAction?.label).toBe('Multisig Call')
        expect(multisigCallAction?.tooltip).toBe('Approve multisig pending calls')
        expect(multisigCallAction?.data?.hasRemainingInternalSigners).toBe(true)
        expect(multisigCallAction?.data?.hasRemainingSigners).toBe(true)
        expect(multisigCallAction?.data?.hasAvailableSigners).toBe(true)
      })

      it('should not add multisig-call action when multisig has no pending calls', () => {
        const members = [createMember('alice', true), createMember('bob', true)]

        const account = createMultisigAddress({
          members,
          pendingMultisigCalls: [],
        })

        const actions = getPendingActions({
          account,
          appId: 'polkadot',
          isMultisigAddress: true,
        })

        const multisigCallAction = actions.find(a => a.type === 'multisig-call')
        expect(multisigCallAction).toBeUndefined()
      })

      it('should not add multisig-call action for non-multisig addresses', () => {
        const account = createAddress()

        const actions = getPendingActions({
          account,
          appId: 'polkadot',
          isMultisigAddress: false,
        })

        const multisigCallAction = actions.find(a => a.type === 'multisig-call')
        expect(multisigCallAction).toBeUndefined()
      })

      it('should handle multisig with multiple pending calls', () => {
        const members = [createMember('alice', true), createMember('bob', true), createMember('charlie', false)]

        const account = createMultisigAddress({
          members,
          pendingMultisigCalls: [
            createMultisigCall({ signatories: ['alice'], callHash: '0x123' }),
            createMultisigCall({ signatories: ['bob'], callHash: '0x456' }),
          ],
        })

        const actions = getPendingActions({
          account,
          appId: 'polkadot',
          isMultisigAddress: true,
        })

        const multisigCallAction = actions.find(a => a.type === 'multisig-call')
        expect(multisigCallAction).toBeDefined()
      })
    })

    describe('multisig-transfer action', () => {
      const createMember = (address: string, internal: boolean): MultisigMember => ({
        address,
        internal,
      })

      it('should add multisig-transfer action when multisig has internal members', () => {
        const members = [createMember('alice', true), createMember('bob', true), createMember('charlie', false)]

        const account = createMultisigAddress({
          members,
        })

        const actions = getPendingActions({
          account,
          appId: 'polkadot',
          isMultisigAddress: true,
        })

        const transferAction = actions.find(a => a.type === 'multisig-transfer')
        expect(transferAction).toBeDefined()
        expect(transferAction?.disabled).toBe(false)
        expect(transferAction?.label).toBe('Transfer')
        expect(transferAction?.tooltip).toBe('Transfer funds to a multisig signatory')
      })

      it('should not add multisig-transfer action when multisig has no internal members', () => {
        const members = [createMember('alice', false), createMember('bob', false)]

        const account = createMultisigAddress({
          members,
        })

        const actions = getPendingActions({
          account,
          appId: 'polkadot',
          isMultisigAddress: true,
        })

        const transferAction = actions.find(a => a.type === 'multisig-transfer')
        expect(transferAction).toBeUndefined()
      })

      it('should not add multisig-transfer action for non-multisig addresses', () => {
        const account = createAddress()

        const actions = getPendingActions({
          account,
          appId: 'polkadot',
          isMultisigAddress: false,
        })

        const transferAction = actions.find(a => a.type === 'multisig-transfer')
        expect(transferAction).toBeUndefined()
      })

      it('should not add multisig-transfer action when members array is empty', () => {
        const account = createMultisigAddress({
          members: [],
        })

        const actions = getPendingActions({
          account,
          appId: 'polkadot',
          isMultisigAddress: true,
        })

        const transferAction = actions.find(a => a.type === 'multisig-transfer')
        expect(transferAction).toBeUndefined()
      })
    })

    describe('account-index action', () => {
      it('should add account-index action when account has an index', () => {
        const account = createAddress({
          index: {
            index: '123',
          },
        })

        const actions = getPendingActions({
          account,
          appId: 'polkadot',
        })

        const indexAction = actions.find(a => a.type === 'account-index')
        expect(indexAction).toBeDefined()
        expect(indexAction?.disabled).toBe(false)
        expect(indexAction?.label).toBe('Account Index')
        expect(indexAction?.tooltip).toBe('Remove account index')
      })

      it('should not add account-index action when account has no index', () => {
        const account = createAddress()

        const actions = getPendingActions({
          account,
          appId: 'polkadot',
        })

        const indexAction = actions.find(a => a.type === 'account-index')
        expect(indexAction).toBeUndefined()
      })

      it('should not add account-index action when index is empty string', () => {
        const account = createAddress({
          index: {
            index: '',
          },
        })

        const actions = getPendingActions({
          account,
          appId: 'polkadot',
        })

        const indexAction = actions.find(a => a.type === 'account-index')
        expect(indexAction).toBeUndefined()
      })
    })

    describe('proxy action', () => {
      it('should add proxy action when account has proxies', () => {
        const account = createAddress({
          proxy: {
            proxies: [
              {
                delegate: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
                proxyType: 'Any',
                delay: 0,
              },
            ],
            reserved: new BN(1000),
          },
        })

        const actions = getPendingActions({
          account,
          appId: 'polkadot',
        })

        const proxyAction = actions.find(a => a.type === 'proxy')
        expect(proxyAction).toBeDefined()
        expect(proxyAction?.disabled).toBe(false)
        expect(proxyAction?.label).toBe('Proxy')
        expect(proxyAction?.tooltip).toBe('Remove proxy')
      })

      it('should not add proxy action when account has no proxies', () => {
        const account = createAddress()

        const actions = getPendingActions({
          account,
          appId: 'polkadot',
        })

        const proxyAction = actions.find(a => a.type === 'proxy')
        expect(proxyAction).toBeUndefined()
      })

      it('should not add proxy action when proxy array is empty', () => {
        const account = createAddress({
          proxy: {
            proxies: [],
            reserved: new BN(0),
          },
        })

        const actions = getPendingActions({
          account,
          appId: 'polkadot',
        })

        const proxyAction = actions.find(a => a.type === 'proxy')
        expect(proxyAction).toBeUndefined()
      })

      it('should add proxy action when account has multiple proxies', () => {
        const account = createAddress({
          proxy: {
            proxies: [
              {
                delegate: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
                proxyType: 'Any',
                delay: 0,
              },
              {
                delegate: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
                proxyType: 'Staking',
                delay: 0,
              },
            ],
            reserved: new BN(2000),
          },
        })

        const actions = getPendingActions({
          account,
          appId: 'polkadot',
        })

        const proxyAction = actions.find(a => a.type === 'proxy')
        expect(proxyAction).toBeDefined()
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
              locked: new BN(500),
            },
          },
        })

        const governanceActivity: GovernanceActivity = {
          delegations: [],
          votes: [],
          unlockableAmount: new BN(500),
        }

        const account = createAddress()
        const actions = getPendingActions({
          account,
          balance,
          appId: 'polkadot',
          governanceActivity,
        })

        const govAction = actions.find(a => a.type === 'governance')
        expect(govAction).toBeDefined()
        expect(govAction?.disabled).toBe(false)
        expect(govAction?.label).toBe('Gov Unlock')
        expect(govAction?.tooltip).toBe('Unlock conviction-locked tokens')
        expect(govAction?.data?.governanceActivity).toEqual(governanceActivity)
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
              locked: new BN(500),
            },
          },
        })

        const governanceActivity: GovernanceActivity = {
          delegations: [{ target: 'alice', conviction: 'Locked1x', balance: '1000' }],
          votes: [],
          unlockableAmount: new BN(0),
        }

        const account = createAddress()
        const actions = getPendingActions({
          account,
          balance,
          appId: 'polkadot',
          governanceActivity,
        })

        const govAction = actions.find(a => a.type === 'governance')
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
              locked: new BN(500),
            },
          },
        })

        const governanceActivity: GovernanceActivity = {
          delegations: [],
          votes: [{ referendumStatus: 'ongoing' }],
          unlockableAmount: new BN(0),
        }

        const account = createAddress()
        const actions = getPendingActions({
          account,
          balance,
          appId: 'polkadot',
          governanceActivity,
        })

        const govAction = actions.find(a => a.type === 'governance')
        expect(govAction).toBeDefined()
        expect(govAction?.label).toBe('Remove Vote')
        expect(govAction?.tooltip).toBe('Remove Votes (Ongoing Referenda)')
      })

      it('should add governance action with generic label when governance locks exist but no specific actions', () => {
        const balance = createNativeBalance({
          balance: {
            free: new BN(1000),
            reserved: { total: new BN(100) },
            frozen: new BN(50),
            total: new BN(1100),
            transferable: new BN(950),
            convictionVoting: {
              locked: new BN(500),
            },
          },
        })

        const governanceActivity: GovernanceActivity = {
          delegations: [],
          votes: [{ referendumStatus: 'completed' }],
          unlockableAmount: new BN(0),
        }

        const account = createAddress()
        const actions = getPendingActions({
          account,
          balance,
          appId: 'polkadot',
          governanceActivity,
        })

        const govAction = actions.find(a => a.type === 'governance')
        expect(govAction).toBeDefined()
        expect(govAction?.label).toBe('Manage Governance')
        expect(govAction?.tooltip).toBe('Manage governance locks and unlock conviction-locked tokens')
      })

      it('should not add governance action when there are no governance locks', () => {
        const balance = createNativeBalance()
        const governanceActivity: GovernanceActivity = {
          delegations: [],
          votes: [],
          unlockableAmount: new BN(0),
        }

        const account = createAddress()
        const actions = getPendingActions({
          account,
          balance,
          appId: 'polkadot',
          governanceActivity,
        })

        const govAction = actions.find(a => a.type === 'governance')
        expect(govAction).toBeUndefined()
      })

      it('should not add governance action when governanceActivity is not provided', () => {
        const balance = createNativeBalance({
          balance: {
            free: new BN(1000),
            reserved: { total: new BN(100) },
            frozen: new BN(50),
            total: new BN(1100),
            transferable: new BN(950),
            convictionVoting: {
              locked: new BN(500),
            },
          },
        })

        const account = createAddress()
        const actions = getPendingActions({
          account,
          balance,
          appId: 'polkadot',
        })

        const govAction = actions.find(a => a.type === 'governance')
        expect(govAction).toBeUndefined()
      })

      it('should prioritize unlock over other governance actions', () => {
        const balance = createNativeBalance({
          balance: {
            free: new BN(1000),
            reserved: { total: new BN(100) },
            frozen: new BN(50),
            total: new BN(1100),
            transferable: new BN(950),
            convictionVoting: {
              locked: new BN(500),
            },
          },
        })

        const governanceActivity: GovernanceActivity = {
          delegations: [{ target: 'alice' }],
          votes: [{ referendumStatus: 'ongoing' }],
          unlockableAmount: new BN(500), // Has unlockable amount
        }

        const account = createAddress()
        const actions = getPendingActions({
          account,
          balance,
          appId: 'polkadot',
          governanceActivity,
        })

        const govAction = actions.find(a => a.type === 'governance')
        expect(govAction?.label).toBe('Gov Unlock') // Should prioritize unlock
      })
    })

    describe('complex scenarios', () => {
      it('should return empty array when account has no pending actions', () => {
        const account = createAddress()

        const actions = getPendingActions({
          account,
          appId: 'polkadot',
        })

        expect(actions).toEqual([])
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
            },
            convictionVoting: {
              locked: new BN(500),
            },
          },
        })

        const governanceActivity: GovernanceActivity = {
          delegations: [],
          votes: [],
          unlockableAmount: new BN(500),
        }

        const account = createAddress({
          registration: {
            identity: {
              display: 'Test User',
            },
            canRemove: true,
          },
          index: {
            index: '123',
          },
          proxy: {
            proxies: [
              {
                delegate: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
                proxyType: 'Any',
                delay: 0,
              },
            ],
            reserved: new BN(1000),
          },
        })

        const actions = getPendingActions({
          account,
          balance,
          appId: 'polkadot',
          governanceActivity,
        })

        expect(actions.length).toBeGreaterThan(1)
        expect(actions.find(a => a.type === 'unstake')).toBeDefined()
        expect(actions.find(a => a.type === 'identity')).toBeDefined()
        expect(actions.find(a => a.type === 'account-index')).toBeDefined()
        expect(actions.find(a => a.type === 'proxy')).toBeDefined()
        expect(actions.find(a => a.type === 'governance')).toBeDefined()
      })

      it('should handle multisig with all types of actions', () => {
        const createMember = (address: string, internal: boolean): MultisigMember => ({
          address,
          internal,
        })

        const createMultisigCall = (): MultisigCall => ({
          signatories: [],
          callHash: '0x123',
          callData: '',
          threshold: 2,
          when: { height: 1000, index: 1 },
          depositor: 'depositor',
          deposit: '1000',
          approvals: [],
        })

        const members = [createMember('alice', true), createMember('bob', true)]

        const account = createMultisigAddress({
          members,
          pendingMultisigCalls: [createMultisigCall()],
          registration: {
            identity: {
              display: 'Multisig Account',
            },
            canRemove: true,
          },
          index: {
            index: '456',
          },
        })

        const actions = getPendingActions({
          account,
          appId: 'polkadot',
          isMultisigAddress: true,
        })

        expect(actions.find(a => a.type === 'multisig-call')).toBeDefined()
        expect(actions.find(a => a.type === 'multisig-transfer')).toBeDefined()
        expect(actions.find(a => a.type === 'identity')).toBeDefined()
        expect(actions.find(a => a.type === 'account-index')).toBeDefined()
      })

      it('should preserve action order correctly', () => {
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
              unlocking: [
                {
                  value: new BN(100),
                  era: 100,
                  canWithdraw: true,
                },
              ],
            },
            convictionVoting: {
              locked: new BN(500),
            },
          },
        })

        const governanceActivity: GovernanceActivity = {
          delegations: [],
          votes: [],
          unlockableAmount: new BN(500),
        }

        const account = createAddress({
          registration: {
            identity: {
              display: 'Test User',
            },
            canRemove: true,
          },
          index: {
            index: '123',
          },
          proxy: {
            proxies: [
              {
                delegate: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
                proxyType: 'Any',
                delay: 0,
              },
            ],
            reserved: new BN(1000),
          },
        })

        const actions = getPendingActions({
          account,
          balance,
          appId: 'polkadot',
          governanceActivity,
        })

        // Expected order: unstake, withdraw, identity, account-index, proxy, governance
        const actionTypes = actions.map(a => a.type)
        const expectedOrder = ['unstake', 'withdraw', 'identity', 'account-index', 'proxy', 'governance']

        expect(actionTypes).toEqual(expectedOrder)
      })
    })

    describe('edge cases', () => {
      it('should handle null values gracefully', () => {
        const account = createAddress({
          registration: undefined,
          index: undefined,
          proxy: undefined,
        })

        const actions = getPendingActions({
          account,
          appId: 'polkadot',
        })

        expect(actions).toEqual([])
      })

      it('should handle different app IDs correctly', () => {
        const account = createAddress({
          registration: {
            identity: {
              display: 'Test User',
            },
            canRemove: true,
          },
        })

        const polkadotActions = getPendingActions({
          account,
          appId: 'polkadot',
        })

        const kusamaActions = getPendingActions({
          account,
          appId: 'kusama',
        })

        expect(polkadotActions.length).toEqual(kusamaActions.length)
      })

      it('should handle zero BN values correctly in governance', () => {
        const balance = createNativeBalance({
          balance: {
            free: new BN(1000),
            reserved: { total: new BN(100) },
            frozen: new BN(50),
            total: new BN(1100),
            transferable: new BN(950),
            convictionVoting: {
              locked: new BN(0), // Zero locked amount
            },
          },
        })

        const governanceActivity: GovernanceActivity = {
          delegations: [],
          votes: [],
          unlockableAmount: new BN(500),
        }

        const account = createAddress()
        const actions = getPendingActions({
          account,
          balance,
          appId: 'polkadot',
          governanceActivity,
        })

        const govAction = actions.find(a => a.type === 'governance')
        expect(govAction).toBeUndefined() // Should not add governance action when locked is 0
      })
    })
  })

  describe('hasPendingActions', () => {
    const createNativeBalance = (overrides?: Partial<NativeBalance>): NativeBalance => ({
      id: 'native',
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
      balances: [],
      ...overrides,
    })

    const createMultisigAddress = (overrides?: Partial<MultisigAddress>): MultisigAddress => ({
      address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      balances: [],
      members: [],
      threshold: 2,
      ...overrides,
    })

    it('should return false when account has no pending actions', () => {
      const account = createAddress()

      const result = hasPendingActions({
        account,
        appId: 'polkadot',
      })

      expect(result).toBe(false)
    })

    it('should return true when account has staked balance', () => {
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

      const account = createAddress()

      const result = hasPendingActions({
        account,
        balance,
        appId: 'polkadot',
      })

      expect(result).toBe(true)
    })

    it('should return true when account has withdrawable funds', () => {
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
            unlocking: [
              {
                value: new BN(100),
                era: 100,
                canWithdraw: true,
              },
            ],
          },
        },
      })

      const account = createAddress()

      const result = hasPendingActions({
        account,
        balance,
        appId: 'polkadot',
      })

      expect(result).toBe(true)
    })

    it('should return true when account has identity', () => {
      const account = createAddress({
        registration: {
          identity: {
            display: 'Test User',
          },
          canRemove: true,
        },
      })

      const result = hasPendingActions({
        account,
        appId: 'polkadot',
      })

      expect(result).toBe(true)
    })

    it('should return true when multisig has pending calls', () => {
      const createMember = (address: string, internal: boolean): MultisigMember => ({
        address,
        internal,
      })

      const createMultisigCall = (): MultisigCall => ({
        signatories: [],
        callHash: '0x123',
        callData: '',
        threshold: 2,
        when: { height: 1000, index: 1 },
        depositor: 'depositor',
        deposit: '1000',
        approvals: [],
      })

      const members = [createMember('alice', true), createMember('bob', true)]

      const account = createMultisigAddress({
        members,
        pendingMultisigCalls: [createMultisigCall()],
      })

      const result = hasPendingActions({
        account,
        appId: 'polkadot',
        isMultisigAddress: true,
      })

      expect(result).toBe(true)
    })

    it('should return true when multisig has internal members', () => {
      const createMember = (address: string, internal: boolean): MultisigMember => ({
        address,
        internal,
      })

      const members = [createMember('alice', true), createMember('bob', false)]

      const account = createMultisigAddress({
        members,
      })

      const result = hasPendingActions({
        account,
        appId: 'polkadot',
        isMultisigAddress: true,
      })

      expect(result).toBe(true)
    })

    it('should return true when account has index', () => {
      const account = createAddress({
        index: {
          index: '123',
        },
      })

      const result = hasPendingActions({
        account,
        appId: 'polkadot',
      })

      expect(result).toBe(true)
    })

    it('should return true when account has proxies', () => {
      const account = createAddress({
        proxy: {
          proxies: [
            {
              delegate: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
              proxyType: 'Any',
              delay: 0,
            },
          ],
          reserved: new BN(1000),
        },
      })

      const result = hasPendingActions({
        account,
        appId: 'polkadot',
      })

      expect(result).toBe(true)
    })

    it('should return true when account has governance locks', () => {
      const balance = createNativeBalance({
        balance: {
          free: new BN(1000),
          reserved: { total: new BN(100) },
          frozen: new BN(50),
          total: new BN(1100),
          transferable: new BN(950),
          convictionVoting: {
            locked: new BN(500),
          },
        },
      })

      const governanceActivity: GovernanceActivity = {
        delegations: [],
        votes: [],
        unlockableAmount: new BN(500),
      }

      const account = createAddress()

      const result = hasPendingActions({
        account,
        balance,
        appId: 'polkadot',
        governanceActivity,
      })

      expect(result).toBe(true)
    })

    it('should match getPendingActions results', () => {
      // Test that hasPendingActions returns the same result as checking getPendingActions length
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
        registration: {
          identity: {
            display: 'Test User',
          },
          canRemove: true,
        },
      })

      const params = {
        account,
        balance,
        appId: 'polkadot' as const,
      }

      const hasActions = hasPendingActions(params)
      const actions = getPendingActions(params)

      expect(hasActions).toBe(actions.length > 0)
      expect(hasActions).toBe(true)
    })

    it('should match getPendingActions when no actions exist', () => {
      const account = createAddress()

      const params = {
        account,
        appId: 'polkadot' as const,
      }

      const hasActions = hasPendingActions(params)
      const actions = getPendingActions(params)

      expect(hasActions).toBe(actions.length > 0)
      expect(hasActions).toBe(false)
    })

    it('should return false when multisig has no internal members', () => {
      const createMember = (address: string, internal: boolean): MultisigMember => ({
        address,
        internal,
      })

      const members = [createMember('alice', false), createMember('bob', false)]

      const account = createMultisigAddress({
        members,
      })

      const result = hasPendingActions({
        account,
        appId: 'polkadot',
        isMultisigAddress: true,
      })

      expect(result).toBe(false)
    })
  })
})
