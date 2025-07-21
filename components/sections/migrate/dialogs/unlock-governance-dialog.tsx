import { useState } from 'react'
import { LockOpen, CheckCircle, Clock } from 'lucide-react'
import { BN } from '@polkadot/util'
import { formatBalance } from 'lib/format'
import { prepareUnlockTransaction, prepareGovernanceBatchTransaction } from 'lib/account'
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

interface UnlockGovernanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  api?: ApiPromise
  token: Token
  senderAddress: string
  unlockableLocks: GovernanceLock[]
  appConfig: any
  onPreparedTransaction: (tx: PreparedTransaction) => void
}

export function UnlockGovernanceDialog({
  open,
  onOpenChange,
  api,
  token,
  senderAddress,
  unlockableLocks,
  appConfig,
  onPreparedTransaction,
}: UnlockGovernanceDialogProps) {
  const [selectedTracks, setSelectedTracks] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()

  // Group locks by track ID for unlock operations
  const locksByTrack = unlockableLocks.reduce((acc, lock) => {
    if (!acc[lock.trackId]) {
      acc[lock.trackId] = []
    }
    acc[lock.trackId].push(lock)
    return acc
  }, {} as Record<number, GovernanceLock[]>)

  const trackIds = Object.keys(locksByTrack).map(Number)

  const handleTrackToggle = (trackId: number) => {
    setSelectedTracks(prev => 
      prev.includes(trackId)
        ? prev.filter(id => id !== trackId)
        : [...prev, trackId]
    )
  }

  const handleSelectAll = () => {
    if (selectedTracks.length === trackIds.length) {
      setSelectedTracks([])
    } else {
      setSelectedTracks(trackIds)
    }
  }

  const totalAmount = selectedTracks
    .flatMap(trackId => locksByTrack[trackId] || [])
    .reduce((sum, lock) => sum.add(lock.amount), new BN(0))

  const handleSubmit = async () => {
    if (!api) return
    
    try {
      setIsLoading(true)
      setError(undefined)

      if (selectedTracks.length === 0) {
        setError('Select at least one track to unlock')
        return
      }

      // Prepare unlock transactions
      const unlockTxs = []
      for (const trackId of selectedTracks) {
        const tx = await prepareUnlockTransaction(api, trackId, senderAddress)
        if (tx) {
          unlockTxs.push(tx)
        }
      }

      if (unlockTxs.length === 0) {
        setError('Failed to prepare transactions')
        return
      }

      // Create batch transaction if multiple tracks
      const batchTx = await prepareGovernanceBatchTransaction(api, unlockTxs)
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
      console.error('Error preparing unlock transaction:', err)
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

  if (unlockableLocks.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              No Unlockable Funds
            </DialogTitle>
            <DialogDescription>
              You don't have any governance locks that are ready to unlock. Locks become unlockable after their conviction period expires.
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
            <LockOpen className="h-5 w-5 text-green-500" />
            Unlock Governance Funds
          </DialogTitle>
          <DialogDescription>
            Unlock your governance tokens that have completed their conviction lock period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Success Message */}
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-700 dark:text-green-300">
              These locks have completed their conviction period and are ready to unlock.
            </span>
          </div>

          {/* Select All */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectedTracks.length === trackIds.length}
                onCheckedChange={handleSelectAll}
              />
              <label 
                htmlFor="select-all"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Select All ({trackIds.length} track{trackIds.length !== 1 ? 's' : ''})
              </label>
            </div>
            {selectedTracks.length > 0 && (
              <div className="text-sm font-mono text-green-600 dark:text-green-400">
                {formatBalance(totalAmount, token, token.decimals, true)}
              </div>
            )}
          </div>

          {/* Track List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {trackIds.map((trackId) => {
              const trackLocks = locksByTrack[trackId]
              const trackTotal = trackLocks.reduce((sum, lock) => sum.add(lock.amount), new BN(0))
              const isSelected = selectedTracks.includes(trackId)
              
              return (
                <div
                  key={trackId}
                  className={`border rounded-md transition-colors ${
                    isSelected 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id={`track-${trackId}`}
                        checked={isSelected}
                        onCheckedChange={() => handleTrackToggle(trackId)}
                      />
                      <div className="flex items-center gap-2">
                        <LockOpen className="h-4 w-4 text-green-500" />
                        <div>
                          <div className="font-medium">
                            Track {trackId}
                          </div>
                          <div className="text-xs text-gray-500">
                            {trackLocks.length} expired lock{trackLocks.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm">
                        {formatBalance(trackTotal, token, token.decimals, true)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Show individual locks if expanded */}
                  {trackLocks.length > 1 && (
                    <div className="px-6 pb-3 space-y-1">
                      {trackLocks.map((lock, index) => (
                        <div key={index} className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                          <span>
                            {lock.type === 'vote' 
                              ? (lock.referendumId !== undefined ? `Ref #${lock.referendumId}` : 'Vote')
                              : 'Delegation'} 
                            • Expired
                          </span>
                          <span className="font-mono">
                            {formatBalance(lock.amount, token, token.decimals, true)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
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
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Preparing...' : `Unlock ${selectedTracks.length} Track${selectedTracks.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}