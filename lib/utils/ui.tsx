import { BN } from '@polkadot/util'
import { AlertCircle, AtSign, CheckCircle, Clock, Globe, Mail, Twitter, User, Users, XCircle } from 'lucide-react'

import type { TooltipItem } from '@/components/CustomTooltip'
import { ExplorerLink } from '@/components/ExplorerLink'
import { Spinner } from '@/components/icons'
import type { AppId, Token } from '@/config/apps'
import { ExplorerItemType } from '@/config/explorers'
import { TransactionStatus, type Registration } from '@/state/types/ledger'
import { cn } from '.'
import { formatBalance } from './format'

// Helper function to create status badge or icon
export const createStatusBadge = (icon: React.ReactNode, label: string, bgColor: string, borderColor: string, textColor: string) => {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${bgColor} border ${borderColor} ${textColor}`}
    >
      {icon}
      <span>{label}</span>
    </div>
  )
}

/**
 * Returns a status icon and message corresponding to the given transaction status.
 *
 * @param status - The current transaction status (optional).
 * @param txStatusMessage - An optional custom status message to display.
 * @param size - The size of the status icon ('sm', 'md', or 'lg'). Defaults to 'sm'.
 * @param txHash - Optional transaction hash for explorer links.
 * @param showLabel - Whether to show the status label with the icon. Defaults to true (badge mode).
 * @returns An object containing the statusIcon (ReactNode), an optional statusMessage (string), and the txHash if available.
 */
export const getTransactionStatus = (
  status?: TransactionStatus,
  txStatusMessage?: string,
  size: 'sm' | 'md' | 'lg' = 'sm',
  txHash?: string,
  showLabel = true
): { statusIcon: React.ReactNode; statusMessage?: string; txHash?: string } => {
  let statusIcon: React.ReactNode | null = null
  let statusMessage = txStatusMessage

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }

  const iconSizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  const iconSize = sizeClasses[size]
  const badgeIconSize = iconSizeClasses[size]

  const createStatus = (icon: React.ReactNode, label: string, bgColor: string, borderColor: string, textColor: string) => {
    if (showLabel) {
      return createStatusBadge(icon, label, bgColor, borderColor, textColor)
    }
    return icon
  }

  switch (status) {
    case TransactionStatus.IS_LOADING:
      statusIcon = createStatus(<Spinner />, 'Loading', 'bg-blue-50', 'border-blue-200', 'text-blue-700')
      statusMessage = 'Loading transaction data...'
      break
    case TransactionStatus.PREPARING_TX:
      statusIcon = createStatus(<Spinner />, 'Preparing', 'bg-blue-50', 'border-blue-200', 'text-blue-700')
      statusMessage = 'Preparing transaction...'
      break
    case TransactionStatus.SIGNING:
      statusIcon = createStatus(<Spinner />, 'Signing', 'bg-purple-50', 'border-purple-200', 'text-purple-700')
      statusMessage = 'Please sign the transaction in your Ledger device'
      break
    case TransactionStatus.SUBMITTING:
      statusIcon = createStatus(<Spinner />, 'Submitting', 'bg-blue-50', 'border-blue-200', 'text-blue-700')
      statusMessage = 'Submitting transaction to the network...'
      break
    case TransactionStatus.PENDING:
      statusIcon = createStatus(
        <Clock className={cn(showLabel ? badgeIconSize : iconSize, 'text-slate-500')} />,
        'Pending',
        'bg-slate-50',
        'border-slate-200',
        'text-slate-700'
      )
      statusMessage = 'Transaction pending in mempool...'
      break
    case TransactionStatus.IN_BLOCK:
      statusIcon = createStatus(
        <Clock className={cn(showLabel ? badgeIconSize : iconSize, 'text-cyan-500')} />,
        'In Block',
        'bg-cyan-50',
        'border-cyan-200',
        'text-cyan-700'
      )
      statusMessage = 'Transaction included in block'
      break
    case TransactionStatus.FINALIZED:
      statusIcon = createStatus(
        <Clock className={cn(showLabel ? badgeIconSize : iconSize, 'text-cyan-500')} />,
        'Finalized',
        'bg-cyan-50',
        'border-cyan-200',
        'text-cyan-700'
      )
      statusMessage = 'Transaction finalized on chain'
      break
    case TransactionStatus.SUCCESS:
      statusIcon = createStatus(
        <CheckCircle className={cn(showLabel ? badgeIconSize : iconSize, 'text-green-500')} />,
        'Success',
        'bg-green-50',
        'border-green-200',
        'text-green-700'
      )
      statusMessage = 'Transaction completed successfully'
      break
    case TransactionStatus.FAILED:
      statusIcon = createStatus(
        <XCircle className={cn(showLabel ? badgeIconSize : iconSize, 'text-red-500')} />,
        'Failed',
        'bg-red-50',
        'border-red-200',
        'text-red-700'
      )
      statusMessage = txStatusMessage || 'Transaction failed'
      break
    case TransactionStatus.ERROR:
      statusIcon = createStatus(
        <AlertCircle className={cn(showLabel ? badgeIconSize : iconSize, 'text-red-500')} />,
        'Error',
        'bg-red-50',
        'border-red-200',
        'text-red-700'
      )
      statusMessage = txStatusMessage || 'An error occurred'
      break
    case TransactionStatus.WARNING:
      statusIcon = createStatus(
        <AlertCircle className={cn(showLabel ? badgeIconSize : iconSize, 'text-yellow-500')} />,
        'Warning',
        'bg-amber-50',
        'border-amber-200',
        'text-amber-800'
      )
      statusMessage = txStatusMessage || 'Transaction completed with warnings'
      break
    case TransactionStatus.COMPLETED:
      statusIcon = createStatus(
        <Clock className={cn(showLabel ? badgeIconSize : iconSize, 'text-cyan-500')} />,
        'Completed',
        'bg-cyan-50',
        'border-cyan-200',
        'text-cyan-700'
      )
      statusMessage = 'Transaction completed'
      break
    case TransactionStatus.UNKNOWN:
      statusIcon = createStatus(
        <AlertCircle className={cn(showLabel ? badgeIconSize : iconSize, 'text-muted-foreground')} />,
        'Unknown',
        'bg-emerald-50',
        'border-emerald-200',
        'text-emerald-700'
      )
      statusMessage = 'Transaction status is unknown'
      break
    default:
      statusIcon = showLabel ? (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-violet-50 border border-violet-200 text-violet-700">
          <span>Ready to migrate</span>
        </div>
      ) : null
  }
  return { statusIcon, statusMessage, txHash }
}

/**
 * Validates a numeric input value against required, numeric, positive, and maximum constraints.
 *
 * @param value - The input value as a string to validate.
 * @param max - The maximum allowed value (inclusive).
 * @returns An object with a boolean `valid` flag and a `helperText` message for user feedback.
 */
export const validateNumberInput = (value: number, max: BN, token: Token): { valid: boolean; helperText: string } => {
  if (Number.isNaN(value)) {
    return { valid: false, helperText: 'Amount is required.' }
  }
  // Convert value to BN for comparison
  let inputBN: BN
  try {
    inputBN = new BN(value)
  } catch (_e) {
    return { valid: false, helperText: 'Amount must be a number.' }
  }
  if (inputBN.lte(new BN(0))) {
    return { valid: false, helperText: 'Amount must be greater than zero.' }
  }
  if (inputBN.gt(max)) {
    return { valid: false, helperText: `Amount cannot exceed your staked balance (${formatBalance(max, token, token?.decimals)}).` }
  }
  return { valid: true, helperText: '' }
}

/**
 * Returns an array of identity items for display from a Registration object.
 * Each item contains a label, value, icon, and optional href.
 */
export function getIdentityItems(registration: Registration | undefined, appId: AppId): TooltipItem[] {
  if (!registration?.identity) return []
  const identity = registration.identity
  const items = [
    {
      label: 'Parent account',
      value: identity.parent ? (
        <ExplorerLink
          value={identity.parent}
          appId={appId}
          explorerLinkType={ExplorerItemType.Address}
          truncate={false}
          disableTooltip
          className="break-all"
          size="xs"
        />
      ) : undefined,
      icon: Users,
    },
    {
      label: 'Parent legal name',
      value: identity.displayParent,
      icon: AtSign,
    },
    {
      label: 'Display name',
      value: identity.display,
      icon: User,
    },
    {
      label: 'Legal name',
      value: identity.legal,
      icon: AtSign,
    },
    {
      label: 'Website',
      value: identity.web,
      icon: Globe,
      href: identity.web,
    },
    {
      label: 'Email',
      value: identity.email,
      icon: Mail,
      href: identity.email ? `mailto:${identity.email}` : undefined,
    },
    {
      label: 'Twitter',
      value: identity.twitter,
      icon: Twitter,
      href: identity.twitter,
    },
  ]
  return items.filter(item => item.value !== undefined) as TooltipItem[]
}
