import { getValidApps } from '@/lib/services/synchronization.service'
import { getAppLightIcon } from '@/lib/utils'
import { observable } from '@legendapp/state'
import { polkadotAppConfig, type AppConfig, type AppId } from 'config/apps'
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

  // Load icons for valid apps and polkadot app
  async loadInitialIcons() {
    if (iconsStatus !== 'unloaded') return
    iconsStatus = 'loading'
    const appIcons: Partial<AppIcons> = {}

    const iconPromises = [...getValidApps(), polkadotAppConfig]
      .filter(app => app.rpcEndpoints && app.rpcEndpoints.length > 0)
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
