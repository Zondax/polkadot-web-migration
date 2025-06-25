import { BalanceType, type Collection, type Native } from 'state/types/ledger'

import TokenIcon from '@/components/TokenIcon'
import { useTokenLogo } from '@/components/hooks/useTokenLogo'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Token } from '@/config/apps'
import { formatBalance } from '@/lib/utils/format'

interface NftDetailCardProps {
  balance: number
  collection: Collection
  isUnique?: boolean
}

/**
 * A card component that displays NFT collection details including image, name, and balance
 * Shows a placeholder if no image is available
 * Displays collection ID and balance type (NFT or UNIQUE)
 */
const NftDetailCard = ({ balance, collection, isUnique }: NftDetailCardProps) => {
  const imageUrl = collection?.image || collection?.mediaUri

  return (
    <Card className="flex flex-row items-center p-3">
      <div className="h-12 w-12 rounded-full overflow-hidden mr-3 shrink-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${collection?.name || collection.collectionId}`}
            className="h-full w-full object-cover"
            loading="lazy"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted">
            <span className="text-xs text-muted-foreground">NFT</span>
          </div>
        )}
      </div>
      <div className="flex-1">
        <CardHeader className="p-0 pb-2">
          <CardTitle className="text-base flex items-center gap-2 w-full">
            <div className="grow min-w-0 flex items-center gap-2">
              <span className="truncate block max-w-[250px]">{collection?.name || `Collection #${collection.collectionId}`}</span>
              <BalanceTypeFlag type={isUnique ? BalanceType.UNIQUE : BalanceType.NFT} />
            </div>
            <span className="shrink-0 font-medium font-mono ml-auto">{balance}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-1 p-0 text-sm text-left">
          <div>
            <span>Collection:</span> #{collection.collectionId}
          </div>
        </CardContent>
      </div>
    </Card>
  )
}

interface NativeTokensDetailCardProps {
  balance: Native
  token: Token
  isMigration?: boolean
}

/**
 * A card component that displays native token details including icon, symbol and total balance
 * Shows the token's native status and formatted balance amount
 */
const NativeTokensDetailCard = ({ balance, token, isMigration }: NativeTokensDetailCardProps) => {
  const icon = useTokenLogo(token.logoId)
  const total = Number(formatBalance(isMigration ? balance.transferable : balance.total, token, token?.decimals, true))

  return (
    <Card className="flex flex-row items-center p-3 gap-3">
      <TokenIcon icon={icon} symbol={token.symbol} size="lg" />
      <div className="flex-1">
        <CardHeader className="p-0">
          <CardTitle className="text-base flex items-center gap-2">
            {token.symbol}
            <span className="bg-font-semibold text-white text-[10px] px-2 py-0 rounded-full">NATIVE</span>
            <span className="ml-auto font-medium font-mono">{total}</span>
          </CardTitle>
        </CardHeader>
      </div>
    </Card>
  )
}

/**
 * Props for the balance type flag component
 */
interface BalanceTypeFlagProps {
  type: string
  variant?: BadgeProps['variant']
}

const BalanceTypeFlag = ({ type, variant }: BalanceTypeFlagProps) => {
  return (
    <Badge variant={variant} className="text-[10px] leading-tight uppercase shrink-0">
      {type}
    </Badge>
  )
}

export { BalanceTypeFlag, NativeTokensDetailCard, NftDetailCard }
