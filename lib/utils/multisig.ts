import type { AppId } from '@/config/apps'
import { ledgerClient } from '@/state/client/ledger'

export const callDataValidationMessages = {
  correct: 'Call data matches the expected hash ✓',
  invalid: 'Call data does not match the expected hash ✗',
  validating: 'Validating...',
  failed: 'Failed to validate call data',
  isRequired: 'Call data is required',
  isFormatInvalid: 'Call data must be a valid hex string starting with 0x',
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
      error: callDataValidationMessages.isFormatInvalid,
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
  } catch (error) {
    return {
      isValid: false,
      error: callDataValidationMessages.failed,
    }
  }
}
