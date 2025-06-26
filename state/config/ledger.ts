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

/**
 * Error types related to device connection issues
 * These errors indicate problems with the physical Ledger device connection
 */
export const deviceConnectionErrors = [
  InternalErrorType.CONNECTION_ERROR,
  InternalErrorType.DISCONNECTION_ERROR,
  InternalErrorType.CONNECTION_TIMEOUT,
  InternalErrorType.CONNECTION_REFUSED,
  InternalErrorType.DEVICE_NOT_SELECTED,
]

/**
 * Error types related to blockchain connection issues
 * These errors indicate problems connecting to the blockchain network
 */
export const blockchainConnectionErrors = [
  InternalErrorType.BLOCKCHAIN_CONNECTION_ERROR,
  InternalErrorType.FAILED_TO_CONNECT_TO_BLOCKCHAIN,
  InternalErrorType.CONNECTION_TIMEOUT,
  InternalErrorType.CONNECTION_REFUSED,
]

/**
 * Error types related to transaction signing
 * These errors occur during the transaction signing process
 */
export const transactionSigningErrors = [
  InternalErrorType.SIGN_TX_ERROR,
  InternalErrorType.PREPARE_TX_ERROR,
  // InternalErrorType.USER_REFUSED_ON_DEVICE,
]

/**
 * Error types related to balance issues
 * These errors indicate problems with account balances
 */
export const balanceErrors = [
  InternalErrorType.INSUFFICIENT_BALANCE,
  InternalErrorType.INSUFFICIENT_BALANCE_TO_COVER_FEE,
  InternalErrorType.NO_BALANCE,
  InternalErrorType.BALANCE_NOT_GOTTEN,
]
