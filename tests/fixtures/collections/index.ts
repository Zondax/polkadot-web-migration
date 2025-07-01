import type { Collection } from '@/state/types/ledger'
import { TEST_ADDRESSES } from '../addresses'

/**
 * Common Collection test data for consistent testing scenarios
 */

export const TEST_COLLECTIONS = {
  COLLECTION1: {
    collectionId: 1,
    name: 'Collection One',
    owner: TEST_ADDRESSES.ADDRESS1,
    items: 2,
    image: 'ipfs://collection1.png',
  } as Collection,

  COLLECTION2: {
    collectionId: 2,
    name: 'Collection Two',
    owner: TEST_ADDRESSES.ADDRESS3,
    items: 1,
    image: 'ipfs://collection2.png',
  } as Collection,

  COLLECTION3: {
    collectionId: 3,
    name: 'Collection Three',
    owner: TEST_ADDRESSES.ADDRESS5,
    items: 1,
  } as Collection,

  COLLECTION4: {
    collectionId: 4,
    name: 'Collection Four',
    owner: TEST_ADDRESSES.ADDRESS6,
    items: 2,
  } as Collection,

  // Large collection for testing pagination
  LARGE_COLLECTION: {
    collectionId: 100,
    name: 'Large Collection',
    owner: TEST_ADDRESSES.ALICE,
    items: 1000,
    image: 'ipfs://large-collection.png',
  } as Collection,

  // Empty collection
  EMPTY_COLLECTION: {
    collectionId: 999,
    name: 'Empty Collection',
    owner: TEST_ADDRESSES.ALICE,
    items: 0,
  } as Collection,
} as const

/**
 * Test scenarios for Collections
 */
export const collectionTestScenarios = {
  // Single collection
  singleCollection: {
    input: [TEST_COLLECTIONS.COLLECTION1],
    expected: {
      total: 1,
      totalItems: 2,
      uniqueOwners: 1,
    },
  },

  // Multiple collections same owner
  sameOwner: {
    input: [TEST_COLLECTIONS.COLLECTION1, TEST_COLLECTIONS.COLLECTION2],
    expected: {
      total: 2,
      totalItems: 3,
      uniqueOwners: 2, // Different owners
    },
  },

  // Collections with different item counts
  mixedSizes: {
    input: [
      TEST_COLLECTIONS.COLLECTION1, // 2 items
      TEST_COLLECTIONS.COLLECTION2, // 1 item
      TEST_COLLECTIONS.EMPTY_COLLECTION, // 0 items
    ],
    expected: {
      total: 3,
      totalItems: 3,
      hasEmpty: true,
    },
  },

  // Large collection scenario
  largeCollection: {
    input: [TEST_COLLECTIONS.LARGE_COLLECTION],
    expected: {
      total: 1,
      totalItems: 1000,
      requiresPagination: true,
    },
  },

  // Empty collections array
  empty: {
    input: [],
    expected: {
      total: 0,
      totalItems: 0,
      uniqueOwners: 0,
    },
  },
}

/**
 * Helper to create test collection with custom properties
 */
export function createTestCollection(overrides: Partial<Collection> = {}): Collection {
  return {
    collectionId: 999,
    name: 'Test Collection',
    owner: TEST_ADDRESSES.ALICE,
    items: 0,
    ...overrides,
  }
}

/**
 * Helper to create multiple test collections
 */
export function createTestCollections(count: number): Collection[] {
  return Array.from({ length: count }, (_, index) =>
    createTestCollection({
      collectionId: 1000 + index,
      name: `Test Collection ${index + 1}`,
      items: Math.floor(Math.random() * 100), // Random number of items
    })
  )
}

/**
 * Collection sorting test cases
 */
export const collectionSortTestCases = {
  byName: {
    input: [TEST_COLLECTIONS.COLLECTION3, TEST_COLLECTIONS.COLLECTION1, TEST_COLLECTIONS.COLLECTION2],
    sortBy: 'name',
    expected: [TEST_COLLECTIONS.COLLECTION1, TEST_COLLECTIONS.COLLECTION3, TEST_COLLECTIONS.COLLECTION2],
  },

  byItemCount: {
    input: [TEST_COLLECTIONS.COLLECTION1, TEST_COLLECTIONS.COLLECTION2, TEST_COLLECTIONS.EMPTY_COLLECTION],
    sortBy: 'items',
    expected: [TEST_COLLECTIONS.EMPTY_COLLECTION, TEST_COLLECTIONS.COLLECTION2, TEST_COLLECTIONS.COLLECTION1],
  },

  byCollectionId: {
    input: [TEST_COLLECTIONS.COLLECTION3, TEST_COLLECTIONS.COLLECTION1, TEST_COLLECTIONS.COLLECTION2],
    sortBy: 'collectionId',
    expected: [TEST_COLLECTIONS.COLLECTION1, TEST_COLLECTIONS.COLLECTION2, TEST_COLLECTIONS.COLLECTION3],
  },
}

/**
 * Collection filter test cases
 */
export const collectionFilterTestCases = {
  byOwner: {
    collections: [TEST_COLLECTIONS.COLLECTION1, TEST_COLLECTIONS.COLLECTION2, TEST_COLLECTIONS.COLLECTION3],
    filter: { owner: TEST_ADDRESSES.ADDRESS1 },
    expected: [TEST_COLLECTIONS.COLLECTION1],
  },

  hasItems: {
    collections: [TEST_COLLECTIONS.COLLECTION1, TEST_COLLECTIONS.EMPTY_COLLECTION, TEST_COLLECTIONS.COLLECTION2],
    filter: { hasItems: true },
    expected: [TEST_COLLECTIONS.COLLECTION1, TEST_COLLECTIONS.COLLECTION2],
  },

  isEmpty: {
    collections: [TEST_COLLECTIONS.COLLECTION1, TEST_COLLECTIONS.EMPTY_COLLECTION, TEST_COLLECTIONS.COLLECTION2],
    filter: { hasItems: false },
    expected: [TEST_COLLECTIONS.EMPTY_COLLECTION],
  },

  hasImage: {
    collections: [TEST_COLLECTIONS.COLLECTION1, TEST_COLLECTIONS.COLLECTION3, TEST_COLLECTIONS.COLLECTION2],
    filter: { hasImage: true },
    expected: [TEST_COLLECTIONS.COLLECTION1, TEST_COLLECTIONS.COLLECTION2],
  },
}
