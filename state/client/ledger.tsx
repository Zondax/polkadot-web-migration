import {
  createSignedExtrinsic,
  getApiAndProvider,
  getTxFee,
  prepareApproveAsMultiTx,
  prepareAsMultiTx,
  prepareRemoveAccountIndexTransaction,
  prepareRemoveIdentityTransaction,
  prepareRemoveProxiesTransaction,
  prepareTransaction,
  prepareTransactionPayload,
  prepareUnstakeTransaction,
  prepareWithdrawTransaction,
  submitAndHandleTransaction,
  type UpdateTransactionStatus,
  validateCallDataMatchesHash,
} from '@/lib/account'
import { ledgerService } from '@/lib/ledger/ledgerService'
import type { ConnectionResponse } from '@/lib/ledger/types'
import { InternalError, withErrorHandling } from '@/lib/utils'
import { getBip44Path } from '@/lib/utils/address'
import { getAccountTransferableBalance } from '@/lib/utils/balance'
import type { BN } from '@polkadot/util'
import { type AppConfig, type AppId, appsConfigs } from 'config/apps'
import { maxAddressesToFetch } from 'config/config'
import { InternalErrorType } from 'config/errors'

import {
  type Address,
  type MultisigAddress,
  type PreTxInfo,
  type TransactionDetails,
  TransactionStatus,
  type UpdateMigratedStatusFn,
} from '../types/ledger'
import { validateApproveAsMultiParams, validateAsMultiParams, validateMigrationParams } from './helpers'

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

  async synchronizeAccounts(app: AppConfig): Promise<{ result?: Address[] }> {
    return withErrorHandling(
      async () => {
        // fetch addresses
        const addresses: Address[] = []
        for (let i = 0; i < maxAddressesToFetch; i++) {
          try {
            const derivedPath = getBip44Path(app.bip44Path, i)
            const address = await ledgerService.getAccountAddress(derivedPath, app.ss58Prefix, false)
            if (address) {
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

  async getAccountAddress(bip44Path: string, index: number, ss58Prefix: number): Promise<{ result?: Address }> {
    return withErrorHandling(
      async () => {
        // get address
        const derivedPath = getBip44Path(bip44Path, index)
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
        const { api } = await getApiAndProvider(appConfig.rpcEndpoint ?? '')
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

        const updateTransactionStatus = (status: TransactionStatus, message?: string, txDetails?: TransactionDetails) => {
          updateStatus(appConfig.id, accountType, account.address, { status, statusMessage: message, ...txDetails })
        }

        if (callData) {
          updateTransactionStatus(TransactionStatus.IS_LOADING, 'Transaction is loading', {
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
    if (!appConfig?.rpcEndpoint) {
      throw new InternalError(InternalErrorType.APP_CONFIG_NOT_FOUND)
    }

    return withErrorHandling(
      async () => {
        const { api } = await getApiAndProvider(appConfig.rpcEndpoint ?? '')
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
    if (!appConfig?.rpcEndpoint) {
      return undefined
    }

    try {
      return await withErrorHandling(
        async () => {
          const { api } = await getApiAndProvider(appConfig.rpcEndpoint ?? '')
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
    if (!appConfig?.rpcEndpoint) {
      throw new InternalError(InternalErrorType.APP_CONFIG_NOT_FOUND)
    }

    return withErrorHandling(
      async () => {
        const { api } = await getApiAndProvider(appConfig.rpcEndpoint ?? '')
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
    if (!appConfig?.rpcEndpoint) {
      return undefined
    }

    try {
      return await withErrorHandling(
        async () => {
          const { api } = await getApiAndProvider(appConfig.rpcEndpoint ?? '')
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
    if (!appConfig?.rpcEndpoint) {
      throw new InternalError(InternalErrorType.APP_CONFIG_NOT_FOUND)
    }

    return withErrorHandling(
      async () => {
        const { api } = await getApiAndProvider(appConfig.rpcEndpoint ?? '')
        if (!api) {
          throw new InternalError(InternalErrorType.BLOCKCHAIN_CONNECTION_ERROR)
        }

        updateTxStatus(TransactionStatus.PREPARING_TX)

        const removeIdentityTx = await prepareRemoveIdentityTransaction(api, address)

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
    if (!appConfig?.rpcEndpoint) {
      return undefined
    }

    try {
      return await withErrorHandling(
        async () => {
          const { api } = await getApiAndProvider(appConfig.rpcEndpoint ?? '')
          if (!api) {
            throw new InternalError(InternalErrorType.BLOCKCHAIN_CONNECTION_ERROR)
          }

          const removeIdentityTx = await prepareRemoveIdentityTransaction(api, address)
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
          const { api } = await getApiAndProvider(appConfig.rpcEndpoint ?? '')
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
    updateTxStatus: UpdateTransactionStatus
  ) {
    const validation = validateApproveAsMultiParams(appId, account, callHash, signer)

    if (!validation.isValid) {
      return undefined
    }

    const { appConfig, multisigInfo, signerPath } = validation

    return withErrorHandling(
      async () => {
        const { api } = await getApiAndProvider(appConfig.rpcEndpoint ?? '')
        if (!api) {
          throw new InternalError(InternalErrorType.BLOCKCHAIN_CONNECTION_ERROR)
        }

        updateTxStatus(TransactionStatus.PREPARING_TX)

        const multiTx = await prepareApproveAsMultiTx(
          signer,
          multisigInfo.address,
          multisigInfo.members,
          multisigInfo.threshold,
          callHash,
          api
        )

        // Prepare transaction payload
        const preparedTx = await prepareTransactionPayload(api, signer, appConfig, multiTx)
        if (!preparedTx) {
          throw new InternalError(InternalErrorType.PREPARE_TX_ERROR)
        }
        const { transfer, payload, metadataHash, nonce, proof1, payloadBytes } = preparedTx

        // Get chain ID from app config
        const chainId = appConfig.token.symbol.toLowerCase()

        updateTxStatus(TransactionStatus.SIGNING)

        // Sign transaction with Ledger
        const { signature } = await ledgerService.signTransaction(signerPath, payloadBytes, chainId, proof1)
        if (!signature) {
          throw new InternalError(InternalErrorType.SIGN_TX_ERROR)
        }

        // Create signed extrinsic
        createSignedExtrinsic(api, transfer, signer, signature, payload, nonce, metadataHash)

        updateTxStatus(TransactionStatus.SUBMITTING)

        // Create and wait for transaction to be submitted
        await submitAndHandleTransaction(transfer, updateTxStatus, api)
      },
      {
        errorCode: InternalErrorType.APPROVE_MULTISIG_CALL_ERROR,
        operation: 'signApproveAsMultiTx',
        context: { appId, account, callHash, signer },
      }
    )
  },

  async signAsMultiTx(
    appId: AppId,
    account: MultisigAddress,
    callHash: string,
    callData: string | undefined,
    signer: string,
    updateTxStatus: UpdateTransactionStatus
  ) {
    const validation = validateAsMultiParams(appId, account, callHash, callData, signer)

    if (!validation.isValid) {
      return undefined
    }

    const { appConfig, multisigInfo, signerPath, callData: validCallData } = validation

    return withErrorHandling(
      async () => {
        const { api } = await getApiAndProvider(appConfig.rpcEndpoint ?? '')
        if (!api) {
          throw new InternalError(InternalErrorType.BLOCKCHAIN_CONNECTION_ERROR)
        }

        updateTxStatus(TransactionStatus.PREPARING_TX)

        const multiTx = await prepareAsMultiTx(
          signer,
          multisigInfo.address,
          multisigInfo.members,
          multisigInfo.threshold,
          callHash,
          validCallData,
          api
        )

        // Prepare transaction payload
        const preparedTx = await prepareTransactionPayload(api, signer, appConfig, multiTx)
        if (!preparedTx) {
          throw new InternalError(InternalErrorType.PREPARE_TX_ERROR)
        }
        const { transfer, payload, metadataHash, nonce, proof1, payloadBytes } = preparedTx

        // Get chain ID from app config
        const chainId = appConfig.token.symbol.toLowerCase()

        updateTxStatus(TransactionStatus.SIGNING)

        // Sign transaction with Ledger
        const { signature } = await ledgerService.signTransaction(signerPath, payloadBytes, chainId, proof1)
        if (!signature) {
          throw new InternalError(InternalErrorType.SIGN_TX_ERROR)
        }

        // Create signed extrinsic
        createSignedExtrinsic(api, transfer, signer, signature, payload, nonce, metadataHash)

        updateTxStatus(TransactionStatus.SUBMITTING)

        // Create and wait for transaction to be submitted
        await submitAndHandleTransaction(transfer, updateTxStatus, api)
      },
      {
        errorCode: InternalErrorType.APPROVE_MULTISIG_CALL_ERROR,
        operation: 'signAsMultiTx',
        context: { appId, account, callHash, callData, signer },
      }
    )
  },

  async validateCallDataMatchesHash(appId: AppId, callData: string, expectedCallHash: string): Promise<boolean> {
    try {
      const appConfig = appsConfigs.get(appId)
      if (!appConfig?.rpcEndpoint) {
        return false
      }

      return await withErrorHandling(
        async () => {
          const { api } = await getApiAndProvider(appConfig.rpcEndpoint ?? '')
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

  async removeProxies(appId: AppId, address: string, path: string, updateTxStatus: UpdateTransactionStatus) {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig?.rpcEndpoint) {
      throw new InternalError(InternalErrorType.APP_CONFIG_NOT_FOUND)
    }

    return withErrorHandling(
      async () => {
        const { api } = await getApiAndProvider(appConfig.rpcEndpoint ?? '')
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
    if (!appConfig?.rpcEndpoint) {
      return undefined
    }

    try {
      return await withErrorHandling(
        async () => {
          const { api } = await getApiAndProvider(appConfig.rpcEndpoint ?? '')
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
    if (!appConfig?.rpcEndpoint) {
      throw new InternalError(InternalErrorType.APP_CONFIG_NOT_FOUND)
    }

    return withErrorHandling(
      async () => {
        const { api } = await getApiAndProvider(appConfig.rpcEndpoint ?? '')
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
    if (!appConfig?.rpcEndpoint) {
      return undefined
    }

    try {
      return await withErrorHandling(
        async () => {
          const { api } = await getApiAndProvider(appConfig.rpcEndpoint ?? '')
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
