import type { MultisigCallFormData } from '@/components/sections/migrate/dialogs/approve-multisig-call-dialog'
import type { Token } from '@/config/apps'
import { getApiAndProvider, getBalance, type UpdateTransactionStatus } from '@/lib/account'
import type { DeviceConnectionProps } from '@/lib/ledger/types'
import { deepScanAllApps, getAppsToSkipMigration, synchronizeAllApps, synchronizeAppAccounts } from '@/lib/services/synchronization.service'
import { interpretError, type InternalError } from '@/lib/utils'
import { isMultisigAddress } from '@/lib/utils/address'
import { canAccountBeMigrated } from '@/lib/utils/ledger'
import { computed, observable } from '@legendapp/state'
import type { BN } from '@polkadot/util'
import { appsConfigs, polkadotAppConfig, type AppId } from 'config/apps'
import { InternalErrorType, errorDetails } from 'config/errors'
import { ledgerClient } from './client/ledger'
import { errorsToStopSync } from './config/ledger'
import { notifications$ } from './notifications'
import {
  AccountType,
  AddressStatus,
  FetchingAddressesPhase,
  TransactionStatus,
  type Address,
  type Collection,
  type MigratingItem,
  type MultisigAddress,
  type SyncProgress,
  type UpdateMigratedStatusFn,
} from './types/ledger'

export enum AppStatus {
  MIGRATED = 'migrated',
  SYNCHRONIZED = 'synchronized',
  LOADING = 'loading',
  ADDRESSES_FETCHED = 'addresses_fetched',
  ERROR = 'error',
  RESCANNING = 'rescanning',
  NO_NEED_MIGRATION = 'no_need_migration',
}

export type AppIcons = {
  [key in AppId]: string
}

export interface Collections {
  uniques: Map<number, Collection>
  nfts: Map<number, Collection>
}

export interface App {
  name: string
  id: AppId
  accounts?: Address[]
  multisigAccounts?: MultisigAddress[]
  collections?: Collections
  token: Token
  status?: AppStatus
  error?: {
    source: 'synchronization'
    description: string
  }
}

type MigrationResultKey = 'success' | 'fails' | 'total'

type AppWithoutPolkadot = Omit<App, 'id'> & { id: Exclude<AppId, 'polkadot'> }
type PolkadotApp = Omit<App, 'id'> & { id: 'polkadot' }

export interface DeepScan {
  isScanning: boolean
  isCompleted: boolean
  cancelRequested: boolean
  progress: SyncProgress
  apps: Array<AppWithoutPolkadot & { originalAccountCount: number }>
}

/**
 * The state of the ledger.
 *
 * @property device - The state of the device.
 * @property apps - The state of the apps.
 * @property apps - The state of the apps.
 *   @property apps - The state of the apps, excluding Polkadot.
 *   @property polkadotApp - The state of the Polkadot app. Polkadot has a fundamental role as the "source of truth" for destination addresses, so it is handled differently.
 * @property deepScan - The state of the deep scan.
 * @property polkadotAddresses - The state of the polkadot addresses.
 */
interface LedgerState {
  device: {
    connection?: DeviceConnectionProps
    isLoading: boolean
    error?: string
  }
  apps: {
    apps: Array<AppWithoutPolkadot>
    polkadotApp: PolkadotApp
    status?: AppStatus
    error?: string
    syncProgress: SyncProgress
    isSyncCancelRequested: boolean
    migrationResult: {
      [key in MigrationResultKey]: number
    }
    currentMigratedItem?: MigratingItem
  }
  deepScan: DeepScan
  polkadotAddresses: Partial<Record<AppId, string[]>>
}

const initialPolkadotApp = {
  name: polkadotAppConfig.name,
  id: 'polkadot' as const,
  token: polkadotAppConfig.token,
}

const initialLedgerState: LedgerState = {
  device: {
    connection: undefined,
    isLoading: false,
    error: undefined,
  },
  apps: {
    apps: [],
    polkadotApp: initialPolkadotApp,
    status: undefined,
    error: undefined,
    syncProgress: {
      scanned: 0,
      total: 0,
      percentage: 0,
      phase: undefined,
    },
    isSyncCancelRequested: false,
    migrationResult: {
      success: 0,
      fails: 0,
      total: 0,
    },
    currentMigratedItem: undefined,
  },
  deepScan: {
    isScanning: false,
    isCompleted: false,
    cancelRequested: false,
    progress: {
      scanned: 0,
      total: 0,
      percentage: 0,
      phase: undefined,
    },
    apps: [],
  },
  polkadotAddresses: {},
}

// Update App
function updateApp(appId: AppId, update: Partial<App>) {
  const apps = ledgerState$.apps.apps.get()
  const appIndex = apps.findIndex(app => app.id === appId)

  if (appIndex !== -1) {
    const updatedApp = { ...apps[appIndex], ...update }
    ledgerState$.apps.apps[appIndex].set(updatedApp)
  } else {
    console.warn(`App with id ${appId} not found for UI update.`)
  }
}

