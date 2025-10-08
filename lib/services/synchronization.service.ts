import { getApiAndProvider } from '@/lib/account'
import { isDevelopment } from '@/lib/utils/env'
import { InternalError } from '@/lib/utils/error'
import { ledgerClient } from '@/state/client/ledger'
import { AppStatus, type App } from '@/state/ledger'
import { notifications$ } from '@/state/notifications'
import { FetchingAddressesPhase, type Address, type SyncProgress } from '@/state/types/ledger'
import type { AppConfig, AppId } from 'config/apps'
import { appsConfigs, polkadotAppConfig } from 'config/apps'
import { maxAddressesToFetch } from 'config/config'
import { InternalErrorType } from 'config/errors'
import { syncApps } from 'config/mockData'
import { processAccountsForApp } from './account-processing.service'

/**
 * Checks if cancellation is requested and throws an error if so
 * @param onCancel - Optional cancellation callback function
 * @throws {Error} When cancellation is requested
 */
function checkCancellation(onCancel?: () => boolean): void {
  if (onCancel?.()) {
    throw new InternalError(InternalErrorType.OPERATION_CANCELLED)
  }
}

export interface SyncResult {
  success: boolean
  apps: App[]
  polkadotApp?: App
  error?: string
}

/**
 * Checks if an app needs to be migrated based on its bip44 path.
 *
 * @param {AppConfig} appConfig - The app configuration to check
 * @returns {boolean} True if the app needs to be migrated, false otherwise
 */
export function needsMigration(appConfig: AppConfig): boolean {
  return appConfig.bip44Path !== polkadotAppConfig.bip44Path
}

/**
 * Determines if an app is valid based on its configuration.
 *
 * @param {AppConfig} appConfig - The app configuration to check
 * @returns {boolean} True if the app is valid, false otherwise
 */
export function isValidApp(appConfig: AppConfig | undefined): appConfig is AppConfig {
  return Boolean(appConfig?.rpcEndpoints && appConfig.rpcEndpoints.length > 0)
}

/**
 * Get the list of apps to synchronize.
 *
 * @description This function returns all the apps that have valid RPC endpoints.
 * It is used to determine which apps should be synchronized.
 *
 * @returns {AppConfig[]} An array of app configurations with valid RPC endpoints.
 */

export function getValidApps(): AppConfig[] {
  const appsToSync: (AppConfig | undefined)[] = Array.from(appsConfigs.values())

  return appsToSync.filter(isValidApp) as AppConfig[]
}

/**
 * Determines which blockchain applications should be synchronized based on configuration.
 *
 * @description Filters the available app configurations to only include those with valid RPC endpoints.
 * In development mode, it can be limited to specific apps via environment variables.
 *
 * @returns {AppConfig[]} Array of app configurations that should be synchronized
 * @throws {InternalError} When environment variable parsing fails in development mode
 */
export function getAppsToSync(): AppConfig[] {
  let appsToSync: (AppConfig | undefined)[] = Array.from(appsConfigs.values())

  // If in development environment, use apps specified in environment variable
  if (isDevelopment()) {
    const appsToSyncInDev = syncApps
    if (appsToSyncInDev && appsToSyncInDev.length > 0) {
      appsToSync = appsToSyncInDev.map(appId => appsConfigs.get(appId as AppId))
    }
  }
  return appsToSync.filter((app): app is AppConfig => Boolean(app && isValidApp(app) && needsMigration(app)))
}

/**
 * Get the list of apps that do not need to be migrated.
 *
 * @description This function returns all the apps that do not need to be migrated.
 * It is used to determine which apps do not need to be synchronized.
 *
 * @returns {AppConfig[]} An array of app configurations that do not need to be migrated.
 */
export function getAppsToSkipMigration(): AppConfig[] {
  const appsToSync: (AppConfig | undefined)[] = getValidApps()

  return appsToSync.filter((app): app is AppConfig => Boolean(app && !needsMigration(app)))
}

/**
 * Fetches account addresses from the Ledger device for a specific blockchain application.
 *
 * @description Communicates with the Ledger device to retrieve the list of addresses
 * for the specified blockchain application. This is the first step in the synchronization process.
 *
 * @param {AppConfig} appConfig - The blockchain application configuration
 * @param {() => boolean} [onCancel] - Optional cancellation callback function
 * @returns {Promise<Address[]>} Array of addresses retrieved from the Ledger device
 * @throws {InternalError} When Ledger communication fails or returns no results
 */
