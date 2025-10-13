import axios from 'axios'
import { type App, AppStatus } from 'state/ledger'
import {
  type Address,
  type AddressBalance,
  type AddressWithVerificationStatus,
  type MultisigAddress,
  VerificationStatus,
} from 'state/types/ledger'
import { hasAddressBalance, hasBalance } from './balance'

/**
 * Retrieves a light icon for a given app from the Hub backend.
 *
 * @param appId - The ID of the app to retrieve the icon for.
 * @returns The icon data and any error that occurred.
 */
export const getAppLightIcon = async (appId: string) => {
  try {
    // First try to fetch from API
    const hubUrl = process.env.NEXT_PUBLIC_HUB_BACKEND_URL

    if (!hubUrl) {
      return { data: undefined, error: 'Hub URL not configured' }
    }

    try {
      const response = await axios.get(`${hubUrl}/app/${appId}/icon/light`)
      return { data: response.data, error: undefined }
    } catch (_apiError) {
      // API call failed, try local image as fallback
    }

    // If API fetch fails, check if the image exists locally
    const localImagePath = `/logos/chains/${appId}.svg`

    try {
      const res = await fetch(localImagePath)
      if (res.ok) {
        // For SVG files, we need to get the text content
        const svgContent = await res.text()
        return { data: svgContent, error: undefined }
      }
    } catch (_localError) {
      // Local image doesn't exist either
    }

    // If we get here, both API and local fetches failed
    return { data: undefined, error: 'Icon not found' }
  } catch (_error) {
    return { data: undefined, error: 'Error fetching app icon' }
  }
}

/**
 * Filters apps to only include those that were validly synchronized and have balances.
 *
 * @param apps - The apps to filter.
 * @returns Apps that are validly synchronized and have balances.
 */
export const filterValidSyncedAppsWithBalances = (apps: App[]): App[] => {
  return apps
    .map(app => ({
      ...app,
      accounts:
        app.accounts?.filter(
          (account: Address) => (!account.error || account.error?.source === 'migration') && hasAddressBalance(account)
        ) || [],
      multisigAccounts:
        app.multisigAccounts?.filter(
          (account: MultisigAddress) => (!account.error || account.error?.source === 'migration') && hasAddressBalance(account)
        ) || [],
    }))
    .filter(app => app.accounts.length > 0 || app.multisigAccounts?.length > 0)
}

/**
 * Checks if a single account meets ALL criteria for migration.
 * This is the single source of truth for migration eligibility.
 *
 * @param account - The account to check (Address or MultisigAddress)
 * @param checkSelected - Whether to check if account is selected (default: true)
 * @returns true if the account can be migrated, false otherwise
 */
export const canAccountBeMigrated = (account: Address | MultisigAddress) => {
  // Must be selected (unless explicitly skipped)
  if (!account.selected) return false

  // Must not be already migrated
  if (account.status === 'migrated') return false

  // Must have balances
  if (!account.balances || account.balances.length === 0) return false

  // Allow accounts with migration errors, but not other errors
  if (account.error && account.error.source !== 'migration') return false

  // ALL balances must meet migration criteria
  return account.balances.every(balance => {
    // Must have transferable balance
    if (!hasBalance([balance], true)) return false

    // Must have destination address - THIS IS THE KEY CHECK!
    if (!balance.transaction?.destinationAddress) return false

    return true
  })
}

/**
 * Filters apps to only include those that have accounts that can be migrated.
 * This function filters for accounts that are selected and have a balance and destination address.
 *
 * @param apps - The apps to filter.
 * @returns Apps with accounts that can be migrated.
 */
export const filterValidSelectedAccountsForMigration = (apps: App[]): App[] => {
  const filteredApps = apps
    .map(app => ({
      ...app,
      accounts: app.accounts?.filter(account => canAccountBeMigrated(account)) || [],
      multisigAccounts: app.multisigAccounts?.filter(account => canAccountBeMigrated(account)) || [],
    }))
    .filter(app => app.accounts.length > 0 || app.multisigAccounts?.length > 0)

  return filteredApps
}

