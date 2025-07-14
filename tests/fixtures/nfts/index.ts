import type { Nft } from '@/state/types/ledger'
import { TEST_ADDRESSES } from '../addresses'

/**
 * Common NFT test data for consistent testing scenarios
 */

// Standard NFTs with string collection IDs
export const TEST_NFTS = {
  NFT1: {
    collectionId: '1',
    itemId: '101',
    creator: TEST_ADDRESSES.ADDRESS1,
    owner: TEST_ADDRESSES.ADDRESS1,
  } as Nft,

  NFT2: {
    collectionId: '1',
    itemId: '102',
    creator: TEST_ADDRESSES.ADDRESS1,
    owner: TEST_ADDRESSES.ADDRESS1,
  } as Nft,

  NFT3: {
    collectionId: '2',
    itemId: '201',
    creator: TEST_ADDRESSES.ADDRESS3,
    owner: TEST_ADDRESSES.ADDRESS3,
  } as Nft,

  NFT4: {
    collectionId: '3',
    itemId: '301',
    creator: TEST_ADDRESSES.ADDRESS5,
    owner: TEST_ADDRESSES.ADDRESS5,
  } as Nft,

  // NFTs with numeric collection IDs
  NFT_NUMERIC_1: {
    collectionId: 4,
    itemId: '401',
    creator: TEST_ADDRESSES.ADDRESS6,
    owner: TEST_ADDRESSES.ADDRESS6,
  } as Nft,

  NFT_NUMERIC_2: {
    collectionId: 4,
    itemId: '402',
    creator: TEST_ADDRESSES.ADDRESS6,
    owner: TEST_ADDRESSES.ADDRESS6,
  } as Nft,

  // Unique NFT
  UNIQUE_NFT: {
    collectionId: '2',
    itemId: '1',
    creator: TEST_ADDRESSES.ADDRESS1,
    owner: TEST_ADDRESSES.ADDRESS1,
    isUnique: true,
  } as Nft,

  // Frozen NFT
  FROZEN_NFT: {
    collectionId: '5',
    itemId: '501',
    creator: TEST_ADDRESSES.ADDRESS2,
    owner: TEST_ADDRESSES.ADDRESS2,
    isFrozen: true,
  } as Nft,
} as const

/**
 * Test scenarios for NFT collections
 */
export const nftTestScenarios = {
  // Single NFT scenarios
  singleNft: {
    input: [TEST_NFTS.NFT1],
    expected: {
      total: 1,
      collections: 1,
      uniqueOwners: 1,
    },
  },

  // Multiple NFTs same collection
  sameCollection: {
    input: [TEST_NFTS.NFT1, TEST_NFTS.NFT2],
    expected: {
      total: 2,
      collections: 1,
      uniqueOwners: 1,
    },
  },

  // Multiple NFTs different collections
  multipleCollections: {
    input: [TEST_NFTS.NFT1, TEST_NFTS.NFT3, TEST_NFTS.NFT4],
    expected: {
      total: 3,
      collections: 3,
      uniqueOwners: 3,
    },
  },

  // Mixed string and numeric collection IDs
  mixedCollectionIds: {
    input: [TEST_NFTS.NFT1, TEST_NFTS.NFT_NUMERIC_1],
    expected: {
      total: 2,
      collections: 2,
      uniqueOwners: 2,
    },
  },

  // Unique NFT scenario
  uniqueNft: {
    input: [TEST_NFTS.UNIQUE_NFT],
    expected: {
      hasUnique: true,
      total: 1,
    },
  },

  // Frozen NFT scenario
  frozenNft: {
    input: [TEST_NFTS.FROZEN_NFT],
    expected: {
      hasFrozen: true,
      total: 1,
    },
  },

  // Empty collection
  empty: {
    input: [],
    expected: {
      total: 0,
      collections: 0,
      uniqueOwners: 0,
    },
  },
}

/**
 * Helper to create test NFT with custom properties
 */
export function createTestNft(overrides: Partial<Nft> = {}): Nft {
  return {
    collectionId: '999',
    itemId: '999',
    creator: TEST_ADDRESSES.ALICE,
    owner: TEST_ADDRESSES.ALICE,
    ...overrides,
  }
}

/**
 * Helper to create multiple test NFTs
 */
export function createTestNfts(count: number, collectionId: string | number = '999'): Nft[] {
  return Array.from({ length: count }, (_, index) =>
    createTestNft({
      collectionId,
      itemId: (1000 + index).toString(),
      creator: TEST_ADDRESSES.ALICE,
      owner: TEST_ADDRESSES.ALICE,
    })
  )
}

/**
 * NFT filter test cases
 */
export const nftFilterTestCases = {
  byCollection: {
    nfts: [TEST_NFTS.NFT1, TEST_NFTS.NFT2, TEST_NFTS.NFT3],
    filter: { collectionId: '1' },
    expected: [TEST_NFTS.NFT1, TEST_NFTS.NFT2],
  },

  byOwner: {
    nfts: [TEST_NFTS.NFT1, TEST_NFTS.NFT3, TEST_NFTS.NFT4],
    filter: { owner: TEST_ADDRESSES.ADDRESS1 },
    expected: [TEST_NFTS.NFT1],
  },

  byCreator: {
    nfts: [TEST_NFTS.NFT1, TEST_NFTS.NFT3, TEST_NFTS.NFT4],
    filter: { creator: TEST_ADDRESSES.ADDRESS3 },
    expected: [TEST_NFTS.NFT3],
  },

  uniqueOnly: {
    nfts: [TEST_NFTS.NFT1, TEST_NFTS.UNIQUE_NFT, TEST_NFTS.NFT3],
    filter: { isUnique: true },
    expected: [TEST_NFTS.UNIQUE_NFT],
  },

  frozenOnly: {
    nfts: [TEST_NFTS.NFT1, TEST_NFTS.FROZEN_NFT, TEST_NFTS.NFT3],
    filter: { isFrozen: true },
    expected: [TEST_NFTS.FROZEN_NFT],
  },
}
