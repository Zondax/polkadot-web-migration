import { getApiAndProvider } from '@/lib/account'
import { isDevelopment } from '@/lib/utils/env'
import { InternalError } from '@/lib/utils/error'
import { ledgerClient } from '@/state/client/ledger'
import { AppStatus, type App } from '@/state/ledger'
import { notifications$ } from '@/state/notifications'
import type { Address } from '@/state/types/ledger'
import type { AppConfig, AppId } from 'config/apps'
import { appsConfigs, polkadotAppConfig } from 'config/apps'
import { maxAddressesToFetch } from 'config/config'
import { InternalErrorType } from 'config/errors'
import { syncApps } from 'config/mockData'
import { processAccountsForApp } from './account-processing.service'

export interface SyncProgress {
  scanned: number
  total: number
  percentage: number
  phase?: 'fetching_addresses' | 'processing_accounts'
}

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
 * Determines which blockchain applications should be synchronized based on configuration.
 *
 * @description Filters the available app configurations to only include those with valid RPC endpoints.
 * In development mode, it can be limited to specific apps via environment variables.
 *
 * @returns {AppConfig[]} Array of app configurations that should be synchronized
 * @throws {InternalError} When environment variable parsing fails in development mode
 */
function getAppsToSync(): AppConfig[] {
  let appsToSync: (AppConfig | undefined)[] = Array.from(appsConfigs.values())

  // If in development environment, use apps specified in environment variable
  if (isDevelopment()) {
    const appsToSyncInDev = syncApps
    if (appsToSyncInDev && appsToSyncInDev.length > 0) {
      appsToSync = appsToSyncInDev.map(appId => appsConfigs.get(appId as AppId))
    }
  }
  return appsToSync.filter(appConfig => appConfig?.rpcEndpoints && appConfig.rpcEndpoints.length > 0) as AppConfig[]
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
 * Synchronizes a single blockchain application with custom account/address indices.
 *
 * @description This function performs deep scanning of blockchain accounts using custom
 * index configurations. It uses the enhanced ledger client to fetch addresses from specific
 * account and address indices, then processes them through the standard account processing pipeline.
 *
 * @param {AppConfig} appConfig - The blockchain application configuration
 * @param {string[]} polkadotAddresses - Array of Polkadot addresses for cross-chain migration
 * @param {number[]} accountIndices - Array of account indices to scan
 * @param {number[]} addressIndices - Array of address indices to scan per account
 * @param {boolean} [filterByBalance=true] - Whether to filter out accounts with zero balance
 * @returns {Promise<App>} Complete app object with synchronized account data
 * @throws {InternalError} When the scanning process fails
 */
export async function scanAppWithCustomIndices(
  appConfig: AppConfig,
  polkadotAddresses: string[],
  accountIndices: number[],
  addressIndices: number[],
  filterByBalance = true,
  onCancel?: () => boolean
): Promise<{
  app: App
  polkadotAddressesForApp: string[]
}> {
  try {
    // Check for cancellation before starting
    checkCancellation(onCancel)

    // Fetch addresses from Ledger using custom indices
    const addresses = await ledgerClient.synchronizeAccountsWithIndices(appConfig, accountIndices, addressIndices, onCancel)

    // Check for cancellation after Ledger interaction
    checkCancellation(onCancel)

    if (!addresses.result || addresses.result.length === 0) {
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

    if (!appConfig.rpcEndpoints || appConfig.rpcEndpoints.length === 0) {
      throw new InternalError(InternalErrorType.SYNC_ERROR, {
        operation: 'scanAppWithCustomIndices',
        context: { appId: appConfig.id, reason: 'RPC endpoint not configured' },
      })
    }

    // Get API connection
    const { api, provider } = await getApiAndProvider(appConfig.rpcEndpoints)

    if (!api) {
      throw new InternalError(InternalErrorType.FAILED_TO_CONNECT_TO_BLOCKCHAIN, {
        operation: 'scanAppWithCustomIndices',
        context: { appId: appConfig.id, rpcEndpoints: appConfig.rpcEndpoints },
      })
    }

    try {
      // Check for cancellation before processing accounts
      checkCancellation(onCancel)

      // Process accounts using the standard account processing service
      const { success, data, error } = await processAccountsForApp(addresses.result, appConfig, api, polkadotAddresses, filterByBalance)

      // Check for cancellation after account processing
      checkCancellation(onCancel)

      if (!success || !data) {
        throw new InternalError(InternalErrorType.SYNC_ERROR, {
          operation: 'scanAppWithCustomIndices',
          context: {
            appId: appConfig.id,
            error: error?.description || 'Failed to process accounts',
          },
        })
      }

      const { accounts, multisigAccounts, collections, polkadotAddressesForApp } = data

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
    console.debug('Error scanning app with custom indices:', appConfig.id, error)

    if (error instanceof InternalError) {
      return {
        app: {
          name: appConfig.name,
          id: appConfig.id,
          token: appConfig.token,
          status: AppStatus.ERROR,
          error: {
            source: 'synchronization',
            description: error.description || 'Custom index scanning failed',
          },
        },
        polkadotAddressesForApp: [],
      }
    }

    throw new InternalError(InternalErrorType.SYNC_ERROR, {
      operation: 'scanAppWithCustomIndices',
      context: { appId: appConfig.id, error },
    })
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
export async function synchronizeAllApps(
  onProgress?: (progress: SyncProgress) => void,
  onCancel?: () => boolean,
  onAppStart?: (app: App) => void,
  onProcessingAccountsStart?: () => void,
  onAppComplete?: (app: App, polkadotAddresses: string[]) => void
): Promise<SyncResult> {
  const syncStartTime = performance.now()

  try {
    // Show initial notification
    notifications$.push({
      title: 'Synchronizing accounts',
      description: `We are synchronizing the first ${maxAddressesToFetch} accounts for each blockchain. Please wait while we gather your account information.`,
      type: 'info',
      autoHideDuration: 5000,
    })

    // Get apps to synchronize (exclude Polkadot since it's handled separately)
    const appsToSync = getAppsToSync().filter(app => app.id !== 'polkadot')
    const totalApps = appsToSync.length + 1 // +1 for Polkadot

    // ===== PHASE 1: Fetch all addresses from Ledger =====
    console.log('[SYNC] 📥 Phase 1: Fetching addresses from Ledger for all apps')
    const addressesByApp = new Map<AppId, Address[]>()

    // Fetch Polkadot addresses first
    console.log('[SYNC] 📍 Fetching Polkadot addresses from Ledger')
    onProgress?.({
      scanned: 0,
      total: totalApps,
      percentage: 0,
      phase: 'fetching_addresses',
    })

    const polkadotAddressesFromLedger = await fetchAddressesFromLedger(polkadotAppConfig, onCancel)
    const polkadotAddresses = polkadotAddressesFromLedger.map(account => account.address)

    // Notify that addresses have been fetched for this app
    const polkadotAddressesFetchedApp: App = {
      id: polkadotAppConfig.id,
      name: polkadotAppConfig.name,
      token: polkadotAppConfig.token,
      status: AppStatus.ADDRESSES_FETCHED,
    }
    onAppStart?.(polkadotAddressesFetchedApp)

    let fetchedApps = 1 // Start at 1 (Polkadot already fetched)

    onProgress?.({
      scanned: fetchedApps,
      total: totalApps,
      percentage: Math.round((fetchedApps / totalApps) * 50), // First phase is 0-50%
      phase: 'fetching_addresses',
    })

    // Fetch addresses for all other apps
    for (const appConfig of appsToSync) {
      if (onCancel?.()) break

      console.log(`[SYNC] 📍 Fetching ${appConfig.name} addresses from Ledger`)
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
        phase: 'fetching_addresses',
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

    console.log(`[SYNC] ✅ Phase 1 complete: Fetched addresses for ${addressesByApp.size + 1} apps`)

    // ===== PHASE 2: Process accounts (fetch balances, multisig, etc.) =====
    console.log('[SYNC] 💾 Phase 2: Processing accounts (balances, multisig, etc.) - ALL IN PARALLEL')
    onProcessingAccountsStart?.()

    // Process Polkadot accounts first
    console.log('[SYNC] 📍 Processing Polkadot accounts')
    const polkadotApp = await synchronizePolkadotAccounts(onCancel, polkadotAddressesFromLedger)

    onProgress?.({
      scanned: 0,
      total: appsToSync.length,
      percentage: 50,
      phase: 'processing_accounts',
    })
    // // Update all apps to LOADING before starting parallel processing
    // Process all apps in parallel
    console.log(`[SYNC] 🚀 Starting parallel processing for ${appsToSync.length} apps`)
    let processedAppsCount = 0

    const appProcessingPromises = []
    for (const appConfig of appsToSync) {
      const promise = (async () => {
        console.log(`[SYNC] 📍 Processing ${appConfig.name} accounts in parallel`)

        try {
          const preloadedAddresses = addressesByApp.get(appConfig.id)
          const result = await synchronizeAppAccounts(appConfig, polkadotAddresses, true, onCancel, preloadedAddresses)
          console.log(`[SYNC] ✅ ${appConfig.name} processing complete`)

          // Update progress
          processedAppsCount++
          onProgress?.({
            scanned: processedAppsCount,
            total: appsToSync.length,
            percentage: 50 + Math.round((processedAppsCount / appsToSync.length) * 50), // 50-100%
            phase: 'processing_accounts',
          })

          // Notify completion immediately after this app finishes
          onAppComplete?.(result.app, result.polkadotAddressesForApp)

          return { ...result, success: true }
        } catch (error) {
          console.error(`[SYNC] ❌ ${appConfig.name} processing failed:`, error)

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
            phase: 'processing_accounts',
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

    console.log(`[SYNC] ✅ Phase 2 complete: Processed ${synchronizedApps.length} apps in parallel`)

    const syncEndTime = performance.now()
    const totalTimeSeconds = ((syncEndTime - syncStartTime) / 1000).toFixed(2)
    console.debug(
      `[SYNC] Synchronization completed at ${new Date().toISOString()}. Total synchronization time: ${totalTimeSeconds}s. Total apps synchronized: ${synchronizedApps.length}.`
    )

    return {
      success: true,
      apps: synchronizedApps,
      polkadotApp,
    }
  } catch (error) {
    const syncEndTime = performance.now()
    const totalTimeSeconds = ((syncEndTime - syncStartTime) / 1000).toFixed(2)
    console.debug(`[SYNC] ❌ Synchronization failed at ${new Date().toISOString()}. Time until failure: ${totalTimeSeconds}s`)

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
