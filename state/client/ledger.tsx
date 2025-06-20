import type { GenericeResponseAddress } from '@zondax/ledger-substrate/dist/common'
import { type AppConfig, type AppId, appsConfigs } from 'config/apps'
import { maxAddressesToFetch } from 'config/config'
import { InternalErrors } from 'config/errors'

import {
  type UpdateTransactionStatus,
  createSignedExtrinsic,
  getApiAndProvider,
  getTxFee,
  prepareAsMultiTx,
  prepareRemoveIdentityTransaction,
  prepareRemoveProxiesTransaction,
  prepareTransaction,
  prepareTransactionPayload,
  prepareUnstakeTransaction,
  prepareWithdrawTransaction,
  submitAndHandleTransaction,
  validateCallDataMatchesHash,
} from '@/lib/account'
import { ledgerService } from '@/lib/ledger/ledgerService'
import type { ConnectionResponse } from '@/lib/ledger/types'
import { getBip44Path } from '@/lib/utils/address'
import { getTransferableAndNfts } from '@/lib/utils/balance'

import type { MultisigCallFormData } from '@/components/sections/migrate/dialogs/approve-multisig-call-dialog'
import type { BN } from '@polkadot/util'
import {
  type Address,
  type MultisigAddress,
  type PreTxInfo,
  type TransactionDetails,
  TransactionStatus,
  type UpdateMigratedStatusFn,
} from '../types/ledger'
import { withErrorHandling } from './base'
import { validateApproveMultisigCallParams, validateMigrationParams } from './helpers'

