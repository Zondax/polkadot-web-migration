import type { Address, MultisigAddress } from '@/state/types/ledger'
import { BalanceType } from '@/state/types/ledger'
import { NATIVE_BALANCE_VARIATIONS } from '../balances'
import { TEST_NFTS } from '../nfts'
import { TEST_ADDRESSES, TEST_PATHS, TEST_PUBKEYS } from './index'

/**
 * Complete Address objects for testing, including balances and metadata
 */

export const FULL_TEST_ADDRESSES = {
  // Address with free balance only
  ADDRESS_WITH_FREE_BALANCE: {
    path: TEST_PATHS.DEFAULT,
    pubKey: TEST_PUBKEYS[TEST_ADDRESSES.ALICE],
    address: TEST_ADDRESSES.ADDRESS1,
    balances: [
      {
        type: BalanceType.NATIVE,
        balance: NATIVE_BALANCE_VARIATIONS.FREE_ONLY,
      },
      {
        type: BalanceType.NFT,
        balance: [],
      },
      {
        type: BalanceType.UNIQUE,
        balance: [],
      },
    ],
    selected: false,
  } as Address,

  // Address with empty balance
  ADDRESS_WITH_EMPTY_BALANCE: {
    path: TEST_PATHS.SECOND_ACCOUNT,
    pubKey: '0x456',
    address: TEST_ADDRESSES.ADDRESS2,
    balances: [
      {
        type: BalanceType.NATIVE,
        balance: NATIVE_BALANCE_VARIATIONS.EMPTY,
      },
      {
        type: BalanceType.NFT,
        balance: [TEST_NFTS.NFT1],
      },
      {
        type: BalanceType.UNIQUE,
        balance: [],
      },
    ],
    selected: false,
  } as Address,

  // Address with NFTs
  ADDRESS_WITH_NFTS: {
    path: "m/44'/354'/0'/2'",
    pubKey: '0x789',
    address: TEST_ADDRESSES.ADDRESS3,
    balances: [
      {
        type: BalanceType.NATIVE,
        balance: NATIVE_BALANCE_VARIATIONS.EMPTY,
      },
      {
        type: BalanceType.NFT,
        balance: [],
      },
      {
        type: BalanceType.UNIQUE,
        balance: [TEST_NFTS.UNIQUE_NFT],
      },
    ],
    selected: false,
  } as Address,

  // Address with balance fetch error
  ADDRESS_WITH_ERROR: {
    path: "m/44'/354'/0'/3'",
    pubKey: '0xabc',
    address: TEST_ADDRESSES.ADDRESS4,
    error: {
      source: 'balance_fetch' as const,
      description: 'Failed to sync',
    },
    balances: undefined,
    selected: false,
  } as Address,

  // Address with migration error
  ADDRESS_WITH_MIGRATION_ERROR: {
    path: "m/44'/354'/0'/4'",
    pubKey: '0xdef',
    address: TEST_ADDRESSES.ADDRESS5,
    error: {
      source: 'migration' as const,
      description: 'Migration failed',
    },
    balances: undefined,
    selected: false,
  } as Address,

  // Address with migration error but has balance
  ADDRESS_WITH_MIGRATION_ERROR_AND_BALANCE: {
    path: "m/44'/354'/0'/4'",
    pubKey: '0xdef',
    address: TEST_ADDRESSES.ADDRESS5,
    error: {
      source: 'migration' as const,
      description: 'Migration failed',
    },
    balances: [
      {
        type: BalanceType.NATIVE,
        balance: NATIVE_BALANCE_VARIATIONS.FREE_ONLY,
      },
    ],
    selected: false,
  } as Address,

  // Address with no balance
  ADDRESS_NO_BALANCE: {
    path: "m/44'/354'/0'/5'",
    pubKey: '0xeee',
    address: TEST_ADDRESSES.ADDRESS6,
    balances: [
      {
        type: BalanceType.NATIVE,
        balance: NATIVE_BALANCE_VARIATIONS.EMPTY,
      },
      {
        type: BalanceType.NFT,
        balance: [],
      },
      {
        type: BalanceType.UNIQUE,
        balance: [],
      },
    ],
    selected: false,
  } as Address,

  // Address with partial balance
  ADDRESS_PARTIAL_BALANCE: {
    path: "m/44'/354'/0'/6'",
    pubKey: '0xfff',
    address: TEST_ADDRESSES.ADDRESS7,
    balances: [
      {
        type: BalanceType.NATIVE,
        balance: NATIVE_BALANCE_VARIATIONS.EMPTY,
      },
      {
        type: BalanceType.NFT,
        balance: [],
      },
      {
        type: BalanceType.UNIQUE,
        balance: [],
      },
    ],
    selected: false,
  } as Address,

  // Address with staking
  ADDRESS_WITH_STAKING: {
    path: TEST_PATHS.DEFAULT,
    pubKey: TEST_PUBKEYS[TEST_ADDRESSES.ALICE],
    address: TEST_ADDRESSES.KUSAMA_STAKING_WITH_BONDED,
    balances: [
      {
        type: BalanceType.NATIVE,
        balance: NATIVE_BALANCE_VARIATIONS.WITH_STAKING,
      },
    ],
    selected: false,
  } as Address,

  // Address with identity
  ADDRESS_WITH_IDENTITY: {
    path: TEST_PATHS.DEFAULT,
    pubKey: TEST_PUBKEYS[TEST_ADDRESSES.ALICE],
    address: TEST_ADDRESSES.ADDRESS_WITH_IDENTITY_AND_PARENT,
    registration: {
      deposit: NATIVE_BALANCE_VARIATIONS.FREE_ONLY.reserved.total,
      identity: {
        display: 'Alice',
        email: 'alice@example.com',
        twitter: '@alice',
      },
      subIdentities: undefined,
      canRemove: true,
    },
    balances: [
      {
        type: BalanceType.NATIVE,
        balance: NATIVE_BALANCE_VARIATIONS.FREE_ONLY,
      },
    ],
    selected: false,
  } as Address,

  // Address with proxy
  ADDRESS_WITH_PROXY: {
    path: TEST_PATHS.DEFAULT,
    pubKey: TEST_PUBKEYS[TEST_ADDRESSES.ALICE],
    address: TEST_ADDRESSES.ADDRESS1,
    proxy: {
      deposit: NATIVE_BALANCE_VARIATIONS.FREE_ONLY.reserved.total,
      proxies: [
        {
          address: TEST_ADDRESSES.ADDRESS2,
          type: 'Any',
          delay: 0,
        },
        {
          address: TEST_ADDRESSES.ADDRESS3,
          type: 'Staking',
          delay: 10,
        },
      ],
    },
    balances: [
      {
        type: BalanceType.NATIVE,
        balance: NATIVE_BALANCE_VARIATIONS.FREE_ONLY,
      },
    ],
    selected: false,
  } as Address,
} as const

