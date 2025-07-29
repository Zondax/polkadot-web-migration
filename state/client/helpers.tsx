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
  isNestedMultisig: boolean
  nestedMultisigData?: {
    members: string[]
    threshold: number
  }
}

// Basic validation for signApproveAsMultiTx
export const validateApproveAsMultiParams = (
  appId: AppId,
  account: MultisigAddress,
  callHash: string,
  signer: string,
  nestedSigner?: string
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

  // Check if signer is itself a multisig (nested multisig scenario)
  const isNestedMultisig = nestedSigner !== undefined
  let signerPath: string
  let actualSigner: string
  let nestedMultisigData: { members: string[], threshold: number } | undefined

  if (isNestedMultisig && nestedSigner) {
    // Nested multisig: signer is a multisig address, nestedSigner is the actual signer
    const nestedMember = account.members?.find(member => member.address === signer)
    if (!nestedMember) {
      throw new InternalError(InternalErrorType.NO_SIGNATORY_ADDRESS)
    }

    // Find the nested multisig in the member's multisig addresses
    const nestedMultisigAddress = nestedMember.memberMultisigAddresses?.find(addr => addr === signer)
    if (!nestedMultisigAddress) {
      throw new InternalError(InternalErrorType.NO_MULTISIG_ADDRESS)
    }

    // Get the nested multisig details from somewhere (this is a limitation - we need the nested multisig data)
    // For now, we'll assume the nested multisig data is passed somehow
    // In a real implementation, this would need to be fetched from the chain or stored locally
    const nestedMembers = [nestedSigner] // This needs to be populated with actual members
    const nestedThreshold = 2 // This needs to be the actual threshold

    nestedMultisigData = {
      members: nestedMembers,
      threshold: nestedThreshold,
    }

    // The actual signer is the nested signer
    actualSigner = nestedSigner
    
    // We need to find the path for the actual signer
    // This is a limitation - we only have paths for direct members
    const actualMember = account.members?.find(member => member.address === nestedSigner)
    if (!actualMember || !actualMember.path) {
      throw new InternalError(InternalErrorType.NO_SIGNATORY_ADDRESS)
    }
    signerPath = actualMember.path
  } else {
    // Regular multisig
    const member = account.members?.find(member => member.address === signer)
    if (!member || !signer) {
      throw new InternalError(InternalErrorType.NO_SIGNATORY_ADDRESS)
    }

    if (!member.path) {
      throw new InternalError(InternalErrorType.NO_SIGNATORY_ADDRESS)
    }
    
    signerPath = member.path
    actualSigner = signer
  }

  return {
    isValid: true,
    appConfig,
    multisigInfo: multisigValidation.multisigInfo,
    callHash,
    signer: actualSigner,
    signerPath,
    isNestedMultisig,
    nestedMultisigData,
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
  signer: string,
  nestedSigner?: string
): ValidateAsMultiParamsResult => {
  // Use the same validation as validateApproveAsMultiParams
  const multisigValidation = validateApproveAsMultiParams(appId, account, callHash, signer, nestedSigner)

  const appConfig = appsConfigs.get(appId)
  if (!appConfig || !appConfig.rpcEndpoint) {
    throw new InternalError(InternalErrorType.APP_CONFIG_NOT_FOUND)
  }

  // Additional validation: check if callData exists
  if (!callData) {
    throw new InternalError(InternalErrorType.NO_CALL_DATA)
  }

  return {
    ...multisigValidation,
    callData,
  }
}