async function fetchAddressesFromLedger(appConfig: AppConfig, onCancel?: () => boolean): Promise<Address[]> {
  try {
    const response = await ledgerClient.synchronizeAccounts(appConfig, onCancel)

    if (!response.result) {
      throw new InternalError(InternalErrorType.SYNC_ERROR, {
        operation: 'fetchAddressesFromLedger',
        context: { appId: appConfig.id },
      })
    }

    return response.result
  } catch (error) {
    if (error instanceof InternalError) {
      throw error
    }
    throw new InternalError(InternalErrorType.SYNC_ERROR, {
      operation: 'fetchAddressesFromLedger',
      context: { appId: appConfig.id, error },
    })
  }
}

/**
 * Fetches account addresses from the Ledger device using custom indices.
 *
 * @description Similar to fetchAddressesFromLedger but allows specifying custom account
 * and address indices for deep scanning.
 *
 * @param {AppConfig} appConfig - The blockchain application configuration
 * @param {number[]} accountIndices - Array of account indices to scan
 * @param {number[]} addressIndices - Array of address indices to scan per account
 * @param {() => boolean} [onCancel] - Optional cancellation callback function
 * @returns {Promise<Address[]>} Array of addresses retrieved from the Ledger device
 * @throws {InternalError} When Ledger communication fails or returns no results
 */
async function fetchAddressesFromLedgerWithIndices(
  appConfig: AppConfig,
  accountIndices: number[],
  addressIndices: number[],
  onCancel?: () => boolean
): Promise<Address[]> {
  try {
    const response = await ledgerClient.synchronizeAccountsWithIndices(appConfig, accountIndices, addressIndices, onCancel)

    if (!response.result) {
      return []
    }

    return response.result
  } catch (error) {
    if (error instanceof InternalError) {
      throw error
    }
    throw new InternalError(InternalErrorType.SYNC_ERROR, {
      operation: 'fetchAddressesFromLedgerWithIndices',
      context: { appId: appConfig.id, error },
    })
  }
}

/**
 * Synchronizes and enriches account data for a single blockchain application.
 *
 * @description This is the main function that orchestrates the complete synchronization process
 * for a single blockchain app. It fetches addresses from Ledger, connects to the blockchain,
 * retrieves account balances, identity info, proxy info, and multisig data.
 *
 * @param {AppConfig} appConfig - The blockchain application configuration
 * @param {string[]} polkadotAddresses - Array of Polkadot addresses for cross-chain migration
 * @param {boolean} [filterByBalance=true] - Whether to filter out accounts with zero balance
 * @returns {Promise<App>} Complete app object with synchronized account data
 * @throws {InternalError} When any step of the synchronization process fails
 */
