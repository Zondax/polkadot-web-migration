export interface ErrorDetails {
  title: string
  description?: string
  content?: string
}

export enum InternalErrors {
  ADDRESS_NOT_SELECTED = 'address_not_selected',
  APP_NOT_OPEN = 'app_not_open',
  UNKNOWN_ERROR = 'unknown_error',
  LOCKED_DEVICE = 'locked_device',
  DEVICE_NOT_SELECTED = 'device_not_selected',
  CONNECTION_ERROR = 'connection_error',
  DISCONNECTION_ERROR = 'disconnection_error',
  BALANCE_NOT_GOTTEN = 'balance_not_gotten',
  SYNC_ERROR = 'sync_error',
  DEFAULT = 'default',
  GET_ADDRESS_ERROR = 'get_address_error',
  NO_RECEIVER_ADDRESS = 'no_receiver_address',
  NO_TRANSFER_AMOUNT = 'no_transfer_amount',
  APP_CONFIG_NOT_FOUND = 'app_config_not_found',
  MIGRATION_ERROR = 'migration_error',
  BLOCKCHAIN_CONNECTION_ERROR = 'blockchain_connection_error',
  INSUFFICIENT_BALANCE = 'insufficient_balance',
  INSUFFICIENT_BALANCE_TO_COVER_FEE = 'insufficient_balance_to_cover_fee',
  UNSTAKE_ERROR = 'unstake_error',
  WITHDRAW_ERROR = 'withdraw_error',
  REMOVE_IDENTITY_ERROR = 'remove_identity_error',
  NO_MULTISIG_MEMBERS = 'no_multisig_members',
  NO_MULTISIG_THRESHOLD = 'no_multisig_threshold',
  NO_SIGNATORY_ADDRESS = 'no_signatory_address',
  NO_MULTISIG_ADDRESS = 'no_multisig_address',
  NO_PENDING_MULTISIG_CALL = 'no_pending_multisig_call',
  NO_CALL_DATA = 'no_call_data',
  SIGNATORY_ALREADY_SIGNED = 'signatory_already_signed',
  APPROVE_MULTISIG_CALL_ERROR = 'approve_multisig_call_error',
  REMOVE_PROXY_ERROR = 'remove_proxy_error',
}

export enum LedgerErrors {
  TransportStatusError = 'TransportStatusError',
  LockedDeviceError = 'LockedDeviceError',
  TransportOpenUserCancelled = 'TransportOpenUserCancelled',
  TransportRaceCondition = 'TransportRaceCondition',
  InvalidStateError = 'InvalidStateError',
  TransportInterfaceNotAvailable = 'TransportInterfaceNotAvailable',
  ClaNotSupported = 'ClaNotSupported',
  AppDoesNotSeemToBeOpen = 'AppDoesNotSeemToBeOpen',
}

export type ErrorDetailsMap = {
  [key in InternalErrors | LedgerErrors]: ErrorDetails
}

