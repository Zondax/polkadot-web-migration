import { use$ } from '@legendapp/state/react'
import { useCallback } from 'react'
import { isSafari } from '@/lib/utils'
import { AppStatus, ledgerState$ } from '@/state/ledger'
import { notifications$ } from '@/state/notifications'

interface UseConnectionReturn {
  connectDevice: () => Promise<boolean>
  disconnectDevice: () => void
  isLedgerConnected: boolean
  isAppOpen: boolean
  isConnecting: boolean
}

/**
 * A hook that provides functionality for synchronizing and managing Ledger accounts
 */
export const useConnection = (): UseConnectionReturn => {
  // Subscribe to the whole `connection` object so reactivity also fires when
  // it transitions to/from undefined. Reading nested `.get()` through optional
  // chaining (the previous pattern) registers no subscription when the parent
  // is undefined, so disconnects never propagated to the UI.
  const connection = use$(ledgerState$.device.connection)
  const isLedgerConnected = Boolean(connection?.transport && connection?.genericApp)
  const isAppOpen = connection?.isAppOpen ?? false

  // True while a connect attempt or an app sync is in flight.
  const isConnecting = use$(() => {
    const appsStatus = ledgerState$.apps.status.get()
    return Boolean(ledgerState$.device.isLoading.get()) || appsStatus === AppStatus.LOADING || appsStatus === AppStatus.ADDRESSES_FETCHED
  })

  // Handle device connection
  const connectDevice = useCallback(async () => {
    if (isSafari()) {
      notifications$.push({
        title: 'Safari Not Supported',
        description:
          'Connecting to your Ledger device is not possible in Safari due to browser limitations. Please use Chrome or Firefox for the best experience.',
        type: 'warning',
        autoHideDuration: 6000,
      })
      return false
    }
    // Guard against re-entry while a connect or sync is already in flight.
    if (
      ledgerState$.device.isLoading.get() ||
      ledgerState$.apps.status.get() === AppStatus.LOADING ||
      ledgerState$.apps.status.get() === AppStatus.ADDRESSES_FETCHED
    ) {
      return false
    }
    const result = await ledgerState$.connectLedger()

    if (result.connected && result.isAppOpen) {
      ledgerState$.synchronizeAccounts()
      return true
    }
    return false
  }, [])

  // Handle device disconnection
  const disconnectDevice = useCallback(() => {
    ledgerState$.disconnectLedger()
  }, [])

  return {
    // Actions
    connectDevice,
    disconnectDevice,
    isLedgerConnected,
    isAppOpen,
    isConnecting,
  }
}
