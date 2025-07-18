import { LedgerError } from '@zondax/ledger-js'

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
  DEVICE_DISCONNECTED = 'device_disconnected',
  DEVICE_NOT_SELECTED = 'device_not_selected',
  DISCONNECTION_ERROR = 'disconnection_error',
  FAILED_TO_CONNECT_TO_BLOCKCHAIN = 'failed_to_connect_to_blockchain',
  FETCH_PROCESS_ACCOUNTS_ERROR = 'fetch_process_accounts_error',
  GET_ADDRESS_ERROR = 'get_address_error',
  GET_REMOVE_ACCOUNT_INDEX_FEE_ERROR = 'get_remove_account_index_fee_error',
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
  MULTISIG_TRANSFER_ERROR = 'multisig_transfer_error',
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
  REMOVE_ACCOUNT_INDEX_ERROR = 'remove_account_index_error',
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
    title: 'Multisig Approval Failed',
    description: 'Unable to approve the multisig transaction.',
    content:
      'This could be due to network issues or insufficient signatures. Please ensure you have the correct permissions and try again.',
  },
  balance_not_gotten: {
    title: 'Balance Not Retrieved',
    description: 'The balance could not be retrieved. Please try again later.',
  },
  blockchain_connection_error: {
    title: 'Blockchain Connection Error',
    description:
      'Unable to connect to the blockchain network. This could be due to network issues or the blockchain node being temporarily unavailable.',
    content: 'Please check your internet connection and try again later.',
  },
  ClaNotSupported: {
    title: 'Command Not Supported',
    description: 'The command is not supported by the device.',
    content: 'Please ensure you have the latest firmware and app installed on your device.',
  },
  connection_error: {
    title: 'Ledger Connection Issue',
    description: 'Unable to establish a connection with your Ledger device.',
    content:
      'Please ensure your Ledger is connected via USB, unlocked, and the Polkadot Migration app is open. You may need to close other applications using the Ledger.',
  },
  connection_refused: {
    title: 'Network Connection Refused',
    description: 'The blockchain network endpoint is currently unreachable.',
    content: 'This may be a temporary network issue. Please check your internet connection and try again in a few moments.',
  },
  connection_timeout: {
    title: 'Connection Timeout',
    description: 'The node is not responding.',
    content: 'Please try again later or contact support if the issue persists.',
  },
  default: {
    title: 'Unexpected Error',
    description: 'An unknown error occurred while processing your request.',
    content: 'Please try again in a few moments. If the problem persists, try refreshing the page or contact support.',
  },
  device_disconnected: {
    title: 'Device Disconnected',
    description: 'The Ledger device has been disconnected.',
  },
  device_not_selected: {
    title: 'No Device Selected',
    description: 'Please connect and select your Ledger device to continue.',
    content: 'Click "Connect Device" to select your Ledger and make sure it is connected via USB and unlocked.',
  },
  disconnection_error: {
    title: 'Disconnection Error',
    description: 'The Ledger device could not be disconnected. Please ensure the device is properly connected and try again.',
  },
  failed_to_connect_to_blockchain: {
    title: 'Network Connection Issue',
    description:
      'Unable to connect to the blockchain network. This could be due to network issues or the blockchain node being temporarily unavailable.',
    content:
      'Please check your internet connection and try again in a few moments. If the problem persists, the network may be experiencing high traffic.',
  },
  fetch_process_accounts_error: {
    title: 'Account Synchronization Failed',
    description: 'We encountered an issue while retrieving your account information from the blockchain.',
    content:
      'This might be temporary. Please check your Ledger connection and try synchronizing again. If this continues, the blockchain network may be busy.',
  },
  get_address_error: {
    title: 'Ledger Address Verification Failed',
    description: 'Could not retrieve the account address from your Ledger device.',
    content:
      'Please ensure your Ledger is connected, unlocked, and the Polkadot Migration app is open. You may need to confirm the operation on your device.',
  },
  get_remove_account_index_fee_error: {
    title: 'Account Index Fee Calculation Failed',
    description: 'Unable to calculate the fee for removing your account index.',
    content: 'This may be due to network issues. Try again in a moment, or skip this step if you do not have an account index to remove.',
  },
  get_remove_identity_fee_error: {
    title: 'Fee Calculation Failed',
    description: 'Unable to calculate the fee for removing your on-chain identity.',
    content: 'This may be a temporary network issue. Please try again in a moment, or skip this operation if not needed.',
  },
  get_remove_proxies_fee_error: {
    title: 'Proxy Removal Fee Calculation Failed',
    description: 'Unable to calculate the fee for removing your proxy accounts.',
    content: 'This may be temporary. Try again in a moment, or skip this step if you do not have proxy accounts to remove.',
  },
  get_unstake_fee_error: {
    title: 'Unstaking Fee Unavailable',
    description: 'Unable to calculate the fee for unstaking your funds.',
    content:
      'This may be due to network congestion. You can try again or proceed with the unstaking operation (fees will be calculated during the transaction).',
  },
  get_withdraw_fee_error: {
    title: 'Withdrawal Fee Calculation Failed',
    description: 'Unable to calculate the fee for withdrawing your staked funds.',
    content:
      'This may be due to network congestion. You can try again or proceed with the withdrawal (fees will be calculated during the transaction).',
  },
  insufficient_balance: {
    title: 'Insufficient Balance',
    description: "You don't have enough funds to cover the transaction fee.",
    content: 'Please ensure you have additional funds in your account to cover transaction fees, or reduce the transfer amount.',
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
    title: 'Ledger Device Error',
    description: 'An unexpected error occurred while communicating with your Ledger device.',
    content:
      'Please ensure your device is connected, unlocked, and the correct app is open. Try disconnecting and reconnecting your device.',
  },
  locked_device: {
    title: 'Device Locked',
    description: 'Your Ledger device needs to be unlocked to continue.',
    content: 'Please enter your PIN on your Ledger device to unlock it, then try again.',
  },
  migration_error: {
    title: 'Migration Failed',
    description: 'The asset migration could not be completed successfully.',
    content:
      'This could be due to network congestion, insufficient balance, or temporary blockchain issues. Please verify your balances and try the migration again.',
  },
  multisig_transfer_error: {
    title: 'Multisig Transfer Failed',
    description: 'The multisig transfer could not be initiated.',
    content:
      'This could be due to insufficient balance in the multisig account, network issues, or incorrect transaction parameters. Please verify the multisig account has sufficient balance and try again.',
  },
  migration_tx_info_error: {
    title: 'Migration Details Unavailable',
    description: 'Unable to retrieve information about your migration transaction.',
    content: 'This may be a temporary network issue. Please refresh the page or try again in a few moments.',
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
    title: 'Transaction Preparation Failed',
    description: 'Unable to prepare your transaction for submission.',
    content: 'This could be due to network issues or invalid transaction parameters. Please check your inputs and try again.',
  },
  remove_account_index_error: {
    title: 'Account Index Removal Failed',
    description: 'Unable to remove your account index from the blockchain.',
    content: 'This may be due to network issues or the account index may not exist. Verify the account index and try again.',
  },
  remove_identity_error: {
    title: 'Identity Removal Failed',
    description: 'Unable to remove your on-chain identity.',
    content: 'This may be due to network issues or you may not have an identity to remove. Check your account and try again.',
  },
  remove_proxy_error: {
    title: 'Proxy Removal Failed',
    description: 'Unable to remove your proxy account.',
    content: 'This may be due to network issues or the proxy account may not exist. Verify the proxy configuration and try again.',
  },
  sign_tx_error: {
    title: 'Transaction Signing Failed',
    description: 'Unable to sign the transaction with your Ledger device.',
    content:
      'Please ensure your Ledger is connected, unlocked, and the correct app is open. You may need to confirm the transaction on your device.',
  },
  signatory_already_signed: {
    title: 'Signatory Already Signed',
    description: 'The signatory has already signed the call.',
    content: 'Please ensure the signatory has not signed the call.',
  },
  sync_error: {
    title: 'Account Synchronization Failed',
    description: 'Unable to synchronize your account data with the blockchain.',
    content: 'This may be due to network issues or high blockchain traffic. Please check your connection and try again in a few moments.',
  },
  transaction_rejected: {
    title: 'Transaction Rejected',
    description: 'The transaction was rejected by the user.',
  },
  transport_error: {
    title: 'Device Communication Failed',
    description: 'Unable to establish communication with your Ledger device.',
    content: 'Please ensure your device is connected via USB, try a different USB port, or restart your browser and try again.',
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
    title: 'Unstaking Failed',
    description: 'Unable to unstake your funds from the network.',
    content: 'This may be due to network issues or bonding period requirements. Please verify your staking status and try again.',
  },
  validate_call_data_matches_hash_error: {
    title: 'Transaction Validation Failed',
    description: 'The transaction data could not be validated.',
    content: 'This may indicate a data integrity issue. Please refresh the page and try creating the transaction again.',
  },
  withdraw_error: {
    title: 'Withdrawal Failed',
    description: 'Unable to withdraw your staked funds.',
    content:
      'This may be due to network issues or your funds may still be in the unbonding period. Please check your staking status and try again.',
  },
}
