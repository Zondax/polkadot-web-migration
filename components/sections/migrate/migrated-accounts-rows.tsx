'use client'

import type { App } from 'state/ledger'
import { VerificationStatus, type AddressWithVerificationStatus, type MultisigAddress, type Transaction } from 'state/types/ledger'

import { CustomTooltip } from '@/components/CustomTooltip'
import { ExplorerLink } from '@/components/ExplorerLink'
import { useTokenLogo } from '@/components/hooks/useTokenLogo'
import { TableCell, TableRow } from '@/components/ui/table'
import type { AppId } from '@/config/apps'
import { ExplorerItemType } from '@/config/explorers'
import { muifyHtml } from '@/lib/utils/html'
import { getTransactionStatus } from '@/lib/utils/ui'
import { ShieldCheck } from 'lucide-react'
import { BalanceHoverCard } from './balance-hover-card'
import TransactionDropdown from './transaction-dropdown'

interface AccountRowsProps {
  app: App
  multisigAddresses?: boolean
  destinationAddressesStatus: AddressWithVerificationStatus[]
}

const MigratedAccountRows = ({ app, multisigAddresses, destinationAddressesStatus }: AccountRowsProps) => {
  const icon = useTokenLogo(app.id)
  const collections = app.collections

  const accounts = multisigAddresses ? app.multisigAccounts : app.accounts

  if (!accounts || accounts.length === 0) {
    return null
  }

  const renderStatusIcon = (transaction: Transaction | undefined) => {
    const txStatus = transaction?.status
    const txStatusMessage = transaction?.statusMessage

    const { statusIcon, statusMessage } = getTransactionStatus(txStatus, txStatusMessage)

    return statusMessage ? <CustomTooltip tooltipBody={statusMessage}>{statusIcon}</CustomTooltip> : statusIcon
  }

  return accounts.map((account, accountIndex) => {
    const balances = account.balances || []
    if (!account.balances || account.balances.length === 0) {
      return null
    }
    return (
      <TableRow key={`${app.id}-${account.address}-${accountIndex}`}>
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
            <div className="flex flex-col gap-1">
              {balances.map(balance => (
                <ExplorerLink
                  key={balance.type}
                  value={balance.transaction?.signatoryAddress || '-'}
                  appId={app.id as AppId}
                  explorerLinkType={ExplorerItemType.Address}
                  hasCopyButton={Boolean(balance.transaction?.signatoryAddress)}
                  disableTooltip={!balance.transaction?.signatoryAddress}
                />
              ))}
            </div>
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
        <TableCell className="p-0!">
          <div className="flex flex-col">
            {balances.map((balance, balanceIndex) => (
              <div key={balance.type}>
                {balanceIndex !== 0 && <hr className="border-gray-200 my-0" />}
                <div className="py-4 px-8 flex items-center gap-1">
                  <ExplorerLink
                    value={balance.transaction?.destinationAddress || ''}
                    appId={app.id as AppId}
                    explorerLinkType={ExplorerItemType.Address}
                  />
                  {destinationAddressesStatus.find(address => address.address === balance.transaction?.destinationAddress)?.status ===
                  VerificationStatus.VERIFIED ? (
                    <CustomTooltip tooltipBody="This address was verified on your device.">
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                    </CustomTooltip>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </TableCell>
        {/* Balance */}
        <TableCell className="p-0!">
          <div className="flex flex-col justify-center min-h-full">
            {balances.map((balance, balanceIndex) => (
              <div key={balance.type}>
                {balanceIndex !== 0 && <hr className="border-gray-200 my-0" />}
                <div className="my-4 mx-8 h-8 flex items-center">
                  <BalanceHoverCard balances={[balance]} collections={collections} token={app.token} appId={app.id as AppId} isMigration />
                </div>
              </div>
            ))}
          </div>
        </TableCell>
        {/* Status */}
        <TableCell>
          <div className="flex items-center space-x-2">
            {renderStatusIcon(account.transaction)}
            {account.transaction && <TransactionDropdown transaction={account.transaction} appId={app.id as AppId} />}
          </div>
        </TableCell>
      </TableRow>
    )
  })
}

export default MigratedAccountRows