export const ledgerClient = {
  // Device operations
  async connectDevice(onDisconnect?: () => void): Promise<ConnectionResponse | undefined> {
    return withErrorHandling(() => ledgerService.connectDevice(onDisconnect), InternalErrors.CONNECTION_ERROR)
  },

  async synchronizeAccounts(app: AppConfig): Promise<{ result?: Address[] }> {
    return withErrorHandling(async () => {
      // fetch addresses
      const addresses: (GenericeResponseAddress | undefined)[] = []
      for (let i = 0; i < maxAddressesToFetch; i++) {
        const derivedPath = getBip44Path(app.bip44Path, i)
        const address = await ledgerService.getAccountAddress(derivedPath, app.ss58Prefix, false)
        addresses.push({ ...address, path: derivedPath } as Address)
      }

      const filteredAddresses = addresses.filter((address): address is Address => address !== undefined)

      return { result: filteredAddresses }
    }, InternalErrors.SYNC_ERROR)
  },

  async getAccountAddress(bip44Path: string, index: number, ss58Prefix: number): Promise<{ result?: Address }> {
    return withErrorHandling(async () => {
      // get address
      const derivedPath = getBip44Path(bip44Path, index)
      const genericAddress = await ledgerService.getAccountAddress(derivedPath, ss58Prefix, true)
      const address: Address = {
        ...genericAddress,
        path: derivedPath,
      } as Address

      return { result: address }
    }, InternalErrors.SYNC_ERROR)
  },

  async migrateAccount(
    appId: AppId,
    account: Address | MultisigAddress,
    updateStatus: UpdateMigratedStatusFn,
    balanceIndex: number
  ): Promise<{ txPromise?: Promise<void> } | undefined> {
    const validation = validateMigrationParams(appId, account, balanceIndex)
    if (!validation.isValid) {
      return undefined
    }

    return withErrorHandling(async () => {
      const { balance, senderAddress, senderPath, receiverAddress, appConfig, multisigInfo, accountType } = validation
      const { api, error } = await getApiAndProvider(appConfig.rpcEndpoint ?? '')
      if (error || !api) {
        throw new Error(error ?? 'Failed to connect to the blockchain.')
      }

      // Determine which type of balance we're dealing with
      const { nftsToTransfer, nativeAmount, transferableAmount } = getTransferableAndNfts(balance, account)

      // Prepare transaction with the specific asset type
      const preparedTx = await prepareTransaction(
        api,
        senderAddress,
        receiverAddress,
        transferableAmount,
        nftsToTransfer,
        appConfig,
        nativeAmount,
        multisigInfo
      )
      if (!preparedTx) {
        throw new Error('Prepare transaction failed')
      }
      const { transfer, payload, metadataHash, nonce, proof1, payloadBytes, callData } = preparedTx

      // Get chain ID from app config
      const chainId = appConfig.token.symbol.toLowerCase()

      // Sign transaction with Ledger
      const { signature } = await ledgerService.signTransaction(senderPath, payloadBytes, chainId, proof1)
      if (!signature) {
        throw new Error('Failed to sign transaction')
      }

      // Create signed extrinsic
      createSignedExtrinsic(api, transfer, senderAddress, signature, payload, nonce, metadataHash)

      const updateTransactionStatus = (status: TransactionStatus, message?: string, txDetails?: TransactionDetails) => {
        updateStatus(appConfig.id, accountType, account.path, balance.type, status, message, txDetails)
      }

      if (callData) {
        updateTransactionStatus(TransactionStatus.IS_LOADING, 'Transaction is loading', {
          callData,
        })
      }

      const txPromise = submitAndHandleTransaction(transfer, updateTransactionStatus, api)

      // Create and wait for transaction to be submitted
      return { txPromise }
    }, InternalErrors.UNKNOWN_ERROR)
  },

  async unstakeBalance(appId: AppId, address: string, path: string, amount: BN, updateTxStatus: UpdateTransactionStatus) {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig?.rpcEndpoint) {
      throw InternalErrors.APP_CONFIG_NOT_FOUND
    }

    return withErrorHandling(async () => {
      const { api, error } = await getApiAndProvider(appConfig.rpcEndpoint ?? '')
      if (error || !api) {
        throw new Error(error ?? 'Failed to connect to the blockchain.')
      }

      const unstakeTx = await prepareUnstakeTransaction(api, amount)

      if (!unstakeTx) {
        throw new Error('Failed to prepare transaction')
      }

      // Prepare transaction payload
      const preparedTx = await prepareTransactionPayload(api, address, appConfig, unstakeTx)
      if (!preparedTx) {
        throw new Error('Failed to prepare transaction')
      }
      const { transfer, payload, metadataHash, nonce, proof1, payloadBytes } = preparedTx

      // Get chain ID from app config
      const chainId = appConfig.token.symbol.toLowerCase()

      // Sign transaction with Ledger
      const { signature } = await ledgerService.signTransaction(path, payloadBytes, chainId, proof1)
      if (!signature) {
        throw new Error('Failed to sign transaction')
      }

      // Create signed extrinsic
      createSignedExtrinsic(api, transfer, address, signature, payload, nonce, metadataHash)

      // Create and wait for transaction to be submitted
      await submitAndHandleTransaction(transfer, updateTxStatus, api)
    }, InternalErrors.UNKNOWN_ERROR)
  },

  async getUnstakeFee(appId: AppId, address: string, amount: BN): Promise<BN | undefined> {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig?.rpcEndpoint) {
      throw InternalErrors.APP_CONFIG_NOT_FOUND
    }

    return withErrorHandling(async () => {
      const { api, error } = await getApiAndProvider(appConfig.rpcEndpoint ?? '')
      if (error || !api) {
        throw new Error(error ?? 'Failed to connect to the blockchain.')
      }

      const unstakeTx = await prepareUnstakeTransaction(api, amount)
      if (!unstakeTx) {
        throw new Error('Failed to prepare transaction')
      }

      const estimatedFee = await getTxFee(unstakeTx, address)

      return estimatedFee
    }, InternalErrors.UNKNOWN_ERROR)
  },

  async withdrawBalance(appId: AppId, address: string, path: string, updateTxStatus: UpdateTransactionStatus) {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig?.rpcEndpoint) {
      throw InternalErrors.APP_CONFIG_NOT_FOUND
    }

    return withErrorHandling(async () => {
      const { api, error } = await getApiAndProvider(appConfig.rpcEndpoint ?? '')
      if (error || !api) {
        throw new Error(error ?? 'Failed to connect to the blockchain.')
      }

      const withdrawTx = await prepareWithdrawTransaction(api)

      // Prepare transaction payload
      const preparedTx = await prepareTransactionPayload(api, address, appConfig, withdrawTx)
      if (!preparedTx) {
        throw new Error('Failed to prepare transaction')
      }
      const { transfer, payload, metadataHash, nonce, proof1, payloadBytes } = preparedTx

      // Get chain ID from app config
      const chainId = appConfig.token.symbol.toLowerCase()

      // Sign transaction with Ledger
      const { signature } = await ledgerService.signTransaction(path, payloadBytes, chainId, proof1)
      if (!signature) {
        throw new Error('Failed to sign transaction')
      }

      // Create signed extrinsic
      createSignedExtrinsic(api, transfer, address, signature, payload, nonce, metadataHash)

      // Create and wait for transaction to be submitted
      await submitAndHandleTransaction(transfer, updateTxStatus, api)
    }, InternalErrors.UNKNOWN_ERROR)
  },

  async getWithdrawFee(appId: AppId, address: string): Promise<BN | undefined> {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig?.rpcEndpoint) {
      throw InternalErrors.APP_CONFIG_NOT_FOUND
    }

    return withErrorHandling(async () => {
      const { api, error } = await getApiAndProvider(appConfig.rpcEndpoint ?? '')
      if (error || !api) {
        throw new Error(error ?? 'Failed to connect to the blockchain.')
      }

      const withdrawTx = await prepareWithdrawTransaction(api)
      return await getTxFee(withdrawTx, address)
    }, InternalErrors.UNKNOWN_ERROR)
  },

  async removeIdentity(appId: AppId, address: string, path: string, updateTxStatus: UpdateTransactionStatus) {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig?.rpcEndpoint) {
      throw InternalErrors.APP_CONFIG_NOT_FOUND
    }

    return withErrorHandling(async () => {
      const { api, error } = await getApiAndProvider(appConfig.rpcEndpoint ?? '')
      if (error || !api) {
        throw new Error(error ?? 'Failed to connect to the blockchain.')
      }

      const removeIdentityTx = await prepareRemoveIdentityTransaction(api, address)

      if (!removeIdentityTx) {
        throw new Error('Failed to prepare transaction')
      }

      // Prepare transaction payload
      const preparedTx = await prepareTransactionPayload(api, address, appConfig, removeIdentityTx)
      if (!preparedTx) {
        throw new Error('Failed to prepare transaction')
      }
      const { transfer, payload, metadataHash, nonce, proof1, payloadBytes } = preparedTx

      // Get chain ID from app config
      const chainId = appConfig.token.symbol.toLowerCase()

      // Sign transaction with Ledger
      const { signature } = await ledgerService.signTransaction(path, payloadBytes, chainId, proof1)
      if (!signature) {
        throw new Error('Failed to sign transaction')
      }

      // Create signed extrinsic
      createSignedExtrinsic(api, transfer, address, signature, payload, nonce, metadataHash)

      // Create and wait for transaction to be submitted
      await submitAndHandleTransaction(transfer, updateTxStatus, api)
    }, InternalErrors.UNKNOWN_ERROR)
  },

  async getRemoveIdentityFee(appId: AppId, address: string): Promise<BN | undefined> {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig?.rpcEndpoint) {
      throw InternalErrors.APP_CONFIG_NOT_FOUND
    }

    return withErrorHandling(async () => {
      const { api, error } = await getApiAndProvider(appConfig.rpcEndpoint ?? '')
      if (error || !api) {
        throw new Error(error ?? 'Failed to connect to the blockchain.')
      }

      const removeIdentityTx = await prepareRemoveIdentityTransaction(api, address)
      if (!removeIdentityTx) {
        throw new Error('Failed to prepare transaction')
      }

      const estimatedFee = await getTxFee(removeIdentityTx, address)

      return estimatedFee
    }, InternalErrors.UNKNOWN_ERROR)
  },

  async getMigrationTxInfo(appId: AppId, account: Address, balanceIndex: number): Promise<PreTxInfo | undefined> {
    const validation = validateMigrationParams(appId, account, balanceIndex)
    if (!validation.isValid) {
      return undefined
    }

    const { balance, senderAddress, receiverAddress, appConfig } = validation

    return withErrorHandling(async () => {
      const { api, error } = await getApiAndProvider(appConfig.rpcEndpoint ?? '')
      if (error || !api) {
        throw new Error(error ?? 'Failed to connect to the blockchain.')
      }

      // Determine which type of balance we're dealing with
      const { nftsToTransfer, nativeAmount, transferableAmount } = getTransferableAndNfts(balance, account)

      // Prepare transaction with the specific asset type
      const preparedTx = await prepareTransaction(
        api,
        senderAddress,
        receiverAddress,
        transferableAmount,
        nftsToTransfer,
        appConfig,
        nativeAmount
      )
      if (!preparedTx) {
        throw new Error('Prepare transaction failed')
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
    }, InternalErrors.UNKNOWN_ERROR)
  },

  async approveMultisigCall(
    appId: AppId,
    account: Address | MultisigAddress,
    formBody: MultisigCallFormData,
    updateTxStatus: UpdateTransactionStatus
  ) {
    const validation = validateApproveMultisigCallParams(appId, account, formBody)

    if (!validation.isValid || !validation.multisigInfo) {
      return undefined
    }

    const { appConfig, multisigInfo, callHash, callData, signer, signerPath } = validation

    return withErrorHandling(async () => {
      const { api, error } = await getApiAndProvider(appConfig.rpcEndpoint ?? '')
      if (error || !api) {
        throw new Error(error ?? 'Failed to connect to the blockchain.')
      }

      const multiTx = await prepareAsMultiTx(
        signer,
        multisigInfo.address,
        callHash,
        callData,
        multisigInfo.members,
        multisigInfo.threshold,
        api
      )

      // Prepare transaction payload
      const preparedTx = await prepareTransactionPayload(api, signer, appConfig, multiTx)
      if (!preparedTx) {
        throw new Error('Failed to prepare transaction')
      }
      const { transfer, payload, metadataHash, nonce, proof1, payloadBytes } = preparedTx

      // Get chain ID from app config
      const chainId = appConfig.token.symbol.toLowerCase()

      // Sign transaction with Ledger
      const { signature } = await ledgerService.signTransaction(signerPath, payloadBytes, chainId, proof1)
      if (!signature) {
        throw new Error('Failed to sign transaction')
      }

      // Create signed extrinsic
      createSignedExtrinsic(api, transfer, signer, signature, payload, nonce, metadataHash)

      // Create and wait for transaction to be submitted
      await submitAndHandleTransaction(transfer, updateTxStatus, api)
    }, InternalErrors.UNKNOWN_ERROR)
  },

  async validateCallDataMatchesHash(appId: AppId, callData: string, expectedCallHash: string): Promise<boolean> {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig?.rpcEndpoint) {
      throw InternalErrors.APP_CONFIG_NOT_FOUND
    }

    return withErrorHandling(async () => {
      const { api, error } = await getApiAndProvider(appConfig.rpcEndpoint ?? '')
      if (error || !api) {
        throw new Error(error ?? 'Failed to connect to the blockchain.')
      }
      return validateCallDataMatchesHash(api, callData, expectedCallHash)
    }, InternalErrors.UNKNOWN_ERROR)
  },

  async removeProxies(appId: AppId, address: string, path: string, updateTxStatus: UpdateTransactionStatus) {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig?.rpcEndpoint) {
      throw InternalErrors.APP_CONFIG_NOT_FOUND
    }

    return withErrorHandling(async () => {
      const { api, error } = await getApiAndProvider(appConfig.rpcEndpoint ?? '')
      if (error || !api) {
        throw new Error(error ?? 'Failed to connect to the blockchain.')
      }

      const removeProxyTx = await prepareRemoveProxiesTransaction(api)

      if (!removeProxyTx) {
        throw new Error('Failed to prepare transaction')
      }

      // Prepare transaction payload
      const preparedTx = await prepareTransactionPayload(api, address, appConfig, removeProxyTx)
      if (!preparedTx) {
        throw new Error('Failed to prepare transaction')
      }
      const { transfer, payload, metadataHash, nonce, proof1, payloadBytes } = preparedTx

      // Get chain ID from app config
      const chainId = appConfig.token.symbol.toLowerCase()

      // Sign transaction with Ledger
      const { signature } = await ledgerService.signTransaction(path, payloadBytes, chainId, proof1)
      if (!signature) {
        throw new Error('Failed to sign transaction')
      }

      // Create signed extrinsic
      createSignedExtrinsic(api, transfer, address, signature, payload, nonce, metadataHash)

      // Create and wait for transaction to be submitted
      await submitAndHandleTransaction(transfer, updateTxStatus, api)
    }, InternalErrors.UNKNOWN_ERROR)
  },

  async getRemoveProxiesFee(appId: AppId, address: string): Promise<BN | undefined> {
    const appConfig = appsConfigs.get(appId)
    if (!appConfig?.rpcEndpoint) {
      throw InternalErrors.APP_CONFIG_NOT_FOUND
    }

    return withErrorHandling(async () => {
      const { api, error } = await getApiAndProvider(appConfig.rpcEndpoint ?? '')
      if (error || !api) {
        throw new Error(error ?? 'Failed to connect to the blockchain.')
      }

      const removeProxyTx = await prepareRemoveProxiesTransaction(api)
      if (!removeProxyTx) {
        throw new Error('Failed to prepare transaction')
      }

      const estimatedFee = await getTxFee(removeProxyTx, address)

      return estimatedFee
    }, InternalErrors.UNKNOWN_ERROR)
  },

  clearConnection() {
    ledgerService.clearConnection()
  },

  disconnect() {
    ledgerService.disconnect()
  },
}
