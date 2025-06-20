import { InternalErrors, LedgerErrors } from 'config/errors'

export interface LedgerClientError {
  name: InternalErrors | LedgerErrors
  message: string
  operation?: string
  context?: Record<string, unknown>
  metadata?: any
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
    const ledgerError: LedgerClientError = {
      name: error.name in LedgerErrors || error.name in InternalErrors ? error.name : errorCode,
      message: error.message || 'An unexpected error occurred',
      operation,
      context,
    }

    console.debug('[LedgerClientError]', {
      name: ledgerError.name,
      message: ledgerError.message,
      operation: ledgerError.operation,
      context: ledgerError.context,
    })

    throw ledgerError
  }
}
