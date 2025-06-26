import { observable } from '@legendapp/state'
import { type AppConfig, type AppId, appsConfigs, polkadotAppConfig } from 'config/apps'
import { InternalErrorType, errorDetails } from 'config/errors'
import { errorApps, syncApps } from 'config/mockData'

import type { Token } from '@/config/apps'
import { maxAddressesToFetch } from '@/config/config'
import {
  type UpdateTransactionStatus,
  getApiAndProvider,
  getBalance,
  getIdentityInfo,
  getMultisigAddresses,
  getProxyInfo,
} from '@/lib/account'
import type { DeviceConnectionProps } from '@/lib/ledger/types'
import { convertSS58Format, isMultisigAddress } from '@/lib/utils/address'
import { hasAddressBalance, hasBalance, hasNegativeBalance, validateReservedBreakdown } from '@/lib/utils/balance'
import { filterAccountsForApps, setDefaultDestinationAddress } from '@/lib/utils/ledger'

import type { MultisigCallFormData } from '@/components/sections/migrate/dialogs/approve-multisig-call-dialog'
import { type InternalError, interpretError } from '@/lib/utils'
import { handleErrorNotification } from '@/lib/utils/notifications'
import { BN } from '@polkadot/util'
import { ledgerClient } from './client/ledger'
import { errorsToStopSync } from './config/ledger'
import { notifications$ } from './notifications'
import {
  AccountType,
  type Address,
  type AddressBalance,
  AddressStatus,
  BalanceType,
  type Collection,
  type MigratingItem,
  type MultisigAddress,
  type Native,
  type PreTxInfo,
  TransactionStatus,
  type UpdateMigratedStatusFn,
} from './types/ledger'
import type { Notification } from './types/notifications'

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

