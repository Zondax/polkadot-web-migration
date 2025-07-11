/**
 * Test constants for integration tests
 * Centralizing test IDs and mock data for better maintainability
 */

// Test IDs
export const TEST_IDS = {
  // Connect page
  CONNECT_LEDGER_BUTTON: 'connect-ledger-button',
  CONNECT_STEP_1_ICON: 'connect-step-1-icon',
  CONNECT_STEP_2_ICON: 'connect-step-2-icon',
  CONNECT_STEP_3_ICON: 'connect-step-3-icon',
  CONNECT_STEP_4_ICON: 'connect-step-4-icon',

  // Tabs
  TAB_CONNECT_DEVICE: 'tab-connect-device',
  TAB_SYNCHRONIZE_ACCOUNTS: 'tab-synchronize-accounts',
  TAB_MIGRATE: 'tab-migrate',

  // Synchronize page
  APP_SYNC_GRID: 'app-sync-grid',
  APP_SYNC_GRID_ITEM: 'app-sync-grid-item',
  APP_SYNC_PROGRESS_BAR: 'app-sync-progress-bar',
  SYNCHRONIZED_APP: 'synchronized-app',
  RETRY_SYNCHRONIZE_BUTTON: 'retry-synchronize-button',
  MIGRATE_BUTTON: 'migrate-button',

  // Migrate page
  MIGRATE_VERIFY_ADDRESSES_BUTTON: 'migrate-verify-addresses-button',
  MIGRATE_ACCOUNTS_TABLE: 'migrate-accounts-table',
  MIGRATE_ACCOUNTS_TABLE_ROW: 'migrate-accounts-table-row',
}

// Mock addresses
export const MOCK_ADDRESSES = {
  KUSAMA: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
  ACALA: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
  POLKADOT: '15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5',
}

// Mock paths
export const MOCK_PATHS = {
  KUSAMA: "m/44'/434'/0'/0'/0'",
  ACALA: "m/44'/787'/0'/0'/0'",
  POLKADOT: "m/44'/354'/0'/0'/0'",
}

// Text constants
export const TEXT = {
  CONNECT_PAGE: {
    HEADING: 'Connect Your Device',
    STEPS: ['Connect your Ledger device', 'Enter your PIN code', 'Open the Migration App', 'Click Connect'],
  },
  SYNCHRONIZE_PAGE: {
    HEADING: 'Synchronized Accounts',
    SYNCHRONIZING: 'Synchronizing apps',
  },
  TABS: {
    CONNECT: 'Connect Device',
    SYNCHRONIZE: 'Synchronize Accounts',
    MIGRATE: 'Migrate',
  },
}
