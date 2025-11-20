import type { AppId } from '@/config/apps'
import { BN } from '@polkadot/util'
import { ActionType, type Address, type MultisigAddress } from 'state/types/ledger'
import { canUnstake, hasStakedBalance, isNativeBalance } from './balance'
import { getAvailableSigners, getRemainingInternalSigners, getRemainingSigners } from './multisig'
import { getIdentityItems } from './ui'
/**
 * Action type definition
 */
export interface PendingAction {
  type: ActionType
  label: string
  tooltip?: string
  disabled: boolean
  // Additional data that components might need
  data?: {
    hasRemainingInternalSigners?: boolean
    hasRemainingSigners?: boolean
    hasAvailableSigners?: boolean
  }
}

export interface GetPendingActionsParams {
  account: MultisigAddress | Address
  appId: AppId
  isMultisigAddress?: boolean
}

/**
 * Determines which action types are pending for an account.
 * This function analyzes the account's state and returns only the types of actions
 * that need to be completed.
 *
 * @param params - Parameters including account and appId
 * @returns Array of action types that are pending
 *
 * @example
 * ```typescript
 * const actionTypes = getPendingActions({
 *   account,
 *   appId: 'polkadot',
 *   isMultisigAddress: true,
 * })
 * // Returns: ['unstake', 'governance']
 * ```
 */
export function getPendingActions(params: GetPendingActionsParams): ActionType[] {
  const { account, isMultisigAddress } = params
  const actionTypes: ActionType[] = []

  const nativeBalance = account.balances?.find(isNativeBalance)

  // 1. Unstake action
  const hasStaked: boolean = Boolean(nativeBalance && hasStakedBalance(nativeBalance))
  if (hasStaked) {
    actionTypes.push(ActionType.UNSTAKE)
  }

  // 2. Withdraw action
  const canWithdraw: boolean = Boolean(nativeBalance?.balance.staking?.unlocking?.some(u => u.canWithdraw))
  if (canWithdraw) {
    actionTypes.push(ActionType.WITHDRAW)
  }

  // 3. Identity action
  if (account.registration?.identity) {
    const identityItems = getIdentityItems(account.registration, params.appId)
    if (identityItems.length > 0) {
      actionTypes.push(ActionType.IDENTITY)
    }
  }

  // 4. Multisig pending call action
  if (isMultisigAddress && (account as MultisigAddress).pendingMultisigCalls?.length > 0) {
    actionTypes.push(ActionType.MULTISIG_CALL)
  }

  // 5. Account index action
  if (account.index?.index) {
    actionTypes.push(ActionType.ACCOUNT_INDEX)
  }

  // 6. Proxy action
  const isProxied: boolean = (account.proxy?.proxies.length ?? 0) > 0
  if (isProxied) {
    actionTypes.push(ActionType.PROXY)
  }

  // 7. Governance action
  // Check governance locks from either governanceActivity or balance.convictionVoting
  let hasGovernanceLocks = false
  const convictionVoting = nativeBalance?.balance.convictionVoting

  if (convictionVoting) {
    // When governanceActivity is provided, also check if there's actually locked balance
    const hasLockedBalance = convictionVoting.totalLocked?.gt(new BN(0))

    hasGovernanceLocks =
      hasLockedBalance &&
      (convictionVoting.votes.length > 0 ||
        convictionVoting.delegations.length > 0 ||
        convictionVoting.unlockableAmount.gtn(0) ||
        convictionVoting.totalLocked?.gtn(0))
  }

  if (hasGovernanceLocks) {
    actionTypes.push(ActionType.GOVERNANCE)
  }

  // 8. Governance refund action
  // Show the action if there are ANY deposits (refundable or ongoing)
  const hasGovernanceDeposits = (nativeBalance?.balance.reserved.governance?.deposits.length ?? 0) > 0
  if (hasGovernanceDeposits) {
    actionTypes.push(ActionType.GOVERNANCE_REFUND)
  }

  return actionTypes
}

/**
 * Builds full pending action objects with labels, tooltips, and disabled states
 * from action types.
 *
 * @param actionTypes - Array of action types to build
 * @param params - Parameters including account and appId
 * @returns Array of pending actions with full details
 *
 * @example
 * ```typescript
 * const actionTypes = ['unstake', 'governance']
 * const actions = buildPendingActions(actionTypes, {
 *   account,
 *   appId: 'polkadot',
 * })
 * // Returns: [{ type: 'unstake', label: 'Unstake', disabled: false, ... }]
 * ```
 */
