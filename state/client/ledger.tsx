import {
  createSignedExtrinsic,
  getApiAndProvider,
  getTxFee,
  prepareApproveAsMultiTx,
  prepareAsMultiTx,
  prepareNestedAsMultiTx,
  prepareNestedMultisigTx,
  prepareRemoveAccountIndexTransaction,
  prepareRemoveIdentityTransaction,
  prepareRemoveProxiesTransaction,
  prepareTransaction,
  prepareTransactionPayload,
  prepareUnstakeTransaction,
  prepareWithdrawTransaction,
  submitAndHandleTransaction,
  validateCallDataMatchesHash,
  type PreparedTransactionPayload,
  type UpdateTransactionStatus,
} from '@/lib/account'
import { ledgerService } from '@/lib/ledger/ledgerService'
import type { ConnectionResponse } from '@/lib/ledger/types'
import { InternalError, withErrorHandling } from '@/lib/utils'
import { updateBip44PathIndices } from '@/lib/utils/address'
import { getAccountTransferableBalance } from '@/lib/utils/balance'
import type { SubmittableExtrinsic } from '@polkadot/api/types'
import type { Option } from '@polkadot/types-codec'
import type { Multisig } from '@polkadot/types/interfaces'
import type { ISubmittableResult } from '@polkadot/types/types/extrinsic'
import { BN } from '@polkadot/util'
import { appsConfigs, type AppConfig, type AppId } from 'config/apps'
import { maxAddressesToFetch } from 'config/config'
import { InternalErrorType } from 'config/errors'
import {
  TransactionStatus,
  type Address,
  type MultisigAddress,
  type PreTxInfo,
  type TransactionDetails,
  type UpdateMigratedStatusFn,
} from '../types/ledger'
import { validateApproveAsMultiParams, validateAsMultiParams, validateMigrationParams, type ValidateApproveAsMultiResult } from './helpers'

