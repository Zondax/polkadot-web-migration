import { useState } from 'react'
import { UserX, Users, AlertCircle } from 'lucide-react'
import { BN } from '@polkadot/util'
import { formatBalance } from 'lib/format'
import { prepareUndelegateTransaction, prepareGovernanceBatchTransaction } from 'lib/account'
import { Button } from 'components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from 'components/ui/dialog'
import { Alert, AlertDescription } from 'components/ui/alert'
import { Checkbox } from 'components/ui/checkbox'
import type { ApiPromise } from '@polkadot/api'
import type { GovernanceLock } from 'state/types/ledger'
import type { Token } from 'config/apps'
import type { PreparedTransaction } from 'lib/account'

interface UndelegateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  api?: ApiPromise
  token: Token
  senderAddress: string
  delegationLocks: GovernanceLock[]
  appConfig: any
  onPreparedTransaction: (tx: PreparedTransaction) => void
}

export function UndelegateDialog({
  open,
  onOpenChange,
  api,
  token,
  senderAddress,
  delegationLocks,
  appConfig,
  onPreparedTransaction,
}: UndelegateDialogProps) {
  const [selectedTracks, setSelectedTracks] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()

  const handleTrackToggle = (trackId: number) => {
    setSelectedTracks(prev => 
      prev.includes(trackId)
        ? prev.filter(id => id !== trackId)
        : [...prev, trackId]
    )
  }

  const handleSelectAll = () => {
    if (selectedTracks.length === delegationLocks.length) {
      setSelectedTracks([])
    } else {
      setSelectedTracks(delegationLocks.map(lock => lock.trackId))
    }
  }

  const totalAmount = delegationLocks
    .filter(lock => selectedTracks.includes(lock.trackId))
    .reduce((sum, lock) => sum.add(lock.amount), new BN(0))

  const handleSubmit = async () => {
    if (!api) return
    
    try {
      setIsLoading(true)
      setError(undefined)

      if (selectedTracks.length === 0) {
        setError('Select at least one delegation to remove')
        return
      }

      // Prepare undelegate transactions
      const undelegateTxs = []
      for (const trackId of selectedTracks) {
        const tx = await prepareUndelegateTransaction(api, trackId)
        if (tx) {
          undelegateTxs.push(tx)
        }
      }

      if (undelegateTxs.length === 0) {
        setError('Failed to prepare transactions')
        return
      }

      // Create batch transaction if multiple tracks
      const batchTx = await prepareGovernanceBatchTransaction(api, undelegateTxs)
      if (!batchTx) {
        setError('Failed to prepare batch transaction')
        return
      }

      // Prepare transaction payload (similar to existing patterns)
      // This would need to be implemented similar to other prepare functions
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
      console.error('Error preparing undelegate transaction:', err)
      setError(err instanceof Error ? err.message : 'Failed to prepare transaction')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedTracks([])
    setError(undefined)
    onOpenChange(false)
  }

  if (delegationLocks.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              No Active Delegations
            </DialogTitle>
            <DialogDescription>
              You don't have any active vote delegations to remove.
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
            <UserX className="h-5 w-5 text-blue-500" />
            Remove Delegations
          </DialogTitle>
          <DialogDescription>
            Remove your vote delegations and start the conviction lock period for these tokens.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Removing delegations will start a conviction lock period. You'll need to wait for the lock to expire before you can unlock these tokens.
            </AlertDescription>
          </Alert>

          {/* Select All */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectedTracks.length === delegationLocks.length}
                onCheckedChange={handleSelectAll}
              />
              <label 
                htmlFor="select-all"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Select All ({delegationLocks.length} delegation{delegationLocks.length !== 1 ? 's' : ''})
              </label>
            </div>
            {selectedTracks.length > 0 && (
              <div className="text-sm font-mono text-blue-600 dark:text-blue-400">
                {formatBalance(totalAmount, token, token.decimals, true)}
              </div>
            )}
          </div>

          {/* Delegation List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {delegationLocks.map((lock) => {
              const isSelected = selectedTracks.includes(lock.trackId)
              
              return (
                <div
                  key={lock.trackId}
                  className={`flex items-center justify-between p-3 border rounded-md transition-colors ${
                    isSelected 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={`track-${lock.trackId}`}
                      checked={isSelected}
                      onCheckedChange={() => handleTrackToggle(lock.trackId)}
                    />
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <div>
                        <div className="font-medium">
                          Track {lock.trackId}
                        </div>
                        <div className="text-xs text-gray-500">
                          Vote delegation
                        </div>
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
            disabled={selectedTracks.length === 0 || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Preparing...' : `Undelegate ${selectedTracks.length} Track${selectedTracks.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}