import type { TabItem } from '@/components/Tabs'
import { Spinner } from '@/components/icons'
import { ConnectTabContent } from '@/components/sections/migrate/connect-tab-content'
import { MigrateTabContent } from '@/components/sections/migrate/migrate-tab-content'
import { SynchronizeTabContent } from '@/components/sections/migrate/synchronize-tab-content'
import { VerificationStatus } from '@/state/types/ledger'
import { AlertCircle, CheckCircle, Clock } from 'lucide-react'

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
    icon: <Spinner />,
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
