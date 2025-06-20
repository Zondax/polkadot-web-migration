import { merkleizeMetadata } from '@polkadot-api/merkleize-metadata'
import { ApiPromise, WsProvider } from '@polkadot/api'
import type { SubmittableExtrinsic } from '@polkadot/api/types'
import type { GenericExtrinsicPayload } from '@polkadot/types'
import type { Option, u128, u32, Vec } from '@polkadot/types-codec'
import type {
  AccountId32,
  Balance,
  Multisig,
  OpaqueMetadata,
  Registration as PolkadotRegistration,
  ProxyDefinition,
  RuntimeDispatchInfo,
  StakingLedger,
} from '@polkadot/types/interfaces'
import type { ExtrinsicPayloadValue, ISubmittableResult } from '@polkadot/types/types/extrinsic'
import { BN, hexToU8a } from '@polkadot/util'
import type { AppConfig, AppId } from 'config/apps'
import { DEFAULT_ERA_TIME_IN_HOURS, getEraTimeByAppId } from 'config/apps'
import { defaultWeights, MULTISIG_WEIGHT_BUFFER } from 'config/config'
import { errorDetails } from 'config/errors'
import { errorAddresses, mockBalances } from 'config/mockData'
import { getMultisigInfo } from 'lib/subscan'
import {
  type AccountProxy,
  type Address,
  type AddressBalance,
  BalanceType,
  type Collection,
  type IdentityInfo,
  type MultisigAddress,
  type MultisigCall,
  type Native,
  type Nft,
  type NftsInfo,
  type Registration,
  type Staking,
  type SubIdentities,
  type TransactionDetails,
  TransactionStatus,
} from 'state/types/ledger'

const HOURS_IN_A_DAY = 24

// Get API and Provider
export async function getApiAndProvider(rpcEndpoint: string): Promise<{ api?: ApiPromise; provider?: WsProvider; error?: string }> {
  try {
    // Create a provider with default settings (will allow first connection)
    const provider = new WsProvider(rpcEndpoint)

    // Add an error handler to prevent the automatic reconnection loops
    provider.on('error', error => {
      console.error('WebSocket error:', error)
    })

    // Set a timeout for the connection attempt
    const connectionPromise = new Promise<ApiPromise>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Connection timeout: The node is not responding.'))
      }, 15000) // 15 second timeout

      ApiPromise.create({
        provider,
        throwOnConnect: true,
        throwOnUnknown: true,
      })
        .then(api => {
          clearTimeout(timeoutId)
          resolve(api)
        })
        .catch(err => {
          clearTimeout(timeoutId)
          reject(err)
        })
    })

    const api = await connectionPromise

    // If connection is successful, return the API and provider
    return { api, provider }
  } catch (e) {
    console.error('Error creating API for RPC endpoint:', rpcEndpoint, e)

    // More specific error messages based on the error
    const errorMessage = e instanceof Error ? e.message : 'Unknown error'

    if (errorMessage.includes('timeout')) {
      return { error: 'Connection timeout: The node is not responding.' }
    }
    if (errorMessage.includes('refused') || errorMessage.includes('WebSocket')) {
      return { error: 'Connection refused: The node endpoint is unreachable.' }
    }
    return { error: `Failed to connect to the blockchain: ${errorMessage}` }
  }
}

// Get Balance
export async function getBalance(
  address: Address,
  api: ApiPromise,
  appId: AppId
): Promise<{
  balances: AddressBalance[]
  collections: { uniques: Collection[]; nfts: Collection[] }
  error?: string
}> {
  const { address: addressString } = address

  try {
    if (process.env.NEXT_PUBLIC_NODE_ENV === 'development') {
      if (mockBalances.some(balance => balance.address === addressString)) {
        const totalBalanceBN = new BN(mockBalances.find(balance => balance.address === addressString)?.balance ?? 0)
        const balance: Native = {
          free: totalBalanceBN,
          reserved: { total: new BN(0) },
          frozen: new BN(0),
          total: totalBalanceBN,
          transferable: totalBalanceBN,
        }
        return {
          balances: [{ type: BalanceType.NATIVE, balance }],
          collections: {
            uniques: [],
            nfts: [],
          },
        }
      }
      if (errorAddresses?.includes(addressString)) {
        throw new Error('Error fetching balance')
      }
    }

    // Get native balance
    const nativeBalance = await getNativeBalance(addressString, api, appId)

    // Get Uniques if available
    const { nfts: uniquesNfts, collections: uniquesCollections } = await getUniquesOwnedByAccount(addressString, api)

    // Get NFTs if available
    const { nfts, collections } = await getNFTsOwnedByAccount(addressString, api)

    const balances: AddressBalance[] = []

    if (nativeBalance !== undefined) {
      balances.push({ type: BalanceType.NATIVE, balance: nativeBalance })
    }
    if (uniquesNfts !== undefined) {
      balances.push({ type: BalanceType.UNIQUE, balance: uniquesNfts })
    }
    if (nfts !== undefined) {
      balances.push({ type: BalanceType.NFT, balance: nfts })
    }

    return {
      balances,
      collections: {
        uniques: uniquesCollections,
        nfts: collections,
      },
    }
  } catch (e) {
    return {
      balances: [],
      collections: {
        uniques: [],
        nfts: [],
      },
      error: errorDetails.balance_not_gotten.description ?? '',
    }
  }
}

export async function getNativeBalance(addressString: string, api: ApiPromise, appId: AppId): Promise<Native | undefined> {
  try {
    const balance = await api?.query.system.account(addressString)

    // Extract all balance components
    if (balance && 'data' in balance) {
      const { free, reserved, frozen } = balance.data as any // AccountData is not updated in @polkadot/types

      // According to the official Polkadot documentation:
      // https://wiki.polkadot.network/learn/learn-guides-accounts/#query-account-data-in-polkadot-js
      // The Existential Deposit is not taking into account to calculate the transferable balance because it is not necessary to keep the account alive
      const freeBN = new BN(free.toString())
      const reservedBN = new BN(reserved.toString())
      const frozenBN = new BN(frozen.toString())
      const totalBN = freeBN.add(reservedBN)
      // transferable = free - max(frozen - reserved, 0)
      const frozenMinusReserved = frozenBN.sub(reservedBN)
      const transferableBN = frozenMinusReserved.isNeg() ? freeBN : freeBN.sub(frozenMinusReserved)

      const nativeBalance: Native = {
        free: freeBN,
        reserved: {
          total: reservedBN,
        },
        frozen: frozenBN,
        total: totalBN,
        transferable: transferableBN,
      }

      if (!frozenBN.isZero()) {
        const stakingInfo = await getStakingInfo(addressString, api, appId)
        nativeBalance.staking = stakingInfo
      }

      return nativeBalance
    }
    return undefined
  } catch (e) {
    console.error('Error fetching native balance:', e)
    return undefined
  }
}

/**
 * Updates the transaction status with optional details.
 */
export type UpdateTransactionStatus = (status: TransactionStatus, message?: string, txDetails?: TransactionDetails) => void

/**
 * Prepares a transaction payload for signing
 * @param api - The API instance.
 * @param senderAddress - The sender's address.
 * @param appConfig - The app config.
 * @param transfer - The transfer extrinsic.
 * @returns The prepared transaction data for signing.
 */
