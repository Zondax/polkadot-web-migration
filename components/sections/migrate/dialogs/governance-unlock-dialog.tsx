import { ExplorerLink } from '@/components/ExplorerLink'
import { useTransactionStatus } from '@/components/hooks/useTransactionStatus'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { AppId, Token } from '@/config/apps'
import { ExplorerItemType } from '@/config/explorers'
import type { UpdateTransactionStatus } from '@/lib/account'
import { formatBalance } from '@/lib/utils/format'
import { getConvictionLockDescription } from '@/lib/utils/governance'
import { ledgerState$ } from '@/state/ledger'
import type { Address, ConvictionVotingInfo } from '@/state/types/ledger'
import type { BN } from '@polkadot/util'
import { AlertCircle, Clock, Lock, Users, Vote } from 'lucide-react'
import { useEffect, useState } from 'react'
import { DialogEstimatedFeeContent, DialogField, DialogLabel, DialogNetworkContent } from './common-dialog-fields'
import { TransactionDialogFooter, TransactionStatusBody } from './transaction-dialog'

interface GovernanceUnlockDialogProps {
  appId: AppId
  open: boolean
  setOpen: (open: boolean) => void
  account: Address
  token: Token
  convictionVoting: ConvictionVotingInfo
}

type SelectedAction = {
  type: 'removeVote' | 'undelegate' | 'unlock'
  trackId: number
  referendumIndex?: number
}

