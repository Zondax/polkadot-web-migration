import { type AppId, appsConfigs } from 'config/apps'
import { InternalErrors } from 'config/errors'

import { hasBalance, isMultisigAddress } from '@/lib/utils'

import type { MultisigInfo } from '@/lib/account'
import { AccountType, type Address, type AddressBalance, type MultisigAddress } from '../types/ledger'

// Interface for the return value of validateMigrationParams
export interface ValidateMigrationParamsResult {
  isValid: true
  balance: AddressBalance
  senderAddress: string
  senderPath: string
  receiverAddress: string
  appConfig: NonNullable<ReturnType<typeof appsConfigs.get>>
  multisigInfo?: MultisigInfo
  accountType: AccountType
}

// Helper function to validate multisig-specific parameters
export const validateMultisigParams = (account: MultisigAddress): { multisigInfo: MultisigInfo } => {
  const multisigMembers = account.members?.map(member => member.address)
  const multisigThreshold = account.threshold
  const multisigAddress = account.address

  if (!multisigMembers) {
    throw InternalErrors.NO_MULTISIG_MEMBERS
  }
  if (!multisigThreshold) {
    throw InternalErrors.NO_MULTISIG_THRESHOLD
  }
  if (!multisigAddress) {
    throw InternalErrors.NO_MULTISIG_ADDRESS
  }

  return {
    multisigInfo: {
      members: multisigMembers,
      threshold: multisigThreshold,
      address: multisigAddress,
    },
  }
}

// Helper function to validate migration parameters
export const validateMigrationParams = (
  appId: AppId,
  account: Address | MultisigAddress,
  balanceIndex: number
): ValidateMigrationParamsResult => {
  const isMultisig = isMultisigAddress(account)
  const balance = account.balances?.[balanceIndex]

  if (!balance) {
    console.warn(`Balance at index ${balanceIndex} not found for ${isMultisig ? 'multisig' : ''}account ${account.address} in app ${appId}`)
    throw InternalErrors.NO_BALANCE
  }

  const senderAddress = isMultisig ? balance.transaction?.signatoryAddress : account.address
  const senderPath = isMultisig ? account.members?.find(member => member.address === senderAddress)?.path : account.path
  const receiverAddress = balance.transaction?.destinationAddress
  const hasAvailableBalance = hasBalance([balance])
  const appConfig = appsConfigs.get(appId)
  let multisigInfo: MultisigInfo | undefined = undefined

  if (!appConfig || !appConfig.rpcEndpoint) {
    throw InternalErrors.APP_CONFIG_NOT_FOUND
  }
  if (!senderAddress || !senderPath) {
    throw InternalErrors.NO_SIGNATORY_ADDRESS
  }
  if (!receiverAddress) {
    throw InternalErrors.NO_RECEIVER_ADDRESS
  }
  if (!hasAvailableBalance) {
    throw InternalErrors.NO_TRANSFER_AMOUNT
  }

  if (isMultisig) {
    multisigInfo = validateMultisigParams(account as MultisigAddress).multisigInfo
  }

  return {
    isValid: true,
    balance,
    senderAddress,
    senderPath,
    receiverAddress,
    appConfig,
    multisigInfo,
    accountType: isMultisig ? AccountType.MULTISIG : AccountType.ACCOUNT,
  }
}

// Interface for the return value of validateMigrationParams
export interface ValidateApproveAsMultiResult {
  isValid: true
  appConfig: NonNullable<ReturnType<typeof appsConfigs.get>>
  multisigInfo: MultisigInfo
  callHash: string
  signer: string
  signerPath: string
}

// Basic validation for signApproveAsMultiTx
export const validateApproveAsMultiParams = (
  appId: AppId,
  account: MultisigAddress,
  callHash: string,
  signer: string
): ValidateApproveAsMultiResult => {
  const multisigValidation = validateMultisigParams(account)

  const appConfig = appsConfigs.get(appId)
  if (!appConfig || !appConfig.rpcEndpoint) {
    throw InternalErrors.APP_CONFIG_NOT_FOUND
  }

  const pendingCall = account.pendingMultisigCalls.find(call => call.callHash === callHash)
  // Validate that the callHash belongs to a pendingMultisigCall
  if (!pendingCall) {
    throw InternalErrors.NO_PENDING_MULTISIG_CALL
  }

  // Validate that the signer is internal (i.e., is a member of the multisig)
  const member = account.members?.find(member => member.address === signer)
  if (!member || !signer) {
    throw InternalErrors.NO_SIGNATORY_ADDRESS
  }

  const signerPath = member.path
  if (!signerPath) {
    throw InternalErrors.NO_SIGNATORY_ADDRESS
  }

  return {
    isValid: true,
    appConfig,
    multisigInfo: multisigValidation.multisigInfo,
    callHash,
    signer,
    signerPath,
  }
}

interface ValidateAsMultiParamsResult extends ValidateApproveAsMultiResult {
  callData: string
}
// Validation for signAsMultiTx (requires callData)
export const validateAsMultiParams = (
  appId: AppId,
  account: MultisigAddress,
  callHash: string,
  callData: string | undefined,
  signer: string
): ValidateAsMultiParamsResult => {
  // Use the same validation as validateApproveAsMultiParams
  const multisigValidation = validateApproveAsMultiParams(appId, account, callHash, signer)

  const appConfig = appsConfigs.get(appId)
  if (!appConfig || !appConfig.rpcEndpoint) {
    throw InternalErrors.APP_CONFIG_NOT_FOUND
  }

  // Additional validation: check if callData exists
  if (!callData) {
    throw InternalErrors.NO_CALL_DATA
  }

  return {
    isValid: true,
    appConfig,
    multisigInfo: multisigValidation.multisigInfo,
    callHash,
    callData,
    signer,
    signerPath: multisigValidation.signerPath,
  }
}
