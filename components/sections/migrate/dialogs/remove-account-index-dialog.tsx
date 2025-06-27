import { ExplorerLink } from '@/components/ExplorerLink'
import { useTransactionStatus } from '@/components/hooks/useTransactionStatus'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { AppId, Token } from '@/config/apps'
import { ExplorerItemType } from '@/config/explorers'
import { formatBalance } from '@/lib/utils/format'
import { ledgerState$ } from '@/state/ledger'
import { BN } from '@polkadot/util'
import { useMemo } from 'react'
import type { Address, TransactionDetails, TransactionStatus } from 'state/types/ledger'
import { DialogEstimatedFeeContent, DialogField, DialogLabel, DialogNetworkContent } from './common-dialog-fields'
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
  estimatedFee: BN | undefined
  estimatedFeeLoading: boolean
}

function RemoveAccountIndexForm({ account, appId, token, estimatedFee, estimatedFeeLoading }: RemoveAccountIndexFormProps) {
  const index = account.index?.index
  const deposit = account.index?.deposit

  return (
    <>
      {/* Source Address */}
      <DialogField>
        <DialogLabel>Source Address</DialogLabel>
        <ExplorerLink value={account.address} explorerLinkType={ExplorerItemType.Address} appId={appId} />
      </DialogField>
      {/* Network */}
      <DialogField>
        <DialogLabel>Network</DialogLabel>
        <DialogNetworkContent token={token} appId={appId} />
      </DialogField>
      {/* Account Index to Remove */}
      <DialogField>
        <DialogLabel>Account Index to Remove</DialogLabel>
        <span className="text-sm">{index}</span>
      </DialogField>
      {/* Deposit to be returned */}
      {deposit !== undefined && (
        <DialogField>
          <DialogLabel>Deposit to be returned</DialogLabel>
          <span className="font-mono text-sm">{formatBalance(deposit, token)}</span>
        </DialogField>
      )}
      {/* Estimated Fee */}
      <DialogField>
        <DialogLabel>Estimated Fee</DialogLabel>
        <DialogEstimatedFeeContent
          token={token}
          estimatedFee={estimatedFee ? new BN(estimatedFee) : undefined}
          loading={estimatedFeeLoading}
        />
      </DialogField>
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
              estimatedFee={estimatedFee}
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
