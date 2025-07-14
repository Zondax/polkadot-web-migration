import { observable } from '@legendapp/state'
import { type AppConfig, type AppId, appsConfigs } from 'config/apps'

import { getAppLightIcon } from '@/lib/utils'

import type { AppIcons } from './ledger'

interface UIState {
  icons: Partial<{ [key in AppId]: any }>
}

const initialUIState: UIState = {
  icons: {},
}

let iconsStatus: 'loading' | 'loaded' | 'unloaded' = 'unloaded'

export const uiState$ = observable({
  ...initialUIState,

  async loadInitialIcons() {
    if (iconsStatus !== 'unloaded') return
    iconsStatus = 'loading'
    const appIcons: Partial<AppIcons> = {}

    const iconPromises = Array.from(appsConfigs.values())
      .filter(app => app.rpcEndpoint)
      .map(async (app: AppConfig) => {
        const lightIconResponse = await getAppLightIcon(app.id)
        if (typeof lightIconResponse?.error === 'undefined') {
          appIcons[app.id] = lightIconResponse?.data
        }
      })

    await Promise.all(iconPromises)
    uiState$.icons.set(appIcons)
    iconsStatus = 'loaded'
  },
})
