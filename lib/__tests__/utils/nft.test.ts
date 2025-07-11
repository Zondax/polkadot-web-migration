import type { Collection, Nft } from 'state/types/ledger'
import { describe, expect, it } from 'vitest'

import { createNftBalances, groupNftsByCollection } from '../../utils/nft'
import {
  mockCollection1,
  mockCollections,
  mockMixedIdNfts,
  mockNft1,
  mockNft2,
  mockNft3,
  mockNft4,
  mockNftNumericId1,
  mockNftNumericId2,
  mockNfts,
} from './__mocks__/mockData'

// =========== Tests: groupNftsByCollection ===========
describe('groupNftsByCollection', () => {
  it('should group NFTs by collection ID', () => {
    const result = groupNftsByCollection(mockNfts)

    // Should have 3 collection groups
    expect(Object.keys(result).length).toBe(3)

    // Collection 1 should have 2 NFTs
    expect(result[1].length).toBe(2)
    expect(result[1]).toContain(mockNft1)
    expect(result[1]).toContain(mockNft2)

    // Collection 2 should have 1 NFT
    expect(result[2].length).toBe(1)
    expect(result[2]).toContain(mockNft3)

    // Collection 3 should have 1 NFT
    expect(result[3].length).toBe(1)
    expect(result[3]).toContain(mockNft4)
  })

  it('should handle empty array input', () => {
    const result = groupNftsByCollection([])
    expect(result).toEqual({})
  })

  it('should handle undefined input', () => {
    const result = groupNftsByCollection(undefined)
    expect(result).toEqual({})
  })

  it('should work with generic types as long as they have collectionId', () => {
    const result = groupNftsByCollection(mockNfts)

    // Should have 3 collection groups
    expect(Object.keys(result).length).toBe(3)

    // Collection 1 should have 2 NFTs
    expect(result[1].length).toBe(2)
    expect(result[1][0].collectionId).toBe('1')
    expect(result[1][1].collectionId).toBe('1')

    // Collection 2 should have 1 NFT
    expect(result[2].length).toBe(1)
    expect(result[2][0].collectionId).toBe('2')

    // Collection 3 should have 1 NFT
    expect(result[3].length).toBe(1)
    expect(result[3][0].collectionId).toBe('3')
  })

  it('should correctly convert string collection IDs to numbers', () => {
    const result = groupNftsByCollection(mockNfts)

    // All keys should be numbers
    expect(Object.keys(result).every(key => !Number.isNaN(Number(key)))).toBe(true)

    // Collection 1 (string '1' converted to number 1)
    expect(result[1]).toBeDefined()
    expect(result[1].length).toBe(2)
  })

  it('should handle a mixture of string and number collection IDs', () => {
    const result = groupNftsByCollection(mockMixedIdNfts)

    // Should have 3 collection groups
    expect(Object.keys(result).length).toBe(3)

    // Collection 1 (from string ID)
    expect(result[1].length).toBe(1)

    // Collection 4 (from number ID)
    expect(result[4].length).toBe(1)
    expect(result[4][0].itemId).toBe('401')
  })

  it('should handle single-item collections', () => {
    const singleNft = [mockNft3]
    const result = groupNftsByCollection(singleNft)

    expect(Object.keys(result).length).toBe(1)
    expect(result[2].length).toBe(1)
    expect(result[2][0]).toBe(mockNft3)
  })
})

// =========== Tests: createNftBalances ===========
describe('createNftBalances', () => {
  it('should create NFT balances with associated collections', () => {
    const result = createNftBalances(mockNfts, mockCollections)

    // Should return an array of NftBalance objects
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(3)

    // Check the first NftBalance (collection 1)
    const balance1 = result.find(b => b.collection.collectionId === 1)
    expect(balance1).toBeDefined()
    expect(balance1?.items.length).toBe(2)
    expect(balance1?.collection.name).toBe('Collection One')

    // Check the second NftBalance (collection 2)
    const balance2 = result.find(b => b.collection.collectionId === 2)
    expect(balance2).toBeDefined()
    expect(balance2?.items.length).toBe(1)
    expect(balance2?.collection.name).toBe('Collection Two')

    // Check the third NftBalance (collection 3)
    const balance3 = result.find(b => b.collection.collectionId === 3)
    expect(balance3).toBeDefined()
    expect(balance3?.items.length).toBe(1)
    expect(balance3?.collection.name).toBe('Collection Three')
  })

  it('should handle empty items array', () => {
    const result = createNftBalances([], mockCollections)
    expect(result).toEqual([])
  })

  it('should handle empty collections array', () => {
    const result = createNftBalances(mockNfts, [])

    // Should still create NftBalance objects, but with minimal collection info
    expect(result.length).toBe(3)

    // Check that collections only have IDs
    const balance1 = result.find(b => b.collection.collectionId === 1)
    expect(balance1?.collection.name).toBeUndefined()
    expect(balance1?.collection.collectionId).toBe(1)
  })

  it('should handle collections not found in the collections array', () => {
    // Create an NFT with a collection ID that doesn't exist in the collections array
    const nftWithUnknownCollection: Nft = {
      collectionId: '999',
      itemId: '9001',
      creator: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      owner: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    }

    const result = createNftBalances([nftWithUnknownCollection], mockCollections)

    // Should create an NftBalance with minimal collection info
    expect(result.length).toBe(1)
    expect(result[0].collection.collectionId).toBe(999)
    expect(result[0].collection.name).toBeUndefined()
  })

  it('should handle NFTs with both string and number collection IDs', () => {
    const result = createNftBalances([...mockNfts, mockNftNumericId1, mockNftNumericId2], mockCollections)

    // Should have 4 collections
    expect(result.length).toBe(4)

    // Check the collection with numeric ID (collection 4)
    const balance4 = result.find(b => b.collection.collectionId === 4)
    expect(balance4).toBeDefined()
    expect(balance4?.items.length).toBe(2)
    expect(balance4?.collection.name).toBe('Collection Four')
  })

  it('should return expected NftBalance structure', () => {
    const result = createNftBalances([mockNft1], [mockCollection1])

    expect(result.length).toBe(1)

    // Check the structure matches NftBalance interface
    const balance = result[0]
    expect(balance).toHaveProperty('items')
    expect(balance).toHaveProperty('collection')
    expect(Array.isArray(balance.items)).toBe(true)
    expect(typeof balance.collection).toBe('object')

    // Check the items are the original NFT objects
    expect(balance.items[0]).toBe(mockNft1)

    // Check the collection is the original Collection object
    expect(balance.collection).toBe(mockCollection1)
  })

  it('should handle collections with missing properties', () => {
    // Create a minimal collection with only the ID
    const minimalCollection: Collection = {
      collectionId: 5,
    }

    // Create an NFT for this collection
    const nftForMinimalCollection: Nft = {
      collectionId: '5',
      itemId: '501',
      creator: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      owner: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    }

    const result = createNftBalances([nftForMinimalCollection], [minimalCollection])

    expect(result.length).toBe(1)
    expect(result[0].collection.collectionId).toBe(5)
    expect(result[0].collection.name).toBeUndefined()
    expect(result[0].collection.owner).toBeUndefined()
  })
})
