import { type ErrorDetails, type InternalErrors, type LedgerErrors, errorDetails } from 'config/errors'
import type { LedgerClientError } from 'state/client/base'

const isLedgerClientError = (error: LedgerClientError | string): error is LedgerClientError => {
  return typeof error === 'object' && 'name' in error
}

/**
 * Handles a Ledger error by resolving it to a detailed error object.
 *
 * @param error - The error to handle.
 * @param defaultError - The default error to use if the specific error cannot be resolved.
 * @returns The detailed error object.
 */
export function mapLedgerError(error: LedgerClientError | string, defaultError: InternalErrors | LedgerErrors): ErrorDetails {
  let resolvedError: ErrorDetails | undefined

  console.log('error', error, defaultError)
  console.log('isLedgerClientError', isLedgerClientError(error))

  const errorDetail = errorDetails[isLedgerClientError(error) ? error.name : (error as keyof typeof errorDetails)]
  if (errorDetail) {
    resolvedError = errorDetail
  } else {
    resolvedError = errorDetails[defaultError] || errorDetails.default
  }

  console.log('resolvedError', resolvedError)

  return resolvedError
}
