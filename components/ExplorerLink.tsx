import { truncateMaxCharacters } from 'config/config'
import Link from 'next/link'

import { CustomTooltip } from '@/components/CustomTooltip'
import type { AppId } from '@/config/apps'
import { ExplorerItemType } from '@/config/explorers'
import { cn, truncateMiddleOfString } from '@/lib/utils'
import { getAddressExplorerUrl, getBlockExplorerUrl, getTransactionExplorerUrl } from '@/lib/utils/explorers'
import { CopyButton } from './CopyButton'
import type { ButtonSize } from './ui/button'

interface ExplorerLinkProps {
  /**
   * The hash or address to display and link
   */
  value: string
  /**
   * Optional tooltip content
   */
  tooltipBody?: string
  /**
   * Whether to disable the tooltip
   */
  disableTooltip?: boolean
  /**
   * Whether to show a copy button
   */
  hasCopyButton?: boolean
  /**
   * Optional CSS class names
   */
  className?: string
  /**
   * Whether to truncate the display text
   */
  truncate?: boolean
  /**
   * Optional app ID for explorer links
   */
  appId?: AppId
  /**
   * Type of explorer link (transaction, address, or block)
   */
  explorerLinkType?: ExplorerItemType
  /**
   * Children to render instead of the value
   */
  children?: React.ReactNode
  /**
   * Whether to disable the link functionality
   */
  disableLink?: boolean
  /**
   * Size of the copy button icon
   */
  size?: ButtonSize
}

export function ExplorerLink({
  value,
  tooltipBody,
  disableTooltip = false,
  hasCopyButton = true,
  className,
  truncate = true,
  appId,
  explorerLinkType,
  children,
  disableLink = false,
  size = 'sm',
}: ExplorerLinkProps) {
  if (!value) return null

  // If appId and explorerLinkType are provided, generate explorer URL
  let explorerUrl = ''
  if (appId && explorerLinkType && !disableLink) {
    switch (explorerLinkType) {
      case ExplorerItemType.Transaction:
        explorerUrl = getTransactionExplorerUrl(appId, value)
        break
      case ExplorerItemType.Address:
        explorerUrl = getAddressExplorerUrl(appId, value)
        break
      case ExplorerItemType.BlockHash:
        explorerUrl = getBlockExplorerUrl(appId, value)
        break
      case ExplorerItemType.BlockNumber:
        explorerUrl = getBlockExplorerUrl(appId, value)
        break
    }
  }

  const shortAddress = truncate ? truncateMiddleOfString(value, truncateMaxCharacters) : value
  const displayText = children || shortAddress

  const renderContent = () => {
    if (explorerUrl) {
      return (
        <Link
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn('flex items-center hover:underline text-primary-500', className)}
        >
          {displayText}
        </Link>
      )
    }
    return <span className={className}>{displayText}</span>
  }

  return (
    <div className="flex items-center gap-2">
      {disableTooltip ? renderContent() : <CustomTooltip tooltipBody={tooltipBody || value}>{renderContent()}</CustomTooltip>}

      {hasCopyButton && <CopyButton value={value} size={size} />}
    </div>
  )
}
