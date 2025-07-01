import type { BN } from '@polkadot/util'
import { useEffect } from 'react'
import type { Address, TransactionDetails, TransactionStatus } from 'state/types/ledger'
import { ExplorerLink } from '@/components/ExplorerLink'
import { useTransactionStatus } from '@/components/hooks/useTransactionStatus'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { AppId, Token } from '@/config/apps'
import { errorDetails } from '@/config/errors'
import { ExplorerItemType } from '@/config/explorers'
import { cannotCoverFee } from '@/lib/utils/balance'
import { formatBalance } from '@/lib/utils/format'
import { ledgerState$ } from '@/state/ledger'
import type { BN } from '@polkadot/util'
import { useEffect } from 'react'
import { DialogError, DialogEstimatedFeeContent, DialogField, DialogLabel, DialogNetworkContent } from './common-dialog-fields'
import { TransactionDialogFooter, TransactionStatusBody } from './transaction-dialog'

interface RemoveProxyDialogProps {
  appId: AppId
  open: boolean
  setOpen: (open: boolean) => void
  token: Token
  account: Address
  transferableBalance: BN
}

interface RemoveProxyFormProps {
  token: Token
  account: Address
  appId: AppId
  estimatedFee?: BN
  estimatedFeeLoading: boolean
  insufficientBalance: boolean
}

function RemoveProxyForm({ token, account, appId, estimatedFee, estimatedFeeLoading, insufficientBalance }: RemoveProxyFormProps) {
  return (
    <div className="space-y-4">
      {/* Sending account */}
      <DialogField>
        <DialogLabel>Source Address</DialogLabel>
        <ExplorerLink value={account.address} appId={appId} explorerLinkType={ExplorerItemType.Address} size="xs" />
      </DialogField>
      {/* Proxy addresses */}
      <DialogField>
        <DialogLabel>Proxy Addresses to Be Removed</DialogLabel>
        {account.proxy?.proxies.map(proxy => (
          <div key={proxy.address}>
            <ExplorerLink value={proxy.address} appId={appId} explorerLinkType={ExplorerItemType.Address} size="xs" />
          </div>
        ))}
      </DialogField>
      {/* Network */}
      <DialogField>
        <DialogLabel>Network</DialogLabel>
        <DialogNetworkContent token={token} appId={appId} />
      </DialogField>
      {/* Deposit */}
      {account.proxy?.deposit !== undefined ? (
        <DialogField>
          <DialogLabel>Deposit to Be Returned</DialogLabel>
          <span className="font-mono">{formatBalance(account.proxy.deposit, token)}</span>
        </DialogField>
      ) : null}
      {/* Estimated Fee */}
      <DialogField>
        <DialogLabel>Estimated Fee</DialogLabel>
        <DialogEstimatedFeeContent token={token} estimatedFee={estimatedFee} loading={estimatedFeeLoading} />
        {!estimatedFeeLoading && insufficientBalance && <DialogError error={errorDetails.insufficient_balance.description} />}
      </DialogField>
    </div>
  )
}

export default function RemoveProxyDialog({ open, setOpen, token, account, appId, transferableBalance }: RemoveProxyDialogProps) {
  // Wrap ledgerState$.removeProxies to match the generic hook's expected signature
  const removeProxyTxFn = async (
    updateTxStatus: (status: TransactionStatus, message?: string, txDetails?: TransactionDetails) => void,
    appId: AppId,
    address: string,
    path: string
  ) => {
    await ledgerState$.removeProxies(appId, address, path, updateTxStatus)
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
  } = useTransactionStatus(removeProxyTxFn, ledgerState$.getRemoveProxiesFee)

  // Calculate fee on mount
  useEffect(() => {
    if (open) {
      getEstimatedFee(appId, account.address)
    }
  }, [open, getEstimatedFee, appId, account.address])

  const signRemoveProxyTx = async () => {
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
          <DialogTitle>Remove Proxies</DialogTitle>
          <DialogDescription>
            This process may require a small transaction fee. Please review the details below before proceeding.
          </DialogDescription>
          <DialogDescription className="pt-1!">The deposit will be automatically returned when the proxies are removed.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {txStatus ? (
            <TransactionStatusBody {...txStatus} appId={appId} />
          ) : (
            <RemoveProxyForm
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
            signTransfer={signRemoveProxyTx}
            isSignDisabled={!isValidFee || Boolean(txStatus)}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
