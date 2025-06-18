import type { Address, TransactionDetails, TransactionStatus } from 'state/types/ledger'

import { ExplorerLink } from '@/components/ExplorerLink'
import TokenIcon from '@/components/TokenIcon'
import { useTokenLogo } from '@/components/hooks/useTokenLogo'
import { useTransactionStatus } from '@/components/hooks/useTransactionStatus'
import { Spinner } from '@/components/icons'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { type AppId, type Token, getChainName } from '@/config/apps'
import { ExplorerItemType } from '@/config/explorers'
import { formatBalance } from '@/lib/utils/format'
import { ledgerState$ } from '@/state/ledger'
import { useEffect, useMemo } from 'react'
import { TransactionDialogFooter, TransactionStatusBody } from './transaction-dialog'

interface RemoveIdentityDialogProps {
  appId: AppId
  open: boolean
  setOpen: (open: boolean) => void
  token: Token
  account: Address
}

interface RemoveIdentityFormProps {
  token: Token
  account: Address
  appId: AppId
  estimatedFee?: string
  estimatedFeeLoading: boolean
}

function RemoveIdentityForm({ token, account, appId, estimatedFee, estimatedFeeLoading }: RemoveIdentityFormProps) {
  const icon = useTokenLogo(token.logoId)
  const appName = getChainName(appId)

  return (
    <div className="space-y-4">
      {/* Sending account */}
      <div className="text-sm">
        <div className="text-xs text-muted-foreground mb-1">Source Address</div>
        <ExplorerLink value={account.address} appId={appId} explorerLinkType={ExplorerItemType.Address} />
      </div>
      {/* Network */}
      <div>
        <div className="text-xs text-muted-foreground mb-1">Network</div>
        <div className="flex items-center gap-2">
          <TokenIcon icon={icon} symbol={token.symbol} size="md" />
          <span className="font-semibold text-base">{appName}</span>
        </div>
      </div>
      {/* Deposit */}
      <div className="text-sm">
        <div className="text-xs text-muted-foreground mb-1">Deposit to be returned</div>
        <span className="font-mono">{formatBalance(account.registration?.deposit ?? 0, token)}</span>
      </div>
      {/* Estimated Fee */}
      <div className="flex flex-col items-start justify-start">
        <div className="text-xs text-muted-foreground mb-1">Estimated Fee</div>
        {estimatedFeeLoading ? (
          <Spinner className="w-4 h-4" />
        ) : (
          <span className={`text-sm ${estimatedFee ? ' font-mono' : ''}`}>{estimatedFee ?? 'Could not be calculated at this time'}</span>
        )}
      </div>
    </div>
  )
}

export default function RemoveIdentityDialog({ open, setOpen, token, account, appId }: RemoveIdentityDialogProps) {
  // Wrap ledgerState$.withdrawBalance to match the generic hook's expected signature
  const removeIdentityTxFn = async (
    updateTxStatus: (status: TransactionStatus, message?: string, txDetails?: TransactionDetails) => void,
    appId: AppId,
    address: string,
    path: string
  ) => {
    await ledgerState$.removeIdentity(appId, address, path, updateTxStatus)
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
  } = useTransactionStatus(removeIdentityTxFn, ledgerState$.getRemoveIdentityFee)

  // Calculate fee on mount
  useEffect(() => {
    if (open) {
      getEstimatedFee(appId, account.address)
    }
  }, [open, getEstimatedFee, appId, account.address])

  const formattedFee = useMemo(() => (estimatedFee ? formatBalance(estimatedFee, token) : undefined), [estimatedFee, token])

  const signWithdrawTx = async () => {
    await runTransaction(appId, account.address, account.path)
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
          <DialogTitle>Remove your identity</DialogTitle>
          <DialogDescription>
            This process may require a small transaction fee. Please review the details below before proceeding.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {txStatus ? (
            <TransactionStatusBody {...txStatus} appId={appId} />
          ) : (
            <RemoveIdentityForm
              token={token}
              account={account}
              appId={appId}
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
            signTransfer={signWithdrawTx}
            isSignDisabled={Boolean(txStatus)}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
