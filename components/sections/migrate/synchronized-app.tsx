import { observer, use$ } from '@legendapp/state/react'
import { BN } from '@polkadot/util'
import { ChevronDown, Info } from 'lucide-react'
import { useMemo, useState } from 'react'
import { type App, ledgerState$ } from 'state/ledger'
import { type Address, BalanceType } from 'state/types/ledger'
import { CustomTooltip } from '@/components/CustomTooltip'
import type { UpdateTransaction } from '@/components/hooks/useSynchronization'
import { useTokenLogo } from '@/components/hooks/useTokenLogo'
import { isNativeBalance } from '@/lib/utils/balance'
import { formatBalance } from '@/lib/utils/format'
import { muifyHtml } from '@/lib/utils/html'
import { BalanceTypeFlag } from './balance-detail-card'
import InvalidSynchronizedAccountsTable from './invalid-synchronized-accounts-table'
import SynchronizedAccountsTable from './synchronized-accounts-table'

function SynchronizedApp({
  app,
  failedSync,
  isMultisig,
  updateTransaction,
}: {
  app: App
  failedSync?: boolean
  isMultisig?: boolean
  updateTransaction: UpdateTransaction
}) {
  const name = use$(app.name)
  const id = use$(app.id)
  const accounts = use$(isMultisig ? app.multisigAccounts : app.accounts)
  const collections = use$(app.collections)

  const [isExpanded, setIsExpanded] = useState(true)

  const icon = useTokenLogo(id)
  const polkadotAddresses = useMemo(() => ledgerState$.polkadotAddresses[id].get(), [id])
  const isAccountsNotEmpty = useMemo(() => Boolean(accounts && accounts.length !== 0), [accounts])

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  const totalBalance = useMemo(() => {
    if (failedSync) return null
    const balance = accounts?.reduce((total: BN, account: Address) => {
      const balances = account.balances ?? []
      const nativeBalance = balances.find(b => isNativeBalance(b))?.balance.total ?? new BN(0)
      return total.add(nativeBalance)
    }, new BN(0))

    return balance !== undefined ? formatBalance(balance, app.token) : '-'
  }, [accounts, app.token, failedSync])

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
    <div className="bg-gray-50 rounded-lg shadow-xs border border-gray-200 mb-4">
      {/* Overview */}
      <button
        type="button"
        className={`w-full flex flex-row items-center justify-between gap-4 px-4 py-3 cursor-pointer select-none transition-colors rounded-lg ${accounts?.length !== 0 ? 'hover:bg-gray-50' : ''}`}
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
            <div className="font-bold text-lg leading-tight">
              {name}
              {isMultisig ? ' Multisig' : ''}
            </div>
            {/* Address count */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-gray-500 text-sm">
              <span>
                {accounts?.length || 0} address{accounts?.length === 1 ? '' : 'es'}
              </span>
            </div>
            <div className="flex items-center gap-2 sm:hidden">{renderBalance()}</div>
          </div>
        </div>
        {!isMultisig && (
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
        )}
        {failedSync && app.error?.description && (
          <div className="flex items-center gap-2">
            <CustomTooltip tooltipBody={app.error?.description} className="bg-white">
              <span className="text-red-500">
                <Info className="h-5 w-5 inline-block mr-1" />
              </span>
            </CustomTooltip>
          </div>
        )}
      </button>
      {/* Accounts Table (expandable) */}
      {isExpanded && isAccountsNotEmpty ? (
        <div className="overflow-hidden">
          {failedSync ? (
            <InvalidSynchronizedAccountsTable
              accounts={accounts}
              token={app.token}
              polkadotAddresses={polkadotAddresses ?? []}
              collections={collections}
              appId={id}
              updateTransaction={updateTransaction}
              isMultisig={isMultisig}
            />
          ) : (
            <SynchronizedAccountsTable
              accounts={accounts}
              token={app.token}
              polkadotAddresses={polkadotAddresses ?? []}
              collections={collections}
              appId={id}
              updateTransaction={updateTransaction}
              isMultisig={isMultisig}
            />
          )}
        </div>
      ) : null}
    </div>
  )
}

export default observer(SynchronizedApp)
