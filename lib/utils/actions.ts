import type { AppId } from '@/config/apps'
import { BN } from '@polkadot/util'
import type { Address, AddressBalance, MultisigAddress, MultisigMember } from 'state/types/ledger'
import { type GovernanceActivity } from '../account'
import { canUnstake, hasStakedBalance, isNativeBalance } from './balance'
import { getAvailableSigners, getRemainingInternalSigners, getRemainingSigners } from './multisig'
import { getIdentityItems } from './ui'

export enum PendingActionType {
  UNSTAKE = 'unstake',
  WITHDRAW = 'withdraw',
  IDENTITY = 'identity',
  MULTISIG_CALL = 'multisig-call',
  MULTISIG_TRANSFER = 'multisig-transfer',
  ACCOUNT_INDEX = 'account-index',
  PROXY = 'proxy',
  GOVERNANCE = 'governance',
}

/**
 * Action type definition
 */
export interface PendingAction {
  type: PendingActionType
  label: string
  tooltip?: string
  disabled: boolean
  // Additional data that components might need
  data?: {
    hasRemainingInternalSigners?: boolean
    hasRemainingSigners?: boolean
    hasAvailableSigners?: boolean
    governanceActivity?: GovernanceActivity
  }
}

export interface GetPendingActionsParams {
  account: MultisigAddress | Address
  balance?: AddressBalance
  appId: AppId
  governanceActivity?: GovernanceActivity
  isMultisigAddress?: boolean
}

/**
 * Gets pending actions for an account based on its state.
 * This function analyzes the account's balance, multisig status, governance locks,
 * identity, proxies, and other on-chain data to determine what actions need to be
 * completed before the account can be migrated.
 *
 * @param params - Parameters including account, balance, and governance activity
 * @param params.account - The account to check (can be regular or multisig address)
 * @param params.balance - The account's balance information (optional)
 * @param params.appId - The app/chain identifier
 * @param params.governanceActivity - Governance activity data (optional)
 * @param params.isMultisigAddress - Whether the account is a multisig address
 * @returns Array of pending actions that should be completed before migration
 *
 * @example
 * ```typescript
 * const actions = getPendingActions({
 *   account,
 *   balance,
 *   appId: 'polkadot',
 *   governanceActivity,
 *   isMultisigAddress: true,
 * })
 * // Returns: [{ type: 'unstake', label: 'Unstake', disabled: false, ... }]
 * ```
 */
