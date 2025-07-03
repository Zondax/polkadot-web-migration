import { ExplorerLink } from '@/components/ExplorerLink'
import { BalanceHoverCard } from '@/components/sections/migrate/balance-hover-card'
import { TransactionStatusBody } from '@/components/sections/migrate/dialogs/transaction-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AppId } from '@/config/apps'
import { ExplorerItemType } from '@/config/explorers'
import type { Collections } from '@/state/ledger'
import { BalanceType, TransactionStatus, type MigratingItem } from '@/state/types/ledger'
import { observer } from '@legendapp/state/react'
import { BalanceTypeFlag } from '../balance-detail-card'
import { DialogEstimatedFeeContent, DialogField, DialogLabel, DialogNetworkContent } from './common-dialog-fields'

interface MigrationProgressDialogProps {
  open: boolean
  onClose: () => void
  migratingItem?: MigratingItem | undefined
  getCollectionsByAppId?: (appId: AppId) => Collections | undefined
}

export const MigrationProgressDialog = observer(function MigrationProgressDialog({
  open,
  onClose,
  migratingItem,
  getCollectionsByAppId = () => undefined,
}: MigrationProgressDialogProps) {
  if (!migratingItem) return null

  // Only show dialog if there is a migrating item, regardless of the open prop
  const shouldShowDialog = open && !!migratingItem

  // Get balances for the account (native + NFTs). Replace the transferable balance with the native amount that takes into account the estimated fee.
  const balances =
    migratingItem.account?.balances?.map(balance =>
      balance.type === BalanceType.NATIVE
        ? {
            ...balance,
            balance: { ...balance.balance, transferable: migratingItem.transaction?.nativeAmount || balance.balance.transferable },
          }
        : balance
    ) || []
  const collections = getCollectionsByAppId(migratingItem.appId)
  const estimatedFee = migratingItem.transaction?.estimatedFee
  const fromAddress = migratingItem.account?.address
  const token = migratingItem.token

  return (
    <Dialog open={shouldShowDialog} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Transaction Approval Needed</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {/* Transaction summary section */}
          <div className="space-y-4">
            {/* From */}
            <DialogField>
              <DialogLabel>From</DialogLabel>
              <ExplorerLink
                data-testid="explorer-link"
                value={fromAddress}
                appId={migratingItem.appId}
                explorerLinkType={ExplorerItemType.Address}
                size="xs"
                disableTooltip={true}
              />
            </DialogField>
            {/* Network */}
            <DialogField>
              <DialogLabel>Network</DialogLabel>
              <DialogNetworkContent token={token} appId={migratingItem.appId} />
            </DialogField>
            {/* Estimated Fee */}
            <DialogField>
              <DialogLabel>Estimated Fee</DialogLabel>
              <DialogEstimatedFeeContent token={token} estimatedFee={estimatedFee} loading={!estimatedFee} />
            </DialogField>
            {/* Multisig Call Data */}
            {migratingItem.transaction?.callData && (
              <DialogField>
                <DialogLabel>Multisig Call Data</DialogLabel>
                <ExplorerLink
                  value={migratingItem.transaction.callData}
                  appId={migratingItem.appId}
                  explorerLinkType={ExplorerItemType.Address}
                  size="xs"
                />
              </DialogField>
            )}
            {/* Balances Table */}
            <div className="mt-4">
              <DialogLabel>Balances to Migrate</DialogLabel>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balances.map(balance => (
                    <TableRow key={balance.type}>
                      <TableCell className="flex items-center gap-2">
                        <BalanceTypeFlag type={balance.type} />
                      </TableCell>
                      <TableCell>
                        <BalanceHoverCard balances={[balance]} token={token} collections={collections} isMigration />
                      </TableCell>
                      <TableCell>
                        {balance.transaction?.destinationAddress ? (
                          <ExplorerLink
                            value={balance.transaction.destinationAddress}
                            appId={migratingItem.appId}
                            explorerLinkType={ExplorerItemType.Address}
                            size="xs"
                          />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogBody>
        {/* Transaction status */}
        {migratingItem.transaction?.status !== TransactionStatus.IS_LOADING && (
          <DialogBody>
            <TransactionStatusBody
              status={migratingItem.transaction?.status}
              statusMessage={migratingItem.transaction?.statusMessage}
              txHash={migratingItem.transaction?.txHash}
              blockHash={migratingItem.transaction?.blockHash}
              blockNumber={migratingItem.transaction?.blockNumber}
            />
          </DialogBody>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})
