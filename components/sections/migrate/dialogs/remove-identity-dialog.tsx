import { CustomTooltip } from '@/components/CustomTooltip'
import { ExplorerLink } from '@/components/ExplorerLink'
import { useTransactionStatus } from '@/components/hooks/useTransactionStatus'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { AppId, Token } from '@/config/apps'
import { errorDetails } from '@/config/errors'
import { ExplorerItemType } from '@/config/explorers'
import type { UpdateTransactionStatus } from '@/lib/account'
import { cannotCoverFee } from '@/lib/utils/balance'
import { formatBalance } from '@/lib/utils/format'
import { ledgerState$ } from '@/state/ledger'
import type { BN } from '@polkadot/util'
import { useEffect } from 'react'
import type { Address } from 'state/types/ledger'
import { DialogError, DialogEstimatedFeeContent, DialogField, DialogLabel, DialogNetworkContent } from './common-dialog-fields'
import { TransactionDialogFooter, TransactionStatusBody } from './transaction-dialog'

interface RemoveIdentityDialogProps {
  appId: AppId
  open: boolean
  setOpen: (open: boolean) => void
  token: Token
  account: Address
  transferableBalance: BN
}

interface RemoveIdentityFormProps {
  token: Token
  account: Address
  appId: AppId
  estimatedFee?: BN
  estimatedFeeLoading: boolean
  insufficientBalance: boolean
}

function RemoveIdentityForm({ token, account, appId, estimatedFee, estimatedFeeLoading, insufficientBalance }: RemoveIdentityFormProps) {
  return (
    <>
      {/* Sending account */}
      <DialogField>
        <DialogLabel>Source Address</DialogLabel>
        <ExplorerLink value={account.address} appId={appId} explorerLinkType={ExplorerItemType.Address} size="xs" />
      </DialogField>
      {/* Network */}
      <DialogField>
        <DialogLabel>Network</DialogLabel>
        <DialogNetworkContent token={token} appId={appId} />
      </DialogField>
      {/* Deposit */}
      {account.registration?.deposit !== undefined ? (
        <DialogField>
          <DialogLabel>Deposit to Be Returned</DialogLabel>
          <CustomTooltip tooltipBody={formatBalance(account.registration.deposit, token, token?.decimals, true)}>
            <span className="font-mono">{formatBalance(account.registration.deposit, token)}</span>
          </CustomTooltip>
        </DialogField>
      ) : null}
      {/* Estimated Fee */}
      <DialogField>
        <DialogLabel>Estimated Fee</DialogLabel>
        <DialogEstimatedFeeContent token={token} estimatedFee={estimatedFee} loading={estimatedFeeLoading} />
        {!estimatedFeeLoading && insufficientBalance && <DialogError error={errorDetails.insufficient_balance.description} />}
      </DialogField>
    </>
  )
}

export default function RemoveIdentityDialog({ open, setOpen, token, account, appId, transferableBalance }: RemoveIdentityDialogProps) {
  // Wrap ledgerState$.removeIdentity to match the generic hook's expected signature
  const removeIdentityTxFn = async (updateTxStatus: UpdateTransactionStatus, appId: AppId, address: string, path: string) => {
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

  const insufficientBalance = Boolean(estimatedFee && cannotCoverFee(transferableBalance, estimatedFee))
  const isValidFee = !estimatedFeeLoading && !insufficientBalance

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
              estimatedFee={estimatedFee}
              estimatedFeeLoading={estimatedFeeLoading}
              insufficientBalance={insufficientBalance}
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
            isSignDisabled={!isValidFee || Boolean(txStatus)}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
