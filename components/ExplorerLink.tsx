import { truncateMaxCharacters } from 'config/config'
import Link from 'next/link'
import { useMemo } from 'react'
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

/**
 * Renders a link to a blockchain explorer, with optional tooltip and copy button.
 */
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
  const explorerUrl = useMemo(() => {
    if (appId && explorerLinkType && !disableLink) {
      switch (explorerLinkType) {
        case ExplorerItemType.Transaction:
          return getTransactionExplorerUrl(appId, value)
        case ExplorerItemType.Address:
          return getAddressExplorerUrl(appId, value)
        case ExplorerItemType.BlockHash:
        case ExplorerItemType.BlockNumber:
          return getBlockExplorerUrl(appId, value)
      }
    }
    return ''
  }, [appId, explorerLinkType, value, disableLink])

  const shortAddress = useMemo(() => (truncate ? truncateMiddleOfString(value, truncateMaxCharacters) : value), [value, truncate])

  if (!value) return null

  const displayText = children || shortAddress

  const content = explorerUrl ? (
    <Link
      href={explorerUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('flex items-center hover:underline text-primary-500', className)}
      aria-label={value}
    >
      {displayText}
    </Link>
  ) : (
    <span className={className} aria-disabled={disableLink}>
      {displayText}
    </span>
  )

  return (
    <div className="flex items-center gap-2">
      {disableTooltip ? content : <CustomTooltip tooltipBody={tooltipBody || value}>{content}</CustomTooltip>}
      {hasCopyButton && <CopyButton value={value} size={size} />}
    </div>
  )
}
