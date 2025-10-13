import type { AppId } from '@/config/apps'
import type { AppStatus } from '@/state/ledger'

/**
 * Lightweight type for displaying app status in loading screens
 */
export interface AppDisplayInfo {
  id: AppId
  name: string
  status: AppStatus | undefined
  totalTransactions: number
}

/**
 * Extended type for displaying app status during deep scan
 */
export interface DeepScanAppDisplayInfo extends AppDisplayInfo {
  originalAccountCount: number
}
