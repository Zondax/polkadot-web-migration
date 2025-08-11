import type { AppId } from '@/config/apps'
import { ledgerClient } from '@/state/client/ledger'
import type { MultisigCall, MultisigMember } from '@/state/types/ledger'

export const callDataValidationMessages = {
  correct: 'Call data matches the expected hash ✓',
  invalid: 'Call data does not match the expected hash ✗',
  validating: 'Validating...',
  failed: 'Failed to validate call data',
  isRequired: 'Call data is required',
  isInvalidFormat: 'Call data must be a valid hex string starting with 0x',
}

export interface CallDataValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Validates call data against a call hash
 * @param appId - The application ID
 * @param callDataValue - The call data to validate
 * @param callHashValue - The call hash to validate against
 * @returns Promise<CallDataValidationResult> - Validation result with status and error message
 */
export async function validateCallData(appId: AppId, callDataValue: string, callHashValue: string): Promise<CallDataValidationResult> {
  // Return early if missing required values
  if (!callDataValue || !callHashValue) {
    return { isValid: true } // Consider empty values as valid (no validation needed)
  }

  // Basic format validation first
  if (!callDataValue.startsWith('0x') || !/^0x[a-fA-F0-9]+$/.test(callDataValue)) {
    return {
      isValid: false,
      error: callDataValidationMessages.isInvalidFormat,
    }
  }

  try {
    // Validate call data against call hash
    const isValid = await ledgerClient.validateCallDataMatchesHash(appId, callDataValue, callHashValue)

    if (!isValid) {
      return {
        isValid: false,
        error: callDataValidationMessages.invalid,
      }
    }

    return { isValid: true }
  } catch (_error) {
    return {
      isValid: false,
      error: callDataValidationMessages.failed,
    }
  }
}

/**
 * Returns the list of internal multisig members who have not yet approved the given pending call.
 *
 * @param pendingCall - The multisig call for which to check approvals
 * @param members - The list of all multisig members (can be enhanced)
 * @returns Members who are internal and have not yet signed the call
 */
export const getRemainingInternalSigners = (pendingCall: MultisigCall, members: MultisigMember[]): MultisigMember[] => {
  const existingApprovals = pendingCall.signatories

  return members.filter(member => {
    // Check if already approved
    if (existingApprovals?.includes(member.address)) {
      return false
    }

    // If it's an enhanced member, check if it's a multisig with available signers
    const enhanced = member as EnhancedMultisigMember
    if (enhanced.isMultisig && (enhanced.multisigData?.availableSigners?.length ?? 0) > 0) {
      return true
    }

    // Otherwise, must be internal
    return member.internal
  })
}

/**
 * Returns the list of all multisig members who have not yet approved the given pending call.
 *
 * @param pendingCall - The multisig call for which to check approvals
 * @param members - The list of all multisig members
 * @returns MultisigMember[] - Members who have not yet signed the call
 */
export const getRemainingSigners = (pendingCall: MultisigCall, members: MultisigMember[]): MultisigMember[] => {
  const existingApprovals = pendingCall.signatories
  return members.filter(member => !existingApprovals?.includes(member.address))
}

/**
 * Enhanced multisig member with additional metadata
 */
export interface EnhancedMultisigMember extends MultisigMember {
  isMultisig: boolean
  multisigData?: {
    threshold: number
    availableSigners: MultisigMember[]
  }
}

/**
 * Returns the list of internal multisig members who have not yet approved the given pending call.
 *
 * @param pendingCall - The multisig call for which to check approvals
 * @param members - The list of all multisig members (can be enhanced)
 * @returns Members who are internal and have not yet signed the call
 */
export function getAvailableSigners<T extends MultisigMember>(pendingCall: MultisigCall, members: T[]): T[] {
  const existingApprovals = pendingCall.signatories

  return members.filter(member => {
    // Check if already approved
    if (existingApprovals?.includes(member.address)) {
      return false
    }

    // If it's an enhanced member, check if it's a multisig with available signers
    if ('isMultisig' in member) {
      const enhanced = member as EnhancedMultisigMember
      if (enhanced.isMultisig && enhanced.multisigData?.availableSigners && enhanced.multisigData.availableSigners.length > 0) {
        return true
      }
    }

    // Otherwise, must be internal
    return member.internal
  })
}
