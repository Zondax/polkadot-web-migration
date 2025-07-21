import { observable } from '@legendapp/state'
import type { BN } from '@polkadot/util'
import { type AppId, appsConfigs, polkadotAppConfig } from 'config/apps'
import { errorDetails, InternalErrorType } from 'config/errors'
import type { MultisigCallFormData } from '@/components/sections/migrate/dialogs/approve-multisig-call-dialog'
import type { Token } from '@/config/apps'
import { getApiAndProvider, getBalance, type UpdateTransactionStatus } from '@/lib/account'
import type { DeviceConnectionProps } from '@/lib/ledger/types'
import { synchronizeAllApps, synchronizeAppAccounts } from '@/lib/services/synchronization.service'
import { type InternalError, interpretError } from '@/lib/utils'
import { isMultisigAddress } from '@/lib/utils/address'
import { hasAddressBalance } from '@/lib/utils/balance'
import { ledgerClient } from './client/ledger'
import { errorsToStopSync } from './config/ledger'
import { notifications$ } from './notifications'
import {
  AccountType,
  type Address,
  AddressStatus,
  type Collection,
  type MigratingItem,
  type MultisigAddress,
  TransactionStatus,
  type UpdateMigratedStatusFn,
} from './types/ledger'

export enum AppStatus {
  MIGRATED = 'migrated',
  SYNCHRONIZED = 'synchronized',
  LOADING = 'loading',
  ERROR = 'error',
  RESCANNING = 'rescanning',
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

interface LedgerState {
  device: {
    connection?: DeviceConnectionProps
    isLoading: boolean
    error?: string
  }
  apps: {
    apps: App[]
    polkadotApp: App
    status?: AppStatus
    error?: string
    syncProgress: {
      scanned: number
      total: number
      percentage: number
    }
    isSyncCancelRequested: boolean
    migrationResult: {
      [key in MigrationResultKey]: number
    }
    currentMigratedItem?: MigratingItem
  }
  polkadotAddresses: Partial<Record<AppId, string[]>>
}

const initialLedgerState: LedgerState = {
  device: {
    connection: undefined,
    isLoading: false,
    error: undefined,
  },
  apps: {
    apps: [],
    polkadotApp: polkadotAppConfig,
    status: undefined,
    error: undefined,
    syncProgress: {
      scanned: 0,
      total: 0,
      percentage: 0,
    },
    isSyncCancelRequested: false,
    migrationResult: {
      success: 0,
      fails: 0,
      total: 0,
    },
    currentMigratedItem: undefined,
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
      polkadotApp: polkadotAppConfig,
      status: undefined,
      error: undefined,
      syncProgress: {
        scanned: 0,
        total: 0,
        percentage: 0,
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

    // Set status to synchronized to indicate that the process was stopped
    ledgerState$.apps.status.set(AppStatus.SYNCHRONIZED)

    notifications$.push({
      title: 'Synchronization Stopped',
      description: 'The synchronization process has been stopped. You can continue with the accounts that were already synchronized.',
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

      const { app, polkadotAddressesForApp } = await synchronizeAppAccounts(appConfig, polkadotAddresses)
      if (app) {
        updateApp(appId, app)
        ledgerState$.polkadotAddresses[appId].set(polkadotAddressesForApp)
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
          ledgerState$.apps.apps.push(loadingApp)
        },
        // App complete callback - replace loading app with completed app
        completedApp => {
          updateApp(completedApp.id, completedApp)
        }
      )

      if (result.success) {
        // Set the polkadot app
        if (result.polkadotApp) {
          ledgerState$.apps.polkadotApp.set({
            ...result.polkadotApp,
            status: AppStatus.SYNCHRONIZED,
          })
        }

        // Set the synchronized apps
        ledgerState$.apps.apps.set(result.apps)

        // Set the polkadot addresses for each app
        if (result.polkadotAddressesForApp) {
          for (const [appId, addresses] of Object.entries(result.polkadotAddressesForApp)) {
            ledgerState$.polkadotAddresses[appId].set(addresses)
          }
        }

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
      // Ensure we reset the cancel flag even if there was an error
      if (ledgerState$.apps.isSyncCancelRequested.get()) {
        ledgerState$.apps.isSyncCancelRequested.set(false)
      }
    }
  },

  // Synchronize Balance
  async getAccountBalance(appId: AppId, accountType: AccountType, address: Address) {
    updateAccount(appId, accountType, address.address, { isLoading: true })
    const rpcEndpoint = appsConfigs.get(appId)?.rpcEndpoint

    if (!rpcEndpoint) {
      console.error('RPC endpoint not found for app:', appId)
      updateAccount(appId, accountType, address.address, {
        isLoading: false,
        error: {
          source: 'balance_fetch',
          description: 'RPC endpoint not found',
        },
      })
      return
    }

    const { api, provider } = await getApiAndProvider(rpcEndpoint)

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
  async migrateSelected(selectedOnly = true) {
    // Reset migration result
    ledgerState$.apps.migrationResult.set({ success: 0, fails: 0, total: 0 })

    try {
      const apps = ledgerState$.apps.apps.get()

      // Array to collect all transaction promises from all apps
      const allTransactionPromises: (Promise<void> | undefined)[] = []

      // Process apps to start their transactions
      for (const app of apps) {
        if ((!app.accounts || app.accounts.length === 0) && (!app.multisigAccounts || app.multisigAccounts.length === 0)) continue

        // Get accounts that need migration
        const accountsToMigrate: (Address | MultisigAddress)[] = [...(app.accounts || []), ...(app.multisigAccounts || [])]
          // Skip accounts that are already migrated or have no balance
          .filter(account => account.status !== 'migrated' && hasAddressBalance(account) && (!selectedOnly || account.selected))

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

      // We don't wait for transactions to complete, we process them in the background
      if (allTransactionPromises.length > 0) {
        const validPromises = allTransactionPromises.filter((p): p is Promise<void> => p !== undefined)

        // Monitor total progress in the background, without blocking
        await Promise.all(validPromises)
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
      const internalError = interpretError(error, InternalErrorType.UNSTAKE_ERROR)
      updateTxStatus(TransactionStatus.ERROR, internalError.description)
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
      const internalError = interpretError(error, InternalErrorType.WITHDRAW_ERROR)
      updateTxStatus(TransactionStatus.ERROR, internalError.description)
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
      const internalError = interpretError(error, InternalErrorType.REMOVE_IDENTITY_ERROR)
      updateTxStatus(TransactionStatus.ERROR, internalError.description)
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
      console.log('[ledgerState$.approveMultisigCall] Starting with:', {
        appId,
        accountAddress: account.address,
        formBody,
        isFinalApproval: formBody.isFinalApprovalWithCall
      })
      
      if (formBody.isFinalApprovalWithCall) {
        await ledgerClient.signAsMultiTx(appId, account, formBody.callHash, formBody.callData, formBody.signer, formBody.nestedSigner, updateTxStatus)
      } else {
        await ledgerClient.signApproveAsMultiTx(appId, account, formBody.callHash, formBody.signer, formBody.nestedSigner, updateTxStatus)
      }
    } catch (error) {
      console.error('[ledgerState$.approveMultisigCall] Error caught:', error)
      const internalError = interpretError(error, InternalErrorType.APPROVE_MULTISIG_CALL_ERROR)
      updateTxStatus(TransactionStatus.ERROR, internalError.description)
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
      const internalError = interpretError(error, InternalErrorType.MULTISIG_TRANSFER_ERROR)
      updateTxStatus(TransactionStatus.ERROR, internalError.description)
    }
  },

  async removeProxies(appId: AppId, address: string, path: string, updateTxStatus: UpdateTransactionStatus) {
    try {
      await ledgerClient.removeProxies(appId, address, path, updateTxStatus)
    } catch (error) {
      const internalError = interpretError(error, InternalErrorType.REMOVE_PROXY_ERROR)
      updateTxStatus(TransactionStatus.ERROR, internalError.description)
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
      const internalError = interpretError(error, InternalErrorType.REMOVE_ACCOUNT_INDEX_ERROR)
      updateTxStatus(TransactionStatus.ERROR, internalError.description)
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
})
