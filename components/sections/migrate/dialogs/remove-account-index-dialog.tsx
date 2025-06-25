import { ExplorerLink } from '@/components/ExplorerLink'
import TokenIcon from '@/components/TokenIcon'
import { useTokenLogo } from '@/components/hooks/useTokenLogo'
import { useTransactionStatus } from '@/components/hooks/useTransactionStatus'
import { Spinner } from '@/components/icons'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getChainName, type AppId, type Token } from '@/config/apps'
import { ExplorerItemType } from '@/config/explorers'
import { formatBalance } from '@/lib/utils/format'
import { ledgerState$ } from '@/state/ledger'
import { BN } from '@polkadot/util'
import { useMemo } from 'react'
import type { Address, TransactionDetails, TransactionStatus } from 'state/types/ledger'
import { TransactionDialogFooter, TransactionStatusBody } from './transaction-dialog'

interface RemoveAccountIndexDialogProps {
  open: boolean
  setOpen: (open: boolean) => void
  account: Address
  appId: AppId
  token: Token
}

interface RemoveAccountIndexFormProps {
  account: Address
  appId: AppId
  token: Token
  estimatedFee: string | undefined
  estimatedFeeLoading: boolean
}

function RemoveAccountIndexForm({ account, appId, token, estimatedFee, estimatedFeeLoading }: RemoveAccountIndexFormProps) {
  const icon = useTokenLogo(token.logoId)
  const appName = getChainName(appId)
  const index = account.index?.index
  const deposit = account.index?.deposit

  return (
    <>
      {/* Source Address */}
      <div className="text-sm">
        <div className="text-xs text-muted-foreground mb-1">Source Address</div>
        <ExplorerLink value={account.address} explorerLinkType={ExplorerItemType.Address} appId={appId} />
      </div>
      {/* Network */}
      <div>
        <div className="text-xs text-muted-foreground mb-1">Network</div>
        <div className="flex items-center gap-2">
          <TokenIcon icon={icon} symbol={token.symbol} size="md" />
          <span className="font-semibold text-base">{appName}</span>
        </div>
      </div>
      {/* Account Index to Remove */}
      <div>
        <div className="text-xs text-muted-foreground mb-1">Account Index to Remove</div>
        <span className="text-sm">{index}</span>
      </div>
      {/* Deposit to be returned */}
      {deposit !== undefined && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Deposit to be returned</div>
          <span className="font-mono text-sm">{formatBalance(deposit, token)}</span>
        </div>
      )}
      {/* Estimated Fee */}
      <div className="flex flex-col items-start justify-start">
        <div className="text-xs text-muted-foreground mb-1">Estimated Fee</div>
        {estimatedFeeLoading ? (
          <Spinner className="w-4 h-4" />
        ) : (
          <span className={`text-sm ${estimatedFee ? ' font-mono' : ''}`}>{estimatedFee ?? 'Could not be calculated at this time'}</span>
        )}
      </div>
    </>
  )
}

export default function RemoveAccountIndexDialog({ open, setOpen, account, appId, token }: RemoveAccountIndexDialogProps) {
  const index = account.index?.index
  if (!index) return null

  // Wrap ledgerState$.removeAccountIndex to match the generic hook's expected signature
  const removeAccountIndexTxFn = async (
    updateTxStatus: (status: TransactionStatus, message?: string, txDetails?: TransactionDetails) => void,
    appId: AppId,
    address: string,
    path: string,
    index: string
  ) => {
    await ledgerState$.removeAccountIndex(appId, address, index, path, updateTxStatus)
  }

  const {
    runTransaction,
    txStatus,
    clearTx,
    isTxFinished,
    isTxFailed,
    updateSynchronization,
    isSynchronizing,
    getEstimatedFee,
    estimatedFee,
    estimatedFeeLoading,
  } = useTransactionStatus(removeAccountIndexTxFn, ledgerState$.getRemoveAccountIndexFee)

  // Estimate fee on mount
  useMemo(() => {
    if (!open) return
    getEstimatedFee(appId, account.address, index)
  }, [open, getEstimatedFee, appId, account.address, index])

  const formattedFee = useMemo(() => (estimatedFee ? formatBalance(new BN(estimatedFee), token) : undefined), [estimatedFee, token])

  const signRemoveAccountIndexTx = async () => {
    await runTransaction(appId, account.address, account.path, index)
  }

  const synchronizeAccount = async () => {
    await updateSynchronization(ledgerState$.synchronizeAccount, appId)
    closeDialog()
  }

  const closeDialog = () => {
    clearTx()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Account Index</DialogTitle>
          <DialogDescription>
            This will remove the account index <span className="font-mono">{index}</span> from your account. This action is irreversible and
            may require a transaction fee.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {txStatus ? (
            <TransactionStatusBody {...txStatus} appId={appId} />
          ) : (
            <RemoveAccountIndexForm
              account={account}
              appId={appId}
              token={token}
              estimatedFee={formattedFee}
              estimatedFeeLoading={estimatedFeeLoading}
            />
          )}
        </DialogBody>
        <DialogFooter>
          <TransactionDialogFooter
            isTxFinished={isTxFinished}
            isTxFailed={isTxFailed}
            isSynchronizing={isSynchronizing}
            clearTx={clearTx}
            synchronizeAccount={synchronizeAccount}
            closeDialog={closeDialog}
            signTransfer={signRemoveAccountIndexTx}
            isSignDisabled={Boolean(txStatus)}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
