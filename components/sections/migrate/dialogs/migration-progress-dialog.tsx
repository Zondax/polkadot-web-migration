import { ExplorerLink } from '@/components/ExplorerLink'
import TokenIcon from '@/components/TokenIcon'
import { useTokenLogo } from '@/components/hooks/useTokenLogo'
import { TransactionStatusBody } from '@/components/sections/migrate/dialogs/transaction-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ExplorerItemType } from '@/config/explorers'
import type { MigratingItem } from '@/state/types/ledger'
import { observer } from '@legendapp/state/react'

interface MigrationProgressDialogProps {
  open: boolean
  onClose: () => void
  migratingItem?: MigratingItem | undefined
}

export const MigrationProgressDialog = observer(function MigrationProgressDialog({
  open,
  onClose,
  migratingItem,
}: MigrationProgressDialogProps) {
  const icon = useTokenLogo(migratingItem?.appId)

  // Only show dialog if there is a migrating item, regardless of the open prop
  const shouldShowDialog = open && !!migratingItem

  return (
    <Dialog open={shouldShowDialog} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transaction Approval Needed</DialogTitle>
          {migratingItem && (
            <DialogDescription className="flex items-center gap-2">
              <TokenIcon icon={icon} symbol={migratingItem.appName} size="sm" />
              <span>{migratingItem.appName}</span>
              <span className="text-xs text-gray-500">
                <ExplorerLink
                  value={migratingItem.account.address}
                  appId={migratingItem.appId}
                  explorerLinkType={ExplorerItemType.Address}
                  disableTooltip
                />
              </span>
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogBody>
          {migratingItem && (
            <TransactionStatusBody
              status={migratingItem.transaction?.status}
              statusMessage={migratingItem.transaction?.statusMessage}
              txHash={migratingItem.transaction?.txHash}
              blockHash={migratingItem.transaction?.blockHash}
              blockNumber={migratingItem.transaction?.blockNumber}
            />
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})
