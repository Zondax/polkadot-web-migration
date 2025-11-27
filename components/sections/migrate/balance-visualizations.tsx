'use client'

import { ExplorerLink } from '@/components/ExplorerLink'
import { Badge } from '@/components/ui/badge'
import type { AppId, Token } from '@/config/apps'
import { ExplorerItemType } from '@/config/explorers'
import { cn, formatBalance } from '@/lib/utils'
import { getGovernanceDepositBadgeProps } from '@/lib/utils/governance'
import type { ConvictionVotingInfo, GovernanceDeposit, Native, Reserved, Staking } from '@/state/types/ledger'
import { BN } from '@polkadot/util'
import { LockClosedIcon } from '@radix-ui/react-icons'
import { BarChartIcon, Check, ClockIcon, Group, Hash, LockOpenIcon, User, UserCog } from 'lucide-react'
import type { ReactNode } from 'react'
import { BALANCE_TYPE_CONFIG, BalanceType } from './balance-config'

interface NativeBalanceVisualizationProps {
  data: Native
  token: Token
  appId: AppId
  types?: BalanceType[]
  hidePercentage?: boolean
}

interface BalanceCardProps {
  value: BN
  total: BN
  label: string
  icon: ReactNode
  colorScheme: {
    gradient: string
    border: string
    iconColor: string
    badgeBg: string
    badgeText: string
    badgeBorder: string
  }
  details?: ReactNode
  hidePercentage?: boolean
  token?: Token
}

const BalanceCard = ({ value, total, label, icon, colorScheme, details, hidePercentage, token }: BalanceCardProps) => {
  const percentage = !total || total.isZero() ? '0.00' : Number(value.div(total).mul(new BN(100)).toString()).toFixed(2)

  return (
    <div
      className={`w-full bg-gradient-to-br ${colorScheme.gradient} rounded-lg border ${colorScheme.border} transition-all duration-200 hover:shadow-md`}
    >
      {/* Compact header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/50 backdrop-blur-sm border-b border-gray-200/50 rounded-t-lg">
        <div className="flex items-center gap-1.5">
          <div className={`${colorScheme.iconColor}`}>{icon}</div>
          <span className="text-sm font-semibold text-gray-700">{label}</span>
        </div>
        {!hidePercentage && <span className="text-xs font-medium text-gray-600">{percentage}%</span>}
      </div>

      {/* Main balance value */}
      <div className={`px-3 py-2 ${!details ? 'rounded-b-lg' : ''}`}>
        <div className="text-base sm:text-lg font-mono font-bold text-gray-900 break-words">
          {formatBalance(value, token, token?.decimals, true)}
        </div>
      </div>

      {/* Expandable details */}
      {details && <div className="border-t border-gray-200/50 bg-white/30 rounded-b-lg px-3">{details}</div>}
    </div>
  )
}

const renderDetailsItem = (icon: ReactNode, label: string, value?: BN, token?: Token) => {
  const bnValue = value !== undefined ? value : new BN(0)
  return (
    <div className="flex items-center justify-between mb-1.5 gap-2">
      <span className="flex items-center gap-1.5 min-w-0">
        {icon} <div className="text-sm text-gray-600 truncate">{label}</div>
      </span>
      <span className="font-mono font-medium text-sm flex-shrink-0">{formatBalance(bnValue, token, token?.decimals, true)}</span>
    </div>
  )
}

const detailFlagStyle = 'flex items-center justify-between text-xs gap-2 px-2 py-1 rounded-lg [&_svg]:h-3 [&_svg]:w-3'

