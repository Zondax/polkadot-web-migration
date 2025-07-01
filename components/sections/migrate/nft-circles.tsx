import type { Collection } from 'state/types/ledger'

interface NftCirclesProps {
  collections: Collection[]
  maxDisplay?: number
}

const NftCircles = ({ collections, maxDisplay = 3 }: NftCirclesProps) => {
  if (!collections || collections.length === 0) return null

  return (
    <div className="flex -space-x-2 overflow-hidden">
      {collections.slice(0, maxDisplay).map(collection => {
        const imageUrl = collection.image || collection.mediaUri

        return (
          <div
            key={collection.collectionId}
            className="h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center overflow-hidden"
          >
            {imageUrl ? (
              // biome-ignore lint/performance/noImgElement: NFT images are external URLs
              <img src={imageUrl} alt={`NFT ${collection.collectionId}`} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs">NFT</span>
            )}
          </div>
        )
      })}

      {collections.length > maxDisplay && (
        <div className="h-6 w-6 rounded-full border-2 border-background bg-primary text-primary-foreground flex items-center justify-center text-[10px]">
          +{collections.length - maxDisplay}
        </div>
      )}
    </div>
  )
}

export default NftCircles
