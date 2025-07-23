/**
 * Central export for all test fixtures
 * Import from here to ensure consistent test data across the test suite
 */

// Address fixtures
export * from './addresses'
// Re-export commonly used test data for convenience
export { TEST_ADDRESSES } from './addresses'
export * from './addresses/full-addresses'
// API and network fixtures
export * from './api-responses'
// Balance fixtures
export * from './balances'
export { TEST_AMOUNTS } from './balances'
export * from './collections'
export { TEST_COLLECTIONS } from './collections'
// Component-specific fixtures
export * from './components/dialog.fixtures'
// NFT and Collection fixtures
export * from './nfts'
export { TEST_NFTS } from './nfts'
export * from './rpc'
export { TEST_RPC_ENDPOINTS } from './rpc'
// Transaction fixtures
export * from './transactions'
export { transactionErrors, transactionScenarios } from './transactions'
