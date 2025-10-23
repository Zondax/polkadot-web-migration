import type { TabItem } from '@/components/Tabs'
import { Spinner } from '@/components/icons'
import { ConnectTabContent } from '@/components/sections/migrate/connect-tab-content'
import { MigrateTabContent } from '@/components/sections/migrate/migrate-tab-content'
import { SynchronizeTabContent } from '@/components/sections/migrate/synchronize-tab-content'
import { ActionType, VerificationStatus } from '@/state/types/ledger'
import { AlertCircle, BanknoteArrowDown, CheckCircle, Clock, LockOpen, Send, Trash2, Users, Vote } from 'lucide-react'

export type MigrationTabValue = 'connect-device' | 'synchronize-accounts' | 'migrate'

export type MigrationTab = TabItem<MigrationTabValue>

export const migrationTabs: MigrationTab[] = [
  {
    value: 'connect-device',
    label: 'Connect Device',
    component: ConnectTabContent,
  },
  {
    value: 'synchronize-accounts',
    label: 'Synchronize Accounts',
    component: SynchronizeTabContent,
  },
  { value: 'migrate', label: 'Migrate', component: MigrateTabContent },
]

/**
 * Map of VerificationStatus to icon component and tooltip.
 * Used for rendering status indicators in address verification UI.
 */
export const verificationStatusMap: Record<VerificationStatus, { icon: React.ReactNode; tooltip: string }> = {
  [VerificationStatus.PENDING]: {
    icon: <Clock className="h-4 w-4 text-muted-foreground" />,
    tooltip: 'Pending verification',
  },
  [VerificationStatus.VERIFYING]: {
    icon: <Spinner className="h-4 w-4" />,
    tooltip: 'Verifying...',
  },
  [VerificationStatus.VERIFIED]: {
    icon: <CheckCircle className="h-4 w-4 text-green-500" />,
    tooltip: 'Verified',
  },
  [VerificationStatus.FAILED]: {
    icon: <AlertCircle className="h-4 w-4 text-red-500" />,
    tooltip: 'Failed verification',
  },
}

/**
 * Warning messages for migration flow
 */
export const MIGRATION_WARNINGS = {
  TRANSFER_ALL_WITH_PENDING_ACTIONS: {
    title: "You're About to Transfer All Your Funds",
    message:
      "You're transferring all your available funds and you still have pending actions. You'll need some balance to pay the fees later. By migrating everything now, you might not have enough left to cover those fees.",
  },
} as const

/**
 * Map of ActionType to icon component.
 * Used for rendering pending action icons in UI.
 */
export const ActionTypeMap: Record<ActionType, React.ReactNode> = {
  [ActionType.UNSTAKE]: <LockOpen size={16} />,
  [ActionType.WITHDRAW]: <BanknoteArrowDown size={16} />,
  [ActionType.IDENTITY]: <Trash2 size={16} />,
  [ActionType.MULTISIG_CALL]: <Users size={16} />,
  [ActionType.MULTISIG_TRANSFER]: <Send size={16} />,
  [ActionType.ACCOUNT_INDEX]: <Trash2 size={16} />,
  [ActionType.PROXY]: <Trash2 size={16} />,
  [ActionType.GOVERNANCE]: <Vote size={16} />,
}
