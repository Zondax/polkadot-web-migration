import { InternalErrorType } from '@/config/errors'

/**
 * Error types that should stop synchronization process
 * These errors are critical enough that we should stop the synchronization process
 */
export const errorsToStopSync = [
  InternalErrorType.CONNECTION_ERROR,
  InternalErrorType.DISCONNECTION_ERROR,
  InternalErrorType.APP_NOT_OPEN,
  InternalErrorType.LOCKED_DEVICE,
  InternalErrorType.DEVICE_NOT_SELECTED,
  InternalErrorType.CONNECTION_TIMEOUT,
  InternalErrorType.CONNECTION_REFUSED,
  InternalErrorType.FAILED_TO_CONNECT_TO_BLOCKCHAIN,
  InternalErrorType.FETCH_PROCESS_ACCOUNTS_ERROR,
  InternalErrorType.SYNC_ERROR,
]

/**
 * Error types that should stop migration process
 * These errors indicate issues that prevent successful migration
 */
export const errorsToStopMigration = [
  InternalErrorType.CONNECTION_ERROR,
  InternalErrorType.DISCONNECTION_ERROR,
  InternalErrorType.APP_NOT_OPEN,
  InternalErrorType.LOCKED_DEVICE,
  InternalErrorType.DEVICE_NOT_SELECTED,
  InternalErrorType.NO_RECEIVER_ADDRESS,
  InternalErrorType.NO_TRANSFER_AMOUNT,
  InternalErrorType.MIGRATION_ERROR,
  InternalErrorType.MIGRATION_TX_INFO_ERROR,
  InternalErrorType.BLOCKCHAIN_CONNECTION_ERROR,
  InternalErrorType.SIGN_TX_ERROR,
  InternalErrorType.PREPARE_TX_ERROR,
]
