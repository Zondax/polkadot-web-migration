'use client'

import { CustomTooltip } from '@/components/CustomTooltip'
import TokenIcon from '@/components/TokenIcon'
import { Badge } from '@/components/ui/badge'
import { getChainName } from '@/config/apps'
import type { AppDisplayInfo, DeepScanAppDisplayInfo } from '@/lib/types/app-display'
import { cn } from '@/lib/utils'
import { use$ } from '@legendapp/state/react'
import { AlertCircle, Check, Loader2 } from 'lucide-react'
import { useMemo } from 'react'
import { AppStatus } from 'state/ledger'
import { uiState$ } from 'state/ui'

interface AppScanItemProps {
  app: AppDisplayInfo | DeepScanAppDisplayInfo
  mode?: 'sync' | 'deep-scan'
}

interface StatusConfig {
  icon: React.ReactNode
  className: string
  text: string
  showBadge: boolean
}

/**
 * Generates a pluralized account text
 */
function pluralizeAccounts(count: number, newAccounts = false): string {
  return `${count} ${newAccounts ? 'new ' : ''}${count === 1 ? 'account' : 'accounts'}`
}

/**
 * Determines the visual status configuration based on app state and mode
 */
function getStatusConfig(
  status: AppStatus | undefined,
  mode: 'sync' | 'deep-scan',
  hasAccounts: boolean,
  totalAccounts: number,
  newAccountsFound: number
): StatusConfig {
  const isDeepScan = mode === 'deep-scan'

  switch (status) {
    case AppStatus.SYNCHRONIZED:
    case AppStatus.MIGRATED:
      if (isDeepScan) {
        if (newAccountsFound > 0) {
          return {
            icon: newAccountsFound,
            className: 'border-green-200 bg-green-50 opacity-100',
            text: `Deep scan complete (${pluralizeAccounts(newAccountsFound, isDeepScan)} found)`,
            showBadge: true,
          }
        }
        return {
          icon: 0,
          className: 'border-gray-200 bg-white opacity-80',
          text: 'Deep scan complete - no new accounts found',
          showBadge: true,
        }
      }

      if (hasAccounts) {
        return {
          icon: totalAccounts,
          className: 'border-green-200 bg-green-50 opacity-100',
          text: `Ready to migrate (${pluralizeAccounts(totalAccounts)})`,
          showBadge: true,
        }
      }
      return {
        icon: totalAccounts,
        className: 'border-gray-200 bg-white opacity-80',
        text: 'No accounts with funds to migrate',
        showBadge: true,
      }

    case AppStatus.ERROR:
      return {
        icon: <AlertCircle data-testid="error-icon" className="h-3.5 w-3.5 text-red-500" />,
        className: 'border-red-200 bg-red-50 opacity-100',
        text: isDeepScan ? 'Deep scan failed' : 'Failed synchronization',
        showBadge: true,
      }

    case AppStatus.ADDRESSES_FETCHED:
      return {
        icon: <Check data-testid="addresses-fetched-icon" className="h-3.5 w-3.5 text-blue-500" />,
        className: 'border-blue-200 bg-blue-50 opacity-100',
        text: 'Addresses fetched',
        showBadge: true,
      }

    case AppStatus.LOADING:
      return {
        icon: <Loader2 data-testid="loading-icon" className="h-3.5 w-3.5 animate-spin text-indigo-500" />,
        className: 'border-indigo-200 bg-indigo-50 opacity-100 animate-pulse',
        text: isDeepScan ? 'Deep scanning...' : 'Synchronizing',
        showBadge: true,
      }

    case AppStatus.RESCANNING:
      return {
        icon: <Loader2 data-testid="loading-icon" className="h-3.5 w-3.5 animate-spin text-yellow-500" />,
        className: 'border-yellow-200 bg-yellow-50 opacity-50',
        text: 'Rescanning',
        showBadge: false,
      }

    case AppStatus.NO_NEED_MIGRATION:
      return {
        icon: <Check data-testid="no-need-migration-icon" className="h-3.5 w-3.5 text-green-500" />,
        className: 'border-gray-200 bg-white opacity-80',
        text: 'No need to migrate',
        showBadge: true,
      }

    default:
      return {
        icon: undefined,
        className: 'border-gray-200 bg-white opacity-20',
        text: isDeepScan ? 'Waiting to scan' : 'Not synchronized',
        showBadge: false,
      }
  }
}

export const AppScanItem = ({ app, mode = 'sync' }: AppScanItemProps) => {
  const icons = use$(uiState$.icons)
  const icon = icons[app.id]
  const appName = app.name || getChainName(app.id) || app.id

  // Calculate account metrics
  const hasAccounts = app.totalTransactions > 0
  const totalAccounts = app.totalTransactions
  const originalCount = 'originalAccountCount' in app ? app.originalAccountCount : 0
  const newAccountsFound = mode === 'deep-scan' ? Math.max(0, totalAccounts - originalCount) : 0

  // Memoize status configuration to avoid recalculating on every render
  const statusConfig = useMemo(
    () => getStatusConfig(app.status, mode, hasAccounts, totalAccounts, newAccountsFound),
    [app.status, mode, hasAccounts, totalAccounts, newAccountsFound]
  )

  return (
    <CustomTooltip tooltipBody={statusConfig.text}>
      <article
        className={cn('flex flex-col items-center p-3 rounded-lg border transition-all', statusConfig.className)}
        data-testid="app-sync-grid-item"
        aria-label={`${appName}: ${statusConfig.text}`}
      >
        <div className="relative mb-2">
          <TokenIcon icon={icon} symbol={appName.substring(0, 3)} size="md" data-testid="app-sync-icon" />
          {statusConfig.showBadge && (
            <div className="absolute -right-2 -bottom-2">
              <Badge
                variant="outline"
                className="bg-white h-5 min-w-5 px-0 justify-center rounded-full text-xs"
                data-testid="app-sync-badge"
                aria-label={`Status: ${statusConfig.text}`}
              >
                {statusConfig.icon}
              </Badge>
            </div>
          )}
        </div>
        <span className="text-xs font-medium truncate max-w-full">{appName}</span>
      </article>
    </CustomTooltip>
  )
}
