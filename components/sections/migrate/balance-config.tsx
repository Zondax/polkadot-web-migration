import { LockClosedIcon } from '@radix-ui/react-icons'
import { ArrowRightLeft, BarChart, Group } from 'lucide-react'
import type { ReactNode } from 'react'

export enum BalanceType {
  Transferable = 'transferable',
  Staking = 'staking',
  Reserved = 'reserved',
  Governance = 'governance',
}

interface BalanceColorConfig {
  // For badge display (used in balance-summary)
  badge: {
    background: string
    text: string
  }
  // For card display (used in balance-visualizations)
  card: {
    gradient: string
    border: string
    iconColor: string
    badgeBg: string
    badgeText: string
    badgeBorder: string
  }
}

interface BalanceTypeConfig {
  id: BalanceType
  label: string
  icon: ReactNode
  colors: BalanceColorConfig
}

export const BALANCE_TYPE_CONFIG: Record<BalanceType, BalanceTypeConfig> = {
  [BalanceType.Transferable]: {
    id: BalanceType.Transferable,
    label: 'Transferable',
    icon: <ArrowRightLeft className="w-6 h-6" />,
    colors: {
      badge: {
        background: 'bg-polkadot-green/10',
        text: 'text-polkadot-green-dark',
      },
      card: {
        gradient: 'from-polkadot-green/5 to-polkadot-green/15',
        border: 'border border-polkadot-green/20 hover:border-polkadot-green/40',
        iconColor: 'text-polkadot-green',
        badgeBg: 'bg-polkadot-green/70',
        badgeText: 'text-black font-semibold',
        badgeBorder: 'border-polkadot-green/30',
      },
    },
  },
  [BalanceType.Staking]: {
    id: BalanceType.Staking,
    label: 'Staking',
    icon: <BarChart className="w-6 h-6" />,
    colors: {
      badge: {
        background: 'bg-polkadot-cyan/10',
        text: 'text-polkadot-cyan-dark',
      },
      card: {
        gradient: 'from-polkadot-cyan/5 to-polkadot-cyan/15',
        border: 'border border-polkadot-cyan/20 hover:border-polkadot-cyan/40',
        iconColor: 'text-polkadot-cyan',
        badgeBg: 'bg-polkadot-cyan/70',
        badgeText: 'text-black font-semibold',
        badgeBorder: 'border-polkadot-cyan/30',
      },
    },
  },
  [BalanceType.Reserved]: {
    id: BalanceType.Reserved,
    label: 'Reserved',
    icon: <LockClosedIcon className="w-6 h-6" />,
    colors: {
      badge: {
        background: 'bg-polkadot-lime/10',
        text: 'text-polkadot-lime-dark',
      },
      card: {
        gradient: 'from-polkadot-lime/5 to-polkadot-lime/15',
        border: 'border border-polkadot-lime/20 hover:border-polkadot-lime/40',
        iconColor: 'text-polkadot-lime',
        badgeBg: 'bg-polkadot-lime/70',
        badgeText: 'text-black font-semibold',
        badgeBorder: 'border-polkadot-lime/30',
      },
    },
  },
  [BalanceType.Governance]: {
    id: BalanceType.Governance,
    label: 'Governance',
    icon: <Group className="w-6 h-6" />,
    colors: {
      badge: {
        background: 'bg-gray-100',
        text: 'text-storm-700',
      },
      card: {
        gradient: 'from-gray-50 to-gray-100',
        border: 'border border-gray-200 hover:border-gray-300',
        iconColor: 'text-storm-700',
        badgeBg: 'bg-gray-200',
        badgeText: 'text-storm-700 font-semibold',
        badgeBorder: 'border-gray-300',
      },
    },
  },
}

// Helper function to get icon with custom size
export const getBalanceIcon = (type: BalanceType, className = 'w-3 h-3') => {
  const config = BALANCE_TYPE_CONFIG[type]
  if (!config) return null

  switch (type) {
    case BalanceType.Transferable:
      return <ArrowRightLeft className={className} />
    case BalanceType.Staking:
      return <BarChart className={className} />
    case BalanceType.Reserved:
      return <LockClosedIcon className={className} />
    case BalanceType.Governance:
      return <Group className={className} />
  }
}
