import { ledgerState$ } from '@/state/ledger'
import { notifications$ } from '@/state/notifications'
import { use$, useObservable } from '@legendapp/state/react'
import { useCallback } from 'react'

import { isSafari } from '@/lib/utils'

interface UseConnectionReturn {
  connectDevice: () => Promise<boolean>
  disconnectDevice: () => void
  isLedgerConnected: boolean
  isAppOpen: boolean
}

/**
 * A hook that provides functionality for synchronizing and managing Ledger accounts
 */
export const useConnection = (): UseConnectionReturn => {
  const isLedgerConnected$ = useObservable(() =>
    Boolean(ledgerState$.device.connection?.transport.get() && ledgerState$.device.connection?.genericApp.get())
  )

  const isLedgerConnected = use$(isLedgerConnected$)
  const isAppOpen = ledgerState$.device.connection?.get()?.isAppOpen ?? false

  // Handle device connection
  const connectDevice = useCallback(async () => {
    if (isSafari()) {
      notifications$.push({
        title: 'Safari Not Supported',
        description: 'Connectivity to Ledger device is not possible on Safari. Please use Chrome or Firefox.',
        type: 'warning',
        autoHideDuration: 6000,
      })
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
  }
}
