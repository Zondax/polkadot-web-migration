// Mock values for balances, collections, and NFTs
export const mockNativeBalance = {
  free: 100000000000,
  reserved: 0,
  frozen: 0,
  total: 100000000000,
  transferable: 100000000000,
}

export const mockUniquesNfts = [
  {
    collectionId: 1,
    itemId: 1,
    creator: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    owner: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    isUnique: true,
    isFrozen: false,
  },
]

export const mockUniquesCollections = [
  {
    collectionId: 1,
    owner: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    items: 1,
    name: 'Mock Uniques Collection',
    image: '',
    description: 'A mock uniques collection',
    external_url: '',
    mediaUri: '',
    attributes: [],
  },
]

export const mockNfts = [
  {
    collectionId: 2,
    itemId: 2,
    creator: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    owner: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    isUnique: false,
    isFrozen: false,
  },
]

export const mockNftCollections = [
  {
    collectionId: 2,
    owner: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    items: 1,
    name: 'Mock NFT Collection',
    image: '',
    description: 'A mock NFT collection',
    external_url: '',
    mediaUri: '',
    attributes: [],
  },
]
