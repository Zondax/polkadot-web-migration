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
  callData,
  callHash,
  appId,
}: Transaction & { appId?: AppId; callHash?: string }) {
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
      
      {/* Display multisig call data and hash for first approval */}
      {callData && callHash && (
        <div className="w-full space-y-3 mt-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-sm font-medium text-center">Multisig Transaction Details</div>
          <div className="text-xs text-muted-foreground text-center">
            Save these details - other signers will need them to approve this transaction
          </div>
          
          <div className="space-y-2">
            <div className="space-y-1">
              <div className="text-xs font-medium">Call Hash</div>
              <div className="p-2 bg-background rounded text-xs font-mono break-all select-all">
                {callHash}
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-xs font-medium">Call Data</div>
              <div className="p-2 bg-background rounded text-xs font-mono break-all select-all">
                {callData}
              </div>
            </div>
          </div>
        </div>
      )}
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