interface PreparedTransactionPayload {
  transfer: SubmittableExtrinsic<'promise', ISubmittableResult>
  payload: GenericExtrinsicPayload
  metadataHash: Uint8Array
  nonce: number
  proof1: Uint8Array
  payloadBytes: Uint8Array
}

export async function prepareTransactionPayload(
  api: ApiPromise,
  senderAddress: string,
  appConfig: AppConfig,
  transfer: SubmittableExtrinsic<'promise', ISubmittableResult>
): Promise<PreparedTransactionPayload | undefined> {
  const nonceResp = await api.query.system.account(senderAddress)
  const { nonce } = nonceResp.toHuman() as any

  const metadataV15 = await api.call.metadata.metadataAtVersion<Option<OpaqueMetadata>>(15).then(m => {
    if (!m.isNone) {
      return m.unwrap()
    }
  })
  if (!metadataV15) return

  const merkleizedMetadata = merkleizeMetadata(metadataV15, {
    decimals: appConfig.token.decimals,
    tokenSymbol: appConfig.token.symbol,
  })

  const metadataHash = merkleizedMetadata.digest()
  const nonceNumber = nonce as unknown as number

  // Create the payload for signing
  const payload = api.createType('ExtrinsicPayload', {
    method: transfer.method.toHex(),
    nonce: nonceNumber,
    genesisHash: api.genesisHash,
    blockHash: api.genesisHash,
    transactionVersion: api.runtimeVersion.transactionVersion,
    specVersion: api.runtimeVersion.specVersion,
    runtimeVersion: api.runtimeVersion,
    version: api.extrinsicVersion,
    mode: 1,
    metadataHash: hexToU8a(`01${Buffer.from(metadataHash).toString('hex')}`),
  })

  const payloadBytes = payload.toU8a(true)

  const metadata = {
    ...merkleizedMetadata,
    chainId: appConfig.token.symbol.toLowerCase(),
  }

  const proof1: Uint8Array = metadata.getProofForExtrinsicPayload(payloadBytes)

  return { transfer, payload, metadataHash, nonce: nonceNumber, proof1, payloadBytes }
}

export type MultisigInfo = {
  members: string[]
  threshold: number
  address: string
}

/**
 * Prepare a transaction to transfer assets (NFTs and/or native tokens)
 * @param api - The API instance.
 * @param senderAddress - The sender's address.
 * @param receiverAddress - The receiver's address.
 * @param transferableBalance - Current transferable balance of the sender.
 * @param nfts - Array of NFTs to transfer, each containing collectionId and itemId.
 * @param appConfig - The app configuration.
 * @param nativeAmount - Optional amount of native tokens to transfer.
 */
export async function prepareTransaction(
  api: ApiPromise,
  senderAddress: string,
  receiverAddress: string,
  transferableBalance: BN,
  nfts: Array<Nft>,
  appConfig: AppConfig,
  nativeAmount?: BN,
  multisigInfo?: MultisigInfo
) {
  // Validate all NFTs
  for (const item of nfts) {
    if (item.collectionId === undefined || item.itemId === undefined) {
      throw new Error('Invalid item: must provide either amount for native transfer or collectionId and itemId for NFT transfer')
    }
  }

  if (!transferableBalance) throw new Error(errorDetails.insufficient_balance.description)

  let calls: SubmittableExtrinsic<'promise', ISubmittableResult>[] = nfts.map(item => {
    return !item.isUnique
      ? api.tx.nfts.transfer(item.collectionId, item.itemId, receiverAddress)
      : api.tx.uniques.transfer(item.collectionId, item.itemId, receiverAddress)
  })

  // Add native amount transfer if provided
  if (nativeAmount !== undefined) {
    // Build the transaction with the provided nativeAmount
    const tempCalls = [...calls, api.tx.balances.transferKeepAlive(receiverAddress, nativeAmount)]
    const tempTransfer = tempCalls.length > 1 ? api.tx.utility.batchAll(tempCalls) : tempCalls[0]
    // Calculate the fee
    const { partialFee } = await tempTransfer.paymentInfo(senderAddress)
    const partialFeeBN = new BN(partialFee)

    // Send the max amount of native tokens
    if (nativeAmount.eq(transferableBalance)) {
      const adjustedAmount = transferableBalance.sub(partialFeeBN)

      if (adjustedAmount.lte(new BN(0))) {
        throw new Error(errorDetails.insufficient_balance.description)
      }
      // Rebuild the calls with the adjusted amount
      calls = [...calls, api.tx.balances.transferKeepAlive(receiverAddress, adjustedAmount)]
    } else {
      const totalNeeded = partialFeeBN.add(nativeAmount)
      if (transferableBalance.lt(totalNeeded)) {
        throw new Error(errorDetails.insufficient_balance_to_cover_fee.description)
      }
      calls.push(api.tx.balances.transferKeepAlive(receiverAddress, nativeAmount))
    }
  }

  let transfer: SubmittableExtrinsic<'promise', ISubmittableResult> = calls.length > 1 ? api.tx.utility.batchAll(calls) : calls[0]

  if (!nativeAmount) {
    // No nativeAmount sent, only NFTs or other assets
    // Calculate the fee and check if the balance is enough
    const { partialFee } = await transfer.paymentInfo(senderAddress)
    const partialFeeBN = new BN(partialFee)

    if (transferableBalance.lt(partialFeeBN)) {
      throw new Error(errorDetails.insufficient_balance.description)
    }
  }

  let callData: string | undefined
  if (multisigInfo) {
    const { members, threshold, address: multisigAddress } = multisigInfo
    // Get call hash
    const callHash = transfer.method.hash.toHex()
    // Get call data: it's necessary for the final call to multi approvals.
    callData = transfer.method.toHex()

    transfer = await prepareApproveAsMultiTx(senderAddress, multisigAddress, members, threshold, callHash, api)
  }

  const transferInfo = await prepareTransactionPayload(api, senderAddress, appConfig, transfer)

  if (!transferInfo) {
    return undefined
  }

  return { ...transferInfo, callData }
}

export async function prepareUnstakeTransaction(api: ApiPromise, amount: BN): Promise<SubmittableExtrinsic<'promise', ISubmittableResult>> {
  const unstakeTx: SubmittableExtrinsic<'promise', ISubmittableResult> = api.tx.staking.unbond(amount)

  return unstakeTx
}

export async function prepareWithdrawTransaction(api: ApiPromise): Promise<SubmittableExtrinsic<'promise', ISubmittableResult>> {
  const numSlashingSpans = 0
  const withdrawTx = api.tx.staking.withdrawUnbonded(numSlashingSpans) as SubmittableExtrinsic<'promise', ISubmittableResult>

  return withdrawTx
}

export async function prepareRemoveIdentityTransaction(
  api: ApiPromise,
  address: string
): Promise<SubmittableExtrinsic<'promise', ISubmittableResult>> {
  const removeIdentityTx = api.tx.identity?.killIdentity(address) as SubmittableExtrinsic<'promise', ISubmittableResult>

  return removeIdentityTx
}

