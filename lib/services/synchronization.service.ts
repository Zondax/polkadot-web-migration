import type { AppConfig, AppId } from 'config/apps'
import { appsConfigs, polkadotAppConfig } from 'config/apps'
import { maxAddressesToFetch } from 'config/config'
import { InternalErrorType } from 'config/errors'
import { syncApps } from 'config/mockData'
import { getApiAndProvider } from '@/lib/account'
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
 *
 * @example
 * ```typescript
 * const apps = getAppsToSync()
 * console.log(apps.length) // Number of apps to sync
 * ```
 */
function getAppsToSync(): AppConfig[] {
  let appsToSync: (AppConfig | undefined)[] = Array.from(appsConfigs.values())

  // If in development environment, use apps specified in environment variable
  if (process.env.NEXT_PUBLIC_NODE_ENV === 'development' && syncApps && syncApps.length > 0) {
    try {
      appsToSync = syncApps.map(appId => appsConfigs.get(appId as AppId))
    } catch (error) {
      console.error('Error parsing NEXT_PUBLIC_SYNC_APPS environment variable:', error)
      throw new InternalError(InternalErrorType.SYNC_ERROR, {
        operation: 'getAppsToSync',
        context: { syncApps },
      })
    }
  }

  return appsToSync.filter(appConfig => appConfig?.rpcEndpoint) as AppConfig[]
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
 *
 * @example
 * ```typescript
 * const addresses = await fetchAddressesFromLedger(polkadotConfig)
 * console.log(`Found ${addresses.length} addresses`)
 * ```
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
 *
 * @example
 * ```typescript
 * const app = await synchronizeAppAccounts(kusamaConfig, polkadotAddresses, true)
 * console.log(`Synchronized ${app.accounts?.length} accounts for ${app.name}`)
 * ```
 */
export async function synchronizeAppAccounts(appConfig: AppConfig, polkadotAddresses: string[], filterByBalance = true): Promise<App> {
  try {
    // Fetch addresses from Ledger
    const addresses = await fetchAddressesFromLedger(appConfig)

    if (!appConfig.rpcEndpoint) {
      throw new InternalError(InternalErrorType.SYNC_ERROR, {
        operation: 'synchronizeAppAccounts',
        context: { appId: appConfig.id, reason: 'RPC endpoint not configured' },
      })
    }

    // Get API connection
    const { api, provider } = await getApiAndProvider(appConfig.rpcEndpoint)

    if (!api) {
      throw new InternalError(InternalErrorType.FAILED_TO_CONNECT_TO_BLOCKCHAIN, {
        operation: 'synchronizeAppAccounts',
        context: { appId: appConfig.id, rpcEndpoint: appConfig.rpcEndpoint },
      })
    }

    try {
      // Process accounts using the account processing service
      const processingResult = await processAccountsForApp(addresses, appConfig, api, polkadotAddresses, filterByBalance)

      if (!processingResult.success || !processingResult.data) {
        throw new InternalError(InternalErrorType.SYNC_ERROR, {
          operation: 'synchronizeAppAccounts',
          context: {
            appId: appConfig.id,
            error: processingResult.error?.description || 'Failed to process accounts',
          },
        })
      }

      const { accounts, multisigAccounts, collections } = processingResult.data

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
          name: appConfig.name,
          id: appConfig.id,
          token: appConfig.token,
          status: AppStatus.SYNCHRONIZED,
          accounts: [],
          multisigAccounts: [],
        }
      }

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
    console.debug('Error synchronizing app accounts:', appConfig.id, error)

    if (error instanceof InternalError) {
      return {
        name: appConfig.name,
        id: appConfig.id,
        token: appConfig.token,
        status: AppStatus.ERROR,
        error: {
          source: 'synchronization',
          description: error.description || 'Synchronization failed',
        },
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

    if (!appConfig.rpcEndpoint) {
      notifications$.push(noAccountsNotification)
      throw new InternalError(InternalErrorType.SYNC_ERROR, {
        operation: 'synchronizePolkadotAccounts',
        context: { reason: 'RPC endpoint not configured' },
      })
    }

    const accounts = response.result

    // Test API connection
    const { api, provider } = await getApiAndProvider(appConfig.rpcEndpoint)

    if (!api) {
      throw new InternalError(InternalErrorType.FAILED_TO_CONNECT_TO_BLOCKCHAIN, {
        operation: 'synchronizePolkadotAccounts',
        context: { rpcEndpoint: appConfig.rpcEndpoint },
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
export async function synchronizeSingleApp(appConfig: AppConfig, polkadotAddresses: string[], filterByBalance = true): Promise<App> {
  return synchronizeAppAccounts(appConfig, polkadotAddresses, filterByBalance)
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
 *
 * @example
 * ```typescript
 * const result = await synchronizeAllApps(
 *   (progress) => console.log(`${progress.percentage}% complete`),
 *   () => userCancelledSync,
 *   (app) => console.log(`Starting ${app.name}`),
 *   (app) => console.log(`Completed ${app.name}`)
 * )
 * ```
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
    const totalApps = appsToSync.length + 1 // +1 for Polkadot
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
        const app = await synchronizeAppAccounts(appConfig, polkadotAddresses)
        synchronizedApps.push(app)

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
    }
  } catch (error) {
    console.debug('Error during synchronization:', error)

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

/**
 * Validates that all prerequisites for synchronization are met.
 *
 * @description Checks if the Ledger device connection is available and ready for synchronization.
 * This should be called before starting any synchronization process.
 *
 * @param {any} connection - The Ledger device connection object
 * @returns {boolean} True if synchronization can proceed, false otherwise
 *
 * @example
 * ```typescript
 * if (validateSyncPrerequisites(connection)) {
 *   await synchronizeAllApps()
 * } else {
 *   console.log('Ledger not connected')
 * }
 * ```
 */
export function validateSyncPrerequisites(connection: any): boolean {
  return Boolean(connection)
}
