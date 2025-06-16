import type { AddressBalance, Native, Nft } from '@/state/types/ledger'
import { useMemo } from 'react'
import type { Collections } from 'state/ledger'

import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import type { Token } from '@/config/apps'
import { formatBalance } from '@/lib/utils'
import { isNativeBalance, isNftBalanceType, isUniqueBalanceType } from '@/lib/utils/balance'
import { createNftBalances } from '@/lib/utils/nft'

import { Info } from 'lucide-react'
import BalanceGallery from './balance-gallery'
import { NativeBalanceVisualization } from './balance-visualizations'
import NftCircles from './nft-circles'

interface BalanceHoverCardProps {
  balances: AddressBalance[]
  collections?: Collections
  token: Token
  isMigration?: boolean // if true, only show transferable amount of native balance
}

/**
 * A component that displays a hover card showing detailed balance information
 * Features:
 * - Shows native token balance with optional NFT circles visualization
 * - Displays a detailed balance gallery on hover
 * - Supports both transferable and total balance display modes
 * - Handles multiple balance types (native, NFT, unique) in a single view
 */
const BalanceHoverCard = ({ balances, collections, token, isMigration }: BalanceHoverCardProps) => {
  const { nfts, uniques, native } = useMemo(() => {
    // Extract balance based on type
    let nfts: Nft[] | undefined
    let uniques: Nft[] | undefined
    let native: Native | undefined

    // Process each balance in the balances array
    for (const balance of balances) {
      if (isNftBalanceType(balance)) nfts = balance.balance as Nft[]
      else if (isUniqueBalanceType(balance)) uniques = balance.balance as Nft[]
      else if (isNativeBalance(balance)) native = balance.balance
    }

    // Convert collections map to array for easier lookup
    const uniquesCollectionsArray = Array.from(collections?.uniques.values() || [])
    const nftsCollectionsArray = Array.from(collections?.nfts.values() || [])

    // Create enhanced NFTs with collection data embedded
    const nftBalance = nfts?.length ? createNftBalances(nfts, nftsCollectionsArray) : undefined
    const uniquesBalance = uniques?.length ? createNftBalances(uniques, uniquesCollectionsArray) : undefined

    return { nfts: nftBalance, uniques: uniquesBalance, native }
  }, [balances, collections])

  const formattedNativeBalance = useMemo(() => {
    return native ? formatBalance(isMigration ? native.transferable : native.total, token) : null
  }, [native, token, isMigration])

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div className="flex items-center gap-2 cursor-pointer">
          {/* Show formatted native balance */}
          {formattedNativeBalance && <span className="font-mono">{formattedNativeBalance}</span>}
          {/* Show NFT circles for visual representation when NFTs are present */}
          {nfts || uniques ? (
            <>
              <NftCircles
                collections={[...(nfts?.map(nft => nft.collection) || []), ...(uniques?.map(unique => unique.collection) || [])]}
              />
              <Info className="w-4 h-4 text-gray-400" />
            </>
          ) : null}
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-[calc(100vw-32px)] sm:w-auto max-w-full p-0 ml-4 mr-0 sm:mx-0" align="end">
        <BalanceGallery nfts={nfts} uniques={uniques} native={native} token={token} isMigration={isMigration} />
      </HoverCardContent>
    </HoverCard>
  )
}

/**
 * A component that displays locked (frozen) balance information in a hover card
 * Features:
 * - Shows the total frozen balance amount
 * - Displays a detailed visualization of staking and reserved balances on hover
 * - Provides a clear breakdown of locked funds by type
 * - Only renders the visualization when balance data is available
 */
const LockedBalanceHoverCard = ({ balance, token }: { balance?: Native; token: Token }) => {
  const lockedBalance = (balance?.total ?? 0) - (balance?.transferable ?? 0)

  const formattedLockedBalance = useMemo(() => {
    return lockedBalance !== undefined ? formatBalance(lockedBalance, token) : null
  }, [lockedBalance, token])

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div className="flex items-center gap-2 cursor-pointer">
          <span className="font-mono">{formattedLockedBalance}</span>
          {lockedBalance ? <Info className="w-4 h-4 text-gray-400" /> : null}
        </div>
      </HoverCardTrigger>
      {lockedBalance && balance ? (
        <HoverCardContent className="w-[calc(100vw-32px)] sm:w-auto max-w-full p-0 ml-4 mr-0 sm:mx-0" align="end">
          <NativeBalanceVisualization data={balance} token={token} types={['staking', 'reserved']} hidePercentage />
        </HoverCardContent>
      ) : null}
    </HoverCard>
  )
}

export { BalanceHoverCard, LockedBalanceHoverCard }
