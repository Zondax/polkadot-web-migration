import { type AppId, appsConfigs } from 'config/apps'
import { InternalErrorType } from 'config/errors'
import type { MultisigInfo } from '@/lib/account'
import { hasBalance, InternalError, isMultisigAddress } from '@/lib/utils'
import { AccountType, type Address, type AddressBalance, type MultisigAddress } from '../types/ledger'

// Interface for the return value of validateMigrationParams
export interface ValidateMigrationParamsResult {
  balances: AddressBalance[]
  senderAddress: string
  senderPath: string
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
    throw new InternalError(InternalErrorType.NO_MULTISIG_MEMBERS)
  }
  if (!multisigThreshold) {
    throw new InternalError(InternalErrorType.NO_MULTISIG_THRESHOLD)
  }
  if (!multisigAddress) {
    throw new InternalError(InternalErrorType.NO_MULTISIG_ADDRESS)
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
export const validateMigrationParams = (appId: AppId, account: Address | MultisigAddress): ValidateMigrationParamsResult => {
  const isMultisig = isMultisigAddress(account)
  const balances = account.balances

  if (!balances || balances.length === 0) {
    console.warn(`Balance not found for ${isMultisig ? 'multisig' : ''}account ${account.address} in app ${appId}`)
    throw new InternalError(InternalErrorType.NO_BALANCE)
  }

  const senderAddress = isMultisig ? balances[0]?.transaction?.signatoryAddress : account.address
  const senderPath = isMultisig ? account.members?.find(member => member.address === senderAddress)?.path : account.path
  const hasReceiverAddresses = balances.every(balance => balance?.transaction?.destinationAddress)
  const hasAvailableBalance = balances.every(balance => balance && hasBalance([balance]))
  const appConfig = appsConfigs.get(appId)
  let multisigInfo: MultisigInfo | undefined

  if (!appConfig || !appConfig.rpcEndpoint) {
    throw new InternalError(InternalErrorType.APP_CONFIG_NOT_FOUND)
  }
  if (!senderAddress || !senderPath) {
    throw new InternalError(InternalErrorType.NO_SIGNATORY_ADDRESS)
  }
  if (!hasReceiverAddresses) {
    throw new InternalError(InternalErrorType.NO_RECEIVER_ADDRESS)
  }
  if (!hasAvailableBalance) {
    throw new InternalError(InternalErrorType.NO_BALANCE)
  }
  if (isMultisig) {
    multisigInfo = validateMultisigParams(account as MultisigAddress).multisigInfo
  }

  return {
    balances,
    senderAddress,
    senderPath,
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
    throw new InternalError(InternalErrorType.APP_CONFIG_NOT_FOUND)
  }

  const pendingCall = account.pendingMultisigCalls.find(call => call.callHash === callHash)
  // Validate that the callHash belongs to a pendingMultisigCall
  if (!pendingCall) {
    throw new InternalError(InternalErrorType.NO_PENDING_MULTISIG_CALL)
  }

  // Validate that the signer is internal (i.e., is a member of the multisig)
  const member = account.members?.find(member => member.address === signer)
  if (!member || !signer) {
    throw new InternalError(InternalErrorType.NO_SIGNATORY_ADDRESS)
  }

  const signerPath = member.path
  if (!signerPath) {
    throw new InternalError(InternalErrorType.NO_SIGNATORY_ADDRESS)
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
    throw new InternalError(InternalErrorType.APP_CONFIG_NOT_FOUND)
  }

  // Additional validation: check if callData exists
  if (!callData) {
    throw new InternalError(InternalErrorType.NO_CALL_DATA)
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
