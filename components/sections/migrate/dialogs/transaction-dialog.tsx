import { ExplorerLink } from '@/components/ExplorerLink'
import { Button } from '@/components/ui/button'
import type { AppId } from '@/config/apps'
import { ExplorerItemType } from '@/config/explorers'
import { getTransactionStatus } from '@/lib/utils/ui'
import type { Transaction } from '@/state/types/ledger'

/**
 * TransactionStatusBody
 *
 * Displays the status of a blockchain transaction, including a status icon, a message,
 * and optional transaction details such as transaction hash, block hash, and block number.
 */
function TransactionStatusBody({
  status,
  statusMessage: txStatusMessage,
  txHash,
  blockHash,
  blockNumber,
  appId,
}: Transaction & { appId?: AppId }) {
  if (!status) return null

  // Collect transaction details only if they exist, and filter out undefined values for cleaner display
  const details: { label: string; value: string; type?: ExplorerItemType }[] = [
    { label: 'Transaction Hash', value: txHash, type: ExplorerItemType.Transaction },
    { label: 'Block Hash', value: blockHash, type: ExplorerItemType.BlockHash },
    { label: 'Block Number', value: blockNumber, type: ExplorerItemType.BlockNumber },
  ].filter((item): item is { label: string; value: string; type: ExplorerItemType } => Boolean(item.value))

  // Common transaction details section to display hash, blockHash and blockNumber if they exist
  const renderTransactionDetails = () => {
    return (
      <div className="text-xs w-full">
        {details.map(
          item =>
            item.value && (
              <div key={item.label} className="flex justify-between items-center gap-1">
                <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                {appId && item.type ? (
                  <ExplorerLink value={item.value} appId={appId} explorerLinkType={item.type} className="break-all" hasCopyButton={false} />
                ) : (
                  <ExplorerLink value={item.value} hasCopyButton={false} />
                )}
              </div>
            )
        )}
      </div>
    )
  }

  const { statusIcon, statusMessage } = getTransactionStatus(status, txStatusMessage, 'lg')

  return (
    <div className="w-full flex flex-col items-center space-y-4">
      {statusIcon}
      <span className="text-base font-medium max-w-[80%] text-center">{statusMessage}</span>
      {details.length > 0 && renderTransactionDetails()}
    </div>
  )
}

interface TransactionDialogFooterProps {
  isSignDisabled: boolean
  isTxFinished: boolean
  isTxFailed: boolean
  isSynchronizing: boolean
  clearTx: () => void
  synchronizeAccount: () => void
  closeDialog: () => void
  signTransfer: () => void
  mainButtonLabel?: string
}

function TransactionDialogFooter({
  isTxFinished,
  isTxFailed,
  isSynchronizing,
  clearTx,
  synchronizeAccount,
  closeDialog,
  signTransfer,
  isSignDisabled,
  mainButtonLabel = 'Sign Transfer',
}: TransactionDialogFooterProps) {
  return (
    <>
      <Button variant="outline" onClick={closeDialog}>
        {isTxFinished ? 'Close' : 'Cancel'}
      </Button>
      {!isTxFinished ? (
        <Button className="bg-[#7916F3] hover:bg-[#6B46C1] text-white" onClick={signTransfer} disabled={isSignDisabled}>
          {mainButtonLabel}
        </Button>
      ) : (
        <Button
          className="bg-[#7916F3] hover:bg-[#6B46C1] text-white"
          onClick={isTxFailed ? clearTx : synchronizeAccount}
          disabled={isSynchronizing}
        >
          {isSynchronizing ? 'Synchronizing...' : isTxFailed ? 'Try again' : 'Update Synchronization'}
        </Button>
      )}
    </>
  )
}
export { TransactionDialogFooter, TransactionStatusBody }
