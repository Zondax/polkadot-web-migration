import { BN } from '@polkadot/util'
import { AlertCircle, AtSign, CheckCircle, Clock, Globe, Mail, Twitter, User, Users, XCircle } from 'lucide-react'

import type { TooltipItem } from '@/components/CustomTooltip'
import { ExplorerLink } from '@/components/ExplorerLink'
import { Spinner } from '@/components/icons'
import type { AppId, Token } from '@/config/apps'
import { ExplorerItemType } from '@/config/explorers'
import { type Registration, TransactionStatus } from '@/state/types/ledger'
import { formatBalance } from './format'

/**
 * Returns a status icon and message corresponding to the given transaction status.
 *
 * @param status - The current transaction status (optional).
 * @param txStatusMessage - An optional custom status message to display.
 * @param size - The size of the status icon ('sm', 'md', or 'lg'). Defaults to 'sm'.
 * @param txHash - Optional transaction hash for explorer links.
 * @returns An object containing the statusIcon (ReactNode), an optional statusMessage (string), and the txHash if available.
 */
export const getTransactionStatus = (
  status?: TransactionStatus,
  txStatusMessage?: string,
  size: 'sm' | 'md' | 'lg' = 'sm',
  txHash?: string
): { statusIcon: React.ReactNode; statusMessage?: string; txHash?: string } => {
  let statusIcon: React.ReactNode | null = null
  let statusMessage = txStatusMessage

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }

  const iconSize = sizeClasses[size]

  switch (status) {
    case TransactionStatus.IS_LOADING:
      statusIcon = <Spinner />
      statusMessage = 'Loading...'
      break
    case TransactionStatus.PREPARING_TX:
      statusIcon = <Spinner />
      statusMessage = 'Preparing transaction...'
      break
    case TransactionStatus.SIGNING:
      statusIcon = <Spinner />
      statusMessage = 'Please sign the transaction in your Ledger device'
      break
    case TransactionStatus.SUBMITTING:
      statusIcon = <Spinner />
      statusMessage = 'Submitting transaction...'
      break
    case TransactionStatus.PENDING:
      statusIcon = <Clock className={`${iconSize} text-muted-foreground`} />
      statusMessage = 'Transaction pending...'
      break
    case TransactionStatus.IN_BLOCK:
      statusIcon = <Clock className={`${iconSize} text-muted-foreground`} />
      break
    case TransactionStatus.FINALIZED:
      statusIcon = <Clock className={`${iconSize} text-muted-foreground`} />
      break
    case TransactionStatus.SUCCESS:
      statusIcon = <CheckCircle className={`${iconSize} text-green-500`} />
      break
    case TransactionStatus.FAILED:
      statusIcon = <XCircle className={`${iconSize} text-red-500`} />
      break
    case TransactionStatus.ERROR:
      statusIcon = <AlertCircle className={`${iconSize} text-red-500`} />
      break
    case TransactionStatus.WARNING:
      statusIcon = <AlertCircle className={`${iconSize} text-yellow-500`} />
      break
    case TransactionStatus.COMPLETED:
      statusIcon = <Clock className={`${iconSize} text-muted-foreground`} />
      break
    default:
      statusIcon = (
        <span className="px-2 py-1 text-xs rounded-full bg-polkadot-lime text-black border border-storm-200">Ready to migrate</span>
      )
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
