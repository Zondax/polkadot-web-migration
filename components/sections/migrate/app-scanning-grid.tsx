'use client'

import { observer } from '@legendapp/state/react'
import type { App } from 'state/ledger'

import { useSynchronization } from '@/components/hooks/useSynchronization'
import { getValidApps } from '@/lib/services/synchronization.service'
import { AppScanItem } from './app-scan-item'

const AppScanningGrid = observer(() => {
  const { apps: scannedApps } = useSynchronization()

  // Show all available apps (from config), including those still loading
  const appsToSync = getValidApps()

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
    <div
      className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 xl:grid-cols-12 gap-2 mt-2 mb-4"
      data-testid="app-sync-grid"
    >
      {displayApps.map(app => (
        <AppScanItem key={app.id} app={app} />
      ))}
    </div>
  )
})

export default AppScanningGrid