export async function synchronizeAppAccounts(
  appConfig: AppConfig,
  polkadotAddresses: string[],
  filterByBalance = true,
  onCancel?: () => boolean,
  preloadedAddresses?: Address[]
): Promise<{
  app: App
  polkadotAddressesForApp: string[]
}> {
  try {
    // Check for cancellation before starting
    checkCancellation(onCancel)

    // Use preloaded addresses if provided, otherwise fetch from Ledger
    const addresses = preloadedAddresses || (await fetchAddressesFromLedger(appConfig, onCancel))

    // Check for cancellation after fetching addresses
    checkCancellation(onCancel)

    if (!appConfig.rpcEndpoints || appConfig.rpcEndpoints.length === 0) {
      throw new InternalError(InternalErrorType.SYNC_ERROR, {
        operation: 'synchronizeAppAccounts',
        context: { appId: appConfig.id, reason: 'RPC endpoint not configured' },
      })
    }

    // Get API connection
    const { api, provider } = await getApiAndProvider(appConfig.rpcEndpoints)

    if (!api) {
      throw new InternalError(InternalErrorType.FAILED_TO_CONNECT_TO_BLOCKCHAIN, {
        operation: 'synchronizeAppAccounts',
        context: { appId: appConfig.id, rpcEndpoints: appConfig.rpcEndpoints },
      })
    }

    try {
      // Process accounts using the account processing service
      const { success, data, error } = await processAccountsForApp(addresses, appConfig, api, polkadotAddresses, filterByBalance)

      if (!success || !data) {
        throw new InternalError(InternalErrorType.SYNC_ERROR, {
          operation: 'synchronizeAppAccounts',
          context: {
            appId: appConfig.id,
            error: error?.description || 'Failed to process accounts',
          },
        })
      }

      const { accounts, multisigAccounts, collections, polkadotAddressesForApp } = data

      // Check if we have any accounts after filtering
      if (accounts.length === 0 && multisigAccounts.length === 0) {
        // Show notification about no accounts found
        notifications$.push({
          title: 'No accounts to migrate',
          description: `We could not find any accounts with a balance to migrate for ${appConfig.id.charAt(0).toUpperCase() + appConfig.id.slice(1)}.`,
          appId: appConfig.id,
          type: 'info',
          autoHideDuration: 5000,
        })

        return {
          app: {
            name: appConfig.name,
            id: appConfig.id,
            token: appConfig.token,
            status: AppStatus.SYNCHRONIZED,
            accounts: [],
            multisigAccounts: [],
          },
          polkadotAddressesForApp: [],
        }
      }

      return {
        app: {
          name: appConfig.name,
          id: appConfig.id,
          token: appConfig.token,
          status: AppStatus.SYNCHRONIZED,
          accounts,
          multisigAccounts,
          collections,
        },
        polkadotAddressesForApp,
      }
    } finally {
      // Always disconnect the API
      if (api) {
        await api.disconnect()
      } else if (provider) {
        await provider.disconnect()
      }
    }
  } catch (error) {
    console.debug('Error synchronizing app accounts:', appConfig.id, error)

    if (error instanceof InternalError) {
      return {
        app: {
          name: appConfig.name,
          id: appConfig.id,
          token: appConfig.token,
          status: AppStatus.ERROR,
          error: {
            source: 'synchronization',
            description: error.description || 'Synchronization failed',
          },
        },
        polkadotAddressesForApp: [],
      }
    }

    throw new InternalError(InternalErrorType.SYNC_ERROR, {
      operation: 'synchronizeAppAccounts',
      context: { appId: appConfig.id, error },
    })
  }
}

/**
 * Synchronizes Polkadot accounts specifically for cross-chain migration setup.
 *
 * @description This function handles the special case of Polkadot account synchronization,
 * which is required first to establish destination addresses for cross-chain migrations.
 * It only tests connectivity and retrieves basic account info without full processing.
 *
 * @returns {Promise<App>} Polkadot app object with basic account information
 * @throws {InternalError} When Polkadot synchronization fails
 *
 * @example
 * ```typescript
 * const polkadotApp = await synchronizePolkadotAccounts()
 * const destinationAddresses = polkadotApp.accounts?.map(acc => acc.address) || []
 * ```
 */
export async function synchronizePolkadotAccounts(onCancel?: () => boolean, preloadedAddresses?: Address[]): Promise<App> {
  try {
    const appConfig = polkadotAppConfig

    // Use preloaded addresses if provided, otherwise fetch from Ledger
    const addresses = preloadedAddresses || (await ledgerClient.synchronizeAccounts(appConfig, onCancel)).result

    const noAccountsNotification = {
      title: 'No Polkadot accounts found',
      description: 'There are no Polkadot accounts available to migrate from on your Ledger device.',
      appId: appConfig.id,
      type: 'info' as const,
      autoHideDuration: 5000,
    }

    if (!addresses) {
      notifications$.push(noAccountsNotification)
      throw new InternalError(InternalErrorType.SYNC_ERROR, {
        operation: 'synchronizePolkadotAccounts',
        context: { reason: 'No accounts found on Ledger device' },
      })
    }

    if (!appConfig.rpcEndpoints || appConfig.rpcEndpoints.length === 0) {
      notifications$.push(noAccountsNotification)
      throw new InternalError(InternalErrorType.SYNC_ERROR, {
        operation: 'synchronizePolkadotAccounts',
        context: { reason: 'RPC endpoint not configured' },
      })
    }

    const accounts = addresses

    // Test API connection
    const { api, provider } = await getApiAndProvider(appConfig.rpcEndpoints)

    if (!api) {
      throw new InternalError(InternalErrorType.FAILED_TO_CONNECT_TO_BLOCKCHAIN, {
        operation: 'synchronizePolkadotAccounts',
        context: { rpcEndpoints: appConfig.rpcEndpoints },
      })
    }

    // Disconnect API immediately after testing
    if (api) {
      await api.disconnect()
    } else if (provider) {
      await provider.disconnect()
    }

    // Only add a notification if there are no accounts
    if (accounts.length === 0) {
      notifications$.push(noAccountsNotification)
    }

    return {
      name: appConfig.name,
      id: appConfig.id,
      token: appConfig.token,
      status: AppStatus.SYNCHRONIZED,
      accounts,
    }
  } catch (error) {
    console.debug('Error synchronizing Polkadot accounts:', error)

    if (error instanceof InternalError) {
      return {
        name: polkadotAppConfig.name,
        id: polkadotAppConfig.id,
        token: polkadotAppConfig.token,
        status: AppStatus.ERROR,
        error: {
          source: 'synchronization',
          description: error.description || 'Failed to synchronize Polkadot accounts',
        },
      }
    }

    throw new InternalError(InternalErrorType.SYNC_ERROR, {
      operation: 'synchronizePolkadotAccounts',
      context: { error },
    })
  }
}

