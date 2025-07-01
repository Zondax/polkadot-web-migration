import type { BN } from '@polkadot/util'
import { useEffect } from 'react'
import type { Address } from 'state/types/ledger'
import { ExplorerLink } from '@/components/ExplorerLink'
import { useTokenLogo } from '@/components/hooks/useTokenLogo'
import { useTransactionStatus } from '@/components/hooks/useTransactionStatus'
import TokenIcon from '@/components/TokenIcon'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { type AppId, type Token, getChainName } from '@/config/apps'
import { errorDetails } from '@/config/errors'
import { ExplorerItemType } from '@/config/explorers'
import { cannotCoverFee } from '@/lib/utils/balance'
import { ledgerState$ } from '@/state/ledger'
import { DialogError, DialogEstimatedFeeContent, DialogField, DialogLabel } from './common-dialog-fields'
import { TransactionDialogFooter, TransactionStatusBody } from './transaction-dialog'

interface WithdrawDialogProps {
  appId: AppId
  open: boolean
  setOpen: (open: boolean) => void
  token: Token
  account: Address
  transferableBalance: BN
}

interface WithdrawFormProps {
  token: Token
  account: Address
  appId: AppId
  estimatedFee?: BN
  estimatedFeeLoading: boolean
  insufficientBalance: boolean
}

function WithdrawForm({ token, account, appId, estimatedFee, estimatedFeeLoading, insufficientBalance }: WithdrawFormProps) {
  const icon = useTokenLogo(token.logoId)
  const appName = getChainName(appId)

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
        <div className="flex items-center gap-2">
          <TokenIcon icon={icon} symbol={token.symbol} size="md" />
          <span className="font-semibold text-base">{appName}</span>
        </div>
      </DialogField>
      {/* Estimated Fee */}
      <DialogField>
        <DialogLabel>Estimated Fee</DialogLabel>
        <DialogEstimatedFeeContent token={token} estimatedFee={estimatedFee} loading={estimatedFeeLoading} />
        {!estimatedFeeLoading && insufficientBalance && <DialogError error={errorDetails.insufficient_balance.description} />}
      </DialogField>
    </>
  )
}

export default function WithdrawDialog({ open, setOpen, token, account, appId, transferableBalance }: WithdrawDialogProps) {
  // Wrap ledgerState$.withdrawBalance to match the generic hook's expected signature
  const withdrawTxFn = async (
    updateTxStatus: (status: TransactionStatus, message?: string, txDetails?: TransactionDetails) => void,
    appId: AppId,
    address: string,
    path: string
  ) => {
    await ledgerState$.withdrawBalance(appId, address, path, updateTxStatus)
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
  } = useTransactionStatus(withdrawTxFn, ledgerState$.getWithdrawFee)

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
          <DialogTitle>Withdraw your unbonded balance</DialogTitle>
          <DialogDescription>
            This process may require a small transaction fee. Please review the details below before proceeding.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {txStatus ? (
            <TransactionStatusBody {...txStatus} appId={appId} />
          ) : (
            <WithdrawForm
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
