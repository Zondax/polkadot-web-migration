import { ERROR_DESCRIPTION_OVERRIDE, LedgerError, ResponseError } from '@zondax/ledger-js'

/**
 * Internal errors
 *
 * This enum represents our own collection of application-specific errors.
 * These error codes are used throughout the application to identify and handle
 * specific error scenarios in a consistent way.
 *
 * They are used with the withErrorHandling utility to provide structured error
 * handling and consistent error reporting across the application.
 *
 * @example
 * ```
 * withErrorHandling(() => ledgerService.connectDevice(onDisconnect), {
 *   errorCode: InternalErrorType.CONNECTION_ERROR,
 *   operation: 'connectDevice',
 * })
 * ```
 */
export enum InternalErrorType {
  ADDRESS_NOT_SELECTED = 'address_not_selected',
  APP_CONFIG_NOT_FOUND = 'app_config_not_found',
  APP_DOES_NOT_SEE_TO_BE_OPEN = 'AppDoesNotSeemToBeOpen',
  APP_NOT_OPEN = 'app_not_open',
  APPROVE_MULTISIG_CALL_ERROR = 'approve_multisig_call_error',
  BALANCE_NOT_GOTTEN = 'balance_not_gotten',
  BLOCKCHAIN_CONNECTION_ERROR = 'blockchain_connection_error',
  CLA_NOT_SUPPORTED = 'ClaNotSupported',
  CONNECTION_ERROR = 'connection_error',
  CONNECTION_REFUSED = 'connection_refused',
  CONNECTION_TIMEOUT = 'connection_timeout',
  DEFAULT = 'default',
  DEVICE_NOT_SELECTED = 'device_not_selected',
  DISCONNECTION_ERROR = 'disconnection_error',
  FAILED_TO_CONNECT_TO_BLOCKCHAIN = 'failed_to_connect_to_blockchain',
  FETCH_PROCESS_ACCOUNTS_ERROR = 'fetch_process_accounts_error',
  GET_ADDRESS_ERROR = 'get_address_error',
  GET_REMOVE_IDENTITY_FEE_ERROR = 'get_remove_identity_fee_error',
  GET_REMOVE_PROXIES_FEE_ERROR = 'get_remove_proxies_fee_error',
  GET_UNSTAKE_FEE_ERROR = 'get_unstake_fee_error',
  GET_WITHDRAW_FEE_ERROR = 'get_withdraw_fee_error',
  INSUFFICIENT_BALANCE = 'insufficient_balance',
  INSUFFICIENT_BALANCE_TO_COVER_FEE = 'insufficient_balance_to_cover_fee',
  INVALID_STATE_ERROR = 'InvalidStateError',
  LEDGER_UNKNOWN_ERROR = 'ledger_unknown_error',
  LOCKED_DEVICE = 'locked_device',
  MIGRATION_ERROR = 'migration_error',
  MIGRATION_TX_INFO_ERROR = 'migration_tx_info_error',
  NO_BALANCE = 'no_balance',
  NO_CALL_DATA = 'no_call_data',
  NO_MULTISIG_ADDRESS = 'no_multisig_address',
  NO_MULTISIG_MEMBERS = 'no_multisig_members',
  NO_MULTISIG_THRESHOLD = 'no_multisig_threshold',
  NO_PENDING_MULTISIG_CALL = 'no_pending_multisig_call',
  NO_RECEIVER_ADDRESS = 'no_receiver_address',
  NO_SIGNATORY_ADDRESS = 'no_signatory_address',
  NO_TRANSFER_AMOUNT = 'no_transfer_amount',
  PREPARE_TX_ERROR = 'prepare_tx_error',
  REMOVE_IDENTITY_ERROR = 'remove_identity_error',
  REMOVE_PROXY_ERROR = 'remove_proxy_error',
  SIGN_TX_ERROR = 'sign_tx_error',
  SIGNATORY_ALREADY_SIGNED = 'signatory_already_signed',
  SYNC_ERROR = 'sync_error',
  TRANSACTION_REJECTED = 'transaction_rejected',
  TRANSPORT_ERROR = 'transport_error',
  TRANSPORT_INTERFACE_NOT_AVAILABLE = 'TransportInterfaceNotAvailable',
  TRANSPORT_OPEN_USER_CANCELLED = 'TransportOpenUserCancelled',
  TRANSPORT_RACE_CONDITION = 'TransportRaceCondition',
  TRANSPORT_STATUS_ERROR = 'TransportStatusError',
  UNKNOWN_ERROR = 'unknown_error',
  UNSTAKE_ERROR = 'unstake_error',
  VALIDATE_CALL_DATA_MATCHES_HASH_ERROR = 'validate_call_data_matches_hash_error',
  WITHDRAW_ERROR = 'withdraw_error',
}