/**
 * Synchronizes accounts for a single blockchain application.
 *
 * @description This is a convenience wrapper around synchronizeAppAccounts for single app operations.
 * It maintains the same interface for backward compatibility and single-app use cases.
 *
 * @param {AppConfig} appConfig - The blockchain application configuration
 * @param {string[]} polkadotAddresses - Array of Polkadot addresses for cross-chain migration
 * @param {boolean} [filterByBalance=true] - Whether to filter out accounts with zero balance
 * @returns {Promise<App>} Complete app object with synchronized account data
 * @throws {InternalError} When synchronization fails
 *
 * @example
 * ```typescript
 * const app = await synchronizeSingleApp(kusamaConfig, polkadotAddresses)
 * ```
 */
export async function synchronizeSingleApp(
  appConfig: AppConfig,
  polkadotAddresses: string[],
  filterByBalance = true,
  onCancel?: () => boolean
): Promise<{
  app: App
  polkadotAddresses: string[]
}> {
  const { app, polkadotAddressesForApp } = await synchronizeAppAccounts(appConfig, polkadotAddresses, filterByBalance, onCancel)
  return {
    app,
    polkadotAddresses: polkadotAddressesForApp,
  }
}

/**
 * Orchestrates the complete synchronization process for all configured blockchain applications.
 *
 * @description This is the main entry point for the synchronization process. It:
 * 1. Synchronizes Polkadot accounts first (for destination addresses)
 * 2. Iterates through all configured apps
 * 3. Provides real-time progress updates via callbacks
 * 4. Handles cancellation requests
 * 5. Manages loading states for UI feedback
 *
 * @param {(progress: SyncProgress) => void} [onProgress] - Callback for progress updates
 * @param {() => boolean} [onCancel] - Function that returns true if cancellation is requested
 * @param {(app: App) => void} [onAppStart] - Callback when an app starts synchronizing
 * @param {() => void} [onProcessingAccountsStart] - Callback when processing accounts starts
 * @param {(app: App) => void} [onAppComplete] - Callback when an app completes synchronization
 * @returns {Promise<SyncResult>} Result containing all synchronized apps and success status
 * @throws {InternalError} When the overall synchronization process fails
 */
/**
 * Result of a deep scan operation
 */
export interface DeepScanResult {
  success: boolean
  apps: (App & { originalAccountCount: number })[]
  newAccountsFound: number
  error?: string
}

/**
 * Orchestrates the deep scan process for selected blockchain applications with custom account and address indices.
 *
 * @description Similar to synchronizeAllApps but allows scanning custom account/address indices.
 * Uses the same two-phase approach: fetch addresses from Ledger sequentially, then process in parallel.
 * This function enables users to discover accounts at non-standard indices (beyond the default scan range).
 *
 * @param {AppId | 'all'} selectedChain - Either a specific chain ID or 'all' to scan all chains
 * @param {number[]} accountIndices - Array of account indices to scan (e.g., [0, 1, 2, 10, 20])
 * @param {number[]} addressIndices - Array of address indices to scan per account (e.g., [0, 1, 2])
 * @param {App[]} currentApps - Currently synchronized apps to merge new accounts with
 * @param {(progress: SyncProgress) => void} [onProgress] - Progress callback
 * @param {() => boolean} [onCancel] - Cancellation check callback
 * @param {(app: App & { originalAccountCount: number }) => void} [onAppStart] - Callback when app starts
 * @param {(app: App & { originalAccountCount: number }) => void} [onAppUpdate] - Callback when app completes
 * @returns {Promise<DeepScanResult>} Result containing updated apps and count of new accounts found
 */
