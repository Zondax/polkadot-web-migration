import type { ApiPromise } from '@polkadot/api'
import { BN } from '@polkadot/util'
import type { AppConfig } from 'config/apps'
import { InternalErrorType } from 'config/errors'
import { errorApps } from 'config/mockData'
import { getBalance, getIdentityInfo, getIndexInfo, getMultisigAddresses, getProxyInfo } from '@/lib/account'
import { convertSS58Format } from '@/lib/utils/address'
import { hasAddressBalance, hasBalance, hasNegativeBalance, validateReservedBreakdown } from '@/lib/utils/balance'
import { InternalError } from '@/lib/utils/error'
import { filterAccountsForApps, setDefaultDestinationAddress } from '@/lib/utils/ledger'
import {
  type AccountIndex,
  type AccountProxy,
  type Address,
  type AddressBalance,
  AddressStatus,
  BalanceType,
  type Collection,
  type MultisigAddress,
  type Native,
  type Registration,
} from '@/state/types/ledger'

export interface ProcessedAccountData {
  accounts: Address[]
  multisigAccounts: MultisigAddress[]
  collections: {
    uniques: Map<number, Collection>
    nfts: Map<number, Collection>
  }
}

export interface AccountProcessingResult {
  success: boolean
  data?: ProcessedAccountData
  error?: {
    source: 'synchronization' | 'balance_fetch' | 'blockchain_connection_error'
    description: string
  }
}

/**
 * Processes and updates collections data in the collections map.
 *
 * @description Updates the collections map with newly fetched unique and NFT collections.
 * This is used to maintain a centralized registry of all collections across accounts.
 *
 * @param {Object} collections - Object containing unique and NFT collections
 * @param {Collection[]} collections.uniques - Array of unique collections
 * @param {Collection[]} collections.nfts - Array of NFT collections
 * @param {Object} collectionsMap - Map objects to store collections by ID
 * @param {Map<number, Collection>} collectionsMap.uniques - Map for unique collections
 * @param {Map<number, Collection>} collectionsMap.nfts - Map for NFT collections
 *
 * @example
 * ```typescript
 * const collectionsMap = { uniques: new Map(), nfts: new Map() }
 * processCollections(fetchedCollections, collectionsMap)
 * ```
 */
