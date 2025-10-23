/**
 * Internal warnings
 *
 * This enum represents our own collection of application-specific warnings.
 * These warnings codes are used throughout the application to identify and handle
 * specific warning scenarios in a consistent way.
 */
export enum InternalWarningsType {
  TRANSFER_ALL_WITH_PENDING_ACTIONS = 'transfer_all_with_pending_actions',
  DEVELOPMENT_MODE_ACTIVE = 'development_mode_active',
  EXISTENTIAL_DEPOSIT_REQUIRED = 'existential_deposit_required',
  LEDGER_UNLOCK_REMINDER = 'ledger_unlock_reminder',
}

/**
 * Warning details
 *
 * This type defines the structure of warning details that can be used to display
 * warning messages to the user.
 */
export interface WarningDetails {
  title: string
  description?: string
  content?: string
}

/**
 * Maps internal warnings to warning details
 *
 * This type defines a mapping between internal warning codes and their corresponding
 * detailed warning information. Used to provide consistent warning messages throughout
 * the application.
 *
 * @typedef {Object} WarningDetailsMap
 */
export type WarningDetailsMap = {
  [key in InternalWarningsType]: WarningDetails
}

/**
 * Warning details mapping
 *
 * Contains the mapping of internal error codes to their human-readable details.
 * Used for displaying appropriate error messages to users when errors occur.
 *
 * @type {ErrorDetailsMap}
 */
export const warningDetails: WarningDetailsMap = {
  transfer_all_with_pending_actions: {
    title: "You're About to Transfer All Your Funds",
    description:
      "You're transferring all your available funds and you still have pending actions. You'll need some balance to pay the fees later. By migrating everything now, you might not have enough left to cover those fees.",
  },
  development_mode_active: {
    title: 'Development Mode Active',
    description: 'Partial transfer for testing',
  },
  existential_deposit_required: {
    title: 'Existential Deposit Required',
    description:
      'Substrate chains require a minimum balance for accounts to remain active. Ensure your destination account exists or transfer exceeds the minimum deposit.',
  },
  ledger_unlock_reminder: {
    title: 'Keep your Ledger device unlocked',
    description:
      'The synchronization process is still running. Please ensure your device stays active to complete the process successfully.',
  },
}