export async function deepScanAllApps(
  selectedChain: AppId | 'all',
  accountIndices: number[],
  addressIndices: number[],
  currentApps: App[],
  onProgress?: (progress: SyncProgress) => void,
  onCancel?: () => boolean,
  onAppStart?: (app: App & { originalAccountCount: number }) => void,
  onProcessingAccountsStart?: () => void,
  onAppUpdate?: (app: App & { originalAccountCount: number }) => void
): Promise<DeepScanResult> {
  try {
    // Validate inputs
    if (accountIndices.length === 0 || addressIndices.length === 0) {
      throw new InternalError(InternalErrorType.SYNC_ERROR, {
        operation: 'deepScanAllApps',
        context: { reason: 'No valid account or address indices to scan' },
      })
    }

    // Get polkadot addresses for cross-chain migration
    const polkadotAddresses: string[] = []
    const polkadotApp = currentApps.find(app => app.id === 'polkadot')
    if (polkadotApp?.accounts) {
      polkadotAddresses.push(...polkadotApp.accounts.map(account => account.address))
    }

    // Get all scannable apps (apps with valid RPC endpoints)
    const scannableApps = getAppsToSync()

    // Determine which apps to scan based on selection
    const syncAllChains = selectedChain === 'all'
    const appsToScan = syncAllChains ? scannableApps : scannableApps.filter(appConfig => appConfig.id === selectedChain)

    if (appsToScan.length === 0) {
      throw new InternalError(InternalErrorType.SYNC_ERROR, {
        operation: 'deepScanAllApps',
        context: { reason: 'No valid apps to scan' },
      })
    }

    // Initialize progress tracking
    const totalApps = appsToScan.length

    // Save original account counts for each app to track new accounts
    const originalAccountCounts = new Map<AppId, number>()
    for (const appConfig of appsToScan) {
      const existingApp = currentApps.find(app => app.id === appConfig.id)
      const originalCount = (existingApp?.accounts?.length || 0) + (existingApp?.multisigAccounts?.length || 0)
      originalAccountCounts.set(appConfig.id, originalCount)
    }

    // Initialize apps for progress tracking
    const initialApps = appsToScan.map(appConfig => {
      const existingApp = currentApps.find(app => app.id === appConfig.id)
      const originalCount = originalAccountCounts.get(appConfig.id) || 0
      const app: App & { originalAccountCount: number } = {
        id: appConfig.id,
        name: appConfig.name,
        token: appConfig.token,
        accounts: existingApp?.accounts || [],
        multisigAccounts: existingApp?.multisigAccounts || [],
        status: AppStatus.LOADING,
        originalAccountCount: originalCount,
      }
      return app
    })

    // Notify initial apps
    for (const app of initialApps) {
      onAppStart?.(app)
    }

    // ===== PHASE 0: Skip apps that don't need synchronization =====
    if (syncAllChains) {
      const appsToBeSkipped = getAppsToSkipMigration()
      for (const appConfig of appsToBeSkipped) {
        onAppStart?.({
          id: appConfig.id,
          name: appConfig.name,
          token: appConfig.token,
          status: AppStatus.NO_NEED_MIGRATION,
          originalAccountCount: 0,
        })
      }
    }

    // ===== PHASE 1: Fetch addresses from Ledger for all apps =====
    const addressesByApp = new Map<AppId, Address[]>()

    for (let i = 0; i < appsToScan.length; i++) {
      // Check for cancellation
      checkCancellation(onCancel)

      const appConfig = appsToScan[i]

      // Update progress
      onProgress?.({
        scanned: i,
        total: totalApps,
        percentage: Math.round((i / totalApps) * 50), // Phase 1 is 0-50%
        phase: FetchingAddressesPhase.FETCHING_ADDRESSES,
      })

      // Fetch addresses from Ledger with custom indices
      try {
        const addresses = await fetchAddressesFromLedgerWithIndices(appConfig, accountIndices, addressIndices, onCancel)
        addressesByApp.set(appConfig.id, addresses)

        const currentApp = initialApps.find(app => app.id === appConfig.id)
        if (currentApp) {
          currentApp.status = AppStatus.ADDRESSES_FETCHED
          onAppUpdate?.(currentApp)
        }
      } catch (error) {
        console.error(`[DEEP_SCAN] Failed to fetch addresses for ${appConfig.name}:`, error)
        addressesByApp.set(appConfig.id, [])

        // Update app with error status
        const appWithError = initialApps.find(app => app.id === appConfig.id)
        if (appWithError) {
          appWithError.status = AppStatus.ERROR
          appWithError.error = {
            source: 'synchronization',
            description: 'Failed to fetch addresses from Ledger',
          }
          onAppUpdate?.(appWithError)
        }
      }
    }

    // ===== PHASE 2: Process accounts (fetch balances, multisig, etc.) in parallel =====
    onProcessingAccountsStart?.()

    let processedAppsCount = 0
    const updatedApps = [...currentApps]
    let newAccountsFound = 0

    const appProcessingPromises = []
    for (const appConfig of appsToScan) {
      const promise = (async () => {
        try {
          const preloadedAddresses = addressesByApp.get(appConfig.id)
          const result = await synchronizeAppAccounts(appConfig, polkadotAddresses, true, onCancel, preloadedAddresses)

          // Update progress
          processedAppsCount++
          onProgress?.({
            scanned: processedAppsCount,
            total: appsToScan.length,
            percentage: 50 + Math.round((processedAppsCount / appsToScan.length) * 50), // 50-100%
            phase: FetchingAddressesPhase.PROCESSING_ACCOUNTS,
          })

          // Check for existing addresses to avoid duplicates
          const existingApp = currentApps.find(app => app.id === appConfig.id)
          const existingAddresses = new Set([
            ...(existingApp?.accounts || []).map(acc => acc.address),
            ...(existingApp?.multisigAccounts || []).map(acc => acc.address),
          ])

          // Only add accounts that don't already exist
          const newAccounts = (result.app.accounts || []).filter(acc => !existingAddresses.has(acc.address))
          const newMultisigAccounts = (result.app.multisigAccounts || []).filter(acc => !existingAddresses.has(acc.address))

          const newAccountCount = newAccounts.length + newMultisigAccounts.length
          console.debug(`[DEEP_SCAN] ${appConfig.name}: Found ${newAccountCount} new accounts`)

          // Update the app in the scanned apps list
          const originalCount = originalAccountCounts.get(appConfig.id) || 0
          const updatedApp: App & { originalAccountCount: number } = {
            ...result.app,
            status: AppStatus.SYNCHRONIZED,
            accounts: [...(existingApp?.accounts || []), ...newAccounts],
            multisigAccounts: [...(existingApp?.multisigAccounts || []), ...newMultisigAccounts],
            originalAccountCount: originalCount,
          }

          // Notify completion
          onAppUpdate?.(updatedApp)

          // Merge results with existing app data if there are new accounts
          const hasNewAccounts = newAccountCount > 0
          if (hasNewAccounts) {
            // Find the app in the updated apps array
            let existingAppInUpdated = updatedApps.find((a: App) => a.id === appConfig.id)

            // If the app doesn't exist in updatedApps, create it
            if (!existingAppInUpdated) {
              existingAppInUpdated = {
                id: appConfig.id,
                name: appConfig.name,
                token: appConfig.token,
                status: AppStatus.SYNCHRONIZED,
                accounts: [],
                multisigAccounts: [],
              } as App
              updatedApps.push(existingAppInUpdated)
            }

            // Add the new accounts
            existingAppInUpdated.accounts = [...(existingAppInUpdated.accounts || []), ...newAccounts]
            existingAppInUpdated.multisigAccounts = [...(existingAppInUpdated.multisigAccounts || []), ...newMultisigAccounts]

            // Clear any error status since we successfully found accounts
            if (existingAppInUpdated.status === AppStatus.ERROR) {
              existingAppInUpdated.status = AppStatus.SYNCHRONIZED
              delete existingAppInUpdated.error
            }

            newAccountsFound += newAccountCount
          }

          return { ...result, success: true, newAccounts: newAccountCount }
        } catch (error) {
          if (error instanceof InternalError && error.errorType === InternalErrorType.OPERATION_CANCELLED) {
            throw error // Re-throw cancellation errors
          }

          console.error(`[DEEP_SCAN] ${appConfig.name} processing failed:`, error)

          // Update progress
          processedAppsCount++
          onProgress?.({
            scanned: processedAppsCount,
            total: appsToScan.length,
            percentage: 50 + Math.round((processedAppsCount / appsToScan.length) * 50),
            phase: FetchingAddressesPhase.PROCESSING_ACCOUNTS,
          })

          // Update app with error status
          const originalCount = originalAccountCounts.get(appConfig.id) || 0
          const errorApp: App & { originalAccountCount: number } = {
            id: appConfig.id,
            name: appConfig.name,
            token: appConfig.token,
            status: AppStatus.ERROR,
            error: {
              source: 'synchronization',
              description: 'Failed to process accounts',
            },
            originalAccountCount: originalCount,
          }

          onAppUpdate?.(errorApp)

          return { success: false, newAccounts: 0 }
        }
      })()
      appProcessingPromises.push(promise)
    }

    await Promise.all(appProcessingPromises)

    // Final progress update
    onProgress?.({
      scanned: totalApps,
      total: totalApps,
      percentage: 100,
      phase: FetchingAddressesPhase.PROCESSING_ACCOUNTS,
    })

    // Create result with updated apps including originalAccountCount
    const resultApps = initialApps.map(initialApp => {
      const updatedApp = updatedApps.find(app => app.id === initialApp.id)
      return {
        ...initialApp,
        ...(updatedApp || {}),
        originalAccountCount: initialApp.originalAccountCount,
      } as App & { originalAccountCount: number }
    })

    console.debug(`[DEEP_SCAN] Scan completed. Total new accounts found: ${newAccountsFound}`)

    return {
      success: true,
      apps: resultApps,
      newAccountsFound,
    }
  } catch (error) {
    console.error('[DEEP_SCAN] Critical error:', error)

    if (error instanceof InternalError) {
      return {
        success: false,
        apps: [],
        newAccountsFound: 0,
        error: error.description || 'Deep scan failed',
      }
    }

    throw new InternalError(InternalErrorType.SYNC_ERROR, {
      operation: 'deepScanAllApps',
      context: { error },
    })
  }
}