function processCollections(
  collections: { uniques: Collection[]; nfts: Collection[] },
  collectionsMap: { uniques: Map<number, Collection>; nfts: Map<number, Collection> }
): void {
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

/**
 * Fetches and processes complete account information including:
 *
 * @description Fetches and processes complete account information including:
 * - Balance information (native tokens, assets, reserved amounts)
 * - Identity registration data
 * - Proxy configuration
 * - Account index information
 * - Multisig membership and deposits
 * - NFT and unique collections
 *
 * @param {Address} address - The account address to process
 * @param {ApiPromise} api - Connected blockchain API instance
 * @param {AppConfig} appConfig - Blockchain application configuration
 * @param {Object} collectionsMap - Collections registry for storing NFT/unique data
 * @returns {Promise<Object>} Object containing enriched account data and multisig deposits
 * @throws {InternalError} When account data fetching fails
 *
 * @example
 * ```typescript
 * const result = await getBlockchainDataForAccount(address, api, appConfig, collectionsMap)
 * console.log(`Account has ${result.account.balances.length} balances`)
 * ```
 */
async function getBlockchainDataForAccount(
  address: Address,
  api: ApiPromise,
  appConfig: AppConfig,
  collectionsMap: { uniques: Map<number, Collection>; nfts: Map<number, Collection> }
): Promise<{
  account: Address
  multisigDeposits: { callHash: string; deposit: BN }[]
  memberMultisigAddresses?: string[]
}> {
  const balances: AddressBalance[] = []
  let addressHasNegativeBalance = false

  try {
    // Balance Info
    const { balances: balancesResponse, collections, error } = await getBalance(address, api, appConfig.id)

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
        account: {
          ...address,
          balances,
          error: {
            source: 'balance_fetch',
            description: 'The synchronized balance is not valid',
          },
          isLoading: false,
        },
        multisigDeposits: [],
      }
    }

    if (error) {
      return {
        account: {
          ...address,
          balances,
          error: {
            source: 'balance_fetch',
            description: 'Failed to fetch balance',
          },
          isLoading: false,
        },
        multisigDeposits: [],
      }
    }

    if (collections) {
      processCollections(collections, collectionsMap)
    }

    // Fetch account metadata in parallel
    const [registration, proxy, indexInfo, multisigAddresses] = await Promise.all([
      getIdentityInfo(address.address, api),
      getProxyInfo(address.address, api),
      getIndexInfo(address.address, api),
      appConfig.explorer?.id === 'subscan'
        ? getMultisigAddresses(address.address, address.path, appConfig.explorer.network || appConfig.id, api)
        : Promise.resolve(undefined),
    ])

    // Process multisig information
    const multisigDeposits: { callHash: string; deposit: BN }[] = []
    const memberMultisigAddresses = multisigAddresses?.map(multisigAddress => multisigAddress.address)

    if (multisigAddresses) {
      for (const multisigAddress of multisigAddresses) {
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

    // Process reserved balance breakdown
    const processedBalances = processReservedBalanceBreakdown(balances, registration, proxy, indexInfo, multisigDeposits)

    return {
      account: {
        ...address,
        balances: processedBalances,
        registration,
        memberMultisigAddresses,
        proxy,
        index: indexInfo,
        status: AddressStatus.SYNCHRONIZED,
        error: undefined,
        isLoading: false,
        selected: true,
      },
      multisigDeposits,
      memberMultisigAddresses,
    }
  } catch (error) {
    throw new InternalError(InternalErrorType.SYNC_ERROR, {
      operation: 'getBlockchainDataForAccount',
      context: { address: address.address, appId: appConfig.id, error },
    })
  }
}

/**
 * Processes and structures reserved balance breakdown information.
 *
 * @description Analyzes reserved balances and creates a detailed breakdown showing
 * how much is reserved for identity, multisig operations, proxies, and account indices.
 * Only updates the balance if the breakdown validation passes.
 *
 * @param {AddressBalance[]} balances - Array of account balances
 * @param {Registration | undefined} registration - Identity registration information
 * @param {AccountProxy | undefined} proxy - Proxy configuration data
 * @param {AccountIndex | undefined} indexInfo - Account index information
 * @param {Array<{callHash: string, deposit: BN}>} multisigDeposits - Multisig call deposits
 * @returns {AddressBalance[]} Updated balances with reserved breakdown details
 *
 * @example
 * ```typescript
 * const balances = processReservedBalanceBreakdown(
 *   accountBalances, identity, proxy, index, multisigDeposits
 * )
 * ```
 */
function processReservedBalanceBreakdown(
  balances: AddressBalance[],
  registration: Registration | undefined,
  proxy: AccountProxy | undefined,
  indexInfo: AccountIndex | undefined,
  multisigDeposits: { callHash: string; deposit: BN }[]
): AddressBalance[] {
  const hasReservedBalance = registration?.deposit || multisigDeposits.length > 0 || proxy?.deposit || indexInfo?.deposit
  const nativeBalanceIndex = balances.findIndex(balance => balance.type === BalanceType.NATIVE)

  if (hasReservedBalance && nativeBalanceIndex !== -1) {
    const nativeBalance = balances[nativeBalanceIndex].balance as Native
    const identityDeposit = registration?.deposit ?? new BN(0)
    const multisigDeposit =
      multisigDeposits.length > 0 ? multisigDeposits.reduce((sum, deposit) => sum.add(deposit.deposit), new BN(0)) : new BN(0)
    const proxyDeposit = proxy?.deposit ?? new BN(0)
    const indexDeposit = indexInfo?.deposit ?? new BN(0)

    const isBreakdownValid = validateReservedBreakdown(
      identityDeposit,
      multisigDeposit,
      proxyDeposit,
      indexDeposit,
      nativeBalance.reserved.total
    )

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
          index: indexDeposit.gtn(0) ? { deposit: indexDeposit } : undefined,
        },
      }
    } else {
      console.debug('We could not load the breakdown details.')
    }
  }

  return balances
}

