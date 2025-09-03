import type { AppConfig, AppId } from 'config/apps'
import { appsConfigs, polkadotAppConfig } from 'config/apps'
import { maxAddressesToFetch } from 'config/config'
import { InternalErrorType } from 'config/errors'
import { syncApps } from 'config/mockData'
import { getApiAndProvider } from '@/lib/account'
import { isDevelopment } from '@/lib/utils/env'
import { InternalError } from '@/lib/utils/error'
import { ledgerClient } from '@/state/client/ledger'
import { type App, AppStatus } from '@/state/ledger'
import { notifications$ } from '@/state/notifications'
import type { Address } from '@/state/types/ledger'
import { processAccountsForApp } from './account-processing.service'

export interface SyncProgress {
  scanned: number
  total: number
  percentage: number
}

/**
 * Checks if cancellation is requested and throws an error if so
 * @param onCancel - Optional cancellation callback function
 * @throws {Error} When cancellation is requested
 */
function checkCancellation(onCancel?: () => boolean): void {
  if (onCancel?.()) {
    throw new Error('Scan was cancelled')
  }
}

export interface SyncResult {
  success: boolean
  apps: App[]
  polkadotApp?: App
  polkadotAddressesForApp?: Record<AppId, string[]>
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
 * @returns {Promise<Address[]>} Array of addresses retrieved from the Ledger device
 * @throws {InternalError} When Ledger communication fails or returns no results
 */
async function fetchAddressesFromLedger(appConfig: AppConfig): Promise<Address[]> {
  try {
    const response = await ledgerClient.synchronizeAccounts(appConfig)

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
  filterByBalance = true
): Promise<{
  app: App
  polkadotAddressesForApp: string[]
}> {
  try {
    // Fetch addresses from Ledger
    const addresses = await fetchAddressesFromLedger(appConfig)

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
export async function synchronizePolkadotAccounts(): Promise<App> {
  try {
    const appConfig = polkadotAppConfig
    const response = await ledgerClient.synchronizeAccounts(appConfig)

    const noAccountsNotification = {
      title: 'No Polkadot accounts found',
      description: 'There are no Polkadot accounts available to migrate from on your Ledger device.',
      appId: appConfig.id,
      type: 'info' as const,
      autoHideDuration: 5000,
    }

    if (!response.result) {
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

    const accounts = response.result

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
  filterByBalance = true
): Promise<{
  app: App
  polkadotAddresses: string[]
}> {
  const { app, polkadotAddressesForApp } = await synchronizeAppAccounts(appConfig, polkadotAddresses, filterByBalance)
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
): Promise<App> {
  try {
    // Check for cancellation before starting
    checkCancellation(onCancel)

    // Fetch addresses from Ledger using custom indices
    const addresses = await ledgerClient.synchronizeAccountsWithIndices(appConfig, accountIndices, addressIndices)

    // Check for cancellation after Ledger interaction
    checkCancellation(onCancel)

    if (!addresses.result || addresses.result.length === 0) {
      return {
        name: appConfig.name,
        id: appConfig.id,
        token: appConfig.token,
        status: AppStatus.SYNCHRONIZED,
        accounts: [],
        multisigAccounts: [],
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

      const { accounts, multisigAccounts, collections } = data

      return {
        name: appConfig.name,
        id: appConfig.id,
        token: appConfig.token,
        status: AppStatus.SYNCHRONIZED,
        accounts,
        multisigAccounts,
        collections,
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
        name: appConfig.name,
        id: appConfig.id,
        token: appConfig.token,
        status: AppStatus.ERROR,
        error: {
          source: 'synchronization',
          description: error.description || 'Custom index scanning failed',
        },
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
 * @param {(app: App) => void} [onAppComplete] - Callback when an app completes synchronization
 * @returns {Promise<SyncResult>} Result containing all synchronized apps and success status
 * @throws {InternalError} When the overall synchronization process fails
 */
export async function synchronizeAllApps(
  onProgress?: (progress: SyncProgress) => void,
  onCancel?: () => boolean,
  onAppStart?: (app: App) => void,
  onAppComplete?: (app: App) => void
): Promise<SyncResult> {
  try {
    // Show initial notification
    notifications$.push({
      title: 'Synchronizing accounts',
      description: `We are synchronizing the first ${maxAddressesToFetch} accounts for each blockchain. Please wait while we gather your account information.`,
      type: 'info',
      autoHideDuration: 5000,
    })

    // Get apps to synchronize
    const appsToSync = getAppsToSync()
    const totalApps = appsToSync.length
    let syncedApps = 0

    // Update initial progress
    onProgress?.({
      scanned: syncedApps,
      total: totalApps,
      percentage: 0,
    })

    // Synchronize Polkadot accounts first
    const polkadotApp = await synchronizePolkadotAccounts()
    const polkadotAddresses = polkadotApp.accounts?.map(account => account.address) || []

    // Update progress after Polkadot
    syncedApps++
    onProgress?.({
      scanned: syncedApps,
      total: totalApps,
      percentage: Math.round((syncedApps / totalApps) * 100),
    })

    const synchronizedApps: App[] = []
    const polkadotAddressesForApp: Record<AppId, string[]> = {}

    // Synchronize each blockchain app
    for (const appConfig of appsToSync) {
      // Check for cancellation
      if (onCancel?.()) {
        break
      }

      // Add app with loading status before synchronization
      const loadingApp: App = {
        id: appConfig.id,
        name: appConfig.name,
        token: appConfig.token,
        status: AppStatus.LOADING,
        error: undefined,
      }

      // Notify that app synchronization has started
      onAppStart?.(loadingApp)

      try {
        const { app, polkadotAddressesForApp: appPolkadotAddresses } = await synchronizeAppAccounts(appConfig, polkadotAddresses)
        synchronizedApps.push(app)
        polkadotAddressesForApp[app.id] = appPolkadotAddresses

        // Notify that app synchronization is complete
        onAppComplete?.(app)
      } catch {
        const errorApp: App = {
          name: appConfig.name,
          id: appConfig.id,
          token: appConfig.token,
          status: AppStatus.ERROR,
          error: {
            source: 'synchronization',
            description: 'Failed to synchronize accounts',
          },
        }

        synchronizedApps.push(errorApp)

        // Notify that app synchronization is complete (with error)
        onAppComplete?.(errorApp)
      }

      // Update progress
      syncedApps++
      const progress = Math.round((syncedApps / totalApps) * 100)
      onProgress?.({
        scanned: syncedApps,
        total: totalApps,
        percentage: progress,
      })
    }

    return {
      success: true,
      apps: synchronizedApps,
      polkadotApp,
      polkadotAddressesForApp,
    }
  } catch (error) {
    console.debug('Error during synchronization:', error)

    if (error instanceof InternalError) {
      return {
        success: false,
        apps: [],
        error: error.description || 'Synchronization failed',
        polkadotAddressesForApp: {},
      }
    }

    throw new InternalError(InternalErrorType.SYNC_ERROR, {
      operation: 'synchronizeAllApps',
      context: { error },
    })
  }
}
