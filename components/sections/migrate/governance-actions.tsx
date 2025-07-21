import { useState } from 'react'
import { Vote, Users, LockOpen } from 'lucide-react'
import type { ConvictionVotingInfo } from 'state/types/ledger'
import type { Token } from 'config/apps'
import type { ApiPromise } from '@polkadot/api'
import { RemoveVoteDialog } from './dialogs/remove-vote-dialog'
import { UndelegateDialog } from './dialogs/undelegate-dialog'
import { UnlockGovernanceDialog } from './dialogs/unlock-governance-dialog'

interface GovernanceActionsProps {
  governanceInfo: ConvictionVotingInfo
  token: Token
  api?: ApiPromise
  senderAddress: string
  appConfig: any
  onPreparedTransaction: (tx: any) => void
}

/**
 * Helper component to provide governance actions and dialogs
 * This demonstrates how governance functionality can be integrated
 * into the existing account row action system
 */
export function GovernanceActions({
  governanceInfo,
  token,
  api,
  senderAddress,
  appConfig,
  onPreparedTransaction,
}: GovernanceActionsProps) {
  // Dialog state management
  const [removeVoteOpen, setRemoveVoteOpen] = useState(false)
  const [undelegateOpen, setUndelegateOpen] = useState(false)
  const [unlockGovernanceOpen, setUnlockGovernanceOpen] = useState(false)

  // Categorize locks for different actions
  const voteLocks = governanceInfo.locks.filter(lock => 
    lock.type === 'vote' && lock.isOngoing && lock.referendumId !== undefined
  )
  const delegationLocks = governanceInfo.locks.filter(lock => 
    lock.type === 'delegation' && !lock.canUnlock
  )
  const unlockableLocks = governanceInfo.locks.filter(lock => 
    lock.canUnlock
  )

  // Generate actions array that can be integrated into existing account row
  const getGovernanceActions = () => {
    const actions = []

    // Remove Vote action
    if (voteLocks.length > 0) {
      actions.push({
        label: 'Remove Vote',
        tooltip: `Remove ${voteLocks.length} vote${voteLocks.length !== 1 ? 's' : ''} from ongoing referenda`,
        onClick: () => setRemoveVoteOpen(true),
        disabled: false,
        icon: <Vote className="h-4 w-4" />,
        variant: 'default' as const,
      })
    }

    // Undelegate action
    if (delegationLocks.length > 0) {
      actions.push({
        label: 'Undelegate',
        tooltip: `Remove ${delegationLocks.length} delegation${delegationLocks.length !== 1 ? 's' : ''}`,
        onClick: () => setUndelegateOpen(true),
        disabled: false,
        icon: <Users className="h-4 w-4" />,
        variant: 'default' as const,
      })
    }

    // Gov Unlock action
    if (unlockableLocks.length > 0) {
      actions.push({
        label: 'Gov Unlock',
        tooltip: `Unlock ${unlockableLocks.length} expired governance lock${unlockableLocks.length !== 1 ? 's' : ''}`,
        onClick: () => setUnlockGovernanceOpen(true),
        disabled: false,
        icon: <LockOpen className="h-4 w-4" />,
        variant: 'default' as const,
      })
    }

    return actions
  }

  return (
    <>
      {/* Remove Vote Dialog */}
      <RemoveVoteDialog
        open={removeVoteOpen}
        onOpenChange={setRemoveVoteOpen}
        api={api}
        token={token}
        senderAddress={senderAddress}
        voteLocks={voteLocks}
        appConfig={appConfig}
        onPreparedTransaction={onPreparedTransaction}
      />

      {/* Undelegate Dialog */}
      <UndelegateDialog
        open={undelegateOpen}
        onOpenChange={setUndelegateOpen}
        api={api}
        token={token}
        senderAddress={senderAddress}
        delegationLocks={delegationLocks}
        appConfig={appConfig}
        onPreparedTransaction={onPreparedTransaction}
      />

      {/* Unlock Governance Dialog */}
      <UnlockGovernanceDialog
        open={unlockGovernanceOpen}
        onOpenChange={setUnlockGovernanceOpen}
        api={api}
        token={token}
        senderAddress={senderAddress}
        unlockableLocks={unlockableLocks}
        appConfig={appConfig}
        onPreparedTransaction={onPreparedTransaction}
      />
    </>
  )
}

// Export the function that generates governance actions for integration
export function getGovernanceActions(governanceInfo: ConvictionVotingInfo) {
  const voteLocks = governanceInfo.locks.filter(lock => 
    lock.type === 'vote' && lock.isOngoing && lock.referendumId !== undefined
  )
  const delegationLocks = governanceInfo.locks.filter(lock => 
    lock.type === 'delegation' && !lock.canUnlock
  )
  const unlockableLocks = governanceInfo.locks.filter(lock => 
    lock.canUnlock
  )

  const actions = []

  if (voteLocks.length > 0) {
    actions.push({
      type: 'removeVote',
      label: 'Remove Vote',
      tooltip: `Remove ${voteLocks.length} vote${voteLocks.length !== 1 ? 's' : ''} from ongoing referenda`,
      count: voteLocks.length,
      locks: voteLocks,
    })
  }

  if (delegationLocks.length > 0) {
    actions.push({
      type: 'undelegate',
      label: 'Undelegate', 
      tooltip: `Remove ${delegationLocks.length} delegation${delegationLocks.length !== 1 ? 's' : ''}`,
      count: delegationLocks.length,
      locks: delegationLocks,
    })
  }

  if (unlockableLocks.length > 0) {
    actions.push({
      type: 'unlock',
      label: 'Gov Unlock',
      tooltip: `Unlock ${unlockableLocks.length} expired governance lock${unlockableLocks.length !== 1 ? 's' : ''}`,
      count: unlockableLocks.length,
      locks: unlockableLocks,
    })
  }

  return actions
}