// Update Migrated Status
const updateMigratedStatus: UpdateMigratedStatusFn = (
  appId: AppId,
  accountType,
  accountPath: string,
  balanceType,
  status,
  message,
  txDetails
) => {
  const apps = ledgerState$.apps.apps.get()
  const appIndex = apps.findIndex(app => app.id === appId)

  if (appIndex !== -1) {
    const app = apps[appIndex]
    const singleAccounts = app?.accounts ? [...app.accounts] : []
    const multisigAccounts = app?.multisigAccounts ? [...app.multisigAccounts] : []

    const accounts = accountType === AccountType.MULTISIG ? multisigAccounts : singleAccounts

    const accountIndex = accounts.findIndex(account => account.path === accountPath)

    if (accountIndex !== -1 && accounts[accountIndex]) {
      // Update the account's transaction details
      accounts[accountIndex] = {
        ...accounts[accountIndex],
        balances: accounts[accountIndex].balances?.map(balance => {
          if (balance.type === balanceType) {
            // If the status is IS_LOADING, set the currentMigratedItem
            if (status === TransactionStatus.IS_LOADING) {
              ledgerState$.apps.currentMigratedItem.set({
                appId,
                appName: app.name || app.id,
                account: accounts[accountIndex],
                transaction: {
                  status: TransactionStatus.IS_LOADING,
                  statusMessage: message,
                  ...txDetails,
                },
              })
            } else {
              // Only clear if this is the currently migrating item
              const currentItem = ledgerState$.apps.currentMigratedItem.get()
              if (currentItem?.appId === appId && currentItem?.account.path === accountPath) {
                // Clear for other statuses (SUCCESS, FAILED, ERROR)
                ledgerState$.apps.currentMigratedItem.set(undefined)
              }
            }

            return {
              ...balance,
              transaction: {
                ...balance.transaction,
                status: status,
                statusMessage: message,
                ...txDetails,
              },
            }
          }
          return balance
        }),
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
      const response = await ledgerClient.connectDevice()

      ledgerState$.device.connection.set(response?.connection)
      ledgerState$.device.error.set(response?.error) // Set error even if not connected

      const isDeviceConnected = Boolean(response?.connection && !response?.error)
      const isAppOpen = Boolean(response?.connection?.isAppOpen)

      // Check if device is connected but app is not open
      if (isDeviceConnected && !isAppOpen) {
        // Add notification to indicate the user should open the app
        notifications$.push({
          title: 'Polkadot Migration App not open',
          description:
            'Please open the Polkadot Migration App on your Ledger device. Once the app is open, click Connect again to continue.',
          type: 'warning',
          autoHideDuration: 5000,
        })
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
    ledgerState$.device.assign({
      connection: undefined,
      error: undefined,
      isLoading: false,
    })
    ledgerState$.clearSynchronization()
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

  // Fetch and Process Accounts for a Single App
  async fetchAndProcessAccountsForApp(app: AppConfig, filterByBalance = true): Promise<App | undefined> {
    try {
      if (process.env.NEXT_PUBLIC_NODE_ENV === 'development' && errorApps && errorApps?.includes(app.id)) {
        throw new Error('Mock synchronization error')
      }

      const response = await ledgerClient.synchronizeAccounts(app)

      if (!response.result || !app.rpcEndpoint) {
        return {
          name: app.name,
          id: app.id,
          token: app.token,
          status: AppStatus.ERROR,
          error: {
            source: 'synchronization',
            description: 'Failed to synchronize accounts',
          },
        }
      }

      const polkadotAccounts = ledgerState$.apps.polkadotApp.get().accounts || []

      const { api, provider } = await getApiAndProvider(app.rpcEndpoint)

      if (!api) {
        return {
          name: app.name,
          id: app.id,
          token: app.token,
          status: AppStatus.ERROR,
          error: {
            source: 'synchronization',
            description: errorDetails.blockchain_connection_error.description ?? '',
          },
        }
      }

      // Store collections for this address if they exist
      const collectionsMap = {
        uniques: new Map<number, Collection>(),
        nfts: new Map<number, Collection>(),
      }

      const multisigAccounts: Map<string, MultisigAddress> = new Map()

      const processCollections = (collections: {
        uniques: Collection[]
        nfts: Collection[]
      }) => {
        // Process uniques collections
        if (collections.uniques && collections.uniques.length > 0) {
          for (const collection of collections.uniques) {
            if (collection.collectionId) {
              collectionsMap.uniques.set(collection.collectionId, collection)
            }
          }
        }

        // Process nfts collections
        if (collections.nfts && collections.nfts.length > 0) {
          for (const collection of collections.nfts) {
            if (collection.collectionId) {
              collectionsMap.nfts.set(collection.collectionId, collection)
            }
          }
        }
      }

      const accounts: Address[] = await Promise.all(
        response.result.map(async address => {
          let addressHasNegativeBalance = false
          const balances: AddressBalance[] = []

          // Balance Info
          const { balances: balancesResponse, collections, error } = await getBalance(address, api, app.id)
          for (const balance of balancesResponse) {
            if (hasNegativeBalance([balance])) {
              addressHasNegativeBalance = true
              break
            }
            if (hasBalance([balance])) {
              balances.push(balance)
            }
          }
          if (addressHasNegativeBalance) {
            return {
              ...address,
              balances,
              error: {
                source: 'balance_fetch',
                description: 'The synchronized balance is not valid',
              },
              isLoading: false,
            }
          }

          if (error) {
            return {
              ...address,
              balances,
              error: {
                source: 'balance_fetch',
                description: 'Failed to fetch balance',
              },
              isLoading: false,
            }
          }
          if (collections) {
            processCollections(collections)
          }

          // Registration Info
          const registration = await getIdentityInfo(address.address, api)

          // Proxy Info
          const proxy = await getProxyInfo(address.address, api)

          // Multisig Addresses
          let memberMultisigAddresses: string[] | undefined
          const multisigDeposits: { callHash: string; deposit: BN }[] = []
          if (app.explorer?.id === 'subscan') {
            // a subscan endpoint is used to get the multisig addresses
            const multisigAddresses = await getMultisigAddresses(address.address, address.path, app.explorer.network || app.id, api)
            memberMultisigAddresses = multisigAddresses?.map(multisigAddress => multisigAddress.address)

            if (memberMultisigAddresses && multisigAddresses) {
              for (const multisigAddress of multisigAddresses) {
                multisigAccounts.set(multisigAddress.address, multisigAddress)

                // Collect deposits from pending multisig calls where this address is the depositor
                if (multisigAddress.pendingMultisigCalls) {
                  for (const call of multisigAddress.pendingMultisigCalls) {
                    if (call.depositor === address.address) {
                      multisigDeposits.push({
                        callHash: call.callHash,
                        deposit: call.deposit,
                      })
                    }
                  }
                }
              }
            }
          }

          const hasReservedBalance = registration?.deposit || multisigDeposits.length > 0 || proxy?.deposit
          const nativeBalanceIndex = balances.findIndex(balance => balance.type === BalanceType.NATIVE)
          if (hasReservedBalance && nativeBalanceIndex !== -1) {
            const nativeBalance = balances[nativeBalanceIndex].balance as Native
            const identityDeposit = registration?.deposit ? new BN(registration.deposit.toString()) : new BN(0)
            const multisigDeposit =
              multisigDeposits.length > 0
                ? new BN(multisigDeposits.reduce((sum, deposit) => sum.add(new BN(deposit.deposit.toString())), new BN(0)).toString())
                : new BN(0)
            const proxyDeposit = proxy?.deposit ? new BN(proxy.deposit.toString()) : new BN(0)

            const isBreakdownValid = validateReservedBreakdown(identityDeposit, multisigDeposit, proxyDeposit, nativeBalance.reserved.total)

            if (isBreakdownValid) {
              balances[nativeBalanceIndex].balance = {
                ...nativeBalance,
                reserved: {
                  ...nativeBalance.reserved,
                  identity: identityDeposit.gtn(0) ? { deposit: identityDeposit } : undefined,
                  multisig: multisigDeposit.gtn(0)
                    ? { total: multisigDeposit, deposits: multisigDeposits.map(d => ({ ...d, deposit: d.deposit })) }
                    : undefined,
                  proxy: proxyDeposit.gtn(0) ? { deposit: proxyDeposit } : undefined,
                },
              }
            } else {
              console.debug('We could not load the breakdown details.')
            }
          }

          return {
            ...address,
            balances,
            registration,
            memberMultisigAddresses,
            proxy,
            status: AddressStatus.SYNCHRONIZED,
            error: undefined,
            isLoading: false,
            selected: true,
          }
        })
      )

      // Get info related to multisig accounts if they exist
      const foundAccounts = accounts.map(account => account.address)

      // Obtener el balance de cada multisigAccount dentro del map
      await Promise.all(
        Array.from(multisigAccounts.values()).map(async multisigAddress => {
          const {
            balances: multisigBalancesResponse,
            collections: multisigCollections,
            error: multisigError,
          } = await getBalance(multisigAddress, api, app.id)
          const multisigBalances = multisigBalancesResponse.filter(balance => hasBalance([balance]))

          if (multisigCollections) {
            processCollections(multisigCollections)
          }

          multisigAddress.balances = multisigBalances.map(balance => ({
            ...balance,
            transaction: { ...balance.transaction, signatoryAddress: multisigAddress.members[0].address },
          }))
          multisigAddress.status = AddressStatus.SYNCHRONIZED
          multisigAddress.error = multisigError
            ? {
                source: 'balance_fetch',
                description: 'Failed to fetch balance',
              }
            : undefined
          multisigAddress.isLoading = false
          multisigAddress.selected = true
          multisigAddress.members = multisigAddress.members.map(member => {
            if (foundAccounts.includes(member.address)) {
              return { ...member, internal: true, path: accounts.find(account => account.address === member.address)?.path }
            }
            return member
          })
          multisigAccounts.set(multisigAddress.address, multisigAddress)
        })
      )

      const filteredAccounts = filterAccountsForApps(accounts, filterByBalance)

      const filteredMultisigAccounts = filterAccountsForApps(Array.from(multisigAccounts.values()), filterByBalance)

      // Only set the app if there are accounts after filtering
      if (filteredAccounts.length > 0) {
        const polkadotAddresses = polkadotAccounts.map(account => convertSS58Format(account.address, app.ss58Prefix || 0))
        ledgerState$.polkadotAddresses[app.id].set(polkadotAddresses)

        if (api) {
          await api.disconnect()
        } else if (provider) {
          await provider.disconnect()
        }

        return {
          name: app.name,
          id: app.id,
          token: app.token,
          status: AppStatus.SYNCHRONIZED,
          accounts: filteredAccounts.map(account => setDefaultDestinationAddress(account, polkadotAddresses[0])),
          collections: collectionsMap,
          multisigAccounts: filteredMultisigAccounts.map(account => setDefaultDestinationAddress(account, polkadotAddresses[0])),
        }
      }

      if (ledgerState$.apps.isSyncCancelRequested.get()) {
        return undefined
      }

      notifications$.push({
        title: 'No accounts to migrate',
        description: `We could not find any accounts with a balance to migrate for ${app.id.charAt(0).toUpperCase() + app.id.slice(1)}.`,
        appId: app.id,
        type: 'info',
        autoHideDuration: 5000,
      })

      // No accounts after filtering
      return {
        name: app.name,
        id: app.id,
        token: app.token,
        status: AppStatus.SYNCHRONIZED,
        accounts: [],
      }
    } catch (error) {
      console.debug('Error fetching and processing accounts for app:', app.id)
      const internalError = interpretError(error, InternalErrorType.FETCH_PROCESS_ACCOUNTS_ERROR)
      ledgerState$.handleError(internalError)
      handleErrorNotification(internalError)

      return {
        name: app.name,
        id: app.id,
        token: app.token,
        status: AppStatus.ERROR,
        error: {
          source: 'synchronization',
          description: internalError.title ?? '',
        },
      }
    }
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

      const app = await ledgerState$.fetchAndProcessAccountsForApp(appConfig)
      if (app) {
        updateApp(appId, app)
      }
    } catch (error) {
      updateApp(appId, {
        status: AppStatus.ERROR,
        error: {
          source: 'synchronization',
          description: 'Failed to synchronize accounts',
        },
      })
    }
  },

  // Fetch and Process Accounts for a Single App
  async fetchAndProcessPolkadotAccounts(): Promise<App | undefined> {
    try {
      const app = polkadotAppConfig
      const response = await ledgerClient.synchronizeAccounts(app)

      const noAccountsNotification: Omit<Notification, 'id' | 'createdAt'> = {
        title: 'No Polkadot accounts found',
        description: 'There are no Polkadot accounts available to migrate from on your Ledger device.',
        appId: app.id,
        type: 'info',
        autoHideDuration: 5000,
      }

      if (!response.result || !app.rpcEndpoint) {
        notifications$.push(noAccountsNotification)
        return {
          name: app.name,
          id: app.id,
          token: app.token,
          status: AppStatus.ERROR,
        }
      }

      const accounts = response.result

      const { api, provider } = await getApiAndProvider(app.rpcEndpoint)

      if (!api) {
        return {
          name: app.name,
          id: app.id,
          token: app.token,
          status: AppStatus.ERROR,
          error: {
            source: 'synchronization',
            description: errorDetails.blockchain_connection_error.description ?? '',
          },
        }
      }

      if (api) {
        await api.disconnect()
      } else if (provider) {
        await provider.disconnect()
      }

      // Only add a notification if there are no accounts after filtering
      if (accounts.length === 0) {
        notifications$.push(noAccountsNotification)
      }

      return {
        name: app.name,
        id: app.id,
        token: app.token,
        status: AppStatus.SYNCHRONIZED,
        accounts,
      }
    } catch (error) {
      const app = polkadotAppConfig
      console.debug('Error fetching and processing accounts for app:', app.id)
      const internalError = interpretError(error, InternalErrorType.FETCH_PROCESS_ACCOUNTS_ERROR)
      ledgerState$.handleError(internalError)
      handleErrorNotification(internalError)

      return {
        name: app.name,
        id: app.id,
        token: app.token,
        status: AppStatus.ERROR,
      }
    }
  },

  // Synchronize Accounts
  async synchronizeAccounts() {
    ledgerState$.apps.isSyncCancelRequested.set(false)
    ledgerState$.apps.assign({
      status: AppStatus.LOADING,
      apps: [],
      syncProgress: {
        scanned: 0,
        total: 0,
        percentage: 0,
      },
    })

    try {
      const connection = ledgerState$.device.connection.get()
      if (!connection) {
        ledgerState$.apps.assign({
          status: undefined,
          apps: [],
          syncProgress: {
            scanned: 0,
            total: 0,
            percentage: 0,
          },
        })
        return
      }

      notifications$.push({
        title: 'Synchronizing accounts',
        description: `We are synchronizing the first ${maxAddressesToFetch} accounts for each blockchain. Please wait while we gather your account information.`,
        type: 'info',
        autoHideDuration: 5000,
      })

      const polkadotApp = await ledgerState$.fetchAndProcessPolkadotAccounts()
      if (polkadotApp) {
        ledgerState$.apps.polkadotApp.set({
          ...polkadotApp,
          status: AppStatus.SYNCHRONIZED,
        })
      }

      // Get the total number of apps to synchronize
      let appsToSync: (AppConfig | undefined)[] = Array.from(appsConfigs.values())

      // If in development environment, use apps specified in environment variable
      if (process.env.NEXT_PUBLIC_NODE_ENV === 'development' && syncApps && syncApps.length > 0) {
        try {
          appsToSync = syncApps.map(appId => appsConfigs.get(appId as AppId))
        } catch (error) {
          console.error('Error parsing NEXT_PUBLIC_SYNC_APPS environment variable:', error)
          return
        }
      }

      appsToSync = appsToSync.filter(appConfig => appConfig?.rpcEndpoint) as AppConfig[]
      const totalApps = appsToSync.length
      let syncedApps = 0

      ledgerState$.apps.syncProgress.set({
        scanned: syncedApps,
        total: totalApps,
        percentage: 0,
      })

      // request and save the accounts of each app synchronously
      for (const appConfig of appsToSync) {
        // Check if cancellation is requested
        if (ledgerState$.apps.isSyncCancelRequested.get()) {
          return undefined
        }

        if (appConfig) {
          ledgerState$.apps.apps.push({
            id: appConfig.id,
            name: appConfig.name,
            token: appConfig.token,
            status: AppStatus.LOADING,
            error: undefined,
          })

          // Comment it later
          const app = await ledgerState$.fetchAndProcessAccountsForApp(appConfig)
          if (app) {
            updateApp(appConfig.id, app)
          }
        }

        // Update sync progress
        syncedApps++
        const progress = Math.round((syncedApps / totalApps) * 100)
        ledgerState$.apps.syncProgress.scanned.set(syncedApps)
        ledgerState$.apps.syncProgress.percentage.set(progress)
      }

      // Reset cancel flag when synchronization completes successfully
      ledgerState$.apps.isSyncCancelRequested.set(false)
      ledgerState$.apps.status.set(AppStatus.SYNCHRONIZED)
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
    path: string
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
      return { isVerified: false }
    }
  },

  // Migrate Single Account
  async migrateAccount(appId: AppId, account: Address | MultisigAddress): Promise<{ txPromises: Promise<void>[] | undefined } | undefined> {
    console.debug(`Starting migration for account ${account.address} in app ${appId}`)

    if (!account) {
      return undefined
    }

    // Check if account has balances to migrate
    if (account.balances && account.balances.length > 0) {
      // Migrate each balance individually
      const migrationPromises = []
      let hasFailures = false

      for (const balanceIndex in account.balances) {
        const migrationResult = await ledgerState$.migrateBalance(appId, account, Number.parseInt(balanceIndex))

        if (migrationResult?.txPromise) {
          migrationPromises.push(migrationResult.txPromise)
        } else {
          hasFailures = true
        }
      }

      if (migrationPromises.length > 0) {
        // At least one balance migration was successful
        console.debug(`Account ${account.address} in app ${appId} has ${migrationPromises.length} successful balance migrations`)

        // Return a promise that resolves when all migrations are complete
        return {
          txPromises: migrationPromises,
        }
      }
      if (hasFailures) {
        // All balance migrations failed
        console.debug(`Account ${account.address} in app ${appId} had all balance migrations fail`)
        return undefined
      }
    }
  },

  // Migrate Balance for a specific account
  async migrateBalance(
    appId: AppId,
    account: Address | MultisigAddress,
    balanceIndex: number
  ): Promise<{ txPromise: Promise<void> | undefined } | undefined> {
    const isMultisig = isMultisigAddress(account)
    const accountType = isMultisig ? AccountType.MULTISIG : AccountType.ACCOUNT
    const balance = account.balances?.[balanceIndex]
    if (!balance) {
      console.warn(
        `Balance at index ${balanceIndex} not found for ${isMultisig ? 'multisig ' : ''}account ${account.address} in app ${appId}`
      )
      return undefined
    }

    console.debug(
      `[${balance.type}] Starting balance migration for ${isMultisig ? 'multisig ' : ''}account ${account.address} in app ${appId}`
    )

    if (!balance.transaction?.destinationAddress) {
      console.warn(`[${balance.type}] No destination address set for ${isMultisig ? 'multisig ' : ''}account ${account.address}`)
      return undefined
    }

    updateMigratedStatus(appId, accountType, account.path, balance.type, TransactionStatus.IS_LOADING)

    updateMigrationResultCounter('total')

    try {
      const response = await ledgerClient.migrateAccount(appId, account, updateMigratedStatus, balanceIndex)

      if (!response?.txPromise) {
        updateMigratedStatus(
          appId,
          accountType,
          account.path,
          balance.type,
          TransactionStatus.ERROR,
          errorDetails.migration_error.description
        )

        // Increment fails counter
        updateMigrationResultCounter('fails')

        console.debug(
          `[${balance.type}] Balance migration for account ${account.address} in app ${appId} failed:`,
          InternalErrorType.MIGRATION_ERROR
        )
        return undefined
      }

      // The transaction has been signed and sent, but has not yet been finalized
      updateMigratedStatus(appId, accountType, account.path, balance.type, TransactionStatus.PENDING)

      console.debug(`[${balance.type}] Balance migration for account ${account.address} in app ${appId} transaction submitted`)

      // Return the transaction promise
      return { txPromise: response.txPromise }
    } catch (error) {
      const internalError = interpretError(error, InternalErrorType.MIGRATION_ERROR)
      updateMigratedStatus(appId, accountType, account.path, balance.type, TransactionStatus.ERROR, internalError.title)

      // Increment fails counter
      updateMigrationResultCounter('fails')
      return undefined
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

  async getMigrationTxInfo(appId: AppId, address: Address | MultisigAddress, balanceIndex: number): Promise<PreTxInfo | undefined> {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig) {
      console.error(`App with id ${appId} not found.`)
      return
    }

    try {
      const txInfo = await ledgerClient.getMigrationTxInfo(appId, address, balanceIndex)
      return txInfo
    } catch (error) {
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
      updateTxStatus(TransactionStatus.ERROR, internalError.title)
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
      updateTxStatus(TransactionStatus.ERROR, internalError.title)
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
      return undefined
    }
  },

  async removeIdentity(appId: AppId, address: string, path: string, updateTxStatus: UpdateTransactionStatus) {
    try {
      await ledgerClient.removeIdentity(appId, address, path, updateTxStatus)
    } catch (error) {
      const internalError = interpretError(error, InternalErrorType.REMOVE_IDENTITY_ERROR)
      updateTxStatus(TransactionStatus.ERROR, internalError.title)
    }
  },

  async getRemoveIdentityFee(appId: AppId, address: string): Promise<BN | undefined> {
    try {
      return await ledgerClient.getRemoveIdentityFee(appId, address)
    } catch (error) {
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
        await ledgerClient.signAsMultiTx(appId, account, formBody.callHash, formBody.callData, formBody.signer, updateTxStatus)
      } else {
        await ledgerClient.signApproveAsMultiTx(appId, account, formBody.callHash, formBody.signer, updateTxStatus)
      }
    } catch (error) {
      const internalError = interpretError(error, InternalErrorType.APPROVE_MULTISIG_CALL_ERROR)
      updateTxStatus(TransactionStatus.ERROR, internalError.title)
    }
  },

  async removeProxies(appId: AppId, address: string, path: string, updateTxStatus: UpdateTransactionStatus) {
    try {
      await ledgerClient.removeProxies(appId, address, path, updateTxStatus)
    } catch (error) {
      const internalError = interpretError(error, InternalErrorType.REMOVE_PROXY_ERROR)
      updateTxStatus(TransactionStatus.ERROR, internalError.title)
    }
  },

  async getRemoveProxiesFee(appId: AppId, address: string): Promise<BN | undefined> {
    try {
      return await ledgerClient.getRemoveProxiesFee(appId, address)
    } catch (error) {
      return undefined
    }
  },
})
