import { FetchingAddressesPhase, type SyncProgress } from '@/state/types/ledger'
import type { JSX } from 'react'

/**
 * Generates a status label based on the current synchronization phase
 * @param progress - The sync or deep scan progress object
 * @param defaultLabel - The default label to show when no phase is set
 * @returns A JSX element with the formatted status label
 */
export function getSyncStatusLabel(progress: SyncProgress | undefined, defaultLabel = 'Synchronizing apps'): JSX.Element {
  if (!progress) {
    return <span className="text-sm text-gray-600">{defaultLabel}</span>
  }

  let statusLabel = ''
  switch (progress.phase) {
    case FetchingAddressesPhase.FETCHING_ADDRESSES:
      statusLabel = '📥 Fetching addresses from Ledger'
      break
    case FetchingAddressesPhase.PROCESSING_ACCOUNTS:
      statusLabel = '💾 Processing accounts (balances, multisig and more)'
      break
    default:
      statusLabel = defaultLabel
  }

  return (
    <span className="text-sm text-gray-600">{statusLabel + (progress.total > 0 ? ` (${progress.scanned} / ${progress.total})` : '')}</span>
  )
}