const StakingDetails = ({ stakingData, token }: { stakingData: Staking; token: Token }) => {
  const readyToWithdraw =
    stakingData.unlocking?.filter(u => u.canWithdraw).reduce((sum, u) => sum.add(new BN(u.value)), new BN(0)) || new BN(0)
  const notReadyToWithdraw = stakingData.unlocking?.filter(u => !u.canWithdraw)
  const unLockingBalance = stakingData.total && stakingData.active ? new BN(stakingData.total).sub(new BN(stakingData.active)) : new BN(0)

  return (
    <div className="w-full text-sm border-t border-gray-100 pt-2 mb-2 flex flex-col gap-2">
      {renderDetailsItem(<BarChartIcon className="w-4 h-4 text-polkadot-cyan" />, 'Active', stakingData.active, token)}

      {stakingData.unlocking && stakingData.unlocking.length > 0 && (
        <div className="flex flex-col gap-1">
          {renderDetailsItem(<LockOpenIcon className="w-4 h-4 text-polkadot-cyan" />, 'Unlocking', unLockingBalance, token)}

          <div className="flex flex-col gap-1.5 px-2 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {/* Staked balance ready to withdraw */}
            {readyToWithdraw.gtn(0) && (
              <div className={`${detailFlagStyle} bg-green-50 border border-green-200`}>
                <span className="flex items-center gap-1.5 min-w-0">
                  <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  Ready to withdraw
                </span>
                <span className="font-mono font-medium text-sm flex-shrink-0">
                  {formatBalance(readyToWithdraw, token, token?.decimals, true)}
                </span>
              </div>
            )}
            {/* Staked balance not ready to withdraw */}
            {notReadyToWithdraw?.map(unlock => (
              <div key={`${unlock.era}-${unlock.value}`} className={`${detailFlagStyle} bg-blue-50 border border-blue-200`}>
                <span className="flex items-center gap-1.5 min-w-0">
                  <ClockIcon className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <span className="text-gray-700">{unlock.timeRemaining}</span>
                </span>
                <span className="font-mono font-medium text-sm flex-shrink-0">
                  {formatBalance(unlock.value, token, token?.decimals, true)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const ReservedDetails = ({ reservedData, token }: { reservedData: Reserved; token: Token }) => {
  return (
    <div className="w-full text-sm border-t border-gray-100 pt-2 mb-2 flex flex-col gap-2">
      {reservedData.proxy?.deposit.gtn(0) &&
        renderDetailsItem(<UserCog className="w-4 h-4 text-polkadot-lime" />, 'Proxy Deposit', reservedData.proxy.deposit, token)}

      {reservedData.identity?.deposit.gtn(0) &&
        renderDetailsItem(<User className="w-4 h-4 text-polkadot-lime" />, 'Identity Deposit', reservedData.identity.deposit, token)}

      {reservedData.index?.deposit.gtn(0) &&
        renderDetailsItem(<Hash className="w-4 h-4 text-polkadot-lime" />, 'Account Index Deposit', reservedData.index.deposit, token)}

      {reservedData.multisig?.total.gtn(0) && (
        <div className="flex flex-col gap-1">
          {renderDetailsItem(
            <LockClosedIcon className="w-4 h-4 text-polkadot-lime" />,
            'Multisig Deposit',
            reservedData.multisig.total,
            token
          )}
          <div className="flex flex-col gap-1.5 px-2 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {reservedData.multisig.deposits.map((deposit: { callHash: string; deposit: BN }) => (
              <div key={deposit.callHash} className={`${detailFlagStyle} bg-lime-50 border border-lime-200`}>
                <span className="flex items-center gap-1.5 min-w-0">
                  <Group className="w-3.5 h-3.5 text-lime-600 flex-shrink-0" />
                  <span className="text-gray-700">Call Hash:</span>
                  <ExplorerLink value={deposit.callHash} disableLink disableTooltip truncate size="xs" />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {reservedData.governance?.total.gtn(0) && (
        <div className="flex flex-col gap-1">
          {renderDetailsItem(
            <LockClosedIcon className="w-4 h-4 text-polkadot-lime" />,
            'Governance Deposit',
            reservedData.governance.total,
            token
          )}
          <div className="flex flex-col gap-1.5 px-2 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {reservedData.governance.deposits.map((deposit: GovernanceDeposit) => {
              const { label, className } = getGovernanceDepositBadgeProps(deposit)
              return (
                <div key={`${deposit.type}-${deposit.referendumIndex}`} className={`${detailFlagStyle} bg-lime-50 border border-lime-200`}>
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Hash className="w-3.5 h-3.5 text-lime-600 flex-shrink-0" />
                    <span className="text-gray-700 capitalize">{deposit.type}:</span>
                    <span className="text-gray-700">Ref #{deposit.referendumIndex}</span>
                    <Badge className={cn(className, 'text-xs hover:bg-current/10')}>{label}</Badge>
                  </span>
                  <span className="font-mono font-medium text-sm flex-shrink-0">
                    {formatBalance(deposit.deposit, token, token?.decimals, true)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const GovernanceDetails = ({ convictionVoting, token, appId }: { convictionVoting: ConvictionVotingInfo; token: Token; appId: AppId }) => {
  if (!convictionVoting) return null
  const { delegations = [], totalLocked } = convictionVoting
  return (
    <div className="w-full text-sm border-t border-gray-100 pt-2 mb-2 flex flex-col gap-2">
      {totalLocked?.gtn(0) && renderDetailsItem(<LockClosedIcon className="w-4 h-4 text-storm-700" />, 'Locked', totalLocked, token)}

      {delegations.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="font-semibold text-xs text-storm-700">Delegations</div>
          <div className="flex flex-col gap-1 px-1 max-h-48 overflow-y-auto">
            {delegations.map((delegation: any) => (
              <div key={`${delegation.trackId}-${delegation.target}`} className={`${detailFlagStyle} bg-gray-100`}>
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-gray-600" />
                  <ExplorerLink value={delegation.target} explorerLinkType={ExplorerItemType.Address} appId={appId} size="xs" truncate />
                  <Badge variant="outline" className="text-xs">
                    {delegation.conviction}
                  </Badge>
                </span>
                <span className="font-mono font-medium">{formatBalance(delegation.balance, token, token?.decimals, true)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export const NativeBalanceVisualization = ({
  data,
  token,
  appId,
  types = [BalanceType.Transferable, BalanceType.Staking, BalanceType.Reserved, BalanceType.Governance],
  hidePercentage = false,
}: NativeBalanceVisualizationProps) => {
  const balanceTypes = [
    {
      id: BalanceType.Transferable,
      value: data.transferable,
      label: BALANCE_TYPE_CONFIG[BalanceType.Transferable].label,
      icon: BALANCE_TYPE_CONFIG[BalanceType.Transferable].icon,
      colorScheme: BALANCE_TYPE_CONFIG[BalanceType.Transferable].colors.card,
    },
    {
      id: BalanceType.Staking,
      value: data.staking?.total || new BN(0),
      label: BALANCE_TYPE_CONFIG[BalanceType.Staking].label,
      icon: BALANCE_TYPE_CONFIG[BalanceType.Staking].icon,
      colorScheme: BALANCE_TYPE_CONFIG[BalanceType.Staking].colors.card,
      details: data.staking && <StakingDetails stakingData={data.staking} token={token} />,
    },
    {
      id: BalanceType.Reserved,
      value: data.reserved.total,
      label: BALANCE_TYPE_CONFIG[BalanceType.Reserved].label,
      icon: BALANCE_TYPE_CONFIG[BalanceType.Reserved].icon,
      colorScheme: BALANCE_TYPE_CONFIG[BalanceType.Reserved].colors.card,
      details: <ReservedDetails reservedData={data.reserved} token={token} />,
    },
    {
      id: BalanceType.Governance,
      value: data.convictionVoting?.totalLocked || new BN(0),
      label: BALANCE_TYPE_CONFIG[BalanceType.Governance].label,
      icon: BALANCE_TYPE_CONFIG[BalanceType.Governance].icon,
      colorScheme: BALANCE_TYPE_CONFIG[BalanceType.Governance].colors.card,
      details: data.convictionVoting && <GovernanceDetails convictionVoting={data.convictionVoting} token={token} appId={appId} />,
    },
  ]

  const filteredBalanceTypes = balanceTypes.filter(type => types.includes(type.id))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
      {filteredBalanceTypes.map(type => (
        <BalanceCard
          key={type.label}
          value={type.value}
          total={data.total ?? new BN(0)}
          label={type.label}
          icon={type.icon}
          colorScheme={type.colorScheme}
          details={type.details}
          hidePercentage={hidePercentage}
          token={token}
        />
      ))}
    </div>
  )
}