// Update Polkadot Addresses
function updatePolkadotAddresses(appId: AppId, addresses: string[]) {
  ledgerState$.polkadotAddresses[appId].set(addresses)
}

// Update Account
function updateAccount(appId: AppId, accountType: AccountType, address: string, update: Partial<Address>) {
  const apps = ledgerState$.apps.apps.get()
  const appIndex = apps.findIndex(app => app.id === appId)

  if (appIndex !== -1) {
    const app = apps[appIndex]
    const singleAccounts = app?.accounts ? [...app.accounts] : []
    const multisigAccounts = app?.multisigAccounts ? [...app.multisigAccounts] : []

    const accounts = accountType === AccountType.MULTISIG ? multisigAccounts : singleAccounts

    const accountIndex = accounts.findIndex(account => account.address === address)

    if (accountIndex !== -1 && accounts[accountIndex]) {
      const updatedAccount = { ...accounts[accountIndex], ...update }
      accounts[accountIndex] = updatedAccount
      if (accountType === AccountType.MULTISIG) {
        ledgerState$.apps.apps[appIndex].multisigAccounts.set(accounts as MultisigAddress[])
      } else {
        ledgerState$.apps.apps[appIndex].accounts.set(accounts as Address[])
      }
    } else {
      console.warn(`Account with address ${address} not found in app ${appId} for UI update.`)
    }
  } else {
    console.warn(`App with appId ${appId} not found for account UI update.`)
  }
}

// Update Migration Result Counter
function updateMigrationResultCounter(type: MigrationResultKey, increment = 1) {
  const currentMigrationResult = ledgerState$.apps.migrationResult.get() || {
    success: 0,
    fails: 0,
    total: 0,
  }
  ledgerState$.apps.migrationResult.set({
    ...currentMigrationResult,
    [type]: (currentMigrationResult[type] || 0) + increment,
  })
}

// Handle Error Notification
function handleErrorNotification(internalError: InternalError): void {
  notifications$.push({
    title: internalError.title,
    description: internalError.description ?? '',
    type: 'error',
    autoHideDuration: 5000,
  })
}

// Update Migrated Status
const updateMigratedStatus: UpdateMigratedStatusFn = (appId: AppId, accountType, address: string, txDetails) => {
  const apps = ledgerState$.apps.apps.get()
  const appIndex = apps.findIndex(app => app.id === appId)
  const status = txDetails?.status

  if (appIndex !== -1 && status) {
    const app = apps[appIndex]
    const singleAccounts = app?.accounts ? [...app.accounts] : []
    const multisigAccounts = app?.multisigAccounts ? [...app.multisigAccounts] : []

    const accounts = accountType === AccountType.MULTISIG ? multisigAccounts : singleAccounts

    const accountIndex = accounts.findIndex(account => account.address === address)

    if (accountIndex !== -1 && accounts[accountIndex]) {
      // Update the account's transaction details
      accounts[accountIndex] = {
        ...accounts[accountIndex],
        transaction: {
          ...txDetails,
        },
      }
      const currentItem = ledgerState$.apps.currentMigratedItem.get()
      const isCurrentMigratedItem = currentItem?.appId === appId && currentItem?.account.address === address
      const isLoadingOrSigning = [TransactionStatus.IS_LOADING, TransactionStatus.PREPARING_TX, TransactionStatus.SIGNING].includes(status)

      if (isLoadingOrSigning) {
        ledgerState$.apps.currentMigratedItem.set({
          appId,
          appName: app.name || app.id,
          token: app.token,
          account: accounts[accountIndex],
          transaction: {
            ...txDetails,
          },
        })
        // Only clear if this is the currently migrating item
      } else if (isCurrentMigratedItem) {
        // Clear for other statuses (SUCCESS, FAILED, ERROR)
        ledgerState$.apps.currentMigratedItem.set(undefined)
      }

      // If the transaction is successful, mark as migrated
      if (status === TransactionStatus.SUCCESS) {
        accounts[accountIndex].status = AddressStatus.MIGRATED
        updateMigrationResultCounter('success')
      } else if (status === TransactionStatus.FAILED || status === TransactionStatus.ERROR) {
        updateMigrationResultCounter('fails')
      }

      if (accountType === AccountType.MULTISIG) {
        ledgerState$.apps.apps[appIndex].multisigAccounts.set(accounts as MultisigAddress[])
      } else {
        ledgerState$.apps.apps[appIndex].accounts.set(accounts as Address[])
      }
    }
  }
}

/**
 * Handles transaction errors, updating the status only if the error wasn't already
 * handled by submitAndHandleTransaction (which handles TRANSACTION_FAILED errors)
 */
function handleTransactionError(error: unknown, errorType: InternalErrorType, updateTxStatus: UpdateTransactionStatus): void {
  const internalError = interpretError(error, errorType)
  // If the error is from a failed transaction, the status is already handled by `submitAndHandleTransaction`.
  if (internalError.errorType !== InternalErrorType.TRANSACTION_FAILED) {
    updateTxStatus(TransactionStatus.ERROR, internalError.description)
  }
}

