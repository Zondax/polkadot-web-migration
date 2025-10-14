import { use$, useObservable } from '@legendapp/state/react'
import { useCallback, useState } from 'react'
import { AppStatus, ledgerState$, type App } from 'state/ledger'

import type { AppId } from '@/config/apps'
import type { AppDisplayInfo, DeepScanAppDisplayInfo } from '@/lib/types/app-display'
import {
  filterInvalidSyncedApps,
  filterValidSyncedAppsWithBalances,
  hasAccountsWithErrors,
  prepareDeepScanDisplayApps,
  prepareDisplayApps,
} from '@/lib/utils'
import { AccountType, type Address, type MultisigAddress, type SyncProgress, type TransactionSettings } from '@/state/types/ledger'

export type UpdateTransaction = (
  transaction: Partial<TransactionSettings>,
  appId: string,
  accountIndex: number,
  balanceIndex: number,
  isMultisig: boolean
) => void

export type ToggleAccountSelection = (appId: AppId, accountAddress: string, checked?: boolean) => void

// Helper function to rescan accounts with errors for a given app and account type
const rescanAccountsWithErrors = async (accounts: Address[] | MultisigAddress[], accountType: AccountType, appId: AppId) => {
  for (const account of accounts) {
    // Check for cancellation before each account
    if (ledgerState$.apps.isSyncCancelRequested.get()) {
      return
    }
    if (account.error && appId) {
      await ledgerState$.getAccountBalance(appId, accountType, account)
    }
  }
}

interface UseSynchronizationReturn {
  // State
  status: AppStatus | undefined
  syncProgress: SyncProgress
  isLedgerConnected: boolean
  isRescaning: boolean
  isSyncCancelRequested: boolean

  // Deep scan state
  isDeepScanning: boolean
  isDeepScanCancelling: boolean
  isDeepScanCompleted: boolean
  deepScanProgress: SyncProgress
  deepScanDisplayApps: DeepScanAppDisplayInfo[]

  // Computed values
  hasAccountsWithErrors: boolean
  filteredAppsWithoutErrors: App[]
  filteredAppsWithErrors: App[]
  displayApps: AppDisplayInfo[]
  polkadotAddresses: string[]
  hasMultisigAccounts: boolean

  // Actions
  rescanFailedAccounts: () => Promise<void>
  restartSynchronization: () => void
  cancelSynchronization: () => void
  updateTransaction: UpdateTransaction

  // Deep scan actions
  deepScanApp: (
    selectedChain: AppId | 'all',
    accountIndices: number[],
    addressIndices: number[]
  ) => Promise<{
    success: boolean
    newAccountsFound: number
  }>
  cancelDeepScan: () => void
  resetDeepScan: () => void

  // Selection actions
  toggleAccountSelection: ToggleAccountSelection
  toggleAllAccounts: (checked: boolean) => void
}

/**
 * A hook that provides functionality for synchronizing and managing Ledger accounts
 */
