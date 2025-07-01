import { observer } from '@legendapp/state/react'
import { ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BalanceType } from 'state/types/ledger'
import { useTokenLogo } from '@/components/hooks/useTokenLogo'
import { muifyHtml } from '@/lib/utils/html'
import { BalanceTypeFlag } from './balance-detail-card'

function SynchronizedAppOverview({
  appId,
  appName,
  accountCount,
  totalBalance,
}: {
  appId: string
  appName: string
  accountCount: number
  totalBalance?: string
}) {
  const [isExpanded, setIsExpanded] = useState(true)

  const icon = useTokenLogo(appId)

  const isAccountsNotEmpty = useMemo(() => Boolean(accountCount && accountCount !== 0), [accountCount])

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  const renderBalance = () =>
    totalBalance ? (
      <div className="flex items-center gap-2">
        <span className="font-bold text-base font-mono">{totalBalance}</span>
        <BalanceTypeFlag type={BalanceType.NATIVE} />
      </div>
    ) : null

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      isAccountsNotEmpty && toggleExpand()
    }
  }

  return (
    <button
      type="button"
      className={`w-full flex flex-row items-center justify-between gap-4 px-4 py-3 cursor-pointer select-none transition-colors rounded-lg ${isAccountsNotEmpty ? 'hover:bg-gray-50' : ''}`}
      onClick={isAccountsNotEmpty ? toggleExpand : undefined}
      onKeyDown={handleKeyDown}
      data-testid="app-row-overview"
      tabIndex={isAccountsNotEmpty ? 0 : -1}
      aria-expanded={isExpanded}
      disabled={!isAccountsNotEmpty}
    >
      <div className="flex items-center gap-4">
        <div className="max-h-8 w-8 h-8 overflow-hidden flex items-center justify-center">
          {/* Icon */}
          {icon ? muifyHtml(icon) : null}
        </div>
        <div className="flex flex-col">
          {/* Name */}
          <div className="font-bold text-lg leading-tight">{appName}</div>
          {/* Address count */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-gray-500 text-sm">
            <span>
              {accountCount} address{accountCount === 1 ? '' : 'es'}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:hidden">{renderBalance()}</div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {/* Balance */}
        <div className="flex flex-col items-end min-w-[120px] hidden sm:flex">{renderBalance()}</div>
        {/* Expand/Collapse Icon */}
        {isAccountsNotEmpty && (
          <div className="flex items-center ml-2">
            <ChevronDown className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        )}
      </div>
    </button>
  )
}

export default observer(SynchronizedAppOverview)
