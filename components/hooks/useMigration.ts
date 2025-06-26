import { VerificationStatus, type AddressWithVerificationStatus, type MigratingItem } from '@/state/types/ledger'
import { observable } from '@legendapp/state'
import { use$ } from '@legendapp/state/react'
import { useCallback, useEffect } from 'react'
import { ledgerState$, type App } from 'state/ledger'

import type { AppId } from '@/config/apps'
import { addDestinationAddressesFromAccounts, filterSelectedAccountsForMigration, filterValidSyncedAppsWithBalances } from '@/lib/utils'

interface UseMigrationReturn {
  // Computed values
  filteredAppsWithoutErrors: App[]
  appsForMigration: App[]
  migrationResults: {
    success: number
    total: number
  }
  destinationAddressesByApp: Record<AppId, AddressWithVerificationStatus[]>
  migratingItem: MigratingItem | undefined

  // Verification related
  allVerified: boolean
  anyFailed: boolean
  isVerifying: boolean
  verifyDestinationAddresses: () => Promise<void>
  verifySelectedAppsAddresses: () => Promise<void>
  verifyFailedAddresses: () => Promise<void>

  // Migration actions
  migrateSelected: () => Promise<void>
  restartSynchronization: () => void

  // Selection actions
  toggleAccountSelection: (appId: AppId, accountAddress: string, checked?: boolean) => void
  toggleAllAccounts: (checked: boolean) => void
}

// Create the observable outside of the hook to ensure it persists across renders
const destinationAddressesStatus$ = observable<Record<AppId, AddressWithVerificationStatus[]>>({})
// Create an observable for tracking verification in progress
const isVerifying$ = observable(false)

/**
 * A hook that provides functionality for migrating and verifying Ledger accounts
 */
