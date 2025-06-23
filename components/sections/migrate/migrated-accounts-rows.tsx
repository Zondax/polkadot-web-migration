'use client'

import type { App } from 'state/ledger'
import type { Address, MultisigAddress } from 'state/types/ledger'

import { CustomTooltip } from '@/components/CustomTooltip'
import { TableCell, TableRow } from '@/components/ui/table'
import { muifyHtml } from '@/lib/utils/html'
import { getTransactionStatus } from '@/lib/utils/ui'

import { ExplorerLink } from '@/components/ExplorerLink'
import { useTokenLogo } from '@/components/hooks/useTokenLogo'
import type { AppId } from '@/config/apps'
import { ExplorerItemType } from '@/config/explorers'
import { BalanceHoverCard } from './balance-hover-card'
import TransactionDropdown from './transaction-dropdown'

interface AccountRowsProps {
  app: App
  multisigAddresses?: boolean
}

const MigratedAccountRows = ({ app, multisigAddresses }: AccountRowsProps) => {
  const icon = useTokenLogo(app.id)
  const collections = app.collections

  const accounts = multisigAddresses ? app.multisigAccounts : app.accounts

  if (!accounts || accounts.length === 0) {
    return null
  }

  const renderStatusIcon = (account: Address, balanceIndex: number) => {
    const txStatus = account.balances?.[balanceIndex].transaction?.status
    const txStatusMessage = account.balances?.[balanceIndex].transaction?.statusMessage

    const { statusIcon, statusMessage } = getTransactionStatus(txStatus, txStatusMessage)

    return statusMessage ? <CustomTooltip tooltipBody={statusMessage}>{statusIcon}</CustomTooltip> : statusIcon
  }

  return accounts.map((account, accountIndex) => {
    return account.balances?.map((balance, balanceIndex) => (
      <TableRow key={`${app.id}-${account.address}-${accountIndex}-${balanceIndex}`}>
        {/* App Icon */}
        <TableCell className="px-2 hidden sm:table-cell">
          <div className="max-h-8 overflow-hidden [&_svg]:max-h-8 [&_svg]:w-8 flex justify-center items-center">
            {icon && muifyHtml(icon)}
          </div>
        </TableCell>
        {/* Source Address */}
        <TableCell>
          <ExplorerLink
            value={account.address}
            appId={app.id as AppId}
            explorerLinkType={ExplorerItemType.Address}
            tooltipBody={`${account.address} - ${account.path}`}
          />
        </TableCell>
        {/* Public Key */}
        {!multisigAddresses && (
          <TableCell>
            <ExplorerLink
              value={account.pubKey !== '' ? account.pubKey : '-'}
              hasCopyButton={account.pubKey !== ''}
              disableTooltip={account.pubKey === ''}
            />
          </TableCell>
        )}
        {/* Signatory Address */}
        {multisigAddresses && (
          <TableCell>
            <ExplorerLink
              value={balance.transaction?.signatoryAddress || '-'}
              appId={app.id as AppId}
              explorerLinkType={ExplorerItemType.Address}
              hasCopyButton={Boolean(balance.transaction?.signatoryAddress)}
              disableTooltip={!balance.transaction?.signatoryAddress}
            />
          </TableCell>
        )}
        {/* Threshold */}
        {multisigAddresses && (
          <TableCell>
            <span className="font-mono">
              {(account as MultisigAddress).threshold}/{(account as MultisigAddress).members.length}
            </span>
          </TableCell>
        )}
        {/* Destination Address */}
        <TableCell>
          <ExplorerLink
            value={balance.transaction?.destinationAddress || ''}
            appId={app.id as AppId}
            explorerLinkType={ExplorerItemType.Address}
          />
        </TableCell>
        {/* Balance */}
        <TableCell>
          <BalanceHoverCard balances={[balance]} collections={collections} token={app.token} isMigration />
        </TableCell>
        {/* Status */}
        <TableCell>
          <div className="flex items-center space-x-2">
            {renderStatusIcon(account, balanceIndex)}
            {balance.transaction && <TransactionDropdown transaction={balance.transaction} appId={app.id as AppId} />}
          </div>
        </TableCell>
      </TableRow>
    ))
  })
}

export default MigratedAccountRows