export async function synchronizeAllApps(
  onProgress?: (progress: SyncProgress) => void,
  onCancel?: () => boolean,
  onAppStart?: (app: App) => void,
  onProcessingAccountsStart?: () => void,
  onAppComplete?: (app: App, polkadotAddresses: string[]) => void
): Promise<SyncResult> {
  try {
    // Show initial notification
    notifications$.push({
      title: 'Synchronizing accounts',
      description: `We are synchronizing the first ${maxAddressesToFetch} accounts for each blockchain. Please wait while we gather your account information.`,
      type: 'info',
      autoHideDuration: 5000,
    })

    // Get apps to synchronize (exclude Polkadot since it's handled separately)
    const appsToSync = getAppsToSync()

    const totalApps = appsToSync.length + 1 // +1 for Polkadot

    // ===== PHASE 0: Get Polkadot addresses and skip apps that don't need synchronization =====
    const addressesByApp = new Map<AppId, Address[]>()

    // Fetch Polkadot addresses first
    onProgress?.({
      scanned: 0,
      total: totalApps,
      percentage: 0,
      phase: FetchingAddressesPhase.FETCHING_ADDRESSES,
    })

    const polkadotAddressesFromLedger = await fetchAddressesFromLedger(polkadotAppConfig, onCancel)
    const polkadotAddresses = polkadotAddressesFromLedger.map(account => account.address)

    const appsToBeSkipped = getAppsToSkipMigration()
    for (const appConfig of appsToBeSkipped) {
      onAppStart?.({
        id: appConfig.id,
        name: appConfig.name,
        token: appConfig.token,
        status: AppStatus.NO_NEED_MIGRATION,
      })
    }

    // ===== PHASE 1: Fetch all addresses from Ledger ====
    let fetchedApps = 1 // Start at 1 (Polkadot already fetched)

    onProgress?.({
      scanned: fetchedApps,
      total: totalApps,
      percentage: Math.round((fetchedApps / totalApps) * 50), // First phase is 0-50%
      phase: FetchingAddressesPhase.FETCHING_ADDRESSES,
    })

    // Fetch addresses for all other apps
    for (const appConfig of appsToSync) {
      if (onCancel?.()) break

      // Notify that addresses have been fetched for this app
      const addressesFetchedApp: App = {
        id: appConfig.id,
        name: appConfig.name,
        token: appConfig.token,
        status: AppStatus.LOADING,
      }
      onAppStart?.(addressesFetchedApp)
      onProgress?.({
        scanned: fetchedApps,
        total: totalApps,
        percentage: Math.round((fetchedApps / totalApps) * 50), // First phase is 0-50%
        phase: FetchingAddressesPhase.FETCHING_ADDRESSES,
      })

      try {
        const addresses = await fetchAddressesFromLedger(appConfig, onCancel)
        addressesByApp.set(appConfig.id, addresses)

        // Notify that addresses have been fetched for this app
        addressesFetchedApp.status = AppStatus.ADDRESSES_FETCHED

        onAppComplete?.(addressesFetchedApp, polkadotAddresses)
      } catch (error) {
        console.error(`[SYNC] Failed to fetch addresses for ${appConfig.name}:`, error)
        addressesByApp.set(appConfig.id, [])

        // Notify that app synchronization has failed for this app
        const errorApp: App = {
          name: appConfig.name,
          id: appConfig.id,
          token: appConfig.token,
          status: AppStatus.ERROR,
          error: {
            source: 'synchronization',
            description: 'Failed to fetch addresses from Ledger',
          },
        }
        onAppComplete?.(errorApp, [])
      }

      fetchedApps++
    }

    // ===== PHASE 2: Process accounts (fetch balances, multisig, etc.) =====
    onProcessingAccountsStart?.()

    // Process Polkadot accounts first
    const polkadotApp = await synchronizePolkadotAccounts(onCancel, polkadotAddressesFromLedger)

    onProgress?.({
      scanned: 0,
      total: appsToSync.length,
      percentage: 50,
      phase: FetchingAddressesPhase.PROCESSING_ACCOUNTS,
    })
    // // Update all apps to LOADING before starting parallel processing
    // Process all apps in parallel
    let processedAppsCount = 0

    const appProcessingPromises = []
    for (const appConfig of appsToSync) {
      const promise = (async () => {
        try {
          const preloadedAddresses = addressesByApp.get(appConfig.id)
          const result = await synchronizeAppAccounts(appConfig, polkadotAddresses, true, onCancel, preloadedAddresses)

          // Update progress
          processedAppsCount++
          onProgress?.({
            scanned: processedAppsCount,
            total: appsToSync.length,
            percentage: 50 + Math.round((processedAppsCount / appsToSync.length) * 50), // 50-100%
            phase: FetchingAddressesPhase.PROCESSING_ACCOUNTS,
          })

          // Notify completion immediately after this app finishes
          onAppComplete?.(result.app, result.polkadotAddressesForApp)

          return { ...result, success: true }
        } catch (error) {
          if (error instanceof InternalError && error.errorType === InternalErrorType.OPERATION_CANCELLED) {
            // This is a cancellation, not an error. Re-throw to stop all processing.
            throw error
          }

          const errorApp: App = {
            name: appConfig.name,
            id: appConfig.id,
            token: appConfig.token,
            status: AppStatus.ERROR,
            error: {
              source: 'synchronization' as const,
              description: 'Failed to synchronize accounts',
            },
          }

          // Update progress
          processedAppsCount++
          onProgress?.({
            scanned: processedAppsCount,
            total: appsToSync.length,
            percentage: 50 + Math.round((processedAppsCount / appsToSync.length) * 50), // 50-100%
            phase: FetchingAddressesPhase.PROCESSING_ACCOUNTS,
          })

          // Notify completion with error
          onAppComplete?.(errorApp, [])

          return {
            app: errorApp,
            polkadotAddressesForApp: [],
            success: false,
          }
        }
      })()
      appProcessingPromises.push(promise)
    }

    // Wait for all apps to complete
    const results = await Promise.all(appProcessingPromises)

    // Collect results (apps have already been notified individually)
    const synchronizedApps: App[] = results.map(result => result.app)

    // Add the Polkadot app to the final results
    synchronizedApps.push(polkadotApp)

    console.debug(`[SYNC] Synchronization completed at ${new Date().toISOString()}. Total apps synchronized: ${synchronizedApps.length}.`)

    return {
      success: true,
      apps: synchronizedApps,
      polkadotApp,
    }
  } catch (error) {
    console.debug(`[SYNC] Synchronization failed at ${new Date().toISOString()}.`)

    if (error instanceof InternalError) {
      return {
        success: false,
        apps: [],
        error: error.description || 'Synchronization failed',
      }
    }

    throw new InternalError(InternalErrorType.SYNC_ERROR, {
      operation: 'synchronizeAllApps',
      context: { error },
    })
  }
}