export function getPendingActions(params: GetPendingActionsParams): PendingAction[] {
  const { account, balance, appId, governanceActivity, isMultisigAddress } = params
  const actions: PendingAction[] = []

  const isNative = isNativeBalance(balance)

  // 1. Unstake action
  const hasStaked: boolean = isNative && hasStakedBalance(balance)
  const isUnstakeAvailable: boolean = isNative ? canUnstake(balance) : false

  if (hasStaked) {
    actions.push({
      type: PendingActionType.UNSTAKE,
      label: 'Unstake',
      tooltip: !isUnstakeAvailable ? 'Only the controller address can unstake this balance' : 'Unlock your staked assets',
      disabled: !isUnstakeAvailable,
    })
  }

  // 2. Withdraw action
  const canWithdraw: boolean = isNative ? (balance?.balance.staking?.unlocking?.some(u => u.canWithdraw) ?? false) : false

  if (canWithdraw) {
    actions.push({
      type: PendingActionType.WITHDRAW,
      label: 'Withdraw',
      tooltip: 'Move your unstaked assets to your available balance',
      disabled: false,
    })
  }

  // 3. Identity action
  if (account.registration?.identity) {
    const identityItems = getIdentityItems(account.registration, appId)
    if (identityItems.length > 0) {
      actions.push({
        type: PendingActionType.IDENTITY,
        label: 'Identity',
        tooltip: account.registration?.canRemove
          ? 'Remove account identity'
          : 'Account identity cannot be removed because it has a parent account',
        disabled: !account.registration?.canRemove,
      })
    }
  }

  // 4. Multisig pending call action
  if (isMultisigAddress && (account as MultisigAddress).pendingMultisigCalls?.length > 0) {
    const pendingCalls = (account as MultisigAddress).pendingMultisigCalls
    const members = (account as MultisigAddress).members

    const hasRemainingInternalSigners = pendingCalls.some(call => getRemainingInternalSigners(call, members).length > 0)
    const hasRemainingSigners = pendingCalls.some(call => getRemainingSigners(call, members).length > 0)
    const hasAvailableSigners = pendingCalls.some(call => getAvailableSigners(call, members).length > 0)

    actions.push({
      type: PendingActionType.MULTISIG_CALL,
      label: 'Multisig Call',
      tooltip: 'Approve multisig pending calls',
      disabled: false,
      data: {
        hasRemainingInternalSigners,
        hasRemainingSigners,
        hasAvailableSigners,
      },
    })
  }

  // 5. Multisig transfer action
  if (isMultisigAddress) {
    const internalMultisigMembers: MultisigMember[] = (account as MultisigAddress).members?.filter(member => member.internal) ?? []

    if (internalMultisigMembers.length > 0) {
      actions.push({
        type: PendingActionType.MULTISIG_TRANSFER,
        label: 'Transfer',
        tooltip: 'Transfer funds to a multisig signatory',
        disabled: false,
      })
    }
  }

  // 6. Account index action
  if (account.index?.index) {
    actions.push({
      type: PendingActionType.ACCOUNT_INDEX,
      label: 'Account Index',
      tooltip: 'Remove account index',
      disabled: false,
    })
  }

  // 7. Proxy action
  const isProxied: boolean = (account.proxy?.proxies.length ?? 0) > 0
  if (isProxied) {
    actions.push({
      type: PendingActionType.PROXY,
      label: 'Proxy',
      tooltip: 'Remove proxy',
      disabled: false,
    })
  }

  // 8. Governance action
  const hasGovernanceLocks = isNative && balance?.balance.convictionVoting?.locked?.gt(new BN(0))

  if (hasGovernanceLocks && governanceActivity) {
    const hasDelegations = governanceActivity.delegations.length > 0
    const hasOngoingVotes = governanceActivity.votes.some(v => v.referendumStatus === 'ongoing')
    const hasUnlockable = governanceActivity.unlockableAmount.gtn(0)

    // Determine button label and tooltip based on governance state
    const getGovernanceLabel = (): { label: string; tooltip: string } => {
      if (hasUnlockable) {
        return {
          label: 'Gov Unlock',
          tooltip: 'Unlock conviction-locked tokens',
        }
      }
      if (hasDelegations) {
        return {
          label: 'Remove Delegation',
          tooltip: 'Remove delegation',
        }
      }
      if (hasOngoingVotes) {
        return {
          label: 'Remove Vote',
          tooltip: 'Remove Votes (Ongoing Referenda)',
        }
      }
      return {
        label: 'Manage Governance',
        tooltip: 'Manage governance locks and unlock conviction-locked tokens',
      }
    }

    const { label, tooltip } = getGovernanceLabel()

    actions.push({
      type: PendingActionType.GOVERNANCE,
      label,
      tooltip,
      disabled: false,
      data: {
        governanceActivity,
      },
    })
  }

  return actions
}

/**
 * Checks if an account has any pending actions that should trigger a warning.
 *
 * This function identifies accounts with any pending actions. While these accounts CAN still be migrated,
 * a warning should be displayed to the user as these pending actions may result in incomplete migration
 * or insufficient balance for transaction fees.
 *
 * This is a convenience function that uses `getPendingActions()` internally but only returns
 * a boolean. If you need the actual list of actions, call `getPendingActions()` directly.
 *
 * @param params - Parameters including account, balance, and app info
 * @returns `true` if the account has any pending actions, `false` otherwise
 *
 * @example
 * ```typescript
 * // Check if account has any pending actions
 * const hasActions = hasPendingActions({
 *   account,
 *   balance,
 *   appId: 'polkadot',
 *   isMultisigAddress: true,
 * })
 *
 * // Or get the full list of actions when you need details
 * const actions = getPendingActions({ account, balance, appId })
 * actions.forEach(action => {
 *   console.log(action.label, action.tooltip)
 * })
 * ```
 */
export function hasPendingActions(params: GetPendingActionsParams): boolean {
  return getPendingActions(params).length > 0
}