/**
 * Test multisig addresses
 */
export const FULL_TEST_MULTISIG_ADDRESSES = {
  // Basic multisig address
  MULTISIG_ADDRESS_1: {
    path: TEST_PATHS.DEFAULT,
    pubKey: '0x123',
    address: TEST_ADDRESSES.ADDRESS2,
    members: [
      {
        address: TEST_ADDRESSES.ADDRESS1,
        internal: false,
      },
    ],
    threshold: 2,
    memberMultisigAddresses: undefined,
    pendingMultisigCalls: [],
    balances: [
      {
        type: BalanceType.NATIVE,
        balance: NATIVE_BALANCE_VARIATIONS.FREE_ONLY,
      },
    ],
    selected: false,
  } as MultisigAddress,

  // Multisig address with error
  MULTISIG_ADDRESS_WITH_ERROR: {
    path: "m/44'/354'/0'/1'",
    pubKey: '0x456',
    address: TEST_ADDRESSES.ADDRESS3,
    members: [
      {
        address: TEST_ADDRESSES.ADDRESS1,
        internal: true,
        path: TEST_PATHS.DEFAULT,
      },
      {
        address: TEST_ADDRESSES.ADDRESS2,
        internal: false,
      },
    ],
    threshold: 2,
    memberMultisigAddresses: undefined,
    pendingMultisigCalls: [],
    error: {
      source: 'balance_fetch' as const,
      description: 'Failed to sync multisig account',
    },
    balances: undefined,
    selected: false,
  } as MultisigAddress,

  // Multisig address with migration error
  MULTISIG_ADDRESS_WITH_MIGRATION_ERROR: {
    path: "m/44'/354'/0'/2'",
    pubKey: '0x789',
    address: TEST_ADDRESSES.ADDRESS4,
    members: [
      {
        address: TEST_ADDRESSES.ADDRESS1,
        internal: true,
        path: TEST_PATHS.DEFAULT,
      },
      {
        address: TEST_ADDRESSES.ADDRESS2,
        internal: false,
      },
      {
        address: TEST_ADDRESSES.ADDRESS3,
        internal: false,
      },
    ],
    threshold: 2,
    memberMultisigAddresses: undefined,
    pendingMultisigCalls: [],
    error: {
      source: 'migration' as const,
      description: 'Migration failed',
    },
    balances: undefined,
    selected: false,
  } as MultisigAddress,
} as const

