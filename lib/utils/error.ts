import {
  type DisconnectedDevice,
  type DisconnectedDeviceDuringOperation,
  TransportError,
  type TransportOpenUserCancelled,
} from '@ledgerhq/errors'
import { ERROR_DESCRIPTION_OVERRIDE, type LedgerError, ResponseError } from '@zondax/ledger-js'
import { InternalErrorType, errorDetails, ledgerErrorToInternalErrorMap } from 'config/errors'

/**
 * Internal error class for application-specific errors
 *
 * @class
 * @extends {Error}
 * @description This class represents an internal error that can be thrown by the application.
 * It extends the standard Error class and provides a details property that contains
 * structured information about the error that can be used to display meaningful
 * error messages to the user.
 *
 * @example
 * ```ts
 * throw new InternalError(InternalErrorType.APP_NOT_OPEN, {
 *   title: 'Custom Error Title',
 *   message: 'A more detailed error message'
 * });
 * ```
 */
export class InternalError extends Error {
  errorType: InternalErrorType
  title: string // for display purposes.
  description?: string // for display purposes.
  operation?: string // operation that caused the error. Specified by the caller.
  context?: Record<string, unknown> // context of the error. Specified by the caller.

  constructor(
    errorType: InternalErrorType,
    details?: {
      operation?: string
      context?: Record<string, unknown>
    }
  ) {
    super(errorType)
    this.name = errorType
    this.errorType = errorType

    // Use provided details or fallback to errorDetails mapping
    const errorDetail = errorDetails[errorType]
    this.title = errorDetail.title
    this.description = errorDetail.description

    // Use provided details or fallback to empty strings
    this.operation = details?.operation
    this.context = details?.context
  }
}

/**
 * Interprets a \@zondax/ledger-js error and returns a detailed error object.
 *
 * @param error - The error to map.
 * @returns The detailed error object.
 */
export function interpretUnknownError(error: unknown, defaultError: InternalErrorType = InternalErrorType.UNKNOWN_ERROR): InternalError {
  // Handle other errors by converting to our format and add operation and context
  const errorName =
    error && typeof error === 'object' && 'name' in error && typeof (error as any).name === 'string'
      ? (error as any).name
      : typeof error === 'string'
        ? error
        : errorDetails[defaultError].title

  const errorMessage =
    error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string'
      ? (error as any).message
      : errorDetails[defaultError].description

  console.debug('[interpretUnknownError] error:', {
    originalError: error,
    errorName,
    errorMessage,
  })

  return new InternalError(defaultError)
}

/**
 * Interprets a \@zondax/ledger-js error and returns a detailed error object.
 *
 * @param error - The error to map.
 * @returns The detailed error object.
 */
export function interpretLedgerJsError(error: ResponseError): InternalError {
  const internalErrorType = ledgerErrorToInternalErrorMap[error.returnCode as LedgerError]
  return new InternalError(internalErrorType)
}

/**
 * Interprets a Ledger client error and returns a detailed error object.
 *
 * @param error - The error to map.
 * @param defaultError - The default error type to use if the specific error cannot be resolved.
 * @returns The detailed error object.
 */
export function interpretLedgerClientError(error: unknown): InternalError {
  // Handle our internal errors
  if (error instanceof InternalError) {
    return error
  }

  // Handle @zondax/ledger-js errors
  if (error instanceof ResponseError) {
    return interpretLedgerJsError(error)
  }

  return interpretUnknownError(error)
}

/**
 * Interprets an error and returns a detailed error object.
 *
 * @param error - The error to map.
 * @param defaultError - The default error type to use if the specific error cannot be resolved.
 * @returns The detailed error object.
 */
export function interpretError(error: unknown, defaultError: InternalErrorType): InternalError {
  // Handle our internal errors
  if (error instanceof InternalError) {
    return error
  }

  return interpretUnknownError(error)
}

/**
 * Options for the withErrorHandling function.
 */
type WithErrorHandlingOptions = {
  errorCode: InternalErrorType
  operation?: string
  context?: Record<string, unknown>
}

/**
 * Interprets an error and returns a detailed error object. Used to wrap functions in Ledger client.
 *
 * @param fn - The function to execute.
 * @param errorCode - The error code to use if the specific error cannot be resolved.
 * @param operation - The operation to use if the specific error cannot be resolved.
 * @param context - The context to use if the specific error cannot be resolved.
 * @param options - The options for the error handling.
 * @returns The detailed error object.
 */
export const withErrorHandling = async <T>(
  fn: () => Promise<T>,
  { errorCode, operation, context }: WithErrorHandlingOptions
): Promise<T> => {
  try {
    return await fn()
  } catch (error: unknown) {
    console.debug('[withErrorHandling] error:', JSON.stringify(error, null, 2))

    const internalError = interpretLedgerClientError(error)

    internalError.operation = internalError.operation || operation
    internalError.context = internalError.context || context

    console.debug('[withErrorHandling] Error Handled', {
      internalError,
    })

    throw internalError
  }
}
