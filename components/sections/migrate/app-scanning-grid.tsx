'use client'

import type { AppDisplayInfo } from '@/lib/types/app-display'
import { memo } from 'react'
import { AppScanItem } from './app-scan-item'

interface AppScanningGridProps {
  apps: AppDisplayInfo[]
}

const AppScanningGrid = memo(({ apps }: AppScanningGridProps) => {
  return (
    <div
      className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 xl:grid-cols-12 gap-2 mt-2 mb-4"
      data-testid="app-sync-grid"
    >
      {apps.map(app => (
        <AppScanItem key={app.id} app={app} />
      ))}
    </div>
  )
})

export default AppScanningGrid
