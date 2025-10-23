import { CustomTooltip } from '@/components/CustomTooltip'
import { ExplorerLink } from '@/components/ExplorerLink'
import { BalanceHoverCard } from '@/components/sections/migrate/balance-hover-card'
import { TransactionStatusBody } from '@/components/sections/migrate/dialogs/transaction-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AppId } from '@/config/apps'
import { ExplorerItemType } from '@/config/explorers'
import { MIGRATION_WARNINGS } from '@/config/ui'
import { formatBalance, hasPendingActions, isFullMigration as isFullMigrationFn, isNativeBalance } from '@/lib/utils'
import type { Collections } from '@/state/ledger'
import { TransactionStatus, type MigratingItem } from '@/state/types/ledger'
import { observer } from '@legendapp/state/react'
import { AlertTriangle, Code, Info } from 'lucide-react'
import { useState } from 'react'
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
  const [showDevDetails, setShowDevDetails] = useState(false)

  if (!migratingItem) return null

  // Only show dialog if there is a migrating item, regardless of the open prop
  const shouldShowDialog = open && !!migratingItem

  // Get balances for the account (native + NFTs)
  // Always show the real balance in UI, even in development mode with MINIMUM_AMOUNT
  const balances = migratingItem.account?.balances || []
  const hasSignatoryAddress = balances.some(balance => balance.transaction?.signatoryAddress)
  const collections = getCollectionsByAppId(migratingItem.appId)
  const estimatedFee = migratingItem.transaction?.estimatedFee
  const fromAddress = migratingItem.account?.address
  const token = migratingItem.token

  // Determine if this is a full migration (sending all transferable balance)
  const originalNativeBalance = migratingItem.account?.balances?.find(isNativeBalance)
  const transferableAmount = originalNativeBalance?.balance.transferable
  const nativeTransferAmount = migratingItem.transaction?.nativeAmount

  const isFullMigration = nativeTransferAmount && transferableAmount && isFullMigrationFn(nativeTransferAmount, transferableAmount)

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
              <div className="flex items-center gap-1.5">
                <DialogLabel>Estimated Fee</DialogLabel>
                <span className="mb-1">
                  {isFullMigration && (
                    <CustomTooltip
                      tooltipBody="The transaction fee will be automatically deducted from the total amount being transferred."
                      align="center"
                    >
                      <Info className="w-3.5 h-3.5 cursor-help text-muted-foreground " />
                    </CustomTooltip>
                  )}
                </span>
              </div>
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
                    {hasSignatoryAddress && <TableHead>Signatory Address</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balances.map(balance => (
                    <TableRow key={balance.type}>
                      <TableCell className="flex items-center gap-2">
                        <BalanceTypeFlag type={balance.type} />
                      </TableCell>
                      <TableCell>
                        <BalanceHoverCard
                          balances={[balance]}
                          token={token}
                          collections={collections}
                          appId={migratingItem.appId}
                          isMigration
                        />
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
                      {hasSignatoryAddress && (
                        <TableCell>
                          {balance.transaction?.signatoryAddress ? (
                            <ExplorerLink
                              value={balance.transaction.signatoryAddress}
                              appId={migratingItem.appId}
                              explorerLinkType={ExplorerItemType.Address}
                              size="xs"
                            />
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Warnings Section */}
            <div className="space-y-3">
              {/* Existential Deposit Info */}
              <Alert variant="info">
                <Info className="h-4 w-4" />
                <AlertTitle>Existential Deposit Required</AlertTitle>
                <AlertDescription className="text-xs mt-1">
                  Substrate chains require a minimum balance for accounts to remain active. Ensure your destination account exists or
                  transfer exceeds the minimum deposit.
                  <CustomTooltip
                    tooltipBody="If the destination account doesn't exist and the transfer amount is below the existential deposit, the transaction will fail and funds may be lost."
                    className="max-w-[20vw]"
                  >
                    <button type="button" className="ml-1 text-blue-700 hover:text-blue-800 underline font-medium">
                      Learn more
                    </button>
                  </CustomTooltip>
                </AlertDescription>
              </Alert>

              {/* Pending Actions Warning */}
              {hasPendingActions(migratingItem.account.pendingActions) && (
                <Alert variant="warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{MIGRATION_WARNINGS.TRANSFER_ALL_WITH_PENDING_ACTIONS.title}</AlertTitle>
                  <AlertDescription className="text-xs mt-1">
                    {MIGRATION_WARNINGS.TRANSFER_ALL_WITH_PENDING_ACTIONS.message}
                  </AlertDescription>
                </Alert>
              )}

              {/* Development Mode Indicator */}
              {!isFullMigration && nativeTransferAmount && transferableAmount && (
                <Alert variant="info" className="border-purple-200 bg-purple-50">
                  <Code className="h-4 w-4 text-purple-600" />
                  <div>
                    <AlertTitle className="text-purple-900">Development Mode Active</AlertTitle>
                    <AlertDescription className="text-xs mt-1 text-purple-800">
                      <button
                        type="button"
                        onClick={() => setShowDevDetails(!showDevDetails)}
                        className="hover:underline flex items-center gap-1 font-medium"
                      >
                        <span>Partial transfer for testing</span>
                        <span className="text-[10px]">{showDevDetails ? '▼' : '▶'}</span>
                      </button>
                      {showDevDetails && (
                        <div className="mt-2 pl-3 border-l-2 border-purple-300 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-purple-700">Transferring:</span>
                            <span className="font-mono font-semibold text-purple-900">
                              {formatBalance(nativeTransferAmount, token, token?.decimals, true)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-purple-700">Full balance:</span>
                            <span className="font-mono text-purple-800">{formatBalance(transferableAmount, token)}</span>
                          </div>
                        </div>
                      )}
                    </AlertDescription>
                  </div>
                </Alert>
              )}
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
