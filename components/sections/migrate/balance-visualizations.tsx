'use client'

import type { Native, Reserved, Staking } from '@/state/types/ledger'
import { BN } from '@polkadot/util'
import { LockClosedIcon } from '@radix-ui/react-icons'
import { ArrowRightLeftIcon, BarChartIcon, Check, ClockIcon, Group, LockOpenIcon, User, UserCog } from 'lucide-react'
import type { ReactNode } from 'react'

import { ExplorerLink } from '@/components/ExplorerLink'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { Token } from '@/config/apps'
import { formatBalance } from '@/lib/utils'

interface NativeBalanceVisualizationProps {
  data: Native
  token: Token
  types?: string[]
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
  const percentage = Number(value.div(total).mul(new BN(100)).toString()).toFixed(2)

  return (
    <Card
      className={`w-full min-w-[150px] p-4 bg-linear-to-br ${colorScheme.gradient} ${colorScheme.border} transition-all duration-300 hover:shadow-md`}
    >
      <CardContent className="p-0 flex flex-col items-center justify-between min-h-[150px]">
        <div className="flex flex-col items-center justify-center">
          <div className={`${colorScheme.iconColor} mb-2`}>{icon}</div>
          <div className="text-2xl font-mono text-center font-semibold mb-1">{formatBalance(value, token, undefined, true)}</div>
          <div className="text-sm text-gray-600 mb-2">{label}</div>
        </div>
        {details && <div className="w-full mt-1">{details}</div>}
        {!hidePercentage && (
          <Badge
            variant="outline"
            className={`${colorScheme.badgeBg} ${colorScheme.badgeText} ${colorScheme.badgeBorder} text-xs font-medium px-3 py-0.5 rounded-full mt-2`}
          >
            {percentage}%
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}

const renderDetailsItem = (icon: ReactNode, label: string, value?: BN, token?: Token) => {
  const bnValue = value !== undefined ? value : new BN(0)
  return (
    <div className="flex justify-between mb-1 gap-1.5">
      <span className="flex items-center gap-1.5">
        {icon} <div className="text-sm text-gray-600">{label}</div>
      </span>
      <span className="font-mono font-medium">{formatBalance(bnValue, token, undefined, true)}</span>
    </div>
  )
}

const detailFlagStyle = 'flex justify-between text-xxs gap-1.5 px-1.5 py-0.5 rounded-xl [&_svg]:h-3 [&_svg]:w-3'

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

          <div className="flex flex-col gap-1 px-1">
            {/* Staked balance ready to withdraw */}
            {readyToWithdraw.gtn(0) && (
              <div className={`${detailFlagStyle} bg-green-400/60`}>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-gray-600" />
                  Ready to withdraw
                </span>
                <span className="font-mono font-medium">{formatBalance(readyToWithdraw, token, undefined, true)}</span>
              </div>
            )}
            {/* Staked balance not ready to withdraw */}
            {notReadyToWithdraw?.map(unlock => (
              <div key={`${unlock.era}-${unlock.value}`} className={`${detailFlagStyle} bg-polkadot-cyan/20`}>
                <span className="flex items-center gap-1.5">
                  <ClockIcon className="w-3.5 h-3.5 text-gray-600" /> {unlock.timeRemaining}
                </span>
                <span className="font-mono font-medium">{formatBalance(unlock.value, token, undefined, true)}</span>
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

      {reservedData.multisig?.total.gtn(0) && (
        <div className="flex flex-col gap-1">
          {renderDetailsItem(
            <LockClosedIcon className="w-4 h-4 text-polkadot-lime" />,
            'Multisig Deposit',
            reservedData.multisig.total,
            token
          )}
          <div className="flex flex-col gap-1 px-1">
            {reservedData.multisig.deposits.map((deposit: { callHash: string; deposit: BN }) => (
              <div key={deposit.callHash} className={`${detailFlagStyle} bg-polkadot-lime/20`}>
                <span className="flex items-center gap-1.5">
                  <Group className="w-3.5 h-3.5 text-gray-600" />
                  Call Hash:
                </span>
                <ExplorerLink value={deposit.callHash} disableLink disableTooltip truncate size="xs" />
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
  types = ['transferable', 'staking', 'reserved'],
  hidePercentage = false,
}: NativeBalanceVisualizationProps) => {
  const balanceTypes = [
    {
      id: 'transferable',
      value: data.transferable,
      label: 'Transferable',
      icon: <ArrowRightLeftIcon className="w-6 h-6" />,
      colorScheme: {
        gradient: 'from-polkadot-green/5 to-polkadot-green/15',
        border: 'border border-polkadot-green/20 hover:border-polkadot-green/40',
        iconColor: 'text-polkadot-green',
        badgeBg: 'bg-polkadot-green/70',
        badgeText: 'text-black font-semibold',
        badgeBorder: 'border-polkadot-green/30',
      },
    },
    {
      id: 'staking',
      value: data.staking?.total || new BN(0),
      label: 'Staked',
      icon: <BarChartIcon className="w-6 h-6" />,
      colorScheme: {
        gradient: 'from-polkadot-cyan/5 to-polkadot-cyan/15',
        border: 'border border-polkadot-cyan/20 hover:border-polkadot-cyan/40',
        iconColor: 'text-polkadot-cyan',
        badgeBg: 'bg-polkadot-cyan/70',
        badgeText: 'text-black font-semibold',
        badgeBorder: 'border-polkadot-cyan/30',
      },
      details: data.staking && <StakingDetails stakingData={data.staking} token={token} />,
    },
    {
      id: 'reserved',
      value: data.reserved.total,
      label: 'Reserved',
      icon: <LockClosedIcon className="w-6 h-6" />,
      colorScheme: {
        gradient: 'from-polkadot-lime/5 to-polkadot-lime/15',
        border: 'border border-polkadot-lime/20 hover:border-polkadot-lime/40',
        iconColor: 'text-polkadot-lime',
        badgeBg: 'bg-polkadot-lime/70',
        badgeText: 'text-black font-semibold',
        badgeBorder: 'border-polkadot-lime/30',
      },
      details: <ReservedDetails reservedData={data.reserved} token={token} />,
    },
  ]

  const filteredBalanceTypes = balanceTypes.filter(type => types.includes(type.id))
  // The properties can't be dynamic in tailwind, so we need to use a record
  type GridColumnCount = 1 | 2 | 3
  const gridCols: Record<GridColumnCount, string> = {
    1: 'sm:grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
  }

  return (
    <div className={`grid grid-cols-1 ${gridCols[filteredBalanceTypes.length as GridColumnCount]} gap-3 p-2`}>
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