/**
 * Fetches and processes multisig accounts with comprehensive blockchain data and member information.
 *
 * @description Processes multisig accounts by fetching their balances, identity, proxy info,
 * and updating member information with internal/external status. Also handles signatory
 * address assignment for transactions.
 *
 * @param {Map<string, MultisigAddress>} multisigAccounts - Map of multisig addresses to process
 * @param {string[]} foundAccounts - Array of account addresses found on the device
 * @param {Address[]} accounts - Array of all synchronized accounts
 * @param {ApiPromise} api - Connected blockchain API instance
 * @param {AppConfig} appConfig - Blockchain application configuration
 * @param {Object} collectionsMap - Collections registry for storing NFT/unique data
 * @returns {Promise<void>} Resolves when all multisig accounts are processed
 * @throws {InternalError} When multisig account processing fails
 *
 * @example
 * ```typescript
 * await getBlockchainDataForMultisigAccounts(
 *   multisigMap, foundAddresses, accounts, api, appConfig, collectionsMap
 * )
 * ```
 */
async function getBlockchainDataForMultisigAccounts(
  multisigAccounts: Map<string, MultisigAddress>,
  foundAccounts: string[],
  accounts: Address[],
  api: ApiPromise,
  appConfig: AppConfig,
  collectionsMap: { uniques: Map<number, Collection>; nfts: Map<number, Collection> }
): Promise<void> {
  try {
    await Promise.all(
      Array.from(multisigAccounts.values()).map(async multisigAddress => {
        // Fetch balance and collections
        const {
          balances: multisigBalancesResponse,
          collections: multisigCollections,
          error: multisigError,
        } = await getBalance(multisigAddress, api, appConfig.id)

        const multisigBalances = multisigBalancesResponse.filter(balance => hasBalance([balance]))

        if (multisigCollections) {
          processCollections(multisigCollections, collectionsMap)
        }

        // Fetch identity and proxy information for multisig accounts
        const [registration, proxy, indexInfo] = await Promise.all([
          getIdentityInfo(multisigAddress.address, api),
          getProxyInfo(multisigAddress.address, api),
          getIndexInfo(multisigAddress.address, api),
        ])

        // Process balances with signatory address
        multisigAddress.balances = multisigBalances.map(balance => ({
          ...balance,
          transaction: { ...balance.transaction, signatoryAddress: multisigAddress.members[0].address },
        }))

        // Set multisig account properties
        multisigAddress.registration = registration
        multisigAddress.proxy = proxy
        multisigAddress.index = indexInfo
        multisigAddress.status = AddressStatus.SYNCHRONIZED
        multisigAddress.error = multisigError
          ? {
              source: 'balance_fetch',
              description: 'Failed to fetch balance',
            }
          : undefined
        multisigAddress.isLoading = false
        multisigAddress.selected = true

        // Update member information
        multisigAddress.members = multisigAddress.members.map(member => {
          if (foundAccounts.includes(member.address)) {
            return {
              ...member,
              internal: true,
              path: accounts.find(account => account.address === member.address)?.path,
            }
          }
          return member
        })

        multisigAccounts.set(multisigAddress.address, multisigAddress)
      })
    )
  } catch (error) {
    throw new InternalError(InternalErrorType.SYNC_ERROR, {
      operation: 'getBlockchainDataForMultisigAccounts',
      context: { appId: appConfig.id, error },
    })
  }
}

/**
 * Orchestrates the complete account processing pipeline for a blockchain application.
 *
 * @description This is the main entry point for account processing. It coordinates:
 * 1. Individual account enrichment with blockchain data
 * 2. Multisig account discovery and processing
 * 3. Balance filtering and validation
 * 4. Destination address assignment for migrations
 * 5. Collections management
 *
 * @param {Address[]} addresses - Array of addresses to process
 * @param {AppConfig} appConfig - Blockchain application configuration
 * @param {ApiPromise} api - Connected blockchain API instance
 * @param {string[]} polkadotAddresses - Polkadot addresses for cross-chain migration
 * @param {boolean} [filterByBalance=true] - Whether to filter accounts by balance
 * @returns {Promise<AccountProcessingResult>} Result containing processed accounts and collections
 * @throws {InternalError} When the account processing pipeline fails
 *
 * @example
 * ```typescript
 * const result = await processAccountsForApp(
 *   addresses, appConfig, api, polkadotAddresses, true
 * )
 * if (result.success) {
 *   console.log(`Processed ${result.data.accounts.length} accounts`)
 * }
 * ```
 */
