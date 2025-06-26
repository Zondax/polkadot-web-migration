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
  title?: string // for display purposes.
  description?: string // for display purposes.
  operation?: string // operation that caused the error. Specified by the caller.
  context?: Record<string, unknown> // context of the error. Specified by the caller.

  constructor(
    errorType: InternalErrorType,
    details?: {
      title?: string
      description?: string
      operation?: string
      context?: Record<string, unknown>
    }
  ) {
    super(errorType)
    this.name = errorType
    this.errorType = errorType

    // Use provided details or fallback to errorDetails mapping
    const errorDetail = errorDetails[errorType] || {}
    this.title = details?.title || errorDetail.title
    this.description = details?.description || errorDetail.description

    // Use provided details or fallback to empty strings
    this.operation = details?.operation
    this.context = details?.context
  }
}

// export interface LedgerClientError {
//   name: InternalErrorType
//   message: string
//   operation?: string
//   context?: Record<string, unknown>
//   metadata?: any
// }

// function isKnownErrorName(name: unknown): name is InternalErrorType {
//   return typeof name === 'string' && Object.values(InternalErrorType).includes(name as InternalErrorType)
// }

function isKnownErrorName(name: unknown): name is InternalErrorType {
  if (typeof name !== 'string') return false

  const isInternalErrorType = Object.values(InternalErrorType).includes(name as InternalErrorType)
  const isLedgerError = Object.values(ERROR_DESCRIPTION_OVERRIDE).includes(name)
  return isInternalErrorType || isLedgerError
}

function decodeErrorName(name: unknown): InternalErrorType | undefined {
  if (typeof name !== 'string') return undefined

  const isInternalErrorType = Object.values(InternalErrorType).includes(name as InternalErrorType)
  const isLedgerError = Object.values(ERROR_DESCRIPTION_OVERRIDE).includes(name)

  if (isInternalErrorType) return name as InternalErrorType
  if (isLedgerError) {
    const ledgerErrorKey = getKeyByValue(ERROR_DESCRIPTION_OVERRIDE, name) // get the key (LedgerError) corresponding to the message
    if (ledgerErrorKey) {
      return ledgerErrorToInternalErrorMap[ledgerErrorKey as LedgerError]
    }
  }

  return InternalErrorType.UNKNOWN_ERROR
}

/**
 * Interprets an error and returns a detailed error object.
 *
 * @param error - The error to map.
 * @param defaultError - The default error type to use if the specific error cannot be resolved.
 * @returns The detailed error object.
 */
export function interpretError(
  error: unknown,
  errorCode: InternalErrorType,
  operation?: string,
  context?: Record<string, unknown>
): InternalError {
  // Handle Ledger specific errors
  if (error instanceof ResponseError) {
    console.debug('[interpretError] is ResponseError')
    const internalErrorType = ledgerErrorToInternalErrorMap[error.returnCode as LedgerError]
    return new InternalError(internalErrorType, {
      operation,
      context,
    })
  }

  // Handle our internal errors and add operation and context
  if (error instanceof InternalError) {
    console.debug('[interpretError] is InternalError')
    error.operation = error.operation || operation
    error.context = error.context || context
    return error
  }

  console.debug('[interpretError] is other error')

  // Handle other errors by converting to our format and add operation and context
  const errorName =
    error && typeof error === 'object' && 'name' in error && typeof (error as any).name === 'string'
      ? (error as any).name
      : typeof error === 'string'
        ? error
        : errorCode

  const errorMessage =
    error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string'
      ? (error as any).message
      : 'An unexpected error occurred'

  return new InternalError(isKnownErrorName(errorName) ? errorName : errorCode, {
    title: errorMessage,
    operation,
    context,
  })
}

type WithErrorHandlingOptions = {
  errorCode: InternalErrorType
  operation?: string
  context?: Record<string, unknown>
}

export const withErrorHandling = async <T>(
  fn: () => Promise<T>,
  { errorCode, operation, context }: WithErrorHandlingOptions
): Promise<T> => {
  try {
    return await fn()
  } catch (error: unknown) {
    console.debug('[withErrorHandling] error:', JSON.stringify(error, null, 2))

    const internalError = interpretError(error, errorCode, operation, context)

    console.debug('[withErrorHandling] interpreted internalError:', JSON.stringify(internalError, null, 2))

    console.debug('[withErrorHandling] Error Handled', {
      originalError: error,
      internalError,
    })

    throw internalError
  }
}