/**
 * Map Ledger errors to internal errors
 *
 * This mapping converts Ledger errors from the zondax/ledger-js library
 * to our application-specific internal error types.
 *
 * @remarks
 * When a Ledger device returns an error code, we use this mapping to translate
 * it to a more meaningful internal error that our application can handle consistently.
 * These error codes come from the Ledger Substrate library which imports the types from
 * the Ledger JS library. For reference, see:
 * @see {@link https://github.com/Zondax/ledger-js/blob/main/src/responseError.ts}
 * @see {@link https://github.com/Zondax/ledger-js/blob/main/src/consts.ts}
 */
export const ledgerErrorToInternalErrorMap: Record<LedgerError, InternalErrorType> = {
  [LedgerError.U2FUnknown]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.U2FBadRequest]: InternalErrorType.CONNECTION_ERROR,
  [LedgerError.U2FConfigurationUnsupported]: InternalErrorType.CONNECTION_ERROR,
  [LedgerError.U2FDeviceIneligible]: InternalErrorType.CONNECTION_ERROR,
  [LedgerError.U2FTimeout]: InternalErrorType.CONNECTION_TIMEOUT,
  [LedgerError.Timeout]: InternalErrorType.CONNECTION_TIMEOUT,
  [LedgerError.NoErrors]: InternalErrorType.DEFAULT,
  [LedgerError.DeviceIsBusy]: InternalErrorType.CONNECTION_ERROR,
  [LedgerError.ErrorDerivingKeys]: InternalErrorType.GET_ADDRESS_ERROR,
  [LedgerError.ExecutionError]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.WrongLength]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.EmptyBuffer]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.OutputBufferTooSmall]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.DataIsInvalid]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.TransactionRejected]: InternalErrorType.TRANSACTION_REJECTED,
  [LedgerError.BadKeyHandle]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.InvalidP1P2]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.InstructionNotSupported]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.AppDoesNotSeemToBeOpen]: InternalErrorType.APP_NOT_OPEN,
  [LedgerError.UnknownError]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.SignVerifyError]: InternalErrorType.SIGN_TX_ERROR,
  [LedgerError.UnknownTransportError]: InternalErrorType.CONNECTION_ERROR,
  [LedgerError.GpAuthFailed]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.PinRemainingAttempts]: InternalErrorType.LOCKED_DEVICE,
  [LedgerError.MissingCriticalParameter]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.ConditionsOfUseNotSatisfied]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.CommandIncompatibleFileStructure]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.ReferencedDataNotFound]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.NotEnoughMemorySpace]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.FileAlreadyExists]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.UnknownApdu]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.DeviceNotOnboarded]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.DeviceNotOnboarded2]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.CustomImageBootloader]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.CustomImageEmpty]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.ClaNotSupported]: InternalErrorType.APP_NOT_OPEN,
  [LedgerError.Licensing]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.Halted]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.AccessConditionNotFulfilled]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.AlgorithmNotSupported]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.CodeBlocked]: InternalErrorType.LOCKED_DEVICE,
  [LedgerError.CodeNotInitialized]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.ContradictionInvalidation]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.ContradictionSecretCodeStatus]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.InvalidKcv]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.InvalidOffset]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.LockedDevice]: InternalErrorType.LOCKED_DEVICE,
  [LedgerError.MaxValueReached]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.MemoryProblem]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.NoEfSelected]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.InconsistentFile]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.FileNotFound]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.UserRefusedOnDevice]: InternalErrorType.SIGN_TX_ERROR,
  [LedgerError.NotEnoughSpace]: InternalErrorType.UNKNOWN_ERROR,
  [LedgerError.GenericError]: InternalErrorType.UNKNOWN_ERROR,
}

/**
 * Error details
 *
 * This type defines the structure of error details that can be used to display
 * error messages to the user.
 */
export interface ErrorDetails {
  title: string
  description?: string
  content?: string
}

/**
 * Maps internal errors to error details
 *
 * This type defines a mapping between internal error codes and their corresponding
 * detailed error information. Used to provide consistent error messages throughout
 * the application.
 *
 * @typedef {Object} ErrorDetailsMap
 */
export type ErrorDetailsMap = {
  [key in InternalErrorType]: ErrorDetails
}

