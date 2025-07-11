/**
 * Central export for all test fixtures
 * Import from here to ensure consistent test data across the test suite
 */

// Address fixtures
export * from './addresses'
export * from './addresses/full-addresses'

// Balance fixtures
export * from './balances'

// NFT and Collection fixtures
export * from './nfts'
export * from './collections'

// API and network fixtures
export * from './api-responses'
export * from './rpc'

// Component-specific fixtures
export * from './components/dialog.fixtures'

// Transaction fixtures
export * from './transactions'

// Re-export commonly used test data for convenience
export { TEST_ADDRESSES } from './addresses'
export { TEST_AMOUNTS } from './balances'
export { TEST_NFTS } from './nfts'
export { TEST_COLLECTIONS } from './collections'
export { TEST_RPC_ENDPOINTS } from './rpc'
export { transactionScenarios, transactionErrors } from './transactions'