export function buildPendingActions(actionTypes: ActionType[], params: GetPendingActionsParams): PendingAction[] {
  const { account, isMultisigAddress } = params
  const actions: PendingAction[] = []

  const nativeBalance = account.balances?.find(isNativeBalance)

  for (const actionType of actionTypes) {
    switch (actionType) {
      case ActionType.UNSTAKE: {
        const isUnstakeAvailable: boolean = nativeBalance ? canUnstake(nativeBalance) : false
        actions.push({
          type: ActionType.UNSTAKE,
          label: 'Unstake',
          tooltip: !isUnstakeAvailable ? 'Only the controller address can unstake this balance' : 'Unlock your staked assets',
          disabled: !isUnstakeAvailable,
        })
        break
      }

      case ActionType.WITHDRAW: {
        actions.push({
          type: ActionType.WITHDRAW,
          label: 'Withdraw',
          tooltip: 'Move your unstaked assets to your available balance',
          disabled: false,
        })
        break
      }

      case ActionType.IDENTITY: {
        actions.push({
          type: ActionType.IDENTITY,
          label: 'Identity',
          tooltip: account.registration?.canRemove
            ? 'Remove account identity'
            : 'Account identity cannot be removed because it has a parent account',
          disabled: !account.registration?.canRemove,
        })
        break
      }

      case ActionType.MULTISIG_CALL: {
        if (isMultisigAddress) {
          const pendingCalls = (account as MultisigAddress).pendingMultisigCalls
          const members = (account as MultisigAddress).members

          const hasRemainingInternalSigners = pendingCalls.some(call => getRemainingInternalSigners(call, members).length > 0)
          const hasRemainingSigners = pendingCalls.some(call => getRemainingSigners(call, members).length > 0)
          const hasAvailableSigners = pendingCalls.some(call => getAvailableSigners(call, members).length > 0)

          actions.push({
            type: ActionType.MULTISIG_CALL,
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
        break
      }

      case ActionType.ACCOUNT_INDEX: {
        actions.push({
          type: ActionType.ACCOUNT_INDEX,
          label: 'Account Index',
          tooltip: 'Remove account index',
          disabled: false,
        })
        break
      }

      case ActionType.PROXY: {
        actions.push({
          type: ActionType.PROXY,
          label: 'Proxy',
          tooltip: 'Remove proxy',
          disabled: false,
        })
        break
      }

      case ActionType.GOVERNANCE: {
        // Use governanceActivity if provided, otherwise fall back to balance.convictionVoting
        const convictionVoting = nativeBalance?.balance.convictionVoting

        if (convictionVoting) {
          const delegations = convictionVoting.delegations ?? []
          const hasDelegations = delegations.length > 0
          const hasOngoingVotes = convictionVoting.votes?.some((v: any) => v.referendumStatus === 'ongoing')
          const hasUnlockable = convictionVoting.unlockableAmount?.gtn(0)

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
            type: ActionType.GOVERNANCE,
            label,
            tooltip,
            disabled: false,
          })
        }
        break
      }

      case ActionType.GOVERNANCE_REFUND: {
        const allDeposits = nativeBalance?.balance.reserved.governance?.deposits ?? []
        const refundableDeposits = allDeposits.filter(d => d.canRefund)
        const ongoingDeposits = allDeposits.filter(d => d.referendumStatus === 'ongoing')
        const totalCount = allDeposits.length
        const refundableCount = refundableDeposits.length

        // Build tooltip based on deposit states
        let tooltip = ''
        if (refundableCount > 0 && ongoingDeposits.length > 0) {
          tooltip = `${refundableCount} refundable deposit${refundableCount > 1 ? 's' : ''}, ${ongoingDeposits.length} ongoing`
        } else if (refundableCount > 0) {
          tooltip = `Reclaim ${refundableCount} refundable deposit${refundableCount > 1 ? 's' : ''}`
        } else if (ongoingDeposits.length > 0) {
          tooltip = `${ongoingDeposits.length} deposit${ongoingDeposits.length > 1 ? 's' : ''} in ongoing referendums (not yet refundable)`
        } else {
          tooltip = `${totalCount} deposit${totalCount > 1 ? 's' : ''} (not refundable)`
        }

        actions.push({
          type: ActionType.GOVERNANCE_REFUND,
          label: 'Refund Deposits',
          tooltip,
          disabled: refundableCount === 0, // Disable if no refundable deposits
        })
        break
      }
    }
  }

  return actions
}

/**
 * getPendingActions is a utility function that determines the pending actions
 * for a given account, balance, appId, and governanceActivity.
 *
 * It checks if the account has pending actions such as governance locks and
 * unlockable tokens, and delegations. If so, it adds the corresponding pending
 * action to the actions array.
 *
 * @param {pendingActions} pendingActions - The pending actions array.
 * @return {boolean} True if there are pending actions, false otherwise.
 */

export function hasPendingActions(pendingActions: ActionType[] | undefined): boolean {
  return Boolean(pendingActions && pendingActions.length > 0)
}