export const ledgerState$ = observable({
  ...initialLedgerState,
  async connectLedger(): Promise<{ connected: boolean; isAppOpen: boolean }> {
    // Set the loading state to true and clear any previous errors
    ledgerState$.device.isLoading.set(true)
    ledgerState$.device.error.set(undefined)

    try {
      const response = await ledgerClient.connectDevice(ledgerState$.clearConnection)

      ledgerState$.device.connection.set(response?.connection)
      ledgerState$.device.error.set(response?.error) // Set error even if not connected

      const isDeviceConnected = Boolean(response?.connection && !response?.error)
      // Use nullish coalescing to handle undefined isAppOpen property
      const isAppOpen = response?.connection?.isAppOpen ?? false

      // Check if device is connected but app is not open
      if (isDeviceConnected && !isAppOpen) {
        // Try to open the app automatically
        console.debug('[ledgerState$] App not open, attempting to open automatically')
        await ledgerClient.openApp()

        // Add notification to indicate the user should open the app
        notifications$.push({
          title: 'Polkadot Migration App not open',
          description:
            'Please open the Polkadot Migration App on your Ledger device. Once the app is open, click Connect again to continue.',
          type: 'warning',
          autoHideDuration: 5000,
        })

        // Check connection again after attempting to open the app
        const checkResult = await ledgerClient.checkConnection()
        if (checkResult) {
          // If app is now open, update the connection state
          return { connected: isDeviceConnected, isAppOpen: true }
        }
      }

      return { connected: isDeviceConnected, isAppOpen }
    } catch (error) {
      const internalError = interpretError(error, InternalErrorType.CONNECTION_ERROR)
      handleErrorNotification(internalError)

      return { connected: false, isAppOpen: false }
    } finally {
      ledgerState$.device.isLoading.set(false)
    }
  },

  async checkConnection() {
    try {
      return await ledgerClient.checkConnection()
    } catch (error) {
      console.warn('[ledgerState$] Connection check failed:', error)
      return false
    }
  },

  disconnectLedger() {
    try {
      ledgerClient.disconnect()
      ledgerState$.clearConnection()
    } catch (error) {
      const internalError = interpretError(error, InternalErrorType.DISCONNECTION_ERROR)
      handleErrorNotification(internalError)
    }
  },

  // Clear connection data
  clearConnection() {
    console.debug('[ledgerState$] Clearing connection data')
    ledgerState$.device.assign({
      connection: undefined,
      error: undefined,
      isLoading: false,
    })
  },

  // Clear synchronization data
  clearSynchronization() {
    ledgerState$.apps.assign({
      apps: [],
      polkadotApp: initialPolkadotApp,
      status: undefined,
      error: undefined,
      syncProgress: {
        scanned: 0,
        total: 0,
        percentage: 0,
        phase: undefined,
      },
      isSyncCancelRequested: false,
      migrationResult: {
        success: 0,
        fails: 0,
        total: 0,
      },
      currentMigratedItem: undefined,
    })
    ledgerState$.polkadotAddresses.set({})
  },

  // Stop synchronization without deleting already synchronized accounts
  cancelSynchronization() {
    ledgerState$.apps.isSyncCancelRequested.set(true)
    ledgerClient.abortCall()
    // Status will be set to SYNCHRONIZED in the finally block of synchronizeAccounts after cleanup

    notifications$.push({
      title: 'Synchronization Stopped',
      description: 'Synchronization cancelled, waiting for already started calls to finish.',
      type: 'info',
      autoHideDuration: 5000,
    })
  },

  // Determine if an error should stop synchronization and handle accordingly
  handleError(internalError: InternalError): boolean {
    // Check if the error type is in the list of errors that should stop synchronization
    if (errorsToStopSync.includes(internalError.errorType)) {
      console.debug('[handleSyncError] stopping synchronization')
      ledgerState$.cancelSynchronization()

      return true // Indicate that an action should be taken
    }
    return false // Indicate that no action should be taken
  },

  // Synchronize Single Account
  async synchronizeAccount(appId: AppId) {
    updateApp(appId, { status: AppStatus.RESCANNING, error: undefined })
    const appConfig = appsConfigs.get(appId)
    if (!appConfig) {
      console.error(`App with id ${appId} not found.`)
      return
    }

    try {
      updateApp(appId, { status: AppStatus.LOADING, error: undefined })

      const polkadotAccounts = ledgerState$.apps.polkadotApp.get().accounts || []
      const polkadotAddresses = polkadotAccounts.map(account => account.address)

      const { app, polkadotAddressesForApp } = await synchronizeAppAccounts(appConfig, polkadotAddresses, true, () =>
        ledgerState$.apps.isSyncCancelRequested.get()
      )
      if (app) {
        updateApp(appId, app)
        updatePolkadotAddresses(appId, polkadotAddressesForApp)
      }
    } catch (_error) {
      updateApp(appId, {
        status: AppStatus.ERROR,
        error: {
          source: 'synchronization',
          description: 'Failed to synchronize accounts',
        },
      })
    }
  },

  // Synchronize Accounts
  async synchronizeAccounts(): Promise<void> {
    ledgerState$.apps.isSyncCancelRequested.set(false)

    try {
      const isConnected = await ledgerState$.checkConnection()
      if (!isConnected) {
        const result = await ledgerState$.connectLedger()
        if (!result.connected) {
          ledgerState$.apps.assign({
            status: AppStatus.ERROR,
            apps: [],
            syncProgress: {
              scanned: 0,
              total: 0,
              percentage: 0,
              phase: undefined,
            },
          })
          return
        }
      }

      ledgerState$.apps.assign({
        status: AppStatus.LOADING,
        apps: [],
        syncProgress: {
          scanned: 0,
          total: 0,
          percentage: 0,
          phase: undefined,
        },
      })

      // Use the synchronization service to handle the sync process
      const result = await synchronizeAllApps(
        // Progress callback
        progress => {
          ledgerState$.apps.syncProgress.set(progress)
        },
        // Cancel callback
        () => ledgerState$.apps.isSyncCancelRequested.get(),
        // App start callback - add app with loading status
        loadingApp => {
          if (loadingApp.id === 'polkadot') {
            ledgerState$.apps.polkadotApp.set({ ...loadingApp, id: 'polkadot' })
          } else {
            ledgerState$.apps.apps.push(loadingApp)
          }
        },
        // Processing accounts start callback
        () => {
          ledgerState$.apps.status.set(AppStatus.ADDRESSES_FETCHED)
          const appsToBeSkipped = getAppsToSkipMigration().map(app => app.id)
          for (const app of ledgerState$.apps.apps.get()) {
            if (appsToBeSkipped.includes(app.id)) continue
            app.status = AppStatus.LOADING
          }
        },
        // App complete callback - replace loading app with completed app, and update polkadot addresses
        (completedApp, polkadotAddresses) => {
          updateApp(completedApp.id, completedApp)
          if (polkadotAddresses) {
            updatePolkadotAddresses(completedApp.id, polkadotAddresses)
          }
        }
      )

      if (result.success) {
        // Set the polkadot app
        if (result.polkadotApp) {
          ledgerState$.apps.polkadotApp.set({
            ...result.polkadotApp,
            id: 'polkadot',
            status: AppStatus.SYNCHRONIZED,
          })
        }

        // Set the synchronized apps
        ledgerState$.apps.apps.set(result.apps)

        // Reset cancel flag when synchronization completes successfully
        ledgerState$.apps.isSyncCancelRequested.set(false)
        ledgerState$.apps.status.set(AppStatus.SYNCHRONIZED)
      } else {
        throw new Error(result.error || 'Synchronization failed')
      }
    } catch (error) {
      const internalError = interpretError(error, InternalErrorType.SYNC_ERROR)
      handleErrorNotification(internalError)
      ledgerState$.apps.error.set('Failed to synchronize accounts')
    } finally {
      // Clean up cancellation state
      const wasCancelled = ledgerState$.apps.isSyncCancelRequested.get()
      ledgerState$.apps.isSyncCancelRequested.set(false)

      // If cancelled, set status to SYNCHRONIZED and notify user
      if (wasCancelled) {
        ledgerState$.apps.status.set(AppStatus.SYNCHRONIZED)
        notifications$.push({
          title: 'Synchronization Stopped',
          description: 'The synchronization process has been stopped. You can continue with the accounts that were already synchronized.',
          type: 'info',
          autoHideDuration: 5000,
        })
      }
    }
  },

  // Synchronize Balance
  async getAccountBalance(appId: AppId, accountType: AccountType, address: Address) {
    updateAccount(appId, accountType, address.address, { isLoading: true })
    const rpcEndpoints = appsConfigs.get(appId)?.rpcEndpoints

    if (!rpcEndpoints || rpcEndpoints.length === 0) {
      console.error('RPC endpoints not found for app:', appId)
      updateAccount(appId, accountType, address.address, {
        isLoading: false,
        error: {
          source: 'balance_fetch',
          description: 'RPC endpoints not found',
        },
      })
      return
    }

    const { api, provider } = await getApiAndProvider(rpcEndpoints)

    if (!api) {
      updateAccount(appId, accountType, address.address, {
        isLoading: false,
        error: {
          source: 'balance_fetch',
          description: errorDetails.balance_not_gotten.description ?? '',
        },
      })
      return
    }

    try {
      const { balances, collections, error } = await getBalance(address, api, appId)
      if (!error) {
        updateAccount(appId, accountType, address.address, {
          ...address,
          balances,
          status: AddressStatus.SYNCHRONIZED,
          error: undefined,
          isLoading: false,
        })

        if (collections && (collections.uniques.length > 0 || collections.nfts.length > 0)) {
          // Get existing collections for this app
          const apps = ledgerState$.apps.apps.get()
          const app = apps.find(a => a.id === appId)
          const existingCollections = app?.collections || {
            uniques: new Map<number, Collection>(),
            nfts: new Map<number, Collection>(),
          }

          // Merge with new collections
          const updatedCollections = {
            uniques: new Map(existingCollections.uniques),
            nfts: new Map(existingCollections.nfts),
          }
          for (const collection of collections.uniques) {
            if (collection.collectionId) {
              updatedCollections.uniques.set(collection.collectionId, collection)
            }
          }
          for (const collection of collections.nfts) {
            if (collection.collectionId) {
              updatedCollections.nfts.set(collection.collectionId, collection)
            }
          }
          updateApp(appId, {
            collections: updatedCollections,
          })
        }
      } else {
        updateAccount(appId, accountType, address.address, {
          isLoading: false,
          error: {
            source: 'balance_fetch',
            description: 'Failed to fetch balance',
          },
        })
      }
    } finally {
      if (api) {
        await api.disconnect()
      } else if (provider) {
        await provider.disconnect()
      }
    }
  },

  async verifyDestinationAddresses(
    appId: AppId,
    address: string,
    _path: string
  ): Promise<{
    isVerified: boolean
  }> {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig) {
      console.error(`App with id ${appId} not found.`)
      return { isVerified: false }
    }

    // Find the index of the address in the polkadotAddresses array
    const polkadotAddresses = ledgerState$.polkadotAddresses[appId].get()
    if (!polkadotAddresses || polkadotAddresses.length === 0) {
      console.error(`No Polkadot addresses found for app ${appId}.`)
      return { isVerified: false }
    }

    // Find the index of the address in the polkadotAddresses array
    const addressIndex = polkadotAddresses.findIndex(addr => addr === address)
    if (addressIndex === -1) {
      console.error(`Address ${address} not found in Polkadot addresses for app ${appId}.`)
      return { isVerified: false }
    }

    const polkadotConfig = polkadotAppConfig
    try {
      notifications$.push({
        title: 'Verify address on Ledger',
        description:
          'Please review and confirm the address on your Ledger device. This step is required to ensure your funds are sent to the correct destination.',
        type: 'info',
        autoHideDuration: 7000,
      })
      const response = await ledgerClient.getAccountAddress(polkadotConfig.bip44Path, addressIndex, appConfig.ss58Prefix)

      return { isVerified: response.result?.address === address }
    } catch (error) {
      console.warn('[ledgerState$] Address verification failed:', error)
      return { isVerified: false }
    }
  },

  // Migrate Single Account
  async migrateAccount(appId: AppId, account: Address | MultisigAddress): Promise<{ txPromises: Promise<void>[] | undefined } | undefined> {
    console.debug(`Starting migration for account ${account.address} in app ${appId}`)

    if (!account) {
      return undefined
    }

    const isMultisig = isMultisigAddress(account)
    const accountType = isMultisig ? AccountType.MULTISIG : AccountType.ACCOUNT

    // Check if account has balances to migrate
    if (account.balances && account.balances.length > 0) {
      updateMigratedStatus(appId, accountType, account.address, { status: TransactionStatus.IS_LOADING })

      updateMigrationResultCounter('total')

      try {
        const response = await ledgerClient.migrateAccount(appId, account, updateMigratedStatus)

        if (!response?.txPromise) {
          updateMigratedStatus(appId, accountType, account.address, {
            status: TransactionStatus.ERROR,
            statusMessage: errorDetails.migration_error.description,
          })

          // Increment fails counter
          updateMigrationResultCounter('fails')

          console.debug(`Balance migration for account ${account.address} in app ${appId} failed:`, InternalErrorType.MIGRATION_ERROR)
          return undefined
        }

        // The transaction has been signed and sent, but has not yet been finalized
        updateMigratedStatus(appId, accountType, account.address, { status: TransactionStatus.PENDING })

        console.debug(`Balance migration for account ${account.address} in app ${appId} transaction submitted`)

        // Return the transaction promise
        return { txPromises: [response.txPromise] }
      } catch (error) {
        const internalError = interpretError(error, InternalErrorType.MIGRATION_ERROR)
        updateMigratedStatus(appId, accountType, account.address, {
          status: TransactionStatus.ERROR,
          statusMessage: internalError.description,
        })

        // Increment fails counter
        updateMigrationResultCounter('fails')
        return undefined
      }
    }
  },

  // Migrate selected accounts
  async migrateSelected() {
    // Reset migration result
    ledgerState$.apps.migrationResult.set({ success: 0, fails: 0, total: 0 })

    try {
      const apps = ledgerState$.apps.apps.get()

      // Array to collect all transaction promises from all apps
      const allTransactionPromises: (Promise<void> | undefined)[] = []

      // Process apps to start their transactions
      for (const app of apps) {
        if ((!app.accounts || app.accounts.length === 0) && (!app.multisigAccounts || app.multisigAccounts.length === 0)) continue

        // Get accounts that need migration - using unified validation logic
        const accountsToMigrate: (Address | MultisigAddress)[] = [...(app.accounts || []), ...(app.multisigAccounts || [])].filter(
          account => canAccountBeMigrated(account)
        )

        if (accountsToMigrate.length === 0) continue

        // Mark the app as in migration process
        updateApp(app.id, { status: AppStatus.LOADING })

        // Start transactions for each account in the app
        for (const account of accountsToMigrate) {
          const migrationResult = await ledgerState$.migrateAccount(app.id, account)
          if (migrationResult?.txPromises) {
            allTransactionPromises.push(...migrationResult.txPromises)
          }
        }

        // Mark the app as synchronized after processing all its accounts
        updateApp(app.id, { status: AppStatus.SYNCHRONIZED })
      }

      // Wait for all transactions to complete before proceeding
      if (allTransactionPromises.length > 0) {
        const validPromises = allTransactionPromises.filter((p): p is Promise<void> => p !== undefined)

        // Use allSettled to wait for all promises, regardless of success or failure
        await Promise.allSettled(validPromises)
      }
    } catch (error) {
      const internalError = interpretError(error, InternalErrorType.MIGRATION_ERROR)
      handleErrorNotification(internalError)
      ledgerState$.apps.error.set('Failed to complete migration')
    }
  },

  async getMigrationTxInfo(appId: AppId, account: Address) {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig) {
      console.error(`App with id ${appId} not found.`)
      return
    }
    try {
      const txInfo = await ledgerClient.getMigrationTxInfo(appId, account)
      return txInfo
    } catch (error) {
      console.warn('[ledgerState$] Failed to get migration transaction info:', error)
      return undefined
    }
  },

  async unstakeBalance(appId: AppId, address: string, path: string, amount: BN, updateTxStatus: UpdateTransactionStatus) {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig) {
      console.error(`App with id ${appId} not found.`)
      return
    }

    try {
      await ledgerClient.unstakeBalance(appId, address, path, amount, updateTxStatus)
    } catch (error) {
      handleTransactionError(error, InternalErrorType.UNSTAKE_ERROR, updateTxStatus)
    }
  },

  async getUnstakeFee(appId: AppId, address: string, amount: BN): Promise<BN | undefined> {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig) {
      console.error(`App with id ${appId} not found.`)
      return
    }

    try {
      const estimatedFee = await ledgerClient.getUnstakeFee(appId, address, amount)
      return estimatedFee
    } catch (error) {
      console.warn('[ledgerState$] Failed to get unstake fee:', error)
      return undefined
    }
  },

  async withdrawBalance(appId: AppId, address: string, path: string, updateTxStatus: UpdateTransactionStatus) {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig) {
      console.error(`App with id ${appId} not found.`)
      return
    }

    try {
      await ledgerClient.withdrawBalance(appId, address, path, updateTxStatus)
    } catch (error) {
      handleTransactionError(error, InternalErrorType.WITHDRAW_ERROR, updateTxStatus)
    }
  },

  async getWithdrawFee(appId: AppId, address: string): Promise<BN | undefined> {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig) {
      console.error(`App with id ${appId} not found.`)
      return
    }

    try {
      return await ledgerClient.getWithdrawFee(appId, address)
    } catch (error) {
      console.warn('[ledgerState$] Failed to get withdraw fee:', error)
      return undefined
    }
  },

  async removeIdentity(appId: AppId, address: string, path: string, updateTxStatus: UpdateTransactionStatus) {
    try {
      await ledgerClient.removeIdentity(appId, address, path, updateTxStatus)
    } catch (error) {
      handleTransactionError(error, InternalErrorType.REMOVE_IDENTITY_ERROR, updateTxStatus)
    }
  },

  async getRemoveIdentityFee(appId: AppId, address: string): Promise<BN | undefined> {
    try {
      return await ledgerClient.getRemoveIdentityFee(appId, address)
    } catch (error) {
      console.warn('[ledgerState$] Failed to get remove identity fee:', error)
      return undefined
    }
  },

  async approveMultisigCall(
    appId: AppId,
    account: MultisigAddress,
    formBody: MultisigCallFormData,
    updateTxStatus: UpdateTransactionStatus
  ) {
    try {
      if (formBody.isFinalApprovalWithCall) {
        await ledgerClient.signAsMultiTx(
          appId,
          account,
          formBody.callHash,
          formBody.callData,
          formBody.signer,
          formBody.nestedSigner,
          updateTxStatus
        )
      } else {
        await ledgerClient.signApproveAsMultiTx(appId, account, formBody.callHash, formBody.signer, formBody.nestedSigner, updateTxStatus)
      }
    } catch (error) {
      console.error('[ledgerState$.approveMultisigCall] Error caught:', error)
      handleTransactionError(error, InternalErrorType.APPROVE_MULTISIG_CALL_ERROR, updateTxStatus)
    }
  },

  async createMultisigTransfer(
    appId: AppId,
    account: MultisigAddress,
    formBody: { recipient: string; signer: string },
    transferAmount: string,
    updateTxStatus: UpdateTransactionStatus
  ) {
    try {
      await ledgerClient.signMultisigTransferTx(appId, account, formBody.recipient, formBody.signer, transferAmount, updateTxStatus)
    } catch (error) {
      handleTransactionError(error, InternalErrorType.MULTISIG_TRANSFER_ERROR, updateTxStatus)
    }
  },

  async removeProxies(appId: AppId, address: string, path: string, updateTxStatus: UpdateTransactionStatus) {
    try {
      await ledgerClient.removeProxies(appId, address, path, updateTxStatus)
    } catch (error) {
      handleTransactionError(error, InternalErrorType.REMOVE_PROXY_ERROR, updateTxStatus)
    }
  },

  async getRemoveProxiesFee(appId: AppId, address: string): Promise<BN | undefined> {
    try {
      return await ledgerClient.getRemoveProxiesFee(appId, address)
    } catch (error) {
      console.warn('[ledgerState$] Failed to get remove proxies fee:', error)
      return undefined
    }
  },

  async removeAccountIndex(appId: AppId, address: string, accountIndex: string, path: string, updateTxStatus: UpdateTransactionStatus) {
    try {
      await ledgerClient.removeAccountIndex(appId, address, accountIndex, path, updateTxStatus)
    } catch (error) {
      handleTransactionError(error, InternalErrorType.REMOVE_ACCOUNT_INDEX_ERROR, updateTxStatus)
    }
  },

  async getRemoveAccountIndexFee(appId: AppId, address: string, accountIndex: string): Promise<BN | undefined> {
    try {
      return await ledgerClient.getRemoveAccountIndexFee(appId, address, accountIndex)
    } catch (error) {
      console.warn('[ledgerState$] Failed to get remove account index fee:', error)
      return undefined
    }
  },

  async executeGovernanceUnlock(
    appId: AppId,
    address: string,
    path: string,
    actions: Array<{ type: 'removeVote' | 'undelegate' | 'unlock'; trackId: number; referendumIndex?: number }>,
    updateTxStatus: UpdateTransactionStatus
  ) {
    try {
      await ledgerClient.executeGovernanceUnlock(appId, address, path, actions, updateTxStatus)
    } catch (error) {
      handleTransactionError(error, InternalErrorType.UNLOCK_CONVICTION_ERROR, updateTxStatus)
    }
  },

  async getGovernanceUnlockFee(
    appId: AppId,
    address: string,
    actions: Array<{ type: 'removeVote' | 'undelegate' | 'unlock'; trackId: number; referendumIndex?: number }>
  ): Promise<BN | undefined> {
    try {
      return await ledgerClient.getGovernanceUnlockFee(appId, address, actions)
    } catch (error) {
      console.warn('[ledgerState$] Failed to get governance unlock fee:', error)
      return undefined
    }
  },

  // Deep Scan functionality
  cancelDeepScan() {
    ledgerState$.deepScan.cancelRequested.set(true)
    ledgerClient.abortCall()
    notifications$.push({
      title: 'Deep Scan Stopped',
      description: 'Deep scan cancelled, waiting for already started calls to finish.',
      type: 'info',
      autoHideDuration: 5000,
    })
  },

  resetDeepScan() {
    ledgerState$.deepScan.assign({
      isScanning: false,
      isCompleted: false,
      cancelRequested: false,
      progress: {
        scanned: 0,
        total: 0,
        percentage: 0,
        phase: undefined,
      },
      apps: [],
    })
  },

  async deepScanApp(
    selectedChain: AppId | 'all',
    accountIndices: number[],
    addressIndices: number[]
  ): Promise<{
    success: boolean
    newAccountsFound: number
  }> {
    // Check if ledger is connected
    const isConnected = await ledgerState$.checkConnection()
    if (!isConnected) {
      const result = await ledgerState$.connectLedger()
      if (!result.connected) {
        return { success: false, newAccountsFound: 0 }
      }
    }

    // Reset state
    ledgerState$.deepScan.assign({
      isScanning: true,
      isCompleted: false,
      cancelRequested: false,
      progress: {
        scanned: 0,
        total: 0,
        percentage: 0,
        phase: undefined,
      },
      apps: [],
    })

    try {
      // Get current synchronized apps
      const currentApps = ledgerState$.apps.apps.get()
      const polkadotAddresses = ledgerState$.apps.polkadotApp.accounts.get()?.map(account => account.address) || []

      // Use the synchronization service to handle the deep scan process
      const result = await deepScanAllApps(
        selectedChain,
        accountIndices,
        addressIndices,
        currentApps,
        polkadotAddresses,
        // Progress callback
        progress => {
          ledgerState$.deepScan.progress.set(progress)
        },
        // Cancel callback
        () => ledgerState$.deepScan.cancelRequested.get(),
        // App start callback - initialize apps for scanning grid
        app => {
          const currentDeepScanApps = ledgerState$.deepScan.apps.get()
          // Add app if not already present
          if (!currentDeepScanApps.find(a => a.id === app.id)) {
            ledgerState$.deepScan.apps.push(app)
          }
        },
        // Processing accounts start callback
        () => {
          ledgerState$.deepScan.progress.phase.set(FetchingAddressesPhase.PROCESSING_ACCOUNTS)

          const appsToBeSkipped = getAppsToSkipMigration().map(app => app.id)
          for (const app of ledgerState$.deepScan.apps.get()) {
            if (appsToBeSkipped.includes(app.id)) continue
            app.status = AppStatus.LOADING
          }
        },
        // App update callback - update app status in scanning grid and update polkadot addresses
        (app, polkadotAddresses) => {
          const currentDeepScanApps = ledgerState$.deepScan.apps.get()
          ledgerState$.deepScan.apps.set(
            currentDeepScanApps.map(scanApp =>
              scanApp.id === app.id
                ? {
                    ...app,
                    originalAccountCount: scanApp.originalAccountCount,
                  }
                : scanApp
            )
          )

          // Update polkadot addresses if provided
          if (polkadotAddresses) {
            updatePolkadotAddresses(app.id, polkadotAddresses)
          }
        }
      )

      if (!result.success) {
        // If cancelled, show cancellation notification
        if (ledgerState$.deepScan.cancelRequested.get()) {
          notifications$.push({
            title: 'Deep Scan Cancelled',
            description: 'The scan was cancelled.',
            type: 'info',
            autoHideDuration: 5000,
          })
        }

        return { success: false, newAccountsFound: 0 }
      }

      // Update state with results (only update apps that have new accounts)
      if (result.newAccountsFound > 0) {
        const currentApps = ledgerState$.apps.apps.get()
        const updatedApps = [...currentApps]

        for (const scannedApp of result.apps) {
          const existingAppIndex = updatedApps.findIndex(app => app.id === scannedApp.id)
          if (existingAppIndex !== -1) {
            updatedApps[existingAppIndex] = {
              ...updatedApps[existingAppIndex],
              accounts: scannedApp.accounts,
              multisigAccounts: scannedApp.multisigAccounts,
              status: scannedApp.status,
              error: undefined,
            }
          } else if (scannedApp.accounts && scannedApp.accounts.length > 0) {
            // Add new app if it has accounts
            updatedApps.push({
              id: scannedApp.id,
              name: scannedApp.name,
              token: scannedApp.token,
              status: scannedApp.status,
              accounts: scannedApp.accounts,
              multisigAccounts: scannedApp.multisigAccounts,
            } as App)
          }
        }

        ledgerState$.apps.apps.set(updatedApps)
      }

      // Update Polkadot app if it was synchronized during deep scan
      const currentPolkadotApp = ledgerState$.apps.polkadotApp.get()
      const hasNewPolkadotAccounts = result.polkadotApp?.accounts && result.polkadotApp.accounts.length > 0
      const needsPolkadotUpdate = !currentPolkadotApp.accounts || currentPolkadotApp.accounts.length === 0

      if (hasNewPolkadotAccounts && needsPolkadotUpdate && result.polkadotApp) {
        ledgerState$.apps.polkadotApp.set({
          ...result.polkadotApp,
          id: 'polkadot',
          status: AppStatus.SYNCHRONIZED,
        })
      }

      // Show appropriate notifications
      const chainInfo = selectedChain === 'all' ? 'all networks' : result.apps[0]?.name || 'selected network'
      if (result.newAccountsFound > 0) {
        notifications$.push({
          title: 'Deep Scan Complete',
          description: `Found ${result.newAccountsFound} new account${result.newAccountsFound === 1 ? '' : 's'} with balances on ${chainInfo}.`,
          type: 'success',
          autoHideDuration: 5000,
        })
      } else {
        notifications$.push({
          title: 'Deep Scan Complete',
          description: 'No new accounts with balances were found in the specified range.',
          type: 'info',
          autoHideDuration: 5000,
        })
      }

      // Mark scan as completed
      ledgerState$.deepScan.isCompleted.set(true)

      return { success: true, newAccountsFound: result.newAccountsFound }
    } catch (error) {
      console.error('Deep scan failed with critical error:', error)

      const internalError = interpretError(error, InternalErrorType.SYNC_ERROR)

      // Show critical system error notification
      notifications$.push({
        title: 'Deep Scan System Error',
        description: internalError.description || 'A critical system error occurred during deep scan.',
        type: 'error',
        autoHideDuration: 5000,
      })

      return { success: false, newAccountsFound: 0 }
    } finally {
      // Clean up scanning state
      ledgerState$.deepScan.isScanning.set(false)
      ledgerState$.deepScan.cancelRequested.set(false)
    }
  },
})

/**
 * Computed observable that combines apps and polkadotApp into a single array.
 * This computed value is memoized and only recalculates when the underlying apps change,
 * preventing unnecessary re-renders in components that consume this data.
 */
export const allApps$ = computed(() => {
  const { apps, polkadotApp } = ledgerState$.apps.get()
  return [...apps, polkadotApp]
})
