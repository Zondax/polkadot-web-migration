import type { Collection, Nft } from 'state/types/ledger'

import type { NftBalance } from '@/components/sections/migrate/balance-gallery'

/**
 * Groups NFTs by their collection ID.
 *
 * @param nfts - The NFTs to group.
 * @returns A record mapping collection IDs to arrays of NFTs.
 */
export const groupNftsByCollection = (nfts: Nft[] | undefined): Record<number, Nft[]> => {
  if (!nfts || nfts.length === 0) {
    return {}
  }

  return nfts.reduce(
    (acc, nft) => {
      const collectionId = Number(nft.collectionId)
      if (!acc[collectionId]) {
        acc[collectionId] = []
      }
      acc[collectionId].push(nft)
      return acc
    },
    {} as Record<number, Nft[]>
  )
}

/**
 * Creates NftBalance objects from collections and items.
 *
 * @param items - The NFT items.
 * @param collectionsArray - The collections to associate with the items.
 * @returns An array of NftBalance objects.
 */
export const createNftBalances = (items: Nft[], collectionsArray: Collection[]): NftBalance[] => {
  if (!items || items.length === 0) {
    return []
  }

  const nftBalances: NftBalance[] = []

  // Group NFTs by collection
  const itemsByCollection = groupNftsByCollection(items)

  // Create NftBalance objects for each collection
  for (const [collectionId, collectionItems] of Object.entries(itemsByCollection)) {
    const collection = collectionsArray.find(c => c.collectionId === Number(collectionId)) || { collectionId: Number(collectionId) }

    nftBalances.push({
      items: collectionItems,
      collection: collection,
    })
  }

  return nftBalances
}
