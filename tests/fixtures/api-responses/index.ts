import { BN } from '@polkadot/util'
import { vi } from 'vitest'
import { TEST_ADDRESSES } from '../addresses'
import { TEST_AMOUNTS } from '../balances'

/**
 * Mock API responses for testing blockchain interactions
 */

/**
 * Mock Polkadot API instance
 */
export const mockApi = {
  query: {
    system: {
      account: vi.fn(),
    },
    balances: {
      account: vi.fn(),
      locks: vi.fn(),
    },
    staking: {
      bonded: vi.fn(),
      ledger: vi.fn(),
      payee: vi.fn(),
      validators: vi.fn(),
      nominators: vi.fn(),
    },
    identity: {
      identityOf: vi.fn(),
      subsOf: vi.fn(),
    },
    proxy: {
      proxies: vi.fn(),
    },
    multisig: {
      multisigs: vi.fn(),
    },
    uniques: {
      account: vi.fn(),
      class: vi.fn(),
      asset: vi.fn(),
    },
    nfts: {
      account: vi.fn(),
      collection: vi.fn(),
      item: vi.fn(),
    },
  },
  tx: {
    balances: {
      transferKeepAlive: vi.fn(),
      transferAllowDeath: vi.fn(),
    },
    staking: {
      bond: vi.fn(),
      unbond: vi.fn(),
      withdrawUnbonded: vi.fn(),
      nominate: vi.fn(),
      chill: vi.fn(),
    },
    identity: {
      setIdentity: vi.fn(),
      clearIdentity: vi.fn(),
    },
    proxy: {
      addProxy: vi.fn(),
      removeProxy: vi.fn(),
      removeProxies: vi.fn(),
    },
    multisig: {
      asMulti: vi.fn(),
      approveAsMulti: vi.fn(),
      cancelAsMulti: vi.fn(),
    },
    utility: {
      batch: vi.fn(),
      batchAll: vi.fn(),
    },
  },
  rpc: {
    chain: {
      getBlock: vi.fn(),
      getBlockHash: vi.fn(),
      getFinalizedHead: vi.fn(),
    },
    state: {
      getStorage: vi.fn(),
      getKeys: vi.fn(),
    },
    system: {
      chain: vi.fn(),
      name: vi.fn(),
      version: vi.fn(),
    },
  },
  consts: {
    balances: {
      existentialDeposit: new BN('10000000000'), // 1 DOT
    },
    staking: {
      bondingDuration: new BN(28), // 28 eras
      sessionsPerEra: new BN(6),
      maxNominatorRewardedPerValidator: new BN(512),
    },
    system: {
      blockWeights: {
        maxBlock: new BN('2000000000000'),
      },
    },
  },
  createType: vi.fn(),
  registry: {
    createType: vi.fn(),
    getOrThrow: vi.fn(),
  },
  isConnected: true,
  disconnect: vi.fn(),
}

/**
 * Mock transaction method responses
 */
export const mockMethod = {
  method: 'transferKeepAlive',
  section: 'balances',
  args: [TEST_ADDRESSES.ADDRESS1, TEST_AMOUNTS.TEN_DOT],
  meta: {
    docs: ['Transfer some liquid free balance to another account'],
  },
  paymentInfo: vi.fn().mockResolvedValue({
    partialFee: TEST_AMOUNTS.TRANSFER_FEE,
    weight: new BN('200000000'),
  }),
  signAndSend: vi.fn(),
  toHuman: vi.fn().mockReturnValue({
    method: 'transferKeepAlive',
    args: {
      dest: TEST_ADDRESSES.ADDRESS1,
      value: '10,000,000,000',
    },
  }),
}

/**
 * Mock account query responses
 */
export const mockAccountResponses = {
  // Account with free balance
  withBalance: {
    data: {
      free: TEST_AMOUNTS.HUNDRED_DOT,
      reserved: TEST_AMOUNTS.ZERO,
      frozen: TEST_AMOUNTS.ZERO,
      flags: TEST_AMOUNTS.ZERO,
    },
    nonce: new BN(5),
    consumers: new BN(0),
    providers: new BN(1),
    sufficients: new BN(0),
  },

  // Empty account
  empty: {
    data: {
      free: TEST_AMOUNTS.ZERO,
      reserved: TEST_AMOUNTS.ZERO,
      frozen: TEST_AMOUNTS.ZERO,
      flags: TEST_AMOUNTS.ZERO,
    },
    nonce: TEST_AMOUNTS.ZERO,
    consumers: TEST_AMOUNTS.ZERO,
    providers: TEST_AMOUNTS.ZERO,
    sufficients: TEST_AMOUNTS.ZERO,
  },

  // Account with reserved balance
  withReserved: {
    data: {
      free: TEST_AMOUNTS.TEN_DOT,
      reserved: TEST_AMOUNTS.HUNDRED_DOT,
      frozen: TEST_AMOUNTS.ZERO,
      flags: TEST_AMOUNTS.ZERO,
    },
    nonce: new BN(3),
    consumers: new BN(1),
    providers: new BN(1),
    sufficients: new BN(0),
  },
}

/**
 * Mock staking query responses
 */