/**
 * Address test scenarios
 */
export const addressTestScenarios = {
  // Single address
  singleAddress: {
    input: [FULL_TEST_ADDRESSES.ADDRESS_WITH_FREE_BALANCE],
    expected: {
      total: 1,
      withBalance: 1,
      withErrors: 0,
    },
  },

  // Multiple addresses with different states
  mixedAddresses: {
    input: [
      FULL_TEST_ADDRESSES.ADDRESS_WITH_FREE_BALANCE,
      FULL_TEST_ADDRESSES.ADDRESS_WITH_EMPTY_BALANCE,
      FULL_TEST_ADDRESSES.ADDRESS_WITH_ERROR,
    ],
    expected: {
      total: 3,
      withBalance: 2,
      withErrors: 1,
    },
  },

  // Addresses with different balance types
  differentBalanceTypes: {
    input: [FULL_TEST_ADDRESSES.ADDRESS_WITH_FREE_BALANCE, FULL_TEST_ADDRESSES.ADDRESS_WITH_NFTS, FULL_TEST_ADDRESSES.ADDRESS_WITH_STAKING],
    expected: {
      withNative: 3,
      withNfts: 1,
      withStaking: 1,
    },
  },

  // Error scenarios
  errorScenarios: {
    input: [
      FULL_TEST_ADDRESSES.ADDRESS_WITH_ERROR,
      FULL_TEST_ADDRESSES.ADDRESS_WITH_MIGRATION_ERROR,
      FULL_TEST_ADDRESSES.ADDRESS_WITH_MIGRATION_ERROR_AND_BALANCE,
    ],
    expected: {
      balanceFetchErrors: 1,
      migrationErrors: 2,
      errorsWithBalance: 1,
    },
  },
}

/**
 * Helper to create test address with custom properties
 */
export function createFullTestAddress(overrides: Partial<Address> = {}): Address {
  return {
    path: TEST_PATHS.DEFAULT,
    pubKey: TEST_PUBKEYS[TEST_ADDRESSES.ALICE],
    address: TEST_ADDRESSES.ALICE,
    balances: [
      {
        type: BalanceType.NATIVE,
        balance: NATIVE_BALANCE_VARIATIONS.FREE_ONLY,
      },
    ],
    selected: false,
    ...overrides,
  }
}

/**
 * Helper to create test multisig address
 */
export function createFullTestMultisigAddress(overrides: Partial<MultisigAddress> = {}): MultisigAddress {
  return {
    path: TEST_PATHS.DEFAULT,
    pubKey: '0x123',
    address: TEST_ADDRESSES.MULTISIG_ADDRESS,
    members: [
      {
        address: TEST_ADDRESSES.ADDRESS1,
        internal: false,
      },
    ],
    threshold: 2,
    memberMultisigAddresses: undefined,
    pendingMultisigCalls: [],
    balances: [
      {
        type: BalanceType.NATIVE,
        balance: NATIVE_BALANCE_VARIATIONS.FREE_ONLY,
      },
    ],
    selected: false,
    ...overrides,
  }
}
