import { type AppId, appsConfigs } from 'config/apps'
import { InternalErrors } from 'config/errors'

import { hasBalance, isMultisigAddress } from '@/lib/utils'

import type { MultisigCallFormData } from '@/components/sections/migrate/dialogs/approve-multisig-call-dialog'
import type { MultisigInfo } from '@/lib/account'
import { AccountType, type Address, type AddressBalance, type MultisigAddress } from '../types/ledger'

// Interface for the return value of validateMigrationParams
export interface ValidateMigrationParamsResultValid {
  isValid: true
  balance: AddressBalance
  senderAddress: string
  senderPath: string
  receiverAddress: string
  appConfig: NonNullable<ReturnType<typeof appsConfigs.get>>
  multisigInfo?: MultisigInfo
  accountType: AccountType
}

export interface ValidateMigrationParamsResultInvalid {
  isValid: false
}

export type ValidateMigrationParamsResult = ValidateMigrationParamsResultValid | ValidateMigrationParamsResultInvalid

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
    return { isValid: false }
  }

  const senderAddress = isMultisig ? balance.transaction?.signatoryAddress : account.address
  const senderPath = isMultisig ? account.members?.find(member => member.address === senderAddress)?.path : account.path
  const receiverAddress = balance.transaction?.destinationAddress
  const hasAvailableBalance = hasBalance([balance])
  const appConfig = appsConfigs.get(appId)
  const multisigMembers = isMultisig ? account.members?.map(member => member.address) : undefined
  const multisigThreshold = isMultisig ? account.threshold : undefined
  const multisigAddress = isMultisig ? account.address : undefined
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
    if (!multisigMembers) {
      throw InternalErrors.NO_MULTISIG_MEMBERS
    }
    if (!multisigThreshold) {
      throw InternalErrors.NO_MULTISIG_THRESHOLD
    }
    if (!multisigAddress) {
      throw InternalErrors.NO_MULTISIG_ADDRESS
    }
    multisigInfo = {
      members: multisigMembers,
      threshold: multisigThreshold,
      address: multisigAddress,
    }
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
export interface ValidateApproveMultisigCallResultValid {
  isValid: true
  appConfig: NonNullable<ReturnType<typeof appsConfigs.get>>
  multisigInfo?: MultisigInfo
  callHash: string
  callData: string
  signer: string
  signerPath: string
}

export interface ValidateApproveMultisigCallResultInvalid {
  isValid: false
}

export type ValidateApproveMultisigCallResult = ValidateApproveMultisigCallResultValid | ValidateApproveMultisigCallResultInvalid

// Helper function to validate migration parameters
export const validateApproveMultisigCallParams = (
  appId: AppId,
  account: Address | MultisigAddress,
  formBody: MultisigCallFormData
): ValidateApproveMultisigCallResult => {
  const isMultisig = isMultisigAddress(account)
  if (!isMultisig) {
    return { isValid: false }
  }

  const callHash = formBody.callHash
  const callData = formBody.callData
  const signer = formBody.signer
  const signerPath = account.members?.find(member => member.address === signer)?.path
  const appConfig = appsConfigs.get(appId)
  const multisigMembers = isMultisig ? account.members?.map(member => member.address) : undefined
  const multisigThreshold = isMultisig ? account.threshold : undefined
  const multisigAddress = isMultisig ? account.address : undefined
  let multisigInfo: MultisigInfo | undefined = undefined

  if (!appConfig || !appConfig.rpcEndpoint) {
    throw InternalErrors.APP_CONFIG_NOT_FOUND
  }
  if (!multisigMembers) {
    throw InternalErrors.NO_MULTISIG_MEMBERS
  }
  if (!multisigThreshold) {
    throw InternalErrors.NO_MULTISIG_THRESHOLD
  }
  if (!multisigAddress) {
    throw InternalErrors.NO_MULTISIG_ADDRESS
  }
  if (!signerPath || !signer) {
    throw InternalErrors.NO_SIGNATORY_ADDRESS
  }

  multisigInfo = {
    members: multisigMembers,
    threshold: multisigThreshold,
    address: multisigAddress,
  }

  return {
    isValid: true,
    appConfig,
    multisigInfo,
    callHash,
    callData,
    signer,
    signerPath,
  }
}