/**
 * Error details mapping
 *
 * Contains the mapping of internal error codes to their human-readable details.
 * Used for displaying appropriate error messages to users when errors occur.
 *
 * @type {ErrorDetailsMap}
 */
export const errorDetails: ErrorDetailsMap = {
  address_not_selected: {
    title: 'Address not selected',
    description: 'Please select an address to continue.',
  },
  app_config_not_found: {
    title: 'App Configuration Not Found',
    description: 'The app configuration could not be found.',
  },
  app_not_open: {
    title: 'App does not seem to be open.',
    description: 'Please open Polkadot Migration App in your device.',
  },
  AppDoesNotSeemToBeOpen: {
    title: 'App Not Open',
    description: 'The required app does not appear to be open on your device.',
    content: 'Please open the correct app on your Ledger device and try again.',
  },
  approve_multisig_call_error: {
    title: 'Approve Multisig Call Error',
    description: 'Failed to approve multisig call.',
    content: 'Please try again later or contact support if the issue persists.',
  },
  balance_not_gotten: {
    title: 'Balance Not Retrieved',
    description: 'The balance could not be retrieved. Please try again later.',
  },
  blockchain_connection_error: {
    title: 'Blockchain Connection Error',
    description: 'Failed to connect to the blockchain network.',
    content: 'Please check your internet connection and try again later.',
  },
  ClaNotSupported: {
    title: 'Command Not Supported',
    description: 'The command is not supported by the device.',
    content: 'Please ensure you have the latest firmware and app installed on your device.',
  },
  connection_error: {
    title: 'Connection Error',
    description: 'Could not reach Ledger device. Please ensure Ledger device is on and unlocked.',
  },
  connection_refused: {
    title: 'Connection Refused',
    description: 'The node endpoint is unreachable.',
    content: 'Please try again later or contact support if the issue persists.',
  },
  connection_timeout: {
    title: 'Connection Timeout',
    description: 'The node is not responding.',
    content: 'Please try again later or contact support if the issue persists.',
  },
  default: {
    title: 'An unknown error happens, please try again.',
  },
  device_not_selected: {
    title: 'There is no a selected device.',
  },
  disconnection_error: {
    title: 'Disconnection Error',
    description: 'The Ledger device could not be disconnected. Please ensure the device is properly connected and try again.',
  },
  failed_to_connect_to_blockchain: {
    title: 'Failed to Connect to Blockchain',
    description: 'Failed to connect to the blockchain network.',
    content: 'Please check your internet connection and try again later.',
  },
  fetch_process_accounts_error: {
    title: 'Error Fetching and Processing Accounts',
    description: 'An error occurred while fetching and processing accounts for the app.',
    content: 'Please try again later or contact support if the issue persists.',
  },
  get_address_error: {
    title: 'Get Address Error',
    description: 'Failed to get account address from Ledger device.',
    content: 'Please ensure the device is connected and try again.',
  },
  get_remove_identity_fee_error: {
    title: 'Get Remove Identity Fee Error',
    description: 'Failed to get remove identity fee.',
    content: 'Please try again later or contact support if the issue persists.',
  },
  get_remove_proxies_fee_error: {
    title: 'Get Remove Proxies Fee Error',
    description: 'Failed to get remove proxies fee.',
    content: 'Please try again later or contact support if the issue persists.',
  },
  get_unstake_fee_error: {
    title: 'Get Unstake Fee Error',
    description: 'Failed to get unstake fee.',
    content: 'Please try again later or contact support if the issue persists.',
  },
  get_withdraw_fee_error: {
    title: 'Get Withdraw Fee Error',
    description: 'Failed to get withdraw fee.',
    content: 'Please try again later or contact support if the issue persists.',
  },
  insufficient_balance: {
    title: 'Insufficient Balance',
    description: 'Insufficient balance to cover the transaction fee.',
    content: 'Please ensure you have enough funds to cover both the transfer amount and transaction fee.',
  },
  insufficient_balance_to_cover_fee: {
    title: 'Insufficient Balance to Cover Fee',
    description: 'Insufficient balance to cover the amount and the transaction fee.',
    content: 'Please ensure you have enough funds to cover the amount and the transaction fee.',
  },
  InvalidStateError: {
    title: 'Invalid State Error',
    description: 'The device is in an invalid state.',
    content: 'Please ensure your device is in a valid state and try again.',
  },
  ledger_unknown_error: {
    title: 'Ledger unknown error',
    description: 'An unknown error happens, please try again.',
  },
  locked_device: {
    title: 'The device is locked.',
  },
  migration_error: {
    title: 'Migration Error',
    description: 'Failed to migrate found of an account.',
    content: 'Please try again later or contact support if the issue persists.',
  },
  migration_tx_info_error: {
    title: 'Migration Transaction Info Error',
    description: 'Failed to get migration transaction info.',
    content: 'Please try again later or contact support if the issue persists.',
  },
  no_balance: {
    title: 'No Balance',
    description: 'No balance found.',
    content: 'Please ensure the account has a balance.',
  },
  no_call_data: {
    title: 'No Call Data',
    description: 'No call data found.',
    content: 'Please ensure the multisig account has a call data.',
  },
  no_multisig_address: {
    title: 'No Multisig Address',
    description: 'No multisig address found.',
    content: 'Please ensure the multisig account has an address.',
  },
  no_multisig_members: {
    title: 'No Multisig Members',
    description: 'No multisig members found.',
    content: 'Please ensure the multisig account has members.',
  },
  no_multisig_threshold: {
    title: 'No Multisig Threshold',
    description: 'No multisig threshold found.',
    content: 'Please ensure the multisig account has a threshold.',
  },
  no_pending_multisig_call: {
    title: 'No Pending Multisig Call',
    description: 'No pending multisig call found.',
    content: 'Please ensure the multisig account has a pending call.',
  },
  no_receiver_address: {
    title: 'No Receiver Address',
    description: 'No Polkadot address to migrate to.',
  },
  no_signatory_address: {
    title: 'No Signatory Address',
    description: 'No signatory address found.',
    content: 'Please ensure the multisig account has a signatory address.',
  },
  no_transfer_amount: {
    title: 'No Transfer Amount',
    description: 'There is no amount to transfer.',
  },
  prepare_tx_error: {
    title: 'Prepare Transaction Error',
    description: 'Failed to prepare transaction.',
    content: 'Please try again later or contact support if the issue persists.',
  },
  remove_identity_error: {
    title: 'Remove Identity Error',
    description: 'Failed to remove identity.',
    content: 'Please try again later or contact support if the issue persists.',
  },
  remove_proxy_error: {
    title: 'Remove Proxy Error',
    description: 'Failed to remove proxy.',
    content: 'Please try again later or contact support if the issue persists.',
  },
  sign_tx_error: {
    title: 'Sign Transaction Error',
    description: 'Failed to sign transaction.',
    content: 'Please try again later or contact support if the issue persists.',
  },
  signatory_already_signed: {
    title: 'Signatory Already Signed',
    description: 'The signatory has already signed the call.',
    content: 'Please ensure the signatory has not signed the call.',
  },
  sync_error: {
    title: 'Synchronization Error',
    description: 'The accounts could not be synchronized. Please try again later.',
  },
  transaction_rejected: {
    title: 'Transaction Rejected',
    description: 'The transaction was rejected by the user.',
  },
  transport_error: {
    title: 'Transport Error',
    description: 'Failed to initialize transport.',
    content: 'Please try again later or contact support if the issue persists.',
  },
  TransportInterfaceNotAvailable: {
    title: 'Transport Interface Not Available',
    description: 'The required transport interface is not available.',
    content: 'Please ensure your browser supports WebHID or WebUSB and try again.',
  },
  TransportOpenUserCancelled: {
    title: 'Connection Cancelled',
    description: 'You cancelled the connection request or closed the browser prompt.',
    content: 'Please try connecting your device again by clicking "Connect" and selecting your device in the popup window.',
  },
  TransportRaceCondition: {
    title: 'Transport Race Condition',
    description: 'A race condition occurred during device communication.',
    content: 'Please disconnect your device, wait a moment, and try again.',
  },
  TransportStatusError: {
    title: 'Transport Status Error',
    description: 'The device is in an invalid state.',
    content: 'Please ensure your device is in a valid state and try again.',
  },
  unknown_error: {
    title: 'Unknown Error',
    description: 'An unexpected error occurred',
  },
  unstake_error: {
    title: 'Unstake Error',
    description: 'Failed to unstake balance.',
    content: 'Please try again later or contact support if the issue persists.',
  },
  validate_call_data_matches_hash_error: {
    title: 'Validate Call Data Matches Hash Error',
    description: 'Failed to validate call data matches hash.',
    content: 'Please try again later or contact support if the issue persists.',
  },
  withdraw_error: {
    title: 'Withdraw Error',
    description: 'Failed to withdraw balance.',
    content: 'Please try again later or contact support if the issue persists.',
  },
}
