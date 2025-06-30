import { describe, expect, it } from 'vitest'
import { groupNftsByCollection, createNftBalances } from '../nft'
import type { Collection, Nft } from 'state/types/ledger'

describe('NFT Utilities', () => {
  // Helper function to create test NFTs
  const createNft = (collectionId: number, itemId: number): Nft => ({
    collectionId,
    itemId,
    creator: 'creator',
    owner: 'owner',
    isFrozen: false,
    isUnique: false,
  })

  // Helper function to create test collections
  const createCollection = (collectionId: number, name?: string): Collection => ({
    collectionId,
    name: name || `Collection ${collectionId}`,
    image: 'image.png',
    description: 'Test collection',
  })

  describe('groupNftsByCollection', () => {
    it('should return empty object for undefined input', () => {
      const result = groupNftsByCollection(undefined)
      expect(result).toEqual({})
    })

    it('should return empty object for empty array', () => {
      const result = groupNftsByCollection([])
      expect(result).toEqual({})
    })

    it('should group single NFT correctly', () => {
      const nfts = [createNft(1, 101)]
      
      const result = groupNftsByCollection(nfts)
      
      expect(result).toEqual({
        1: [createNft(1, 101)],
      })
    })

    it('should group multiple NFTs from same collection', () => {
      const nfts = [
        createNft(1, 101),
        createNft(1, 102),
        createNft(1, 103),
      ]
      
      const result = groupNftsByCollection(nfts)
      
      expect(result).toEqual({
        1: [
          createNft(1, 101),
          createNft(1, 102),
          createNft(1, 103),
        ],
      })
    })

    it('should group NFTs from different collections', () => {
      const nfts = [
        createNft(1, 101),
        createNft(2, 201),
        createNft(1, 102),
        createNft(3, 301),
        createNft(2, 202),
      ]
      
      const result = groupNftsByCollection(nfts)
      
      expect(result).toEqual({
        1: [createNft(1, 101), createNft(1, 102)],
        2: [createNft(2, 201), createNft(2, 202)],
        3: [createNft(3, 301)],
      })
    })

    it('should handle string collection IDs by converting to numbers', () => {
      const nfts = [
        { ...createNft(1, 101), collectionId: '1' as any },
        { ...createNft(1, 102), collectionId: '1' as any },
        { ...createNft(2, 201), collectionId: '2' as any },
      ]
      
      const result = groupNftsByCollection(nfts)
      
      expect(result).toEqual({
        1: [
          { ...createNft(1, 101), collectionId: '1' },
          { ...createNft(1, 102), collectionId: '1' },
        ],
        2: [{ ...createNft(2, 201), collectionId: '2' }],
      })
    })

    it('should handle collection ID 0', () => {
      const nfts = [
        createNft(0, 1),
        createNft(0, 2),
      ]
      
      const result = groupNftsByCollection(nfts)
      
      expect(result).toEqual({
        0: [createNft(0, 1), createNft(0, 2)],
      })
    })

    it('should handle large collection IDs', () => {
      const nfts = [
        createNft(999999, 1),
        createNft(999999, 2),
      ]
      
      const result = groupNftsByCollection(nfts)
      
      expect(result).toEqual({
        999999: [createNft(999999, 1), createNft(999999, 2)],
      })
    })

    it('should preserve NFT properties while grouping', () => {
      const nft1: Nft = {
        collectionId: 1,
        itemId: 101,
        creator: 'alice',
        owner: 'bob',
        isFrozen: true,
        isUnique: true,
        approved: 'charlie',
      }

      const nft2: Nft = {
        collectionId: 1,
        itemId: 102,
        creator: 'dave',
        owner: 'eve',
        isFrozen: false,
        isUnique: false,
      }
      
      const result = groupNftsByCollection([nft1, nft2])
      
      expect(result[1]).toEqual([nft1, nft2])
      expect(result[1][0]).toEqual(nft1)
      expect(result[1][1]).toEqual(nft2)
    })
  })

  describe('createNftBalances', () => {
    it('should return empty array for undefined items', () => {
      const collections = [createCollection(1)]
      const result = createNftBalances(undefined as any, collections)
      expect(result).toEqual([])
    })

    it('should return empty array for empty items array', () => {
      const collections = [createCollection(1)]
      const result = createNftBalances([], collections)
      expect(result).toEqual([])
    })

    it('should create NftBalance with matching collection', () => {
      const items = [createNft(1, 101)]
      const collections = [createCollection(1, 'Test Collection')]
      
      const result = createNftBalances(items, collections)
      
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        items: [createNft(1, 101)],
        collection: createCollection(1, 'Test Collection'),
      })
    })

    it('should create NftBalance with default collection when no match found', () => {
      const items = [createNft(1, 101)]
      const collections = [createCollection(2)] // Different collection ID
      
      const result = createNftBalances(items, collections)
      
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        items: [createNft(1, 101)],
        collection: { collectionId: 1 }, // Default collection with just ID
      })
    })

    it('should group items by collection and create multiple NftBalances', () => {
      const items = [
        createNft(1, 101),
        createNft(1, 102),
        createNft(2, 201),
        createNft(3, 301),
        createNft(1, 103),
      ]
      
      const collections = [
        createCollection(1, 'Collection One'),
        createCollection(2, 'Collection Two'),
      ]
      
      const result = createNftBalances(items, collections)
      
      expect(result).toHaveLength(3)
      
      // Find balance for collection 1
      const balance1 = result.find(b => b.collection.collectionId === 1)
      expect(balance1).toBeDefined()
      expect(balance1!.items).toHaveLength(3)
      expect(balance1!.collection.name).toBe('Collection One')
      
      // Find balance for collection 2
      const balance2 = result.find(b => b.collection.collectionId === 2)
      expect(balance2).toBeDefined()
      expect(balance2!.items).toHaveLength(1)
      expect(balance2!.collection.name).toBe('Collection Two')
      
      // Find balance for collection 3 (no matching collection data)
      const balance3 = result.find(b => b.collection.collectionId === 3)
      expect(balance3).toBeDefined()
      expect(balance3!.items).toHaveLength(1)
      expect(balance3!.collection).toEqual({ collectionId: 3 })
    })

    it('should handle empty collections array', () => {
      const items = [
        createNft(1, 101),
        createNft(2, 201),
      ]
      
      const result = createNftBalances(items, [])
      
      expect(result).toHaveLength(2)
      expect(result[0].collection).toEqual({ collectionId: 1 })
      expect(result[1].collection).toEqual({ collectionId: 2 })
    })

    it('should handle collection ID 0', () => {
      const items = [createNft(0, 1)]
      const collections = [createCollection(0, 'Zero Collection')]
      
      const result = createNftBalances(items, collections)
      
      expect(result).toHaveLength(1)
      expect(result[0].collection.collectionId).toBe(0)
      expect(result[0].collection.name).toBe('Zero Collection')
    })

    it('should preserve all item properties in the result', () => {
      const nftWithAllProps: Nft = {
        collectionId: 1,
        itemId: 101,
        creator: 'alice',
        owner: 'bob',
        isFrozen: true,
        isUnique: true,
        approved: 'charlie',
      }
      
      const collections = [createCollection(1)]
      const result = createNftBalances([nftWithAllProps], collections)
      
      expect(result[0].items[0]).toEqual(nftWithAllProps)
    })

    it('should handle duplicate collection IDs in collections array', () => {
      const items = [createNft(1, 101)]
      const collections = [
        createCollection(1, 'First Collection'),
        createCollection(1, 'Second Collection'), // Duplicate - should use first match
      ]
      
      const result = createNftBalances(items, collections)
      
      expect(result).toHaveLength(1)
      expect(result[0].collection.name).toBe('First Collection')
    })

    it('should handle mixed collection ID types', () => {
      const items = [
        { ...createNft(1, 101), collectionId: '1' as any },
        createNft(2, 201),
      ]
      
      const collections = [
        createCollection(1, 'String ID Collection'),
        createCollection(2, 'Number ID Collection'),
      ]
      
      const result = createNftBalances(items, collections)
      
      expect(result).toHaveLength(2)
      
      // Should find collection for string ID converted to number
      const balance1 = result.find(b => b.collection.collectionId === 1)
      expect(balance1?.collection.name).toBe('String ID Collection')
    })

    it('should maintain insertion order for items within collections', () => {
      const items = [
        createNft(1, 103),
        createNft(1, 101),
        createNft(1, 102),
      ]
      
      const collections = [createCollection(1)]
      const result = createNftBalances(items, collections)
      
      expect(result[0].items.map(item => item.itemId)).toEqual([103, 101, 102])
    })
  })
})