import { useMemo } from 'react'
import { BN } from '@polkadot/util'
import { formatBalance, formatBalanceFromBN } from 'lib/format'
import { Badge } from 'components/ui/badge'
import { Card } from 'components/ui/card'
import type { ConvictionVotingInfo } from 'state/types/ledger'
import type { Token } from 'config/apps'
import { GovernanceHoverCard } from './governance-hover-card'

interface GovernanceBalanceCardProps {
  governanceInfo: ConvictionVotingInfo
  token: Token
}

export function GovernanceBalanceCard({ governanceInfo, token }: GovernanceBalanceCardProps) {
  const hasGovernanceLocks = useMemo(() => {
    return governanceInfo.totalLocked.gt(new BN(0))
  }, [governanceInfo.totalLocked])

  const formattedAmount = useMemo(() => {
    return formatBalance(governanceInfo.totalLocked, token, token.decimals, false)
  }, [governanceInfo.totalLocked, token])

  if (!hasGovernanceLocks) {
    return null
  }

  return (
    <Card className="relative flex items-center justify-between border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-purple-500/15 p-4 hover:border-purple-500/40 transition-colors">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-500/10">
          <div className="w-6 h-6 rounded-full bg-purple-500" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {token.symbol}
            </span>
            <Badge 
              variant="secondary" 
              className="text-xs bg-purple-500/70 text-white font-semibold border-purple-500/30"
            >
              GOVERNANCE
            </Badge>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Locked in governance
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="text-right">
          <div className="font-mono font-semibold text-gray-900 dark:text-gray-100">
            {formattedAmount}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {governanceInfo.locks.length} lock{governanceInfo.locks.length !== 1 ? 's' : ''}
          </div>
        </div>
        <GovernanceHoverCard governanceInfo={governanceInfo} token={token} />
      </div>
    </Card>
  )
}