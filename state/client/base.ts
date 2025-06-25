import { InternalErrors, LedgerErrors } from 'config/errors'

export interface LedgerClientError {
  name: InternalErrors | LedgerErrors
  message: string
  operation?: string
  context?: Record<string, unknown>
  metadata?: any
}

function isKnownErrorName(name: unknown): name is InternalErrors | LedgerErrors {
  return (
    typeof name === 'string' &&
    (Object.values(InternalErrors).includes(name as InternalErrors) || Object.values(LedgerErrors).includes(name as LedgerErrors))
  )
}

type WithErrorHandlingOptions = {
  errorCode: InternalErrors | LedgerErrors
  operation: string
  context?: Record<string, unknown>
}

export const withErrorHandling = async <T>(
  fn: () => Promise<T>,
  { errorCode, operation, context }: WithErrorHandlingOptions
): Promise<T> => {
  try {
    return await fn()
  } catch (error: any) {
    const errorName =
      error && typeof error === 'object' && 'name' in error && typeof (error as any).name === 'string'
        ? (error as any).name
        : typeof error === 'string'
          ? error
          : errorCode

    const ledgerError: LedgerClientError = {
      name: isKnownErrorName(errorName) ? errorName : errorCode,
      message: error.message || 'An unexpected error occurred',
      operation,
      context,
    }

    console.debug('[LedgerClientError]', {
      error,
      code: errorCode,
      name: ledgerError.name,
      message: ledgerError.message,
      operation: ledgerError.operation,
      context: ledgerError.context,
    })

    throw ledgerError
  }
}
