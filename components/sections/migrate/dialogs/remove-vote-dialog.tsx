import { useState } from 'react'
import { X, Vote } from 'lucide-react'
import { BN } from '@polkadot/util'
import { z } from 'zod'
import { formatBalance } from 'lib/format'
import { prepareRemoveVoteTransaction, prepareGovernanceBatchTransaction } from 'lib/account'
import { Button } from 'components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from 'components/ui/dialog'
import { Checkbox } from 'components/ui/checkbox'
import type { ApiPromise } from '@polkadot/api'
import type { GovernanceLock } from 'state/types/ledger'
import type { Token } from 'config/apps'
import type { PreparedTransaction } from 'lib/account'

interface RemoveVoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  api?: ApiPromise
  token: Token
  senderAddress: string
  voteLocks: GovernanceLock[]
  appConfig: any
  onPreparedTransaction: (tx: PreparedTransaction) => void
}

const removeVoteSchema = z.object({
  selectedVotes: z.array(z.string()).min(1, 'Select at least one vote to remove'),
})

export function RemoveVoteDialog({
  open,
  onOpenChange,
  api,
  token,
  senderAddress,
  voteLocks,
  appConfig,
  onPreparedTransaction,
}: RemoveVoteDialogProps) {
  const [selectedVotes, setSelectedVotes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()

  // Filter to only ongoing referendum votes that can be removed
  const removableVotes = voteLocks.filter(lock => 
    lock.isOngoing && lock.referendumId !== undefined
  )

  const handleVoteToggle = (voteKey: string) => {
    setSelectedVotes(prev => 
      prev.includes(voteKey)
        ? prev.filter(key => key !== voteKey)
        : [...prev, voteKey]
    )
  }

  const handleSelectAll = () => {
    if (selectedVotes.length === removableVotes.length) {
      setSelectedVotes([])
    } else {
      setSelectedVotes(removableVotes.map(lock => `${lock.trackId}-${lock.referendumId}`))
    }
  }

  const totalAmount = removableVotes
    .filter(lock => selectedVotes.includes(`${lock.trackId}-${lock.referendumId}`))
    .reduce((sum, lock) => sum.add(lock.amount), new BN(0))

  const handleSubmit = async () => {
    if (!api) return
    
    try {
      setIsLoading(true)
      setError(undefined)

      // Validate selection
      const result = removeVoteSchema.safeParse({ selectedVotes })
      if (!result.success) {
        setError(result.error.issues[0].message)
        return
      }

      // Prepare remove vote transactions
      const removeVoteTxs = []
      for (const voteKey of selectedVotes) {
        const [trackId, referendumId] = voteKey.split('-').map(Number)
        const tx = await prepareRemoveVoteTransaction(api, trackId, referendumId)
        if (tx) {
          removeVoteTxs.push(tx)
        }
      }

      if (removeVoteTxs.length === 0) {
        setError('Failed to prepare transactions')
        return
      }

      // Create batch transaction if multiple votes
      const batchTx = await prepareGovernanceBatchTransaction(api, removeVoteTxs)
      if (!batchTx) {
        setError('Failed to prepare batch transaction')
        return
      }

      // Prepare transaction payload (similar to existing patterns)
      // This would need to be implemented similar to other prepare functions
      // For now, we'll pass the basic transaction
      const preparedTx = {
        transfer: batchTx,
        payload: null as any, // Would need actual payload preparation
        metadataHash: new Uint8Array(),
        nonce: 0,
        proof1: new Uint8Array(),
        payloadBytes: new Uint8Array(),
        estimatedFee: new BN(0), // Would need fee calculation
      }

      onPreparedTransaction(preparedTx)
      onOpenChange(false)
    } catch (err) {
      console.error('Error preparing remove vote transaction:', err)
      setError(err instanceof Error ? err.message : 'Failed to prepare transaction')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedVotes([])
    setError(undefined)
    onOpenChange(false)
  }

  if (removableVotes.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Vote className="h-5 w-5 text-purple-500" />
              No Removable Votes
            </DialogTitle>
            <DialogDescription>
              You don't have any active votes in ongoing referenda that can be removed.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <X className="h-5 w-5 text-purple-500" />
            Remove Votes
          </DialogTitle>
          <DialogDescription>
            Remove your votes from ongoing referenda. This will immediately unlock your tokens.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Select All */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectedVotes.length === removableVotes.length}
                onCheckedChange={handleSelectAll}
              />
              <label 
                htmlFor="select-all"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Select All ({removableVotes.length} votes)
              </label>
            </div>
            {selectedVotes.length > 0 && (
              <div className="text-sm font-mono text-purple-600 dark:text-purple-400">
                {formatBalance(totalAmount, token, token.decimals, true)}
              </div>
            )}
          </div>

          {/* Vote List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {removableVotes.map((lock) => {
              const voteKey = `${lock.trackId}-${lock.referendumId}`
              const isSelected = selectedVotes.includes(voteKey)
              
              return (
                <div
                  key={voteKey}
                  className={`flex items-center justify-between p-3 border rounded-md transition-colors ${
                    isSelected 
                      ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={voteKey}
                      checked={isSelected}
                      onCheckedChange={() => handleVoteToggle(voteKey)}
                    />
                    <div>
                      <div className="font-medium">
                        Referendum #{lock.referendumId}
                      </div>
                      <div className="text-xs text-gray-500">
                        Track {lock.trackId} • Ongoing
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm">
                      {formatBalance(lock.amount, token, token.decimals, true)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-4">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={selectedVotes.length === 0 || isLoading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? 'Preparing...' : `Remove ${selectedVotes.length} Vote${selectedVotes.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}