export const errorDetails: ErrorDetailsMap = {
  app_not_open: {
    title: 'App does not seem to be open.',
    description: 'Please open Polkadot Migration App in your device.',
  },
  AppDoesNotSeemToBeOpen: {
    title: 'App does not seem to be open.',
    description: 'Please open Polkadot Migration App in your device.',
  },
  unknown_error: {
    title: 'An unknown error happens, please try again.',
  },
  locked_device: {
    title: 'The device is locked.',
  },
  device_not_selected: {
    title: 'There is no a selected device.',
  },
  connection_error: {
    title: 'Connection Error',
    description: 'Could not reach Ledger device. Please ensure Ledger device is on and unlocked.',
  },
  disconnection_error: {
    title: 'Disconnection Error',
    description: 'The Ledger device could not be disconnected. Please ensure the device is properly connected and try again.',
  },
  address_not_selected: {
    title: 'Address not selected',
    description: 'Please select an address to continue.',
  },
  ClaNotSupported: {
    title: 'Wrong app.',
  },
  balance_not_gotten: {
    title: 'Balance Not Retrieved',
    description: 'The balance could not be retrieved. Please try again later.',
  },
  sync_error: {
    title: 'Synchronization Error',
    description: 'The accounts could not be synchronized. Please try again later.',
  },
  get_address_error: {
    title: 'Get Address Error',
    description: 'Failed to get account address from Ledger device.',
    content: 'Please ensure the device is connected and try again.',
  },
  no_receiver_address: {
    title: 'No Receiver Address',
    description: 'No Polkadot address to migrate to.',
  },
  no_transfer_amount: {
    title: 'No Transfer Amount',
    description: 'There is no amount to transfer.',
  },
  app_config_not_found: {
    title: 'App Configuration Not Found',
    description: 'The app configuration could not be found.',
  },
  migration_error: {
    title: 'Migration Error',
    description: 'Failed to migrate found of an account.',
    content: 'Please try again later or contact support if the issue persists.',
  },
  blockchain_connection_error: {
    title: 'Blockchain Connection Error',
    description: 'Failed to connect to the blockchain network.',
    content: 'Please check your internet connection and try again later.',
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
  default: {
    title: 'An unknown error happens, please try again.',
  },
  TransportStatusError: {
    title: 'Transport Status Error',
    description: 'An error occurred with the transport status.',
    content: 'Please check the device connection and try again.',
  },
  LockedDeviceError: {
    title: 'Locked Device Error',
    description: 'The device is locked and cannot be accessed.',
    content: 'Please unlock the device to proceed.',
  },
  TransportOpenUserCancelled: {
    title: 'Transport Open User Cancelled',
    description: 'The user cancelled the transport opening.',
    content: 'Select the device to connect.',
  },
  TransportRaceCondition: {
    title: 'Transport Race Condition',
    description: 'A race condition occurred in the transport.',
    content: 'Please deny from device or reconnect.',
  },
  InvalidStateError: {
    title: 'Invalid State Error',
    description: 'The device is in an invalid state.',
    content: 'Please deny from device or reconnect.',
  },
  TransportInterfaceNotAvailable: {
    title: 'Transport Interface Not Available',
    description: 'The transport interface is not available.',
    content: 'Please disconnect the device and try again.',
  },
  unstake_error: {
    title: 'Unstake Error',
    description: 'Failed to unstake balance.',
    content: 'Please try again later or contact support if the issue persists.',
  },
  withdraw_error: {
    title: 'Withdraw Error',
    description: 'Failed to withdraw balance.',
    content: 'Please try again later or contact support if the issue persists.',
  },
  remove_identity_error: {
    title: 'Remove Identity Error',
    description: 'Failed to remove identity.',
    content: 'Please try again later or contact support if the issue persists.',
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
  no_signatory_address: {
    title: 'No Signatory Address',
    description: 'No signatory address found.',
    content: 'Please ensure the multisig account has a signatory address.',
  },
  no_multisig_address: {
    title: 'No Multisig Address',
    description: 'No multisig address found.',
    content: 'Please ensure the multisig account has an address.',
  },
  no_pending_multisig_call: {
    title: 'No Pending Multisig Call',
    description: 'No pending multisig call found.',
    content: 'Please ensure the multisig account has a pending call.',
  },
  no_call_data: {
    title: 'No Call Data',
    description: 'No call data found.',
    content: 'Please ensure the multisig account has a call data.',
  },
  signatory_already_signed: {
    title: 'Signatory Already Signed',
    description: 'The signatory has already signed the call.',
    content: 'Please ensure the signatory has not signed the call.',
  },
  approve_multisig_call_error: {
    title: 'Approve Multisig Call Error',
    description: 'Failed to approve multisig call.',
    content: 'Please try again later or contact support if the issue persists.',
  },
  remove_proxy_error: {
    title: 'Remove Proxy Error',
    description: 'Failed to remove proxy.',
    content: 'Please try again later or contact support if the issue persists.',
  },
}