export async function processAccountsForApp(
  addresses: Address[],
  appConfig: AppConfig,
  api: ApiPromise,
  polkadotAddresses: string[],
  filterByBalance = true
): Promise<AccountProcessingResult> {
  try {
    // Check for development environment error simulation
    if (process.env.NEXT_PUBLIC_NODE_ENV === 'development' && errorApps && errorApps.includes(appConfig.id)) {
      throw new InternalError(InternalErrorType.SYNC_ERROR, {
        operation: 'processAccountsForApp',
        context: { appId: appConfig.id, reason: 'Mock synchronization error' },
      })
    }

    const collectionsMap = {
      uniques: new Map<number, Collection>(),
      nfts: new Map<number, Collection>(),
    }

    const multisigAccounts: Map<string, MultisigAddress> = new Map()

    // Process all addresses in parallel
    const accountResults = await Promise.all(addresses.map(address => getBlockchainDataForAccount(address, api, appConfig, collectionsMap)))

    // Collect multisig accounts
    for (const result of accountResults) {
      if (result.memberMultisigAddresses) {
        // Get multisig addresses and add them to the map
        const multisigAddresses = await getMultisigAddresses(
          result.account.address,
          result.account.path,
          appConfig.explorer?.network || appConfig.id,
          api
        )

        if (multisigAddresses) {
          for (const multisigAddress of multisigAddresses) {
            multisigAccounts.set(multisigAddress.address, multisigAddress)
          }
        }
      }
    }

    const accounts = accountResults.map(result => result.account)
    const foundAccounts = accounts.map(account => account.address)

    // Process multisig accounts
    await getBlockchainDataForMultisigAccounts(multisigAccounts, foundAccounts, accounts, api, appConfig, collectionsMap)

    // Filter accounts based on balance
    const filteredAccounts = filterAccountsForApps(accounts, filterByBalance)
    const filteredMultisigAccounts = filterAccountsForApps(Array.from(multisigAccounts.values()), filterByBalance)

    // Set default destination addresses
    const polkadotAddressesForApp = polkadotAddresses.map(address => convertSS58Format(address, appConfig.ss58Prefix || 0))

    const processedAccounts = filteredAccounts.map(account => setDefaultDestinationAddress(account, polkadotAddressesForApp[0]))

    const processedMultisigAccounts = filteredMultisigAccounts.map(account =>
      setDefaultDestinationAddress(account, polkadotAddressesForApp[0])
    )

    return {
      success: true,
      data: {
        accounts: processedAccounts,
        multisigAccounts: processedMultisigAccounts,
        collections: collectionsMap,
      },
    }
  } catch (error) {
    console.debug('Error processing accounts for app:', appConfig.id, error)

    if (error instanceof InternalError) {
      return {
        success: false,
        error: {
          source: 'synchronization',
          description: error.description || 'Account processing failed',
        },
      }
    }

    throw new InternalError(InternalErrorType.SYNC_ERROR, {
      operation: 'processAccountsForApp',
      context: { appId: appConfig.id, error },
    })
  }
}

/**
 * Validates if an account has a migratable balance.
 *
 * @description Checks if an account has any balance that can be migrated to another chain.
 * This is used for filtering accounts during synchronization.
 *
 * @param {Address | MultisigAddress} account - The account to validate
 * @returns {boolean} True if the account has a migratable balance
 *
 * @example
 * ```typescript
 * const canMigrate = hasValidBalance(account)
 * if (canMigrate) {
 *   console.log('Account can be migrated')
 * }
 * ```
 */
export function hasValidBalance(account: Address | MultisigAddress): boolean {
  return hasAddressBalance(account)
}

/**
 * Filters accounts to only include those with valid migratable balances.
 *
 * @description Utility function to filter an array of accounts, keeping only those
 * that have balances suitable for migration. Used in the synchronization process
 * to remove empty accounts from the UI.
 *
 * @param {(Address | MultisigAddress)[]} accounts - Array of accounts to filter
 * @returns {(Address | MultisigAddress)[]} Filtered array containing only accounts with balances
 *
 * @example
 * ```typescript
 * const accountsWithBalance = filterAccountsWithBalance(allAccounts)
 * console.log(`${accountsWithBalance.length} accounts have migratable balances`)
 * ```
 */
export function filterAccountsWithBalance(accounts: (Address | MultisigAddress)[]): (Address | MultisigAddress)[] {
  return accounts.filter(account => hasValidBalance(account))
}