export const useMigration = (): UseMigrationReturn => {
  const apps$ = ledgerState$.apps.apps

  // Get all apps from the observable state
  const apps = use$(() => apps$.get())

  // Get migration results from the observable state
  const successMigration = use$(ledgerState$.apps.migrationResult.success)
  const totalMigration = use$(ledgerState$.apps.migrationResult.total)

  // Compute derived values from apps
  const appsWithoutErrors = use$(() => filterValidSyncedAppsWithBalances(apps))

  const appsForMigration = use$(() => filterSelectedAccountsForMigration(appsWithoutErrors))

  // Get destination addresses used for each app (only selected accounts)
  const destinationAddressesByApp = use$(() =>
    appsForMigration.reduce((acc: Record<AppId, AddressWithVerificationStatus[]>, app) => {
      // Create a map to track unique addresses with their paths
      const addressMap = new Map<string, AddressWithVerificationStatus>()

      // Add destination addresses from regular accounts
      addDestinationAddressesFromAccounts(app.accounts, addressMap)

      // Add destination addresses from multisig accounts
      addDestinationAddressesFromAccounts(app.multisigAccounts, addressMap)

      // Convert the map values to an array
      const uniqueDestinationAddresses = Array.from(addressMap.values())

      if (uniqueDestinationAddresses.length > 0) {
        acc[app.id] = uniqueDestinationAddresses
      }
      return acc
    }, {})
  )

  // Get the latest state of address verification status
  const destinationAddressesStatus = use$(() => destinationAddressesStatus$.get())
  // Get the verification in progress state
  const isVerifying = use$(() => isVerifying$.get())

  // Get the current migrating item from the observable state
  const migratingItem = use$(() => {
    const currentItem = ledgerState$.apps.currentMigratedItem.get()
    if (!currentItem) return undefined

    return currentItem
  })

  // Initialize or update the observable with the latest data from destinationAddressesByApp
  useEffect(() => {
    // Get current apps in the status observable
    const currentApps = Object.keys(destinationAddressesStatus$.peek() || {}) as AppId[]

    // Clear any apps that no longer exist in destinationAddressesByApp
    for (const appId of currentApps) {
      if (!destinationAddressesByApp[appId]) {
        destinationAddressesStatus$[appId].delete()
      }
    }

    // Update the observable with the latest data for all apps
    for (const [appId, addresses] of Object.entries(destinationAddressesByApp)) {
      if (
        !destinationAddressesStatus$[appId as AppId].peek() ||
        destinationAddressesStatus$[appId as AppId].peek()?.length !== addresses.length
      ) {
        destinationAddressesStatus$[appId as AppId].set(addresses)
      }
    }
  }, [destinationAddressesByApp])

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

  // ---- Verification related functions ----

  /**
   * Verify a single address with the Ledger device
   */
  const verifyAddress = useCallback(async (appId: AppId, addressIndex: number): Promise<void> => {
    const address = destinationAddressesStatus$[appId][addressIndex].peek()

    // Update the verification status to 'verifying'
    destinationAddressesStatus$[appId][addressIndex].status.set(VerificationStatus.VERIFYING)

    const response = await ledgerState$.verifyDestinationAddresses(appId, address.address, address.path)

    // The property is spelled 'isVerified' in the API response
    destinationAddressesStatus$[appId][addressIndex].status.set(
      response.isVerified ? VerificationStatus.VERIFIED : VerificationStatus.FAILED
    )
  }, [])

  /**
   * Verify all destination addresses
   */
  const verifyDestinationAddresses = useCallback(async () => {
    isVerifying$.set(true)

    try {
      // Iterate through each app and verify all destination addresses
      for (const appId of Object.keys(destinationAddressesStatus$.peek())) {
        const addresses = destinationAddressesStatus$[appId as AppId].peek() || []

        for (let i = 0; i < addresses.length; i++) {
          await verifyAddress(appId as AppId, i)
        }
      }
    } finally {
      isVerifying$.set(false)
    }
  }, [verifyAddress])

  /**
   * Verify only destination addresses from selected apps
   */
  const verifySelectedAppsAddresses = useCallback(async () => {
    isVerifying$.set(true)

    try {
      // Get the current selected apps
      const selectedApps = filterSelectedAccountsForMigration(appsForMigration)
      const selectedAppIds = new Set(selectedApps.map(app => app.id as AppId))

      // Iterate through each app and verify only addresses from selected apps
      for (const appId of Object.keys(destinationAddressesStatus$.peek())) {
        // Skip apps that are not selected
        if (!selectedAppIds.has(appId as AppId)) continue

        const addresses = destinationAddressesStatus$[appId as AppId].peek() || []

        for (let i = 0; i < addresses.length; i++) {
          await verifyAddress(appId as AppId, i)
        }
      }
    } finally {
      isVerifying$.set(false)
    }
  }, [verifyAddress, appsForMigration])

  /**
   * Verify only the addresses that have failed verification
   */
  const verifyFailedAddresses = useCallback(async () => {
    isVerifying$.set(true)

    try {
      // Iterate through each app and verify only failed destination addresses
      for (const appId of Object.keys(destinationAddressesStatus$.peek())) {
        const addresses = destinationAddressesStatus$[appId as AppId].peek() || []

        for (let i = 0; i < addresses.length; i++) {
          const address = destinationAddressesStatus$[appId as AppId][i].peek()

          // Only verify addresses with failed status
          if (address.status === 'failed') {
            await verifyAddress(appId as AppId, i)
          }
        }
      }
    } finally {
      isVerifying$.set(false)
    }
  }, [verifyAddress])

  // Compute verification status flags
  const allVerified = use$(() => {
    const addresses = Object.values(destinationAddressesStatus).flat()
    return addresses.length > 0 && addresses.every(addr => addr.status === 'verified')
  })

  const anyFailed = use$(() => {
    return Object.values(destinationAddressesStatus)
      .flat()
      .some(addr => addr.status === 'failed')
  })

  // ---- Migration related functions ----
  /**
   * Migrate only selected accounts
   */
  const migrateSelected = useCallback(async () => {
    await ledgerState$.migrateSelected()
  }, [])

  /**
   * Clear synchronization data and restart the synchronization process
   */
  const restartSynchronization = useCallback(async () => {
    // Clear synchronization data
    ledgerState$.clearSynchronization()

    const result = await ledgerState$.connectLedger()
    if (result.connected && result.isAppOpen) {
      ledgerState$.synchronizeAccounts()
    }

    // Reset verification status
    destinationAddressesStatus$.set({})
    isVerifying$.set(false)
  }, [])

  return {
    // Computed values
    filteredAppsWithoutErrors: appsWithoutErrors,
    appsForMigration,
    migrationResults: {
      success: successMigration,
      total: totalMigration,
    },
    destinationAddressesByApp: destinationAddressesStatus,
    migratingItem,

    // Verification related
    allVerified,
    anyFailed,
    isVerifying,
    verifyDestinationAddresses,
    verifySelectedAppsAddresses,
    verifyFailedAddresses,

    // Migration actions
    migrateSelected,
    restartSynchronization,

    // Selection actions
    toggleAccountSelection,
    toggleAllAccounts,
  }
}
