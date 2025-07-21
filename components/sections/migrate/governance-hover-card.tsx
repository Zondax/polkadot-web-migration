import { useMemo } from 'react'
import { BN } from '@polkadot/util'
import { Clock, Info, Lock, Users, Vote } from 'lucide-react'
import { formatBalance } from 'lib/format'
import { eraToHumanTime } from 'lib/account'
import { HoverCard, HoverCardContent, HoverCardTrigger } from 'components/ui/hover-card'
import type { ConvictionVotingInfo, GovernanceLock } from 'state/types/ledger'
import type { Token } from 'config/apps'

interface GovernanceHoverCardProps {
  governanceInfo: ConvictionVotingInfo
  token: Token
}

export function GovernanceHoverCard({ governanceInfo, token }: GovernanceHoverCardProps) {
  const { voteLocks, delegationLocks, expiredLocks } = useMemo(() => {
    const voteLocks = governanceInfo.locks.filter(lock => lock.type === 'vote' && !lock.canUnlock)
    const delegationLocks = governanceInfo.locks.filter(lock => lock.type === 'delegation' && !lock.canUnlock)
    const expiredLocks = governanceInfo.locks.filter(lock => lock.canUnlock)

    return { voteLocks, delegationLocks, expiredLocks }
  }, [governanceInfo.locks])

  const formatLockTime = (lock: GovernanceLock): string => {
    if (lock.unlockAt) {
      // This would need actual block time calculation
      return `Block ${lock.unlockAt}`
    }
    if (lock.isOngoing) {
      return 'Ongoing referendum'
    }
    return 'Ready to unlock'
  }

  const detailFlagStyle = 'flex justify-between items-center px-3 py-2 rounded-md border text-xs'

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger className="cursor-pointer">
        <Info className="h-4 w-4 text-purple-500" />
      </HoverCardTrigger>
      <HoverCardContent 
        align="end" 
        className="w-80 p-4 space-y-4"
      >
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">
            Governance Locks Overview
          </h4>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Your tokens locked in governance activities
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded-md">
            <div className="text-purple-600 dark:text-purple-400 font-medium">Total Locked</div>
            <div className="font-mono font-semibold text-gray-900 dark:text-gray-100">
              {formatBalance(governanceInfo.totalLocked, token, token.decimals, true)}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
            <div className="text-gray-600 dark:text-gray-400 font-medium">Total Locks</div>
            <div className="font-mono font-semibold text-gray-900 dark:text-gray-100">
              {governanceInfo.locks.length}
            </div>
          </div>
        </div>

        {/* Vote Locks */}
        {voteLocks.length > 0 && (
          <div className="space-y-2">
            <h5 className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              <Vote className="h-4 w-4 text-purple-500" />
              Active Votes ({voteLocks.length})
            </h5>
            <div className="space-y-1.5">
              {voteLocks.map((lock, index) => (
                <div 
                  key={index}
                  className={`${detailFlagStyle} bg-purple-500/10 border-purple-500/20`}
                >
                  <div className="flex items-center gap-2">
                    {lock.isOngoing ? (
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    ) : (
                      <Clock className="w-3 h-3 text-purple-600" />
                    )}
                    <span>
                      {lock.referendumId !== undefined 
                        ? `Ref #${lock.referendumId}` 
                        : `Track ${lock.trackId}`}
                    </span>
                  </div>
                  <span className="font-mono font-medium">
                    {formatBalance(lock.amount, token, token.decimals, true)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delegation Locks */}
        {delegationLocks.length > 0 && (
          <div className="space-y-2">
            <h5 className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              <Users className="h-4 w-4 text-blue-500" />
              Delegations ({delegationLocks.length})
            </h5>
            <div className="space-y-1.5">
              {delegationLocks.map((lock, index) => (
                <div 
                  key={index}
                  className={`${detailFlagStyle} bg-blue-500/10 border-blue-500/20`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-3 h-3 text-blue-600" />
                    <span>Track {lock.trackId}</span>
                  </div>
                  <span className="font-mono font-medium">
                    {formatBalance(lock.amount, token, token.decimals, true)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expired Locks */}
        {expiredLocks.length > 0 && (
          <div className="space-y-2">
            <h5 className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
              <Lock className="h-4 w-4" />
              Ready to Unlock ({expiredLocks.length})
            </h5>
            <div className="space-y-1.5">
              {expiredLocks.map((lock, index) => (
                <div 
                  key={index}
                  className={`${detailFlagStyle} bg-green-500/10 border-green-500/20`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>
                      {lock.type === 'vote' 
                        ? (lock.referendumId !== undefined ? `Ref #${lock.referendumId}` : `Track ${lock.trackId}`)
                        : `Delegation Track ${lock.trackId}`}
                    </span>
                  </div>
                  <span className="font-mono font-medium">
                    {formatBalance(lock.amount, token, token.decimals, true)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Summary */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            {governanceInfo.canRemoveVotes > 0 && (
              <div>• {governanceInfo.canRemoveVotes} vote{governanceInfo.canRemoveVotes !== 1 ? 's' : ''} can be removed</div>
            )}
            {governanceInfo.canUndelegate && (
              <div>• Delegation can be removed</div>
            )}
            {governanceInfo.canUnlock > 0 && (
              <div>• {governanceInfo.canUnlock} lock{governanceInfo.canUnlock !== 1 ? 's' : ''} ready to unlock</div>
            )}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}