export async function prepareRemoveProxiesTransaction(api: ApiPromise): Promise<SubmittableExtrinsic<'promise', ISubmittableResult>> {
  const removeProxyTx = api.tx.proxy.removeProxies() as SubmittableExtrinsic<'promise', ISubmittableResult>

  return removeProxyTx
}

export async function getTxFee(tx: SubmittableExtrinsic<'promise', ISubmittableResult>, senderAddress: string): Promise<BN> {
  const paymentInfo: RuntimeDispatchInfo = await tx.paymentInfo(senderAddress)
  return new BN(paymentInfo.partialFee)
}

// Create Signed Extrinsic
export function createSignedExtrinsic(
  api: ApiPromise,
  transfer: SubmittableExtrinsic<'promise', ISubmittableResult>,
  senderAddress: string,
  signature: Uint8Array,
  payload: GenericExtrinsicPayload,
  nonce: number,
  metadataHash: Uint8Array
) {
  const payloadValue: ExtrinsicPayloadValue = {
    era: payload.era,
    genesisHash: api.genesisHash,
    blockHash: api.genesisHash,
    method: transfer.method.toHex(),
    nonce,
    specVersion: api.runtimeVersion.specVersion,
    tip: 0,
    transactionVersion: api.runtimeVersion.transactionVersion,
    mode: 1,
    metadataHash: hexToU8a(`01${Buffer.from(metadataHash).toString('hex')}`),
  }

  return transfer.addSignature(senderAddress, signature, payloadValue)
}

// Submit Transaction and Handle Status
export async function submitAndHandleTransaction(
  transfer: SubmittableExtrinsic<'promise', ISubmittableResult>,
  updateStatus: UpdateTransactionStatus,
  api: ApiPromise
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      updateStatus(TransactionStatus.UNKNOWN, 'Transaction timed out, check the transaction status in the explorer.')
      api.disconnect().catch(console.error)
      reject(new Error('Transaction timed out'))
    }, 120000) // 2-minute timeout

    transfer
      .send(async (status: ISubmittableResult) => {
        let blockNumber: string | undefined
        let blockHash: string | undefined
        let txHash: string | undefined

        if (status.isInBlock) {
          blockHash = status.status.asInBlock.toHex()
          txHash = status.txHash.toHex()
          blockNumber = 'blockNumber' in status ? Number(status.blockNumber).toString() : undefined
          updateStatus(TransactionStatus.IN_BLOCK, `In block: ${blockHash}`, {
            txHash,
            blockHash,
            blockNumber,
          })
        }
        if (status.isFinalized) {
          clearTimeout(timeoutId)
          blockHash = status.status.asFinalized.toHex()
          txHash = status.txHash.toHex()
          blockNumber = 'blockNumber' in status ? Number(status.blockNumber).toString() : undefined

          console.debug(`Transaction finalized in block: ${blockHash}`)
          updateStatus(TransactionStatus.FINALIZED, 'Transaction is finalized. Waiting the result...', {
            txHash,
            blockHash,
            blockNumber,
          })

          if (!status.txIndex) {
            updateStatus(TransactionStatus.UNKNOWN, 'The status is unknown', {
              txHash,
              blockHash,
              blockNumber,
            })
            api.disconnect().catch(console.error)
            resolve()
            return // Resolve here, as we have a final status
          }

          const result = await getTransactionDetails(api, blockHash, status.txIndex)
          if (result?.success) {
            console.debug(`Transaction successful: ${txHash}, ${blockHash}, ${blockNumber}`)
            updateStatus(TransactionStatus.SUCCESS, 'Successful Transaction', {
              txHash,
              blockHash,
              blockNumber,
            })
            api.disconnect().catch(console.error)
            resolve()
          } else if (result?.error) {
            updateStatus(TransactionStatus.FAILED, result.error, {
              txHash,
              blockHash,
              blockNumber,
            })
            api.disconnect().catch(console.error)
            reject(new Error(result.error)) // Reject with the specific error
          } else {
            // Handle cases where result is undefined or doesn't have success/error
            updateStatus(TransactionStatus.ERROR, 'Unknown transaction status', {
              txHash,
              blockHash,
              blockNumber,
            })
            api.disconnect().catch(console.error)
            reject(new Error('Unknown transaction status'))
          }
        } else if (status.isError) {
          clearTimeout(timeoutId)
          console.error('Transaction is error ', status.dispatchError)
          updateStatus(TransactionStatus.ERROR, 'Transaction is error')
          api.disconnect().catch(console.error)
          reject(new Error('Transaction is error'))
        } else if (status.isWarning) {
          console.debug('Transaction is warning')
          updateStatus(TransactionStatus.WARNING, 'Transaction is warning')
        } else if (status.isCompleted) {
          console.debug('Transaction is completed')
          txHash = status.txHash.toHex()
          blockNumber = 'blockNumber' in status ? Number(status.blockNumber).toString() : undefined
          updateStatus(TransactionStatus.COMPLETED, 'Transaction is completed. Waiting confirmation...', {
            txHash,
            blockNumber,
          })
        }
      })
      .catch((error: any) => {
        clearTimeout(timeoutId)
        console.error('Error sending transaction:', error)
        updateStatus(TransactionStatus.ERROR, 'Error sending transaction')
        api.disconnect().catch(console.error)
        reject(error)
      })
  })
}