function GovernanceUnlockForm({
  account,
  appId,
  token,
  convictionVoting,
  estimatedFee,
  estimatedFeeLoading,
  selectedActions,
  setSelectedActions,
}: {
  account: Address
  appId: AppId
  token: Token
  convictionVoting: GovernanceUnlockDialogProps['convictionVoting']
  estimatedFee?: BN
  estimatedFeeLoading: boolean
  selectedActions: SelectedAction[]
  setSelectedActions: (actions: SelectedAction[]) => void
}): React.ReactElement {
  const toggleAction = (action: SelectedAction) => {
    const exists = selectedActions.some(
      a => a.type === action.type && a.trackId === action.trackId && a.referendumIndex === action.referendumIndex
    )

    if (exists) {
      setSelectedActions(
        selectedActions.filter(
          a => !(a.type === action.type && a.trackId === action.trackId && a.referendumIndex === action.referendumIndex)
        )
      )
    } else {
      setSelectedActions([...selectedActions, action])
    }
  }

  const hasOngoingVotes = convictionVoting.votes.some(v => v.referendumStatus === 'ongoing')
  const hasFinishedVotes = convictionVoting.votes.some(v => v.referendumStatus === 'finished')
  const hasDelegations = convictionVoting.delegations.length > 0
  const hasUnlockable = convictionVoting.unlockableAmount.gtn(0)

  return (
    <div className="space-y-4">
      {/* Source Address */}
      <DialogField>
        <DialogLabel>Source Address</DialogLabel>
        <ExplorerLink value={account.address} explorerLinkType={ExplorerItemType.Address} appId={appId} size="xs" />
      </DialogField>

      {/* Network */}
      <DialogField>
        <DialogLabel>Network</DialogLabel>
        <DialogNetworkContent token={token} appId={appId} />
      </DialogField>

      {/* Total Locked */}
      <DialogField>
        <DialogLabel>Total Conviction Locked</DialogLabel>
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-gray-500" />
          <span className="font-mono text-lg">{formatBalance(convictionVoting.totalLocked, token)}</span>
        </div>
      </DialogField>

      {/* Actions */}
      <DialogField>
        <DialogLabel>Available Actions</DialogLabel>
        <div className="w-full max-h-96 overflow-y-auto border rounded-md p-4">
          <div className="space-y-4">
            {/* Ongoing Votes */}
            {hasOngoingVotes && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Vote className="w-4 h-4" />
                  Remove Votes (Ongoing Referenda)
                </div>
                {convictionVoting.votes
                  .filter(v => v.referendumStatus === 'ongoing')
                  .map(vote => {
                    const action: SelectedAction = {
                      type: 'removeVote',
                      trackId: vote.trackId,
                      referendumIndex: vote.referendumIndex,
                    }
                    const isSelected = selectedActions.some(
                      a => a.type === action.type && a.trackId === action.trackId && a.referendumIndex === action.referendumIndex
                    )

                    return (
                      <div
                        key={`vote-${vote.trackId}-${vote.referendumIndex}`}
                        className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleAction(action)}
                          id={`vote-${vote.trackId}-${vote.referendumIndex}`}
                        />
                        <label htmlFor={`vote-${vote.trackId}-${vote.referendumIndex}`} className="flex-1 cursor-pointer space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">Referendum #{vote.referendumIndex}</span>
                            <Badge variant={vote.vote.aye ? 'default' : 'destructive'} className="text-xs">
                              {vote.vote.aye ? 'Aye' : 'Nay'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {vote.vote.conviction}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500">{formatBalance(vote.vote.balance, token)} locked</div>
                        </label>
                      </div>
                    )
                  })}
              </div>
            )}

            {/* Delegations */}
            {hasDelegations && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="w-4 h-4" />
                  Remove Delegations
                </div>
                {convictionVoting.delegations.map(delegation => {
                  const action: SelectedAction = {
                    type: 'undelegate',
                    trackId: delegation.trackId,
                  }
                  const isSelected = selectedActions.some(a => a.type === action.type && a.trackId === action.trackId)

                  return (
                    <div key={`delegation-${delegation.trackId}`} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50">
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleAction(action)} id={`delegation-${delegation.trackId}`} />
                      <label htmlFor={`delegation-${delegation.trackId}`} className="flex-1 cursor-pointer space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Track #{delegation.trackId}</span>
                          <Badge variant="outline" className="text-xs">
                            {delegation.conviction}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <span>{formatBalance(delegation.balance, token)} delegated to</span>
                          <ExplorerLink
                            value={delegation.target}
                            explorerLinkType={ExplorerItemType.Address}
                            appId={appId}
                            size="xs"
                            truncate
                          />
                        </div>
                        {delegation.unlockAt && (
                          <div className="flex items-center gap-1 text-xs text-orange-600">
                            <Clock className="w-3 h-3" />
                            Lock period: {getConvictionLockDescription(delegation.conviction)}
                          </div>
                        )}
                      </label>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Finished Votes Warning */}
            {hasFinishedVotes && (
              <div className="p-3 bg-orange-50 rounded-md">
                <div className="flex gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
                  <div className="flex-1 text-sm text-orange-800">
                    <p className="font-medium">Votes on Finished Referenda</p>
                    <p className="text-xs mt-1">
                      You have votes on {convictionVoting.votes.filter(v => v.referendumStatus === 'finished').length} finished referenda.
                      These will be unlocked after their conviction lock periods expire.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Unlockable Amount */}
            {hasUnlockable && (
              <div className="p-3 bg-green-50 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Ready to Unlock</span>
                  </div>
                  <span className="font-mono text-sm text-green-800">{formatBalance(convictionVoting.unlockableAmount, token)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogField>

      {/* Estimated Fee */}
      {selectedActions.length > 0 && (
        <DialogField>
          <DialogLabel>Estimated Fee</DialogLabel>
          <DialogEstimatedFeeContent token={token} estimatedFee={estimatedFee} loading={estimatedFeeLoading} />
        </DialogField>
      )}
    </div>
  )
}

export default function GovernanceUnlockDialog({ open, setOpen, account, appId, token, convictionVoting }: GovernanceUnlockDialogProps) {
  const [selectedActions, setSelectedActions] = useState<SelectedAction[]>([])

  // Wrap governance unlock transaction
  const governanceUnlockTxFn = async (
    updateTxStatus: UpdateTransactionStatus,
    appId: AppId,
    address: string,
    path: string,
    actions: SelectedAction[]
  ) => {
    await ledgerState$.executeGovernanceUnlock(appId, address, path, actions, updateTxStatus)
  }

  const {
    runTransaction,
    txStatus,
    clearTx,
    isTxFinished,
    isTxFailed,
    updateSynchronization,
    isSynchronizing,
    getEstimatedFee,
    estimatedFeeLoading,
  } = useTransactionStatus(governanceUnlockTxFn, ledgerState$.getGovernanceUnlockFee)

  // Estimate fee when actions change
  const [estimatedFee, setEstimatedFee] = useState<BN>()
  useEffect(() => {
    if (!open || selectedActions.length === 0) {
      setEstimatedFee(undefined)
      return
    }

    const calculateFee = async () => {
      const fee = await getEstimatedFee(appId, account.address, selectedActions)
      if (fee) {
        setEstimatedFee(fee)
      }
    }

    calculateFee()
  }, [open, selectedActions, getEstimatedFee, appId, account.address])

  const executeGovernanceUnlock = async () => {
    await runTransaction(appId, account.address, account.path, selectedActions)
  }

  const synchronizeAccount = async () => {
    await updateSynchronization(ledgerState$.synchronizeAccount, appId)
    closeDialog()
  }

  const closeDialog = () => {
    setSelectedActions([])
    clearTx()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Governance Locks</DialogTitle>
          <DialogDescription>
            Review and manage your conviction-locked tokens from governance activities. You can remove votes from ongoing referenda,
            undelegate voting power, and unlock tokens when their lock periods have expired.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {txStatus ? (
            <TransactionStatusBody {...txStatus} appId={appId} />
          ) : (
            <GovernanceUnlockForm
              account={account}
              appId={appId}
              token={token}
              convictionVoting={convictionVoting}
              estimatedFee={estimatedFee}
              estimatedFeeLoading={estimatedFeeLoading}
              selectedActions={selectedActions}
              setSelectedActions={setSelectedActions}
            />
          )}
        </DialogBody>
        <DialogFooter>
          <TransactionDialogFooter
            isTxFinished={isTxFinished}
            isTxFailed={isTxFailed}
            isSynchronizing={isSynchronizing}
            clearTx={clearTx}
            synchronizeAccount={synchronizeAccount}
            closeDialog={closeDialog}
            signTransfer={executeGovernanceUnlock}
            isSignDisabled={selectedActions.length === 0 || Boolean(txStatus) || estimatedFeeLoading}
            mainButtonLabel={selectedActions.length > 1 ? `Execute ${selectedActions.length} Actions` : 'Execute Action'}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
