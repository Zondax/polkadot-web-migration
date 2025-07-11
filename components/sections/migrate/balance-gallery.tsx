import type { Collection, Native, Nft } from 'state/types/ledger'

import type { Token } from '@/config/apps'

import { NativeTokensDetailCard, NftDetailCard } from './balance-detail-card'

export interface NftBalance {
  items: Nft[]
  collection: Collection
}

interface BalanceGalleryProps {
  nfts?: NftBalance[]
  uniques?: NftBalance[]
  native?: Native
  token: Token
  isMigration?: boolean
}

const BalanceGallery = ({ nfts, uniques, native, token, isMigration }: BalanceGalleryProps) => {
  return (
    <div className="flex flex-col gap-3 p-2 max-h-[400px] overflow-y-auto w-full sm:w-auto sm:min-w-[300px]">
      {native && (
        <div>
          <NativeTokensDetailCard balance={native} token={token} isMigration={isMigration} />
        </div>
      )}
      {uniques?.map(unique => (
        <div key={`${unique.collection.collectionId}-${unique.items[0].itemId}`}>
          <NftDetailCard balance={unique.items.length} collection={unique.collection} isUnique />
        </div>
      ))}
      {nfts?.map(nft => (
        <div key={`${nft.collection.collectionId}-${nft.items[0].itemId}`}>
          <NftDetailCard balance={nft.items.length} collection={nft.collection} />
        </div>
      ))}
    </div>
  )
}

export default BalanceGallery
