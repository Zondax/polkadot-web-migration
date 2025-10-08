/**
 * State stores index
 *
 * This directory contains Legend State observables for application state management.
 * Stores are organized by domain/feature area and consistent with the app's
 * existing observable-based architecture.
 */

// Address cache store for Ledger public keys (Legend State observable)
export {
  type AddressCacheAdapter,
  addressCache,
  addressCache$,
  addressCacheActions,
  useAddressCache,
} from './addressCache'

// Future observable stores can be added here
// export { userPreferences$, useUserPreferences } from './userPreferences'
// export { transactionCache$, useTransactionCache } from './transactionCache'