export const mockStakingResponses = {
  // Bonded controller response
  bonded: {
    isSome: true,
    unwrap: () => TEST_ADDRESSES.ADDRESS1,
  },

  // Staking ledger response
  ledger: {
    isSome: true,
    unwrap: () => ({
      stash: TEST_ADDRESSES.ADDRESS1,
      total: TEST_AMOUNTS.THOUSAND_DOT,
      active: TEST_AMOUNTS.HUNDRED_DOT.muln(8),
      unlocking: [
        {
          value: TEST_AMOUNTS.HUNDRED_DOT,
          era: new BN(2400),
        },
        {
          value: TEST_AMOUNTS.HUNDRED_DOT,
          era: new BN(2500),
        },
      ],
      claimedRewards: [new BN(2300), new BN(2350)],
    }),
  },

  // No staking data
  notStaking: {
    isSome: false,
    isNone: true,
  },
}

/**
 * Mock identity query responses
 */
export const mockIdentityResponses = {
  // Account with identity
  withIdentity: {
    isSome: true,
    unwrap: () => ({
      info: {
        display: { Raw: 'Alice' },
        email: { Raw: 'alice@example.com' },
        twitter: { Raw: '@alice' },
      },
      deposit: TEST_AMOUNTS.TEN_DOT,
    }),
  },

  // Account without identity
  noIdentity: {
    isSome: false,
    isNone: true,
  },
}

/**
 * Mock proxy query responses
 */
export const mockProxyResponses = {
  // Account with proxies
  withProxies: [
    [
      {
        delegate: TEST_ADDRESSES.ADDRESS2,
        proxyType: 'Any',
        delay: new BN(0),
      },
      {
        delegate: TEST_ADDRESSES.ADDRESS3,
        proxyType: 'Staking',
        delay: new BN(10),
      },
    ],
    TEST_AMOUNTS.TEN_DOT, // deposit
  ],

  // Account without proxies
  noProxies: [[], TEST_AMOUNTS.ZERO],
}

/**
 * Mock NFT/Collection responses
 */
export const mockNftResponses = {
  // Account owns NFTs
  withNfts: [
    {
      collectionId: 1,
      itemId: 101,
    },
    {
      collectionId: 1,
      itemId: 102,
    },
    {
      collectionId: 2,
      itemId: 201,
    },
  ],

  // Account owns no NFTs
  noNfts: [],

  // Collection metadata
  collectionMetadata: {
    isSome: true,
    unwrap: () => ({
      data: 'Collection One',
      isFrozen: false,
    }),
  },

  // Item metadata
  itemMetadata: {
    isSome: true,
    unwrap: () => ({
      data: 'NFT Item 101',
      isFrozen: false,
    }),
  },
}

/**
 * Mock transaction result
 */
export const mockTransactionResult = {
  status: {
    isInBlock: true,
    isFinalized: false,
    asInBlock: {
      toHex: () => '0x1234567890abcdef',
    },
  },
  events: [],
  txHash: {
    toHex: () => '0xabcdef1234567890',
  },
}

/**
 * Mock successful transaction result
 */
export const mockSuccessfulTransactionResult = {
  status: {
    isInBlock: false,
    isFinalized: true,
    asFinalized: {
      toHex: () => '0x1234567890abcdef',
    },
  },
  events: [
    {
      event: {
        method: 'Transfer',
        section: 'balances',
        data: [TEST_ADDRESSES.ADDRESS1, TEST_ADDRESSES.ADDRESS2, TEST_AMOUNTS.TEN_DOT],
      },
    },
  ],
  txHash: {
    toHex: () => '0xabcdef1234567890',
  },
}

/**
 * Mock failed transaction result
 */
export const mockFailedTransactionResult = {
  status: {
    isInBlock: false,
    isFinalized: false,
    isDropped: true,
  },
  events: [],
  txHash: {
    toHex: () => '0xabcdef1234567890',
  },
  dispatchError: {
    isModule: true,
    asModule: {
      index: new BN(5),
      error: new BN(1),
    },
  },
}

/**
 * Helper to create mock API responses
 */
export function createMockApiResponse<T>(data: T, isSuccess = true) {
  if (isSuccess) {
    return Promise.resolve({
      isSome: true,
      unwrap: () => data,
      toHuman: () => data,
    })
  }
  return Promise.resolve({
    isSome: false,
    isNone: true,
  })
}

/**
 * Helper to setup mock API queries
 */
export function setupMockApiQueries() {
  // Setup default responses
  mockApi.query.system.account.mockResolvedValue(mockAccountResponses.withBalance)
  mockApi.query.staking.bonded.mockResolvedValue(mockStakingResponses.notStaking)
  mockApi.query.staking.ledger.mockResolvedValue(mockStakingResponses.notStaking)
  mockApi.query.identity.identityOf.mockResolvedValue(mockIdentityResponses.noIdentity)
  mockApi.query.proxy.proxies.mockResolvedValue(mockProxyResponses.noProxies)
  mockApi.query.uniques.account.mockResolvedValue(mockNftResponses.noNfts)
  mockApi.query.nfts.account.mockResolvedValue(mockNftResponses.noNfts)
}
