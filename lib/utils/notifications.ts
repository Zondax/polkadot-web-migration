import { InternalErrorType } from '@/config/errors'
import { notifications$ } from '@/state/notifications'
import { type InternalError, interpretError } from './error'

/**
 * Handles an internal error and shows a notification to the user if appropriate
 *
 * @param error - The internal error to handle
 * @param showNotification - Whether to show a notification (defaults to true)
 * @returns The error details from the error
 */
export function handleErrorNotification(internalError: InternalError): void {
  console.debug('[handleErrorNotification] sending notification/toast for error:', JSON.stringify(internalError, null, 2))

  // Only show notification if explicitly requested
  notifications$.push({
    title: internalError.title,
    description: internalError.description ?? '',
    type: 'error',
    autoHideDuration: 5000,
  })
}