export const ledgerClient = {
  // Device operations
  async connectDevice(onDisconnect?: () => void): Promise<ConnectionResponse | undefined> {
    return withErrorHandling(() => ledgerService.connectDevice(onDisconnect), {
      errorCode: InternalErrorType.CONNECTION_ERROR,
      operation: 'connectDevice',
    })
  },

  async checkConnection() {
    return withErrorHandling(async () => await ledgerService.checkConnection(), {
      errorCode: InternalErrorType.CONNECTION_ERROR,
      operation: 'checkConnection',
    })
  },

  async openApp() {
    return withErrorHandling(async () => await ledgerService.openApp('Polkadot Migration'), {
      errorCode: InternalErrorType.CONNECTION_ERROR,
      operation: 'openApp',
    })
  },

  async synchronizeAccounts(app: AppConfig, onCancel?: () => boolean): Promise<{ result?: Address[] }> {
    return withErrorHandling(
      async () => {
        // fetch addresses
        const addresses: Address[] = []
        for (let i = 0; i < maxAddressesToFetch; i++) {
          // Check for cancellation before fetching each address
          if (onCancel?.()) {
            throw new InternalError(InternalErrorType.OPERATION_CANCELLED)
          }

          try {
            const derivedPath = updateBip44PathIndices(app.bip44Path, { address: i })
            const address = await ledgerService.getAccountAddress(derivedPath, app.ss58Prefix, false)
            if (address && !onCancel?.()) {
              // Double-check cancellation before adding
              addresses.push({ ...address, path: derivedPath } as Address)
            }
          } catch {
            // Skip failed addresses
          }
        }

        const filteredAddresses = addresses

        // If no addresses were successfully fetched, throw an error
        if (filteredAddresses.length === 0) {
          throw new InternalError(InternalErrorType.SYNC_ERROR)
        }

        return { result: filteredAddresses }
      },
      { errorCode: InternalErrorType.SYNC_ERROR, operation: 'synchronizeAccounts', context: { appId: app.id } }
    )
  },

  /**
   * Synchronize accounts with custom account and address indices for deep scanning
   */
  async synchronizeAccountsWithIndices(
    app: AppConfig,
    accountIndices: number[],
    addressIndices: number[],
    onCancel?: () => boolean
  ): Promise<{ result?: Address[] }> {
    return withErrorHandling(
      async () => {
        const addresses: Address[] = []

        // Process accounts and addresses sequentially
        for (const accountIndex of accountIndices) {
          for (const addressIndex of addressIndices) {
            // Check for cancellation before fetching each address
            if (onCancel?.()) {
              throw new InternalError(InternalErrorType.OPERATION_CANCELLED)
            }

            try {
              // Build the derivation path with both account and address indices using the robust utility
              const derivedPath = updateBip44PathIndices(app.bip44Path, {
                account: accountIndex,
                address: addressIndex,
              })

              const address = await ledgerService.getAccountAddress(derivedPath, app.ss58Prefix, false)
              if (address && !onCancel?.()) {
                // Double-check cancellation before adding
                addresses.push({ ...address, path: derivedPath } as Address)
              }
            } catch (error) {
              console.warn(`Failed to get address for account ${accountIndex}, address ${addressIndex} on ${app.name}:`, error)
              // Continue with next address even if this one fails
            }
          }
        }

        return { result: addresses }
      },
      {
        errorCode: InternalErrorType.SYNC_ERROR,
        operation: 'synchronizeAccountsWithIndices',
        context: { appId: app.id, accountIndices, addressIndices },
      }
    )
  },

  async getAccountAddress(bip44Path: string, index: number, ss58Prefix: number): Promise<{ result?: Address }> {
    return withErrorHandling(
      async () => {
        // get address
        const derivedPath = updateBip44PathIndices(bip44Path, { address: index })
        const genericAddress = await ledgerService.getAccountAddress(derivedPath, ss58Prefix, true)
        const address: Address = {
          ...genericAddress,
          path: derivedPath,
        } as Address

        return { result: address }
      },
      { errorCode: InternalErrorType.SYNC_ERROR, operation: 'getAccountAddress', context: { bip44Path, index, ss58Prefix } }
    )
  },

  async migrateAccount(
    appId: AppId,
    account: Address | MultisigAddress,
    updateStatus: UpdateMigratedStatusFn
  ): Promise<{ txPromise?: Promise<void> } | undefined> {
    const validation = validateMigrationParams(appId, account)

    return withErrorHandling(
      async () => {
        const { balances, senderAddress, senderPath, appConfig, multisigInfo, accountType } = validation
        const { api } = await getApiAndProvider(appConfig.rpcEndpoints ?? [])
        if (!api) {
          throw new InternalError(InternalErrorType.BLOCKCHAIN_CONNECTION_ERROR)
        }

        updateStatus(appConfig.id, accountType, account.address, { status: TransactionStatus.PREPARING_TX })

        // Get the transferable balance
        const transferableBalance = getAccountTransferableBalance(account)

        // Prepare transaction with the specific asset type
        const preparedTx = await prepareTransaction(api, senderAddress, balances, transferableBalance, appConfig, multisigInfo)
        if (!preparedTx) {
          throw new InternalError(InternalErrorType.PREPARE_TX_ERROR)
        }
        const { transfer, payload, metadataHash, nonce, proof1, payloadBytes, callData, estimatedFee, nativeAmount } = preparedTx

        // Get chain ID from app config
        const chainId = appConfig.token.symbol.toLowerCase()

        updateStatus(appConfig.id, accountType, account.address, {
          status: TransactionStatus.SIGNING,
          estimatedFee,
          nativeAmount,
          callData,
        })

        // Sign transaction with Ledger
        const { signature } = await ledgerService.signTransaction(senderPath, payloadBytes, chainId, proof1)
        if (!signature) {
          throw new InternalError(InternalErrorType.SIGN_TX_ERROR)
        }

        // Create signed extrinsic
        createSignedExtrinsic(api, transfer, senderAddress, signature, payload, nonce, metadataHash)

        const updateTransactionStatus = (
          status: TransactionStatus,
          message?: string,
          dispatchError?: string,
          txDetails?: TransactionDetails
        ) => {
          updateStatus(appConfig.id, accountType, account.address, { status, statusMessage: message, dispatchError, ...txDetails })
        }

        if (callData) {
          updateTransactionStatus(TransactionStatus.IS_LOADING, 'Transaction is loading', undefined, {
            callData,
          })
        }

        updateStatus(appConfig.id, accountType, account.address, { status: TransactionStatus.SUBMITTING })

        const txPromise = submitAndHandleTransaction(transfer, updateTransactionStatus, api)

        // Create and wait for transaction to be submitted
        return { txPromise }
      },
      { errorCode: InternalErrorType.MIGRATION_ERROR, operation: 'migrateAccount', context: { appId, account } }
    )
  },

  async unstakeBalance(appId: AppId, address: string, path: string, amount: BN, updateTxStatus: UpdateTransactionStatus) {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig?.rpcEndpoints || appConfig.rpcEndpoints.length === 0) {
      throw new InternalError(InternalErrorType.APP_CONFIG_NOT_FOUND)
    }

    return withErrorHandling(
      async () => {
        const { api } = await getApiAndProvider(appConfig.rpcEndpoints ?? [])
        if (!api) {
          throw new InternalError(InternalErrorType.BLOCKCHAIN_CONNECTION_ERROR)
        }

        updateTxStatus(TransactionStatus.PREPARING_TX)

        const unstakeTx = await prepareUnstakeTransaction(api, amount)

        if (!unstakeTx) {
          throw new InternalError(InternalErrorType.PREPARE_TX_ERROR)
        }

        // Prepare transaction payload
        const preparedTx = await prepareTransactionPayload(api, address, appConfig, unstakeTx)
        if (!preparedTx) {
          throw new InternalError(InternalErrorType.PREPARE_TX_ERROR)
        }
        const { transfer, payload, metadataHash, nonce, proof1, payloadBytes } = preparedTx

        // Get chain ID from app config
        const chainId = appConfig.token.symbol.toLowerCase()

        updateTxStatus(TransactionStatus.SIGNING)

        // Sign transaction with Ledger
        const { signature } = await ledgerService.signTransaction(path, payloadBytes, chainId, proof1)
        if (!signature) {
          throw new InternalError(InternalErrorType.SIGN_TX_ERROR)
        }

        // Create signed extrinsic
        createSignedExtrinsic(api, transfer, address, signature, payload, nonce, metadataHash)

        updateTxStatus(TransactionStatus.SUBMITTING)

        // Create and wait for transaction to be submitted
        await submitAndHandleTransaction(transfer, updateTxStatus, api)
      },
      { errorCode: InternalErrorType.UNSTAKE_ERROR, operation: 'unstakeBalance', context: { appId, address, path, amount } }
    )
  },

  async getUnstakeFee(appId: AppId, address: string, amount: BN): Promise<BN | undefined> {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig?.rpcEndpoints || appConfig.rpcEndpoints.length === 0) {
      return undefined
    }

    try {
      return await withErrorHandling(
        async () => {
          const { api } = await getApiAndProvider(appConfig.rpcEndpoints ?? [])
          if (!api) {
            throw new InternalError(InternalErrorType.BLOCKCHAIN_CONNECTION_ERROR)
          }

          const unstakeTx = await prepareUnstakeTransaction(api, amount)
          if (!unstakeTx) {
            throw new InternalError(InternalErrorType.PREPARE_TX_ERROR)
          }

          const estimatedFee = await getTxFee(unstakeTx, address)

          return estimatedFee
        },
        { errorCode: InternalErrorType.GET_UNSTAKE_FEE_ERROR, operation: 'getUnstakeFee', context: { appId, address, amount } }
      )
    } catch {
      return undefined
    }
  },

  async withdrawBalance(appId: AppId, address: string, path: string, updateTxStatus: UpdateTransactionStatus) {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig?.rpcEndpoints || appConfig.rpcEndpoints.length === 0) {
      throw new InternalError(InternalErrorType.APP_CONFIG_NOT_FOUND)
    }

    return withErrorHandling(
      async () => {
        const { api } = await getApiAndProvider(appConfig.rpcEndpoints ?? [])
        if (!api) {
          throw new InternalError(InternalErrorType.BLOCKCHAIN_CONNECTION_ERROR)
        }

        updateTxStatus(TransactionStatus.PREPARING_TX)

        const withdrawTx = await prepareWithdrawTransaction(api)
        if (!withdrawTx) {
          throw new InternalError(InternalErrorType.PREPARE_TX_ERROR)
        }
        // Prepare transaction payload
        const preparedTx = await prepareTransactionPayload(api, address, appConfig, withdrawTx)
        if (!preparedTx) {
          throw new InternalError(InternalErrorType.PREPARE_TX_ERROR)
        }
        const { transfer, payload, metadataHash, nonce, proof1, payloadBytes } = preparedTx

        // Get chain ID from app config
        const chainId = appConfig.token.symbol.toLowerCase()

        updateTxStatus(TransactionStatus.SIGNING)

        // Sign transaction with Ledger
        const { signature } = await ledgerService.signTransaction(path, payloadBytes, chainId, proof1)
        if (!signature) {
          throw new InternalError(InternalErrorType.SIGN_TX_ERROR)
        }

        // Create signed extrinsic
        createSignedExtrinsic(api, transfer, address, signature, payload, nonce, metadataHash)

        updateTxStatus(TransactionStatus.SUBMITTING)

        // Create and wait for transaction to be submitted
        await submitAndHandleTransaction(transfer, updateTxStatus, api)
      },
      { errorCode: InternalErrorType.WITHDRAW_ERROR, operation: 'withdrawBalance', context: { appId, address, path } }
    )
  },

  async getWithdrawFee(appId: AppId, address: string): Promise<BN | undefined> {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig?.rpcEndpoints || appConfig.rpcEndpoints.length === 0) {
      return undefined
    }

    try {
      return await withErrorHandling(
        async () => {
          const { api } = await getApiAndProvider(appConfig.rpcEndpoints ?? [])
          if (!api) {
            throw new InternalError(InternalErrorType.BLOCKCHAIN_CONNECTION_ERROR)
          }

          const withdrawTx = await prepareWithdrawTransaction(api)
          if (!withdrawTx) {
            throw new InternalError(InternalErrorType.GET_WITHDRAW_FEE_ERROR)
          }

          return await getTxFee(withdrawTx, address)
        },
        { errorCode: InternalErrorType.GET_WITHDRAW_FEE_ERROR, operation: 'getWithdrawFee', context: { appId, address } }
      )
    } catch {
      return undefined
    }
  },

  async removeIdentity(appId: AppId, address: string, path: string, updateTxStatus: UpdateTransactionStatus) {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig?.rpcEndpoints || appConfig.rpcEndpoints.length === 0) {
      throw new InternalError(InternalErrorType.APP_CONFIG_NOT_FOUND)
    }

    return withErrorHandling(
      async () => {
        const { api } = await getApiAndProvider(appConfig.rpcEndpoints ?? [])
        if (!api) {
          throw new InternalError(InternalErrorType.BLOCKCHAIN_CONNECTION_ERROR)
        }

        updateTxStatus(TransactionStatus.PREPARING_TX)

        const removeIdentityTx = await prepareRemoveIdentityTransaction(api)

        if (!removeIdentityTx) {
          throw new InternalError(InternalErrorType.PREPARE_TX_ERROR)
        }

        // Prepare transaction payload
        const preparedTx = await prepareTransactionPayload(api, address, appConfig, removeIdentityTx)
        if (!preparedTx) {
          throw new InternalError(InternalErrorType.PREPARE_TX_ERROR)
        }
        const { transfer, payload, metadataHash, nonce, proof1, payloadBytes } = preparedTx

        // Get chain ID from app config
        const chainId = appConfig.token.symbol.toLowerCase()

        updateTxStatus(TransactionStatus.SIGNING)

        // Sign transaction with Ledger
        const { signature } = await ledgerService.signTransaction(path, payloadBytes, chainId, proof1)
        if (!signature) {
          throw new InternalError(InternalErrorType.SIGN_TX_ERROR)
        }

        // Create signed extrinsic
        createSignedExtrinsic(api, transfer, address, signature, payload, nonce, metadataHash)

        updateTxStatus(TransactionStatus.SUBMITTING)

        // Create and wait for transaction to be submitted
        await submitAndHandleTransaction(transfer, updateTxStatus, api)
      },
      { errorCode: InternalErrorType.REMOVE_IDENTITY_ERROR, operation: 'removeIdentity', context: { appId, address, path } }
    )
  },

  async getRemoveIdentityFee(appId: AppId, address: string): Promise<BN | undefined> {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig?.rpcEndpoints || appConfig.rpcEndpoints.length === 0) {
      return undefined
    }

    try {
      return await withErrorHandling(
        async () => {
          const { api } = await getApiAndProvider(appConfig.rpcEndpoints ?? [])
          if (!api) {
            throw new InternalError(InternalErrorType.BLOCKCHAIN_CONNECTION_ERROR)
          }

          const removeIdentityTx = await prepareRemoveIdentityTransaction(api)
          if (!removeIdentityTx) {
            throw new InternalError(InternalErrorType.PREPARE_TX_ERROR)
          }

          const estimatedFee = await getTxFee(removeIdentityTx, address)

          return estimatedFee
        },
        { errorCode: InternalErrorType.GET_REMOVE_IDENTITY_FEE_ERROR, operation: 'getRemoveIdentityFee', context: { appId, address } }
      )
    } catch {
      return undefined
    }
  },

  async getMigrationTxInfo(appId: AppId, account: Address): Promise<PreTxInfo | undefined> {
    const validation = validateMigrationParams(appId, account)

    try {
      return await withErrorHandling(
        async () => {
          const { balances, senderAddress, appConfig, multisigInfo } = validation
          const { api } = await getApiAndProvider(appConfig.rpcEndpoints ?? [])
          if (!api) {
            throw new InternalError(InternalErrorType.BLOCKCHAIN_CONNECTION_ERROR)
          }

          // Get the transferable balance
          const transferableBalance = getAccountTransferableBalance(account)

          // Prepare transaction with the specific asset type
          const preparedTx = await prepareTransaction(api, senderAddress, balances, transferableBalance, appConfig, multisigInfo)
          if (!preparedTx) {
            throw new InternalError(InternalErrorType.PREPARE_TX_ERROR)
          }

          const { transfer } = preparedTx

          // Get the estimated fee
          const estimatedFee = await getTxFee(transfer, senderAddress)

          // Get the call hash
          const callHash = transfer.method.hash.toHex()

          return {
            fee: estimatedFee,
            callHash,
          }
        },
        { errorCode: InternalErrorType.MIGRATION_TX_INFO_ERROR, operation: 'getMigrationTxInfo', context: { appId, account } }
      )
    } catch {
      return undefined
    }
  },

  async signApproveAsMultiTx(
    appId: AppId,
    account: MultisigAddress,
    callHash: string,
    signer: string,
    nestedSigner: string | undefined,
    updateTxStatus: UpdateTransactionStatus
  ) {
    let validation: ValidateApproveAsMultiResult
    try {
      validation = validateApproveAsMultiParams(appId, account, callHash, signer, nestedSigner)
    } catch (validationError) {
      console.error('[signApproveAsMultiTx] Validation error:', validationError)
      throw validationError
    }

    if (!validation.isValid) {
      console.error('[signApproveAsMultiTx] Validation failed')
      return undefined
    }

    const { appConfig, multisigInfo, signerPath } = validation

    return withErrorHandling(
      async () => {
        const { api } = await getApiAndProvider(appConfig.rpcEndpoints ?? [])
        if (!api) {
          throw new InternalError(InternalErrorType.BLOCKCHAIN_CONNECTION_ERROR)
        }

        updateTxStatus(TransactionStatus.PREPARING_TX, undefined, undefined, {
          callHash: callHash,
        })

        let multiTx: SubmittableExtrinsic<'promise', ISubmittableResult>
        const signerForPayload = validation.signer
        const isFirstApproval = false
        let callData: string | undefined

        // Check if this is a nested multisig scenario
        if (validation.isNestedMultisig && validation.nestedMultisigData) {
          // First create the inner multisig call
          const innerCall = await prepareApproveAsMultiTx(
            signer, // The nested multisig address
            multisigInfo.address,
            multisigInfo.members,
            multisigInfo.threshold,
            callHash,
            api
          )

          // Then wrap it in the outer multisig call
          multiTx = await prepareNestedMultisigTx(
            signer, // Inner multisig address
            validation.nestedMultisigData.members,
            validation.nestedMultisigData.threshold,
            validation.signer, // Actual signer
            innerCall,
            api
          )

          // For nested multisig, the call data is the outer call
          if (isFirstApproval) {
            callData = multiTx.method.toHex()
          }
        } else {
          // Regular multisig approval
          multiTx = await prepareApproveAsMultiTx(
            validation.signer,
            multisigInfo.address,
            multisigInfo.members,
            multisigInfo.threshold,
            callHash,
            api
          )
        }

        // Prepare transaction payload
        const preparedTx = await prepareTransactionPayload(api, signerForPayload, appConfig, multiTx)
        if (!preparedTx) {
          throw new InternalError(InternalErrorType.PREPARE_TX_ERROR)
        }
        const { transfer, payload, metadataHash, nonce, proof1, payloadBytes } = preparedTx

        // Get chain ID from app config
        const chainId = appConfig.token.symbol.toLowerCase()

        updateTxStatus(TransactionStatus.SIGNING, undefined, undefined, {
          callHash: callHash,
          callData: callData,
        })

        // Sign transaction with Ledger
        const { signature } = await ledgerService.signTransaction(signerPath, payloadBytes, chainId, proof1)
        if (!signature) {
          throw new InternalError(InternalErrorType.SIGN_TX_ERROR)
        }

        // Create signed extrinsic
        createSignedExtrinsic(api, transfer, signerForPayload, signature, payload, nonce, metadataHash)

        updateTxStatus(TransactionStatus.SUBMITTING, undefined, undefined, {
          callHash: callHash,
          callData: callData,
        })

        // Create wrapper to preserve call data through all status updates
        const updateTxStatusWithCallData: UpdateTransactionStatus = (status, message, dispatchError, txDetails) => {
          updateTxStatus(status, message, dispatchError, {
            ...txDetails,
            callData: callData || txDetails?.callData,
            callHash: callHash || txDetails?.callHash,
          })
        }

        // Create and wait for transaction to be submitted
        await submitAndHandleTransaction(transfer, updateTxStatusWithCallData, api)
      },
      {
        errorCode: InternalErrorType.APPROVE_MULTISIG_CALL_ERROR,
        operation: 'signApproveAsMultiTx',
        context: { appId, account, callHash, signer, nestedSigner },
      }
    )
  },

  async signAsMultiTx(
    appId: AppId,
    account: MultisigAddress,
    callHash: string,
    callData: string | undefined,
    signer: string,
    nestedSigner: string | undefined,
    updateTxStatus: UpdateTransactionStatus
  ) {
    const validation = validateAsMultiParams(appId, account, callHash, callData, signer, nestedSigner)

    if (!validation.isValid) {
      return undefined
    }

    const { appConfig, multisigInfo, signerPath, callData: validCallData } = validation

    return withErrorHandling(
      async () => {
        const { api } = await getApiAndProvider(appConfig.rpcEndpoints ?? [])
        if (!api) {
          throw new InternalError(InternalErrorType.BLOCKCHAIN_CONNECTION_ERROR)
        }

        updateTxStatus(TransactionStatus.PREPARING_TX)

        let multiTx: SubmittableExtrinsic<'promise', ISubmittableResult>
        const signerForPayload = validation.signer

        // Check if this is a nested multisig scenario
        if (validation.isNestedMultisig && validation.nestedMultisigData) {
          // First create the inner multisig call
          const innerCall: SubmittableExtrinsic<'promise', ISubmittableResult> = await prepareAsMultiTx(
            signer, // The nested multisig address
            multisigInfo.address,
            multisigInfo.members,
            multisigInfo.threshold,
            callHash,
            validCallData,
            api
          )

          // Then wrap it in the outter multisig call
          multiTx = await prepareNestedAsMultiTx(
            signer, // Inner multisig address
            validation.nestedMultisigData.members,
            validation.nestedMultisigData.threshold,
            validation.signer, // Actual signer
            innerCall,
            api
          )
        } else {
          // Regular multisig approval
          multiTx = await prepareAsMultiTx(
            validation.signer,
            multisigInfo.address,
            multisigInfo.members,
            multisigInfo.threshold,
            callHash,
            validCallData,
            api
          )
        }

        // Prepare transaction payload
        const preparedTx = await prepareTransactionPayload(api, signerForPayload, appConfig, multiTx)
        if (!preparedTx) {
          throw new InternalError(InternalErrorType.PREPARE_TX_ERROR)
        }

        const { transfer, payload, metadataHash, nonce, proof1, payloadBytes } = preparedTx

        // Get chain ID from app config
        const chainId = appConfig.token.symbol.toLowerCase()

        updateTxStatus(TransactionStatus.SIGNING, undefined, undefined, {
          callHash: callHash,
          callData: validCallData,
        })

        // Sign transaction with Ledger
        const { signature } = await ledgerService.signTransaction(signerPath, payloadBytes, chainId, proof1)
        if (!signature) {
          throw new InternalError(InternalErrorType.SIGN_TX_ERROR)
        }

        // Create signed extrinsic
        createSignedExtrinsic(api, transfer, signerForPayload, signature, payload, nonce, metadataHash)

        updateTxStatus(TransactionStatus.SUBMITTING, undefined, undefined, {
          callHash: callHash,
          callData: validCallData,
        })

        // Create wrapper to preserve call data through all status updates
        const updateTxStatusWithCallData: UpdateTransactionStatus = (status, message, dispatchError, txDetails) => {
          updateTxStatus(status, message, dispatchError, {
            ...txDetails,
            callData: validCallData || txDetails?.callData,
            callHash: callHash || txDetails?.callHash,
          })
        }

        // Create and wait for transaction to be submitted
        await submitAndHandleTransaction(transfer, updateTxStatusWithCallData, api)
      },
      {
        errorCode: InternalErrorType.APPROVE_MULTISIG_CALL_ERROR,
        operation: 'signAsMultiTx',
        context: { appId, account, callHash, callData, signer, nestedSigner },
      }
    )
  },

  async validateCallDataMatchesHash(appId: AppId, callData: string, expectedCallHash: string): Promise<boolean> {
    try {
      const appConfig = appsConfigs.get(appId)
      if (!appConfig?.rpcEndpoints || appConfig.rpcEndpoints.length === 0) {
        return false
      }

      return await withErrorHandling(
        async () => {
          const { api } = await getApiAndProvider(appConfig.rpcEndpoints ?? [])
          if (!api) {
            throw new InternalError(InternalErrorType.BLOCKCHAIN_CONNECTION_ERROR)
          }
          return validateCallDataMatchesHash(api, callData, expectedCallHash)
        },
        {
          errorCode: InternalErrorType.VALIDATE_CALL_DATA_MATCHES_HASH_ERROR,
          operation: 'validateCallDataMatchesHash',
          context: { appId, callData, expectedCallHash },
        }
      )
    } catch {
      return false
    }
  },

  async signMultisigTransferTx(
    appId: AppId,
    account: MultisigAddress,
    recipient: string,
    signer: string,
    transferAmount: string,
    updateTxStatus: UpdateTransactionStatus
  ) {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig?.rpcEndpoints || appConfig.rpcEndpoints.length === 0) {
      throw new InternalError(InternalErrorType.APP_CONFIG_NOT_FOUND)
    }

    const multisigInfo = account
    const signerMember = multisigInfo.members.find(m => m.address === signer && m.internal)
    if (!signerMember) {
      throw new InternalError(InternalErrorType.NO_SIGNATORY_ADDRESS)
    }

    // We need the signer's derivation path to sign with Ledger
    // The path is only available for the member that matches the synchronized address
    if (!signerMember.path) {
      // This is a current limitation - we only have the path for the address
      // that was used to discover this multisig account
      throw new InternalError(InternalErrorType.GET_ADDRESS_ERROR)
    }
    const signerPath = signerMember.path

    return withErrorHandling(
      async () => {
        const { api } = await getApiAndProvider(appConfig.rpcEndpoints ?? [])
        if (!api) {
          throw new InternalError(InternalErrorType.BLOCKCHAIN_CONNECTION_ERROR)
        }

        updateTxStatus(TransactionStatus.PREPARING_TX)

        // Create the transfer call
        const transferCall = api.tx.balances.transferKeepAlive(recipient, new BN(transferAmount))
        const callHash = transferCall.method.hash.toHex()
        const callData = transferCall.method.toHex()

        // Prepare the multisig transaction (it will check for existing approvals internally)
        const multiTx = await prepareApproveAsMultiTx(
          signer,
          multisigInfo.address,
          multisigInfo.members.map(m => m.address),
          multisigInfo.threshold,
          callHash,
          api
        )

        let preparedTx: PreparedTransactionPayload | undefined
        try {
          preparedTx = await prepareTransactionPayload(api, signer, appConfig, multiTx)
          if (!preparedTx) {
            console.error('[signMultisigTransferTx] prepareTransactionPayload returned null/undefined')
            throw new InternalError(InternalErrorType.PREPARE_TX_ERROR)
          }
        } catch (payloadError) {
          console.error('[signMultisigTransferTx] Error in prepareTransactionPayload:', payloadError)
          throw payloadError
        }
        const { transfer, payload, metadataHash, nonce, proof1, payloadBytes } = preparedTx

        // Get chain ID from app config
        const chainId = appConfig.token.symbol.toLowerCase()

        // Check if this is the first approval to determine if we should return callData
        const existingApprovals = (await api.query.multisig.multisigs(multisigInfo.address, callHash)) as Option<Multisig>
        const isFirstApproval = existingApprovals.isNone

        updateTxStatus(TransactionStatus.SIGNING, undefined, undefined, {
          callData: isFirstApproval ? callData : undefined,
          callHash: callHash,
        })

        // Sign transaction with Ledger
        const { signature } = await ledgerService.signTransaction(signerPath, payloadBytes, chainId, proof1)
        if (!signature) {
          throw new InternalError(InternalErrorType.SIGN_TX_ERROR)
        }

        // Create signed extrinsic
        createSignedExtrinsic(api, transfer, signer, signature, payload, nonce, metadataHash)

        updateTxStatus(TransactionStatus.SUBMITTING, undefined, undefined, {
          callData: isFirstApproval ? callData : undefined,
          callHash: callHash,
        })

        // Create wrapper to preserve call data through all status updates
        const updateTxStatusWithCallData: UpdateTransactionStatus = (status, message, dispatchError, txDetails) => {
          updateTxStatus(status, message, dispatchError, {
            ...txDetails,
            callData: (isFirstApproval ? callData : undefined) || txDetails?.callData,
            callHash: callHash || txDetails?.callHash,
          })
        }

        // Create and wait for transaction to be submitted
        await submitAndHandleTransaction(transfer, updateTxStatusWithCallData, api)
      },
      {
        errorCode: InternalErrorType.MULTISIG_TRANSFER_ERROR,
        operation: 'signMultisigTransferTx',
        context: { appId, account, recipient, signer, transferAmount },
      }
    )
  },

  async removeProxies(appId: AppId, address: string, path: string, updateTxStatus: UpdateTransactionStatus) {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig?.rpcEndpoints || appConfig.rpcEndpoints.length === 0) {
      throw new InternalError(InternalErrorType.APP_CONFIG_NOT_FOUND)
    }

    return withErrorHandling(
      async () => {
        const { api } = await getApiAndProvider(appConfig.rpcEndpoints ?? [])
        if (!api) {
          throw new InternalError(InternalErrorType.BLOCKCHAIN_CONNECTION_ERROR)
        }

        updateTxStatus(TransactionStatus.PREPARING_TX)

        const removeProxyTx = await prepareRemoveProxiesTransaction(api)

        if (!removeProxyTx) {
          throw new InternalError(InternalErrorType.PREPARE_TX_ERROR)
        }

        // Prepare transaction payload
        const preparedTx = await prepareTransactionPayload(api, address, appConfig, removeProxyTx)
        if (!preparedTx) {
          throw new InternalError(InternalErrorType.PREPARE_TX_ERROR)
        }
        const { transfer, payload, metadataHash, nonce, proof1, payloadBytes } = preparedTx

        // Get chain ID from app config
        const chainId = appConfig.token.symbol.toLowerCase()

        updateTxStatus(TransactionStatus.SIGNING)

        // Sign transaction with Ledger
        const { signature } = await ledgerService.signTransaction(path, payloadBytes, chainId, proof1)
        if (!signature) {
          throw new InternalError(InternalErrorType.SIGN_TX_ERROR)
        }

        // Create signed extrinsic
        createSignedExtrinsic(api, transfer, address, signature, payload, nonce, metadataHash)

        updateTxStatus(TransactionStatus.SUBMITTING)

        // Create and wait for transaction to be submitted
        await submitAndHandleTransaction(transfer, updateTxStatus, api)
      },
      { errorCode: InternalErrorType.REMOVE_PROXY_ERROR, operation: 'removeProxies', context: { appId, address, path } }
    )
  },

  async getRemoveProxiesFee(appId: AppId, address: string): Promise<BN | undefined> {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig?.rpcEndpoints || appConfig.rpcEndpoints.length === 0) {
      return undefined
    }

    try {
      return await withErrorHandling(
        async () => {
          const { api } = await getApiAndProvider(appConfig.rpcEndpoints ?? [])
          if (!api) {
            throw new InternalError(InternalErrorType.BLOCKCHAIN_CONNECTION_ERROR)
          }

          const removeProxyTx = await prepareRemoveProxiesTransaction(api)
          if (!removeProxyTx) {
            throw new InternalError(InternalErrorType.PREPARE_TX_ERROR)
          }

          const estimatedFee = await getTxFee(removeProxyTx, address)

          return estimatedFee
        },
        { errorCode: InternalErrorType.GET_REMOVE_PROXIES_FEE_ERROR, operation: 'getRemoveProxiesFee', context: { appId, address } }
      )
    } catch {
      return undefined
    }
  },

  async removeAccountIndex(appId: AppId, address: string, accountIndex: string, path: string, updateTxStatus: UpdateTransactionStatus) {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig?.rpcEndpoints || appConfig.rpcEndpoints.length === 0) {
      throw new InternalError(InternalErrorType.APP_CONFIG_NOT_FOUND)
    }

    return withErrorHandling(
      async () => {
        const { api } = await getApiAndProvider(appConfig.rpcEndpoints ?? [])
        if (!api) {
          throw new InternalError(InternalErrorType.BLOCKCHAIN_CONNECTION_ERROR)
        }

        updateTxStatus(TransactionStatus.PREPARING_TX)

        const removeAccountIndexTx = await prepareRemoveAccountIndexTransaction(api, accountIndex)
        if (!removeAccountIndexTx) {
          throw new InternalError(InternalErrorType.PREPARE_TX_ERROR)
        }

        // Prepare transaction payload
        const preparedTx = await prepareTransactionPayload(api, address, appConfig, removeAccountIndexTx)
        if (!preparedTx) {
          throw new InternalError(InternalErrorType.PREPARE_TX_ERROR)
        }
        const { transfer, payload, metadataHash, nonce, proof1, payloadBytes } = preparedTx

        // Get chain ID from app config
        const chainId = appConfig.token.symbol.toLowerCase()

        updateTxStatus(TransactionStatus.SIGNING)

        // Sign transaction with Ledger
        const { signature } = await ledgerService.signTransaction(path, payloadBytes, chainId, proof1)
        if (!signature) {
          throw new InternalError(InternalErrorType.SIGN_TX_ERROR)
        }

        // Create signed extrinsic
        createSignedExtrinsic(api, transfer, address, signature, payload, nonce, metadataHash)

        updateTxStatus(TransactionStatus.SUBMITTING)

        // Create and wait for transaction to be submitted
        await submitAndHandleTransaction(transfer, updateTxStatus, api)
      },
      {
        errorCode: InternalErrorType.REMOVE_ACCOUNT_INDEX_ERROR,
        operation: 'removeAccountIndex',
        context: { appId, address, path, accountIndex },
      }
    )
  },

  async getRemoveAccountIndexFee(appId: AppId, address: string, accountIndex: string): Promise<BN | undefined> {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig?.rpcEndpoints || appConfig.rpcEndpoints.length === 0) {
      return undefined
    }

    try {
      return await withErrorHandling(
        async () => {
          const { api } = await getApiAndProvider(appConfig.rpcEndpoints ?? [])
          if (!api) {
            throw new InternalError(InternalErrorType.BLOCKCHAIN_CONNECTION_ERROR)
          }

          const removeAccountIndexTx = await prepareRemoveAccountIndexTransaction(api, accountIndex)
          if (!removeAccountIndexTx) {
            throw new InternalError(InternalErrorType.PREPARE_TX_ERROR)
          }

          const estimatedFee = await getTxFee(removeAccountIndexTx, address)

          return estimatedFee
        },
        {
          errorCode: InternalErrorType.GET_REMOVE_ACCOUNT_INDEX_FEE_ERROR,
          operation: 'getRemoveAccountIndexFee',
          context: { appId, address, accountIndex },
        }
      )
    } catch {
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
    const appConfig = appsConfigs.get(appId)
    if (!appConfig?.rpcEndpoints || appConfig.rpcEndpoints.length === 0) {
      throw new InternalError(InternalErrorType.APP_CONFIG_NOT_FOUND)
    }

    return withErrorHandling(
      async () => {
        const { api } = await getApiAndProvider(appConfig.rpcEndpoints ?? [])
        if (!api) {
          throw new InternalError(InternalErrorType.BLOCKCHAIN_CONNECTION_ERROR)
        }

        const { prepareBatchRemoveVotesTransaction, prepareBatchUndelegateTransaction, prepareBatchUnlockTransaction } = await import(
          '@/lib/account'
        )

        updateTxStatus(TransactionStatus.PREPARING_TX)

        // Group actions by type
        const removeVotes = actions.filter(a => a.type === 'removeVote')
        const undelegates = actions.filter(a => a.type === 'undelegate')
        const unlocks = actions.filter(a => a.type === 'unlock')

        // Prepare batch transactions
        const calls = []

        if (removeVotes.length > 0) {
          const validVotes = removeVotes.filter(v => v.referendumIndex !== undefined)
          if (validVotes.length > 0) {
            const tx = await prepareBatchRemoveVotesTransaction(
              api,
              validVotes.map(v => ({
                trackId: v.trackId,
                referendumIndex: v.referendumIndex as number,
              }))
            )
            calls.push(tx)
          }
        }

        if (undelegates.length > 0) {
          const tx = await prepareBatchUndelegateTransaction(
            api,
            undelegates.map(u => u.trackId)
          )
          calls.push(tx)
        }

        if (unlocks.length > 0) {
          const tx = await prepareBatchUnlockTransaction(
            api,
            address,
            unlocks.map(u => u.trackId)
          )
          calls.push(tx)
        }

        if (calls.length === 0) {
          throw new InternalError(InternalErrorType.NO_ACTIVE_VOTES)
        }

        // Create the final transaction (single call or batch)
        const finalTx = calls.length === 1 ? calls[0] : api.tx.utility.batchAll(calls)

        // Prepare transaction payload
        const preparedTx = await prepareTransactionPayload(api, address, appConfig, finalTx)
        if (!preparedTx) {
          throw new InternalError(InternalErrorType.PREPARE_TX_ERROR)
        }
        const { payload, transfer, nonce, metadataHash, payloadBytes, proof1 } = preparedTx

        // Get chain ID from app config
        const chainId = appConfig.token.symbol.toLowerCase()

        updateTxStatus(TransactionStatus.SIGNING)

        // Sign transaction with Ledger
        const { signature } = await ledgerService.signTransaction(path, payloadBytes, chainId, proof1)
        if (!signature) {
          throw new InternalError(InternalErrorType.SIGN_TX_ERROR)
        }

        // Create signed extrinsic
        createSignedExtrinsic(api, transfer, address, signature, payload, nonce, metadataHash)

        updateTxStatus(TransactionStatus.SUBMITTING)

        // Create and wait for transaction to be submitted
        await submitAndHandleTransaction(transfer, updateTxStatus, api)
      },
      {
        errorCode: InternalErrorType.UNLOCK_CONVICTION_ERROR,
        operation: 'executeGovernanceUnlock',
        context: { appId, address, path, actions },
      }
    )
  },

  async getGovernanceUnlockFee(
    appId: AppId,
    address: string,
    actions: Array<{ type: 'removeVote' | 'undelegate' | 'unlock'; trackId: number; referendumIndex?: number }>
  ): Promise<BN | undefined> {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig?.rpcEndpoints || appConfig.rpcEndpoints.length === 0) {
      return undefined
    }

    try {
      return await withErrorHandling(
        async () => {
          const { api } = await getApiAndProvider(appConfig.rpcEndpoints ?? [])
          if (!api) {
            throw new InternalError(InternalErrorType.BLOCKCHAIN_CONNECTION_ERROR)
          }

          const { prepareBatchRemoveVotesTransaction, prepareBatchUndelegateTransaction, prepareBatchUnlockTransaction } = await import(
            '@/lib/account'
          )

          // Group actions by type
          const removeVotes = actions.filter(a => a.type === 'removeVote')
          const undelegates = actions.filter(a => a.type === 'undelegate')
          const unlocks = actions.filter(a => a.type === 'unlock')

          // Prepare batch transactions
          const calls = []

          if (removeVotes.length > 0) {
            const validVotes = removeVotes.filter(v => v.referendumIndex !== undefined)
            if (validVotes.length > 0) {
              const tx = await prepareBatchRemoveVotesTransaction(
                api,
                validVotes.map(v => ({
                  trackId: v.trackId,
                  referendumIndex: v.referendumIndex as number,
                }))
              )
              calls.push(tx)
            }
          }

          if (undelegates.length > 0) {
            const tx = await prepareBatchUndelegateTransaction(
              api,
              undelegates.map(u => u.trackId)
            )
            calls.push(tx)
          }

          if (unlocks.length > 0) {
            const tx = await prepareBatchUnlockTransaction(
              api,
              address,
              unlocks.map(u => u.trackId)
            )
            calls.push(tx)
          }

          if (calls.length === 0) {
            return new BN(0)
          }

          // Create the final transaction
          const finalTx = calls.length === 1 ? calls[0] : api.tx.utility.batchAll(calls)

          const estimatedFee = await getTxFee(finalTx, address)
          return estimatedFee
        },
        { errorCode: InternalErrorType.GET_CONVICTION_VOTING_INFO_ERROR, operation: 'getGovernanceUnlockFee', context: { appId, address } }
      )
    } catch {
      return undefined
    }
  },

  clearConnection() {
    ledgerService.clearConnection()
  },

  disconnect() {
    ledgerService.disconnect()
  },

  abortCall() {
    ledgerService.abortCall()
  },
}