// Get Transaction Details
export async function getTransactionDetails(
  api: ApiPromise,
  blockHash: string,
  txIndex: number
): Promise<{ success: boolean; error?: string } | undefined> {
  // Use api.at(blockHash) to get the API for that block
  const apiAt = await api.at(blockHash)
  // Get the events and filter the ones related to this extrinsic.
  const records = await apiAt.query.system.events()

  // Find events related to the specific extrinsic
  const relatedEvents = (records as any).filter(
    ({
      phase,
    }: {
      phase: {
        isApplyExtrinsic: any
        asApplyExtrinsic: { eq: (arg0: any) => any }
      }
    }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(txIndex)
  )

  let success = false
  let errorInfo: string | undefined

  for (const { event } of relatedEvents) {
    if (apiAt.events.system.ExtrinsicSuccess.is(event)) {
      success = true
    } else if (apiAt.events.system.ExtrinsicFailed.is(event)) {
      console.debug('Transaction failed!')
      const [dispatchError] = event.data

      if ((dispatchError as any).isModule) {
        // for module errors, we have the section indexed, lookup
        const decoded = apiAt.registry.findMetaError((dispatchError as any).asModule)
        errorInfo = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`
      } else {
        // Other, CannotLookup, BadOrigin, no extra info
        errorInfo = dispatchError.toString()
      }
    }
  }

  if (success) {
    console.debug('Transaction successful!')
    return { success: true }
  }
  if (errorInfo) {
    return {
      success: false,
      error: `Transaction failed on-chain: ${errorInfo}`,
    }
  }
  // Important:  Handle the case where neither success nor failure is found.
  return undefined
}

/**
 * Safely disconnects the API and WebSocket provider to prevent memory leaks
 * and ongoing connection attempts.
 */
export async function disconnectSafely(api?: ApiPromise, provider?: WsProvider): Promise<void> {
  try {
    // First disconnect the API if it exists
    if (api) {
      console.debug('Disconnecting API...')
      await api.disconnect()
    }

    // Then disconnect the provider if it exists
    if (provider) {
      console.debug('Disconnecting WebSocket provider...')
      await provider.disconnect()
    }

    console.debug('Disconnection complete')
  } catch (error) {
    console.error('Error during disconnection:', error)
  }
}

/**
 * Analyzes collection metadata and returns an enriched Collection object
 * @param metadata The metadata obtained from the blockchain
 * @param collectionId The collection ID
 * @returns Promise with the processed collection data
 */
export async function processCollectionMetadata(metadata: any, collectionId: number): Promise<Collection> {
  // Initialize collection with ID
  let collection: Collection = { collectionId }

  try {
    // Convert metadata to primitive format
    const mdPrimitive = metadata.toPrimitive ? metadata.toPrimitive() : metadata

    // Verify if metadata has the expected structure
    if (mdPrimitive && typeof mdPrimitive === 'object' && 'data' in mdPrimitive) {
      const data = mdPrimitive.data as any

      // Case 1: Data is a string (possibly an IPFS URI)
      if (typeof data === 'string') {
        const enrichedData = await getEnrichedNftMetadata(data)

        if (enrichedData) {
          collection = { ...enrichedData, collectionId }
        }
      }
      // Case 2: Data is already an object with recognizable properties
      else if (typeof data === 'object' && 'name' in data && 'image' in data) {
        collection = {
          name: data.name,
          image: data.image,
          collectionId,
          description: data.description,
          external_url: data.external_url,
          mediaUri: data.mediaUri,
          attributes: data.attributes,
        }
      }
      // Default case: Log that it couldn't be processed in JSON format
      else {
        console.debug('Metadata is not in a recognizable JSON format')
      }
    }
  } catch (error) {
    console.error(`Error processing collection metadata ${collectionId}:`, error)
  }

  return collection
}

/**
 * Processes NFT information and converts it to a standardized format
 * @param item The NFT item with its basic information
 * @returns An object with the processed NFT information
 */
/**
 * Interface that defines the structure of an NFT item with its basic information
 */
export interface NftItem {
  ids: {
    collectionId: number | string
    itemId: number | string
  }
  itemInfo: any
}

/**
 * Processes NFT information and converts it to a standardized format
 * @param item The NFT item with its basic information
 * @returns An object with the processed NFT information
 */
export function processNftItem(item: NftItem, isUnique = false) {
  // Initialize properties
  let creator = ''
  let owner = ''
  let isFrozen = false
  let approved = null

  // Extract basic information
  const collectionId = Number(item.ids.collectionId)
  const itemId = Number(item.ids.itemId)
  const itemInfo = item.itemInfo

  // Analyze the itemInfo object to extract relevant data
  if (itemInfo && typeof itemInfo === 'object') {
    // Creator/depositor information
    if ('deposit' in itemInfo && itemInfo.deposit && typeof itemInfo.deposit === 'object' && 'account' in itemInfo.deposit) {
      creator = String(itemInfo.deposit.account)
    }

    // NFT owner
    if ('owner' in itemInfo) {
      owner = String(itemInfo.owner)
    }

    // NFT frozen state
    if ('isFrozen' in itemInfo) {
      isFrozen = Boolean(itemInfo.isFrozen)
    }

    // Approval information if available
    if ('approved' in itemInfo) {
      approved = itemInfo.approved
    }
  }

  // Return object with processed data
  return {
    collectionId,
    itemId,
    creator,
    owner,
    isFrozen,
    isUnique,
    ...(approved !== null && { approved }),
  }
}

/**
 * Common function to handle NFT fetching logic for both nfts and uniques pallets
 * @param address The address to check
 * @param apiOrEndpoint An existing API instance or RPC endpoint string
 * @param palletType The pallet type to query ('nfts' or 'uniques')
 * @returns An object with NFT information or error details
 */
async function getNFTsCommon(
  address: string,
  apiOrEndpoint: string | ApiPromise,
  palletType: BalanceType.NFT | BalanceType.UNIQUE
): Promise<NftsInfo> {
  let apiToUse: ApiPromise
  let providerToDisconnect: WsProvider | undefined

  // Check if we received an API instance or an endpoint string
  if (typeof apiOrEndpoint === 'string') {
    // Create a new connection using the provided endpoint
    const { api, provider, error } = await getApiAndProvider(apiOrEndpoint)

    if (error || !api) {
      return {
        nfts: [],
        collections: [],
        error: {
          source: `${palletType}_info_fetch` as 'nft_info_fetch' | 'uniques_info_fetch',
          description: error ?? 'Failed to connect to the blockchain.',
        },
      }
    }

    apiToUse = api
    providerToDisconnect = provider
  } else {
    // Use the provided API instance
    apiToUse = apiOrEndpoint
  }

  const allNFTs: NftsInfo = { nfts: [], collections: [] }

  // Define pallet-specific configurations
  const config = {
    [BalanceType.NFT]: {
      accountQuery: apiToUse.query.nfts?.account,
      itemQuery: apiToUse.query.nfts?.item,
      metadataQuery: apiToUse.query.nfts?.collectionMetadataOf,
      logPrefix: 'NFT',
      errorSource: 'nft_info_fetch',
    },
    [BalanceType.UNIQUE]: {
      accountQuery: apiToUse.query.uniques?.account,
      itemQuery: apiToUse.query.uniques?.asset,
      metadataQuery: apiToUse.query.uniques?.classMetadataOf,
      logPrefix: 'uniques',
      errorSource: 'uniques_info_fetch',
    },
  }[palletType]

  // Check if the pallet is available
  if (!config.accountQuery) {
    console.debug(`${config.logPrefix} pallet is not available on this chain`)

    // Disconnect if we created a new connection
    if (providerToDisconnect) {
      await disconnectSafely(apiToUse, providerToDisconnect)
    }

    return allNFTs
  }

  try {
    const entries = await config.accountQuery.entries(address)

    console.debug(`Found ${entries.length} ${config.logPrefix} entries for address ${address}`)

    const itemsInfo = entries.map(([key, _info]) => {
      const info = key.args.map(k => k.toPrimitive())
      info.shift() // first item is the address which we do not need it to fetch the item information
      return info
    })

    const itemsInformation = await Promise.all(itemsInfo.map(async itemInfo => await config.itemQuery(...itemInfo)))

    const myItems: NftItem[] = itemsInformation.map((item, index) => {
      const [collectionId, itemId] = itemsInfo[index]
      return {
        ids: {
          collectionId: collectionId as string | number,
          itemId: itemId as string | number,
        },
        itemInfo: item.toPrimitive(),
      }
    })

    if (myItems.length === 0) {
      // Disconnect if we created a new connection
      if (providerToDisconnect) {
        await disconnectSafely(apiToUse, providerToDisconnect)
      }

      return allNFTs
    }

    // Fetch metadata for all items
    // Filter items with unique collection IDs to avoid duplicate metadata requests
    const collectionIds = Array.from(new Set(myItems.map(item => Number(item.ids.collectionId))))

    const metadataPromises = collectionIds.map(collectionId => config.metadataQuery(collectionId))
    const metadataRequests = await Promise.all(metadataPromises)
    const collectionInfo: Promise<Collection>[] = metadataRequests.map(async (metadata, index) => {
      const collectionId = collectionIds[index]
      return processCollectionMetadata(metadata, collectionId)
    })

    const result: NftsInfo = {
      nfts: myItems.map(item => processNftItem(item, palletType === BalanceType.UNIQUE)),
      collections: await Promise.all(collectionInfo),
    }

    // Disconnect if we created a new connection
    if (providerToDisconnect) {
      await disconnectSafely(apiToUse, providerToDisconnect)
    }

    return result
  } catch (error) {
    console.error(`Error fetching ${config.logPrefix} for address ${address}:`, error)

    // Disconnect if we created a new connection
    if (providerToDisconnect) {
      await disconnectSafely(apiToUse, providerToDisconnect)
    }

    return {
      nfts: [],
      collections: [],
      error: {
        source: config.errorSource as 'nft_info_fetch' | 'uniques_info_fetch',
        description: `Failed to fetch NFTs: ${String(error)}`,
      },
    }
  }
}

/**
 * Gets all NFTs owned by a given address, across all collections.
 * @param address The address to check.
 * @param apiOrEndpoint An existing API instance or RPC endpoint string (required).
 * @returns An array of NFTDisplayInfo objects, or an empty array on error.
 */
export async function getNFTsOwnedByAccount(address: string, apiOrEndpoint: string | ApiPromise): Promise<NftsInfo> {
  return getNFTsCommon(address, apiOrEndpoint, BalanceType.NFT)
}

/**
 * Gets all uniques owned by a given address, across all collections.
 * @param address The address to check.
 * @param apiOrEndpoint An existing API instance or RPC endpoint string (required).
 * @returns An array of NFTDisplayInfo objects, or an empty array on error.
 */
export async function getUniquesOwnedByAccount(address: string, apiOrEndpoint: string | ApiPromise): Promise<NftsInfo> {
  return getNFTsCommon(address, apiOrEndpoint, BalanceType.UNIQUE)
}

/**
 * Converts an IPFS URL to an HTTP URL using a public gateway
 * @param ipfsUrl The IPFS URL (starting with ipfs://)
 * @returns The HTTP URL to access the same content
 */
export function ipfsToHttpUrl(ipfsUrl: string): string {
  // List of public gateways to try
  const gateways = [
    'https://ipfs.io/ipfs/',
    'https://gateway.ipfs.io/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
  ]

  // Gateway to use (default is the first one)
  const gateway = gateways[0]

  // Check if the URL is a valid IPFS URL
  if (!ipfsUrl || typeof ipfsUrl !== 'string') {
    return ipfsUrl
  }

  // Replace the ipfs:// prefix with the gateway
  if (ipfsUrl.startsWith('ipfs://ipfs/')) {
    return ipfsUrl.replace('ipfs://ipfs/', gateway)
  }
  if (ipfsUrl.startsWith('ipfs://')) {
    return ipfsUrl.replace('ipfs://', gateway)
  }

  return ipfsUrl
}

/**
 * Gets the JSON content from an IPFS URL
 * @param ipfsUrl The IPFS URL (starting with ipfs://)
 * @returns The content parsed as JSON, or null if there's an error
 */
export async function fetchFromIpfs<T>(ipfsUrl: string): Promise<T | null> {
  try {
    // Convert IPFS URL to HTTP
    const httpUrl = ipfsToHttpUrl(ipfsUrl)

    // Make the HTTP request
    const response = await fetch(httpUrl)

    if (!response.ok) {
      console.error(`Error fetching from IPFS: ${response.status} ${response.statusText}`)
      return null
    }

    // Try to parse the response as JSON
    const data = await response.json()
    return data as T
  } catch (error) {
    console.error('Error fetching from IPFS:', error)
    return null
  }
}

/**
 * Gets enriched metadata of an NFT from its IPFS URL
 * @param ipfsUrl The IPFS URL containing the metadata
 * @returns An object with the enriched metadata (name, image, attributes, etc.)
 */
export async function getEnrichedNftMetadata(metadataUrl: string): Promise<{
  name?: string
  image?: string
  description?: string
  attributes?: any[]
  [key: string]: any
} | null> {
  try {
    // If it's a direct CID (starts with 'Q' or similar), convert it to ipfs:// format
    const isDirectCid = /^Q[a-zA-Z0-9]{44,}$/.test(metadataUrl) || /^bafy[a-zA-Z0-9]{44,}$/.test(metadataUrl)
    let ipfsUrl: string

    if (isDirectCid) {
      // It's a direct CID, convert it to HTTP URL format
      ipfsUrl = ipfsToHttpUrl(`ipfs://${metadataUrl}`)
    } else {
      // It's already an IPFS or HTTP URL
      ipfsUrl = metadataUrl.startsWith('ipfs://') ? ipfsToHttpUrl(metadataUrl) : metadataUrl
    }

    // Get the metadata
    const metadata = await fetchFromIpfs<any>(ipfsUrl)

    if (!metadata) {
      return null
    }

    // Enrich the metadata
    return {
      ...metadata,
      // If the image is an IPFS URL, convert it to HTTP
      image: metadata.image ? ipfsToHttpUrl(metadata.image) : undefined,
    }
  } catch (error) {
    console.error('Error getting enriched NFT metadata:', error)
    return null
  }
}

/**
 * Converts an era number to a human-readable time string
 * @param era The era number
 * @param currentEra The current era number
 * @param eraTimeInHours The duration of one era in hours (defaults to 24 for Polkadot)
 * @returns The human-readable time string
 */
export function eraToHumanTime(era: number, currentEra: number, eraTimeInHours = DEFAULT_ERA_TIME_IN_HOURS): string {
  // If current era is greater than the specified era, return "0 hours"
  if (currentEra > era) {
    return '0 hours'
  }

  const erasRemaining = era - currentEra
  const hoursRemaining = erasRemaining * eraTimeInHours
  const daysRemaining = Math.floor(hoursRemaining / HOURS_IN_A_DAY)
  const remainingHours = hoursRemaining % HOURS_IN_A_DAY

  const hoursFormatted: string = remainingHours === 1 ? 'hour' : 'hours'
  const daysFormatted: string = daysRemaining === 1 ? 'day' : 'days'

  if (daysRemaining > 0) {
    if (remainingHours > 0) {
      return `${daysRemaining} ${daysFormatted} and ${remainingHours} ${hoursFormatted}`
    }
    return `${daysRemaining} ${daysFormatted}`
  }
  return `${remainingHours} ${hoursFormatted}`
}

/**
 * Checks if a staking unlock chunk is ready to withdraw (era is less than or equal to current era)
 * @param chunkEra The era of the unlock chunk
 * @param currentEra The current era
 * @returns True if ready to withdraw, false otherwise
 */
export function isReadyToWithdraw(chunkEra: number, currentEra: number): boolean {
  return chunkEra <= currentEra
}

/**
 * Gets the staking information for an address
 * @param address The address to check
 * @param api The API instance
 * @param appId Optional app ID to determine era time
 * @returns The staking information
 */
export async function getStakingInfo(address: string, api: ApiPromise, appId: AppId): Promise<Staking | undefined> {
  let stakingInfo: Staking | undefined
  // Get Controller and check if we can unstake or not
  const controller = (await api.query.staking.bonded(address)) as Option<AccountId32>
  if (controller.isSome) {
    stakingInfo = {
      controller: controller.toHuman() as string,
      canUnstake: controller.toHuman() === address, // if controller is the same as the address, we can unstake
    }
  } else {
    // Account has no active staking
    return undefined
  }

  // Get staking info
  const stakingLedgerRaw = (await api.query.staking.ledger(stakingInfo.controller)) as Option<StakingLedger>
  if (stakingLedgerRaw && !stakingLedgerRaw.isEmpty) {
    const stakingLedger = stakingLedgerRaw.unwrap()

    stakingInfo.active = new BN(stakingLedger.active.toString())
    stakingInfo.total = new BN(stakingLedger.total.toString())

    // Get current era
    const currentEraOption = (await api.query.staking.currentEra()) as Option<u32>
    const currentEra = currentEraOption.isSome ? Number(currentEraOption.unwrap().toString()) : 0

    // Get era time for the specified app or use default of 24 hours
    const eraTimeInHours = getEraTimeByAppId(appId)

    stakingInfo.unlocking = stakingLedger.unlocking.map(chunk => ({
      value: new BN(chunk.value.toString()),
      era: Number(chunk.era.toString()),
      timeRemaining: eraToHumanTime(Number(chunk.era.toString()), currentEra, eraTimeInHours),
      canWithdraw: isReadyToWithdraw(Number(chunk.era.toString()), currentEra),
    }))
    return stakingInfo
  }

  // Account has no active staking ledger
  return undefined
}

/**
 * Extracts identity information from a raw Polkadot registration response
 * @param rawResponse The raw registration response from the blockchain
 * @returns Extracted identity information
 */
function extractIdentityFromRawResponse(rawResponse: PolkadotRegistration): IdentityInfo {
  const info = rawResponse.info

  return {
    display: info.display?.isRaw ? info.display.asRaw.toUtf8() : undefined,
    legal: info.legal?.isRaw ? info.legal.asRaw.toUtf8() : undefined,
    web: info.web?.isRaw ? info.web.asRaw.toUtf8() : undefined,
    email: info.email?.isRaw ? info.email.asRaw.toUtf8() : undefined,
    pgpFingerprint: info.pgpFingerprint?.isSome ? info.pgpFingerprint.unwrap().toString() : undefined,
    image: info.image?.isRaw ? info.image.asRaw.toUtf8() : undefined,
    twitter: info.twitter?.isRaw ? info.twitter.asRaw.toUtf8() : undefined,
  }
}

/**
 * Fetches derived identity information using the API's derive functionality
 * @param address The address to check
 * @param api The API instance
 * @returns Derived identity information or undefined if not available
 */
async function fetchDerivedIdentity(address: string, api: ApiPromise): Promise<Registration | undefined> {
  if (!api.derive?.accounts?.identity) {
    return undefined
  }

  try {
    const derivedIdentity = await api.derive.accounts.identity(address)

    // If identity has a parent it means it is a sub-account and we cannot remove it
    if (derivedIdentity.displayParent) {
      return {
        canRemove: false,
        identity: {
          displayParent: derivedIdentity.displayParent,
          display: derivedIdentity.display,
          parent: derivedIdentity.parent?.toHuman(),
        },
      }
    }
  } catch (error) {
    console.debug('Derived identity not available:', error)
  }

  return undefined
}

/**
 * Fetches raw identity information from the blockchain
 * @param address The address to check
 * @param api The API instance
 * @returns Raw identity information or undefined if not available
 */
async function fetchRawIdentity(address: string, api: ApiPromise): Promise<Registration | undefined> {
  if (!api.query.identity?.identityOf) {
    return undefined
  }

  try {
    const identity = (await api.query.identity.identityOf(address)) as Option<PolkadotRegistration>

    if (identity.isNone) {
      return undefined
    }

    const rawResponse = identity.unwrap() as PolkadotRegistration
    if (!rawResponse) {
      return undefined
    }

    const identityInfo = extractIdentityFromRawResponse(rawResponse)
    const deposit = new BN(rawResponse.deposit.toString())

    // Get sub-identities if available
    let subIdentities: SubIdentities | undefined
    try {
      const subs = await api.query.identity.subsOf(address)
      if (subs) {
        const subsTuple = subs as unknown as [Balance, Vec<AccountId32>]
        const [subDeposit, subAccounts] = subsTuple

        subIdentities = {
          subAccounts: subAccounts.toHuman() as string[],
          deposit: new BN(subDeposit.toString()),
        }
      }
    } catch (error) {
      console.debug('Sub-identities not available:', error)
    }

    return {
      identity: identityInfo,
      deposit,
      subIdentities,
      canRemove: true, // Will be overridden if derived identity shows it's a sub-account
    }
  } catch (error) {
    console.debug('Raw identity query not available:', error)
    return undefined
  }
}

/**
 * Merges derived and raw identity information, with derived info taking precedence
 * @param derivedRegistration Derived identity information
 * @param rawRegistration Raw identity information
 * @returns Merged registration information
 */
function mergeIdentityInfo(derivedRegistration?: Registration, rawRegistration?: Registration): Registration | undefined {
  if (!derivedRegistration && !rawRegistration) {
    return undefined
  }

  if (!rawRegistration) {
    return derivedRegistration
  }

  if (!derivedRegistration) {
    return rawRegistration
  }

  // Merge identity information, with derived info taking precedence
  const mergedIdentity: IdentityInfo = {
    ...rawRegistration.identity,
    ...derivedRegistration.identity,
  }

  return {
    ...rawRegistration,
    identity: mergedIdentity,
    canRemove: derivedRegistration.canRemove, // Derived info determines if it can be removed
  }
}

/**
 * Gets the identity information for a specific address
 * @param address The address to check
 * @param api The API instance
 * @returns The identity information or undefined if not found
 */
export async function getIdentityInfo(address: string, api: ApiPromise): Promise<Registration | undefined> {
  try {
    // Fetch both derived and raw identity information in parallel
    const [derivedRegistration, rawRegistration] = await Promise.allSettled([
      fetchDerivedIdentity(address, api),
      fetchRawIdentity(address, api),
    ])

    // Extract results, handling rejected promises
    const isFulfilled = 'fulfilled'
    const derived = derivedRegistration.status === isFulfilled ? derivedRegistration.value : undefined
    const raw = rawRegistration.status === isFulfilled ? rawRegistration.value : undefined

    // Merge the information
    return mergeIdentityInfo(derived, raw)
  } catch (error) {
    console.error('Error fetching identity information:', error)
    return undefined
  }
}

/**
 * Gets the multisig addresses for a given address
 * @param address The address to check
 * @param path The derivation path or identifier for the address
 * @param network The network name (e.g., 'kusama', 'polkadot')
 * @param api The ApiPromise instance for the network
 * @returns The multisig addresses and their members if any
 */
export async function getMultisigAddresses(
  address: string,
  path: string,
  network: string,
  api: ApiPromise
): Promise<MultisigAddress[] | undefined> {
  try {
    const multisigInfo = await getMultisigInfo(address, network)

    // If no multisig info is available, return undefined
    if (!multisigInfo) {
      return undefined
    }

    const multisigAddresses: MultisigAddress[] = []

    // Case 1: Address is a multisig account itself (has threshold and members). It should not happen, because the synchroniser should not have multisig accounts
    if (multisigInfo.threshold && multisigInfo.multi_account_member && multisigInfo.multi_account_member.length > 0) {
      multisigAddresses.push({
        address,
        path,
        pubKey: '', // Not available for multisig accounts
        threshold: multisigInfo.threshold,
        members: multisigInfo.multi_account_member.map(member => ({
          address: member.address,
          internal: member.address === address,
          path: member.address === address ? path : undefined,
        })),
        memberMultisigAddresses: undefined,
        pendingMultisigCalls: [],
      })
    }

    // Case 2: Address is part of other multisig accounts
    if (multisigInfo.multi_account && multisigInfo.multi_account.length > 0) {
      // Process each multisig account the address is part of
      for (const account of multisigInfo.multi_account) {
        try {
          // Get member info for this specific multisig address
          const memberInfo = await getMultisigInfo(account.address, network)
          if (memberInfo?.multi_account_member) {
            multisigAddresses.push({
              address: account.address,
              path: '', // Not available for external multisig accounts
              pubKey: '', // Not available for external multisig accounts
              threshold: memberInfo.threshold || multisigInfo.threshold,
              members: memberInfo.multi_account_member.map(member => ({
                address: member.address,
                internal: member.address === address,
                path: member.address === address ? path : undefined,
              })),
              memberMultisigAddresses: memberInfo.multi_account?.map(account => account.address),
              pendingMultisigCalls: [],
            })
          }
        } catch (err) {
          console.error(`Error fetching member info for multisig account ${account.address}:`, err)
        }
      }
    }

    // If no multisig addresses were found, return undefined
    if (multisigAddresses.length === 0) {
      return undefined
    }

    // Process pending multisig calls for each address
    for (const [index, multisigAddress] of Object.entries(multisigAddresses)) {
      try {
        const pendingMultisigCalls: MultisigCall[] = []
        const multisigsCheck = await api.query.multisig.multisigs.entries(multisigAddress.address)

        if (multisigsCheck.length !== 0) {
          console.debug(`Found ${multisigsCheck.length} pending multisig call(s).`)

          for (const [key, value] of multisigsCheck) {
            const keyArgs = key.args
            const multisigAccount = keyArgs[0].toString()

            if (multisigAccount !== multisigAddress.address) {
              continue
            }

            const optionValue = value as Option<Multisig>

            if (optionValue.isSome) {
              const multisigInfo = optionValue.unwrap()

              const multisigCall: MultisigCall = {
                callHash: key.args[1].toHex(),
                deposit: new BN(multisigInfo.deposit.toString()),
                depositor: multisigInfo.depositor.toString(),
                signatories: multisigInfo.approvals.map(approval => approval.toString()),
              }

              pendingMultisigCalls.push(multisigCall)
            }
          }
        }
        multisigAddresses[Number(index)].pendingMultisigCalls = pendingMultisigCalls
      } catch (err) {
        console.error(`Error fetching pending calls for multisig account ${multisigAddress.address}:`, err)
      }
    }

    return multisigAddresses
  } catch (error) {
    return undefined
  }
}

export const prepareApproveAsMultiTx = async (
  senderAddress: string,
  multisigAddress: string,
  members: string[],
  threshold: number,
  callHash: string,
  api: ApiPromise
) => {
  // Sort the other signatories (excluding the current signer)
  const allSignatories = members.sort()
  const otherSignatories = allSignatories.filter(addr => addr !== senderAddress)

  // Check if there's an existing multisig for this call
  const multisigs = (await api.query.multisig.multisigs(multisigAddress, callHash)) as Option<Multisig>

  let maybeTimepoint = null
  // Found existing timepoint. If not, it will be the first approval
  if (multisigs?.isSome) {
    const multisigInfo = multisigs.unwrap()

    maybeTimepoint = {
      height: multisigInfo.when.height.toNumber(),
      index: multisigInfo.when.index.toNumber(),
    }
  }
  // Estimate the weight for this approveAsMulti operation
  const estimatedWeight = estimateMultisigWeight(undefined, threshold, otherSignatories, maybeTimepoint)

  // Create the approveAsMulti transaction with estimated weight
  const multisigTx = api.tx.multisig.approveAsMulti(
    threshold,
    otherSignatories,
    maybeTimepoint,
    callHash,
    estimatedWeight
  ) as SubmittableExtrinsic<'promise', ISubmittableResult>

  return multisigTx
}

/**
 * Creates the final asMulti transaction to complete the multisig workflow
 * @param signer The address of the final signer
 * @param multisigAddress The multisig address
 * @param callHash The hash of the original call
 * @param callData The actual call data (hex string)
 * @param members Array of multisig member addresses
 * @param threshold The multisig threshold
 * @param api The API instance
 */
export async function prepareAsMultiTx(
  signer: string,
  multisigAddress: string,
  callHash: string,
  callData: string,
  members: string[],
  threshold: number,
  api: ApiPromise
): Promise<SubmittableExtrinsic<'promise', ISubmittableResult>> {
  // Get the existing multisig timepoint (this should exist from the previous approveAsMulti)
  const multisigs = (await api.query.multisig.multisigs(multisigAddress, callHash)) as Option<Multisig>

  if (!multisigs || multisigs.isNone) {
    throw new Error('No existing multisig found. Make sure approveAsMulti was called first.')
  }

  const multisigInfo = multisigs.unwrap()
  const timepoint = {
    height: multisigInfo.when.height.toNumber(),
    index: multisigInfo.when.index.toNumber(),
  }

  // Sort the other signatories (excluding the current signer)
  const allSignatories = members.sort()
  const otherSignatories = allSignatories.filter(addr => addr !== signer)

  // Decode the call data to get the actual call
  const call = api.createType('Call', callData)

  // Create a temporary extrinsic to estimate weight
  const tempExtrinsic = api.createType('Call', call) as any

  // Estimate the weight for this asMulti operation
  const estimatedWeight = estimateMultisigWeight(tempExtrinsic, threshold, otherSignatories)

  // Create the final asMulti transaction with the actual call and estimated weight
  const finalMultisigTx = api.tx.multisig.asMulti(
    threshold,
    otherSignatories,
    timepoint,
    call, // Pass the actual call, not the hash
    estimatedWeight
  ) as SubmittableExtrinsic<'promise', ISubmittableResult>

  return finalMultisigTx
}

/**
 * Estimates the weight of a call by analyzing its type and parameters
 * @param call - The extrinsic call to estimate weight for
 * @returns Estimated weight in nanoseconds
 */
export function estimateCallWeight(call: SubmittableExtrinsic<'promise', ISubmittableResult>): number {
  const method = call.method

  // Extract the pallet and method name
  const palletName = method.section
  const methodName = method.method
  const key = `${palletName}.${methodName}`

  // Check if we have a predefined weight for this call
  if (defaultWeights[key]) {
    return defaultWeights[key]
  }

  // Handle batch calls - sum up all individual call weights
  if (palletName === 'utility' && methodName === 'batchAll') {
    // For batch calls, use a higher default weight that accounts for multiple operations
    let totalWeight = defaultWeights['utility.batchAll'] || 1_000_000_000

    try {
      const calls = method.args[0]
      // Estimate based on the encoded length as a proxy for complexity
      const encodedLength = calls.toString().length
      // Add weight based on the size/complexity of the batch
      totalWeight += Math.min(encodedLength * 1000, 2_000_000_000) // Cap at 2 seconds
    } catch (error) {
      // If we can't analyze the batch, use a conservative estimate
      totalWeight = 2_000_000_000 // 2 seconds for complex batch
    }

    return totalWeight
  }

  // Handle specific call types with variable weights
  switch (key) {
    case 'nfts.transfer':
    case 'uniques.transfer':
      return defaultWeights[key] || 500_000_000

    case 'balances.transfer':
    case 'balances.transferKeepAlive':
      return defaultWeights[key] || 200_000_000

    case 'assets.transfer':
      return defaultWeights[key] || 300_000_000

    default:
      // Default weight for unknown calls
      return 500_000_000
  }
}

/**
 * Estimates the weight for approveAsMulti operation
 * @param callHash - The hash of the call being approved
 * @param threshold - The multisig threshold
 * @param otherSignatories - Array of other signatory addresses
 * @param maybeTimepoint - Optional timepoint for existing multisig
 * @returns Estimated weight in nanoseconds
 */
export function estimateApproveAsMultiWeight(
  callHash: string,
  threshold: number,
  otherSignatories: string[],
  maybeTimepoint?: { height: number; index: number } | null
): number {
  // Base weight for approveAsMulti operation
  const baseWeight = 500_000_000 // 500ms in nanoseconds

  // Add weight based on number of signatories
  // Each signatory adds computational overhead
  const signatoriesWeight = otherSignatories.length * 50_000_000 // 50ms per signatory

  // Add weight based on threshold (more signatures = more validation)
  const thresholdWeight = threshold * 25_000_000 // 25ms per threshold unit

  // If timepoint exists, add weight for existing multisig lookup and update
  const timepointWeight = maybeTimepoint ? 100_000_000 : 50_000_000 // 100ms for existing, 50ms for new

  // Storage operations weight
  const storageWeight = 150_000_000 // 150ms for storage read/write operations

  const totalWeight = baseWeight + signatoriesWeight + thresholdWeight + timepointWeight + storageWeight

  // Apply buffer for safety
  return Math.floor(totalWeight * MULTISIG_WEIGHT_BUFFER)
}

/**
 * Estimates the weight for asMulti operation (final execution)
 * @param call - The actual call to be executed
 * @param threshold - The multisig threshold
 * @param otherSignatories - Array of other signatory addresses
 * @returns Estimated weight in nanoseconds
 */
export function estimateAsMultiWeight(
  call: SubmittableExtrinsic<'promise', ISubmittableResult>,
  threshold: number,
  otherSignatories: string[]
): number {
  // Get the weight of the underlying call
  const underlyingCallWeight = estimateCallWeight(call)

  // Base weight for asMulti operation (similar to approveAsMulti but with execution)
  const multisigOverhead = 600_000_000 // 600ms base overhead for final execution

  // Add weight based on number of signatories
  const signatoriesWeight = otherSignatories.length * 75_000_000 // 75ms per signatory (more than approve)

  // Add weight based on threshold
  const thresholdWeight = threshold * 50_000_000 // 50ms per threshold unit

  // Storage cleanup weight (removing multisig entry)
  const cleanupWeight = 200_000_000 // 200ms for storage cleanup

  // Total multisig overhead
  const totalOverhead = multisigOverhead + signatoriesWeight + thresholdWeight + cleanupWeight

  // Final weight is underlying call + multisig overhead
  const totalWeight = underlyingCallWeight + totalOverhead

  // Apply buffer for safety
  return Math.floor(totalWeight * MULTISIG_WEIGHT_BUFFER)
}

/**
 * Converts weight (in nanoseconds) to the Polkadot weight format
 * @param weightNs - Weight in nanoseconds
 * @returns Weight object with refTime and proofSize
 */
export function convertToPolkadotWeight(weightNs: number): { refTime: number; proofSize: number } {
  return {
    refTime: weightNs,
    proofSize: 65536, // Default proof size (64KB)
  }
}

/**
 * Estimates the appropriate max_weight parameter for multisig operations
 * @param call - The call to be executed (for asMulti) or undefined (for approveAsMulti)
 * @param threshold - The multisig threshold
 * @param otherSignatories - Array of other signatory addresses
 * @param maybeTimepoint - Optional timepoint for existing multisig (approveAsMulti only)
 * @returns Weight object suitable for max_weight parameter
 */
export function estimateMultisigWeight(
  call: SubmittableExtrinsic<'promise', ISubmittableResult> | undefined,
  threshold: number,
  otherSignatories: string[],
  maybeTimepoint?: { height: number; index: number } | null
): { refTime: number; proofSize: number } {
  let estimatedWeight: number

  if (call) {
    // This is for asMulti (final execution)
    estimatedWeight = estimateAsMultiWeight(call, threshold, otherSignatories)
  } else {
    // This is for approveAsMulti
    estimatedWeight = estimateApproveAsMultiWeight('', threshold, otherSignatories, maybeTimepoint)
  }

  return convertToPolkadotWeight(estimatedWeight)
}

/**
 * Validates that the provided call data, when decoded as a Substrate Call, matches the expected call hash.
 *
 * @param api - The ApiPromise instance used to decode the call data.
 * @param callData - The hex-encoded call data to validate.
 * @param expectedCallHash - The expected call hash (as hex string) to compare against.
 * @returns True if the decoded call's hash matches the expected hash, false otherwise.
 */
export function validateCallDataMatchesHash(api: ApiPromise, callData: string, expectedCallHash: string): boolean {
  try {
    // Decode the call from the hex data
    const call = api.createType('Call', callData)

    // Get the hash of the decoded call
    const computedHash = call.hash.toHex()

    // Compare with the expected hash
    const matches = computedHash.toLowerCase() === expectedCallHash.toLowerCase()

    return matches
  } catch (error) {
    return false
  }
}

// The storage item proxies(AccountId32) returns [Vec<ProxyDefinition>, u128]
// See: https://polkadot.js.org/docs/substrate/storage#proxies-accountid32---vecproxydefinition-u128
type ProxiesResult = [Vec<ProxyDefinition>, u128]

export async function getProxyInfo(address: string, api: ApiPromise): Promise<AccountProxy | undefined> {
  try {
    const proxiesResult = (await api.query.proxy?.proxies(address)) as unknown as ProxiesResult | undefined

    // Note: Not all chains support setting proxies, so this value may not be available.
    if (!proxiesResult) {
      return undefined
    }

    const [proxies, deposit] = proxiesResult

    const proxiesHuman = proxies.toHuman() as ProxyDefinition[] | undefined
    const proxy: AccountProxy = {
      proxies: Array.isArray(proxiesHuman)
        ? proxiesHuman.map((proxy: any) => ({
            type: proxy.proxyType,
            address: proxy.delegate,
            delay: proxy.delay,
          }))
        : [],
      deposit: new BN(deposit.toString()),
    }

    return proxy
  } catch (error) {
    console.error('Error fetching proxy information:', error)
    return undefined
  }
}
