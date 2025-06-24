import { use$, useObservable } from '@legendapp/state/react'
import { useCallback, useState } from 'react'
import { type App, AppStatus, ledgerState$ } from 'state/ledger'

import type { AppId } from '@/config/apps'
import { filterInvalidSyncedApps, filterValidSyncedAppsWithBalances, hasAccountsWithErrors } from '@/lib/utils'
import { AccountType, type Address, type MultisigAddress, type Transaction } from '@/state/types/ledger'

export type UpdateTransaction = (
  transaction: Partial<Transaction>,
  appId: string,
  accountIndex: number,
  balanceIndex: number,
  isMultisig: boolean
) => void

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
  // General
  apps: App[]

  // State
  status: AppStatus | undefined
  syncProgress: {
    scanned: number
    total: number
    percentage: number
  }
  isLedgerConnected: boolean
  isRescaning: boolean
  isSyncCancelRequested: boolean

  // Computed values
  hasAccountsWithErrors: boolean
  filteredAppsWithoutErrors: App[]
  filteredAppsWithErrors: App[]
  polkadotAddresses: string[]
  hasMultisigAccounts: boolean

  // Actions
  rescanFailedAccounts: () => Promise<void>
  restartSynchronization: () => void
  cancelSynchronization: () => void
  updateTransaction: UpdateTransaction
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

  // Check if Ledger is connected
  const isLedgerConnected = use$(() => Boolean(ledgerState$.device.connection?.transport && ledgerState$.device.connection?.genericApp))

  // Get all apps from the observable state
  const apps = use$(() => apps$.get())

  // Compute derived values from apps
  const accountsWithErrors = use$(() => hasAccountsWithErrors(apps))
  const appsWithoutErrors = use$(() => filterValidSyncedAppsWithBalances(apps))
  const appsWithErrors = use$(() => filterInvalidSyncedApps(apps))

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
    (partial: Partial<Transaction>, appId: string, accountIndex: number, balanceIndex: number, isMultisig = false) => {
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

  return {
    // General
    apps,

    // State
    status,
    syncProgress,
    isLedgerConnected,
    isRescaning,
    isSyncCancelRequested,

    // Computed values
    hasAccountsWithErrors: accountsWithErrors,
    filteredAppsWithoutErrors: appsWithoutErrors,
    filteredAppsWithErrors: appsWithErrors,
    polkadotAddresses: polkadotAddresses,
    hasMultisigAccounts,

    // Actions
    rescanFailedAccounts,
    restartSynchronization,
    cancelSynchronization: ledgerState$.cancelSynchronization,
    updateTransaction,
  }
}