/**
 * Filters apps to include only those with accounts or multisig accounts that have errors (excluding migration errors).
 *
 * @param apps - The list of apps to filter.
 * @returns Apps containing accounts or multisig accounts with non-migration errors.
 */
export const filterInvalidSyncedApps = (apps: App[]): App[] => {
  return apps
    .map(app => ({
      ...app,
      accounts: app.accounts?.filter((account: Address) => account.error && account.error?.source !== 'migration') || [],
      multisigAccounts:
        app.multisigAccounts?.filter((account: MultisigAddress) => account.error && account.error?.source !== 'migration') || [],
    }))
    .filter(app => app.accounts.length > 0 || app.multisigAccounts?.length > 0 || app.status === 'error')
}

/**
 * Checks if there are any accounts with errors.
 *
 * @param apps - The apps to check.
 * @returns True if there are accounts with errors, false otherwise.
 */
export const hasAccountsWithErrors = (apps: App[]): boolean => {
  return apps.some(
    app =>
      app.error?.source === 'synchronization' ||
      app.status === AppStatus.RESCANNING ||
      app.accounts?.some(account => account.error && account.error?.source !== 'migration') ||
      app.multisigAccounts?.some(account => account.error && account.error?.source !== 'migration')
  )
}

/**
 * Checks if the app has any accounts.
 *
 * @param app - The app to check.
 * @returns True if the app has accounts, false otherwise.
 */
export const hasAppAccounts = (app: App): boolean => {
  return Boolean((app.accounts && app.accounts.length > 0) || (app.multisigAccounts && app.multisigAccounts.length > 0))
}

/**
 * Gets the total number of accounts with balances for a single app.
 *
 * @param app - The app to check.
 * @returns The number of accounts with balances for the app.
 */
export const getAppTotalAccounts = (app: App): number => {
  return (app.accounts?.length || 0) + (app.multisigAccounts?.length || 0)
}

/**
 * Filters the accounts that will be saved in the app.
 *
 * @param app - The app whose accounts will be filtered.
 * @param filterByBalance - A function to test each account. Return true to keep the account, false otherwise.
 * @returns An array of accounts that satisfy the predicate.
 */
export function filterAccountsForApps<T extends Address | MultisigAddress>(accounts: T[], filterByBalance: boolean): T[] {
  return accounts.filter(
    account =>
      !filterByBalance ||
      (account.balances && hasBalance(account.balances)) ||
      account.error ||
      (account.memberMultisigAddresses && account.memberMultisigAddresses.length > 0)
  )
}

/**
 * Sets a default destination address for all balances in an account that have transactions
 * @param account The account (Address or MultisigAddress) to update
 * @param defaultDestinationAddress The default destination address to set
 * @returns The account with updated transaction destination addresses
 */
export function setDefaultDestinationAddress<T extends { balances?: AddressBalance[] }>(account: T, defaultDestinationAddress: string): T {
  if (!account.balances) {
    return account
  }

  return {
    ...account,
    balances: account.balances.map(balance => ({
      ...balance,
      transaction: {
        ...balance.transaction,
        destinationAddress: balance.transaction?.destinationAddress || defaultDestinationAddress,
      },
    })),
  }
}

/**
 * Adds destination addresses from a list of accounts to an address map
 * @param accounts - The accounts to process (can be regular or multisig accounts)
 * @param addressMap - The map to store unique addresses with their paths and status
 * @param polkadotAddresses - The list of polkadot addresses to check against
 */
export function addDestinationAddressesFromAccounts(
  accounts: Address[] | MultisigAddress[] | undefined,
  addressMap: Map<string, AddressWithVerificationStatus>,
  polkadotAddresses: string[]
): void {
  if (!accounts) return
  for (const account of accounts) {
    if (account.balances && account.balances.length > 0) {
      for (const balance of account.balances) {
        if (
          balance.transaction?.destinationAddress &&
          !addressMap.has(balance.transaction.destinationAddress) &&
          polkadotAddresses.includes(balance.transaction.destinationAddress)
        ) {
          addressMap.set(balance.transaction.destinationAddress, {
            address: balance.transaction.destinationAddress,
            path: account.path,
            status: VerificationStatus.PENDING,
          })
        }
      }
    }
  }
}
