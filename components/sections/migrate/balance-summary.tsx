'use client'

import { Badge } from '@/components/ui/badge'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import type { AppId, Token } from '@/config/apps'
import { formatBalance } from '@/lib/utils'
import type { Native } from '@/state/types/ledger'
import { BN } from '@polkadot/util'
import { Info } from 'lucide-react'
import { useMemo } from 'react'
import { BALANCE_TYPE_CONFIG, BalanceType, getBalanceIcon } from './balance-config'
import { NativeBalanceVisualization } from './balance-visualizations'

interface BalanceSummaryProps {
  balance?: Native
  token: Token
  appId: AppId
}

/**
 * - Colored backgrounds with icons
 * - Easy to scan visually
 * - Clean separation between items
 */
export const BalanceSummary = ({ balance, token, appId }: BalanceSummaryProps) => {
  const balanceBreakdown = useMemo(() => {
    if (!balance) return null

    const parts: { label: string; value: string; icon: React.ReactNode; bgColor: string; textColor: string }[] = []

    if (balance.transferable?.gt(new BN(0))) {
      const config = BALANCE_TYPE_CONFIG[BalanceType.Transferable]
      parts.push({
        label: config.label,
        value: formatBalance(balance.transferable, token, 5),
        icon: getBalanceIcon(BalanceType.Transferable, 'w-3 h-3'),
        bgColor: config.colors.badge.background,
        textColor: config.colors.badge.text,
      })
    }
    if (balance.staking?.total?.gt(new BN(0))) {
      const config = BALANCE_TYPE_CONFIG[BalanceType.Staking]
      parts.push({
        label: config.label,
        value: formatBalance(balance.staking.total, token, 5),
        icon: getBalanceIcon(BalanceType.Staking, 'w-3 h-3'),
        bgColor: config.colors.badge.background,
        textColor: config.colors.badge.text,
      })
    }
    if (balance.reserved?.total?.gt(new BN(0))) {
      const config = BALANCE_TYPE_CONFIG[BalanceType.Reserved]
      parts.push({
        label: config.label,
        value: formatBalance(balance.reserved.total, token, 5),
        icon: getBalanceIcon(BalanceType.Reserved, 'w-3 h-3'),
        bgColor: config.colors.badge.background,
        textColor: config.colors.badge.text,
      })
    }
    if (balance.convictionVoting?.totalLocked?.gt(new BN(0))) {
      const config = BALANCE_TYPE_CONFIG[BalanceType.Governance]
      parts.push({
        label: config.label,
        value: formatBalance(balance.convictionVoting.totalLocked, token, 5),
        icon: getBalanceIcon(BalanceType.Governance, 'w-3 h-3'),
        bgColor: config.colors.badge.background,
        textColor: config.colors.badge.text,
      })
    }

    return {
      total: balance.total,
      parts,
      hasDetails:
        balance.staking?.total?.gt(new BN(0)) ||
        balance.reserved?.total?.gt(new BN(0)) ||
        balance.convictionVoting?.totalLocked?.gt(new BN(0)),
    }
  }, [balance, token])

  if (!balanceBreakdown) return <span className="font-mono">-</span>

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div className="flex flex-col gap-1.5 cursor-pointer">
          <div className="flex items-center gap-2 justify-end">
            <span className="font-mono text-base font-semibold">{formatBalance(balanceBreakdown.total, token)}</span>
            {balanceBreakdown.hasDetails && <Info className="w-4 h-4 text-gray-400" />}
          </div>
          {balanceBreakdown.parts.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-end">
              {balanceBreakdown.parts.map(part => (
                <Badge
                  key={part.label}
                  variant="outline"
                  className={`${part.bgColor} ${part.textColor} text-[10px] px-2 py-0.5 border-transparent flex items-center gap-1`}
                >
                  {part.icon}
                  <span className="font-medium">{part.label}:</span>
                  <span className="font-mono font-semibold">{part.value}</span>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </HoverCardTrigger>
      {balanceBreakdown.hasDetails && balance && (
        <HoverCardContent
          className="w-[calc(100vw-32px)] sm:w-auto max-w-[calc(100vw-16px)] max-h-[50vh] overflow-y-auto p-0 ml-4 mr-0 sm:mx-0"
          align="end"
        >
          <NativeBalanceVisualization
            data={balance}
            token={token}
            appId={appId}
            hidePercentage
            types={[
              BalanceType.Transferable,
              ...(balance.staking?.total?.gt(new BN(0)) ? [BalanceType.Staking] : []),
              ...(balance.reserved?.total?.gt(new BN(0)) ? [BalanceType.Reserved] : []),
              ...(balance.convictionVoting?.totalLocked?.gt(new BN(0)) ? [BalanceType.Governance] : []),
            ]}
          />
        </HoverCardContent>
      )}
    </HoverCard>
  )
}
