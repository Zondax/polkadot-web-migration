'use client'

import { observer, use$ } from '@legendapp/state/react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { type App, AppStatus } from 'state/ledger'
import { uiState$ } from 'state/ui'

import { CustomTooltip } from '@/components/CustomTooltip'
import { useSynchronization } from '@/components/hooks/useSynchronization'
import TokenIcon from '@/components/TokenIcon'
import { Badge } from '@/components/ui/badge'
import { type AppConfig, appsConfigs, getChainName } from '@/config/apps'
import { cn, getAppTotalAccounts, hasAppAccounts } from '@/lib/utils'

interface AppScanItemProps {
  app: App
}

const AppScanItem = ({ app }: AppScanItemProps) => {
  const icons = use$(uiState$.icons)
  const icon = icons[app.id]
  const appName = app.name || getChainName(app.id) || app.id
  const { status } = app
  const hasAccounts = hasAppAccounts(app)
  const totalAccounts = getAppTotalAccounts(app)

  let displayBadge = true
  let statusIcon: React.ReactNode
  let statusClass = 'border-gray-200 bg-white'
  let statusText = 'Waiting'

  // Define different app states for UI
  switch (status) {
    case AppStatus.SYNCHRONIZED:
    case AppStatus.MIGRATED:
      if (hasAccounts) {
        statusIcon = totalAccounts
        statusClass = 'border-green-200 bg-green-50 opacity-100'
        statusText = `Ready to migrate (${totalAccounts} ${totalAccounts === 1 ? 'account' : 'accounts'})`
      } else {
        statusIcon = totalAccounts
        statusClass = 'border-gray-200 bg-white opacity-80'
        statusText = 'No accounts with funds to migrate'
      }
      break
    case AppStatus.ERROR:
      statusIcon = <AlertCircle className="h-3.5 w-3.5 text-red-500" />
      statusClass = 'border-red-200 bg-red-50 opacity-100'
      statusText = 'Failed synchronization'
      break
    case AppStatus.LOADING:
      statusIcon = <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
      statusClass = 'border-indigo-200 bg-indigo-50 opacity-100 animate-pulse'
      statusText = 'Synchronizing'
      break
    case AppStatus.RESCANNING:
      statusIcon = <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-500" />
      statusClass = 'border-yellow-200 bg-yellow-50 opacity-50'
      statusText = 'Rescanning'
      displayBadge = false
      break
    default:
      statusIcon = undefined
      statusClass = 'border-gray-200 bg-white opacity-20'
      statusText = 'Not synchronized'
      displayBadge = false
      break
  }

  return (
    <CustomTooltip tooltipBody={statusText}>
      <div className={cn('flex flex-col items-center p-3 rounded-lg border transition-all', statusClass)}>
        <div className="relative mb-2">
          <TokenIcon icon={icon} symbol={appName.substring(0, 3)} size="md" />
          {displayBadge && (
            <div className="absolute -right-2 -bottom-2">
              <Badge variant="outline" className="bg-white h-5 min-w-5 px-0 justify-center rounded-full text-xs">
                {statusIcon}
              </Badge>
            </div>
          )}
        </div>
        <span className="text-xs font-medium truncate max-w-full">{appName}</span>
      </div>
    </CustomTooltip>
  )
}

const AppScanningGrid = observer(() => {
  const { apps: scannedApps } = useSynchronization()

  // Show all available apps (from config), including those still loading
  const allApps: AppConfig[] = Array.from(appsConfigs.values())
  const appsToSync = allApps.filter(appConfig => appConfig?.rpcEndpoint) as AppConfig[]

  // Create display apps with enhanced information
  const displayApps: App[] = appsToSync.map(config => {
    const scannedApp = scannedApps.find(app => app.id === config.id)

    if (scannedApp) {
      return scannedApp
    }

    // App not yet scanned/loading
    return {
      id: config.id,
      name: config.name,
      token: config.token,
      status: undefined,
    }
  })

  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 xl:grid-cols-12 gap-2 mt-2 mb-4">
      {displayApps.map(app => (
        <AppScanItem key={app.id} app={app} />
      ))}
    </div>
  )
})

export default AppScanningGrid