export const useSynchronization = (): UseSynchronizationReturn => {
  const apps$ = ledgerState$.apps.apps
  const status = use$(ledgerState$.apps.status)
  const syncProgress = use$(ledgerState$.apps.syncProgress)
  const isSyncCancelRequested = use$(ledgerState$.apps.isSyncCancelRequested)
  const [isRescaning, setIsRescaning] = useState<boolean>(false)

  // Deep scan state
  const isDeepScanning = use$(ledgerState$.deepScan.isScanning)
  const isDeepScanCancelling = use$(ledgerState$.deepScan.isCancelling)
  const isDeepScanCompleted = use$(ledgerState$.deepScan.isCompleted)
  const deepScanProgress = use$(ledgerState$.deepScan.progress)
  const deepScanApps = use$(ledgerState$.deepScan.apps)

  // Check if Ledger is connected
  const isLedgerConnected = use$(() => Boolean(ledgerState$.device.connection?.transport && ledgerState$.device.connection?.genericApp))

  // Get all apps from the observable state
  const apps = use$(() => apps$.get())

  // Compute derived values from apps
  const accountsWithErrors = use$(() => hasAccountsWithErrors(apps))
  const appsWithoutErrors = use$(() => filterValidSyncedAppsWithBalances(apps))
  const appsWithErrors = use$(() => filterInvalidSyncedApps(apps))
  const displayApps = use$(() => prepareDisplayApps(apps, appsWithoutErrors))
  const deepScanDisplayApps = use$(() => prepareDeepScanDisplayApps(deepScanApps))

  const hasMultisigAccounts = apps.some(
    app => app.status === AppStatus.SYNCHRONIZED && app.multisigAccounts && app.multisigAccounts.length > 0
  )

  // Extract Polkadot addresses
  const polkadotAddresses$ = useObservable(() => {
    return ledgerState$.apps.polkadotApp.accounts?.map(account => account.address)
  })

  const polkadotAddresses = use$(() => polkadotAddresses$.get())

  // Rescan all failed accounts and apps
  const rescanFailedAccounts = useCallback(async () => {
    if (isRescaning) return // Prevent multiple simultaneous rescans

    setIsRescaning(true)

    try {
      // Get the latest filtered apps with errors
      const appsToRescan = filterInvalidSyncedApps(apps$.get())

      for (const app of appsToRescan) {
        // Check if cancellation is requested
        if (ledgerState$.apps.isSyncCancelRequested.get()) {
          return
        }

        // Skip apps without a valid ID
        if (!app.id) continue

        if (app.status === AppStatus.ERROR) {
          // Rescan the entire app if it has an error status
          await ledgerState$.synchronizeAccount(app.id)
          continue
        }

        await rescanAccountsWithErrors(app.accounts ?? [], AccountType.ACCOUNT, app.id)
        await rescanAccountsWithErrors(app.multisigAccounts ?? [], AccountType.MULTISIG, app.id)
      }
    } finally {
      setIsRescaning(false)
    }
  }, [isRescaning, apps$])

  // Clear synchronization data
  const restartSynchronization = useCallback(() => {
    ledgerState$.clearSynchronization()
    ledgerState$.synchronizeAccounts()
  }, [])

  const updateTransaction = useCallback(
    // Partial transaction update: accepts a partial transaction object and merges it into the current transaction state
    (partial: Partial<TransactionSettings>, appId: string, accountIndex: number, balanceIndex: number, isMultisig = false) => {
      const appIndex = apps.findIndex(app => app.id === appId)
      if (appIndex !== -1) {
        const transaction =
          ledgerState$.apps.apps[appIndex][isMultisig ? 'multisigAccounts' : 'accounts'][accountIndex].balances[balanceIndex].transaction
        transaction.set({
          ...transaction.get(),
          ...partial,
        })
      }
    },
    [apps]
  )

  const cancelSynchronization = useCallback(() => {
    ledgerState$.cancelSynchronization()
  }, [])

  // ---- Deep scan functions ----

  const deepScanApp = useCallback(async (selectedChain: AppId | 'all', accountIndices: number[], addressIndices: number[]) => {
    return await ledgerState$.deepScanApp(selectedChain, accountIndices, addressIndices)
  }, [])

  const cancelDeepScan = useCallback(() => {
    ledgerState$.cancelDeepScan()
  }, [])

  const resetDeepScan = useCallback(() => {
    ledgerState$.resetDeepScan()
  }, [])

  // ---- Account selection functions ----

  /**
   * Toggle selection state of a specific account
   */
  const toggleAccountSelection = useCallback(
    (appId: AppId, accountAddress: string, checked?: boolean) => {
      const apps = apps$.get()
      const appIndex = apps.findIndex(app => app.id === appId)

      const accountIndex = apps[appIndex]?.accounts?.findIndex(account => account.address === accountAddress) ?? -1
      const multisigAccountIndex = apps[appIndex]?.multisigAccounts?.findIndex(account => account.address === accountAddress) ?? -1

      // Regular account
      if (accountIndex !== -1 && appIndex !== -1) {
        const currentValue = apps?.[appIndex]?.accounts?.[accountIndex]?.selected || false
        apps$[appIndex].accounts[accountIndex].selected.set(checked ?? !currentValue)
      } else if (multisigAccountIndex !== -1 && appIndex !== -1) {
        const currentValue = apps?.[appIndex]?.multisigAccounts?.[multisigAccountIndex]?.selected || false
        apps$[appIndex].multisigAccounts[multisigAccountIndex].selected.set(checked ?? !currentValue)
      }
    },
    [apps$]
  )

  /**
   * Set selection state for all accounts
   */
  const toggleAllAccounts = useCallback(
    (checked: boolean) => {
      const currentApps = apps$.get()

      currentApps.forEach((app, i) => {
        if (!app.error) {
          if (app.accounts) {
            apps$[i].accounts.forEach((_, j) => {
              apps$[i].accounts[j].selected.set(checked)
            })
          }
          if (app.multisigAccounts) {
            apps$[i].multisigAccounts.forEach((_, j) => {
              apps$[i].multisigAccounts[j].selected.set(checked)
            })
          }
        }
      })
    },
    [apps$]
  )

  return {
    // State
    status,
    syncProgress,
    isLedgerConnected,
    isRescaning,
    isSyncCancelRequested,

    // Deep scan state
    isDeepScanning,
    isDeepScanCancelling,
    isDeepScanCompleted,
    deepScanProgress,
    deepScanDisplayApps,

    // Computed values
    hasAccountsWithErrors: accountsWithErrors,
    filteredAppsWithoutErrors: appsWithoutErrors,
    filteredAppsWithErrors: appsWithErrors,
    displayApps,
    polkadotAddresses: polkadotAddresses,
    hasMultisigAccounts,

    // Actions
    rescanFailedAccounts,
    restartSynchronization,
    cancelSynchronization,
    updateTransaction,

    // Deep scan actions
    deepScanApp,
    cancelDeepScan,
    resetDeepScan,

    // Selection actions
    toggleAccountSelection,
    toggleAllAccounts,
  }
}
