import { ExplorerLink } from '@/components/ExplorerLink'
import { useTransactionStatus } from '@/components/hooks/useTransactionStatus'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { AppId, Token } from '@/config/apps'
import { errorDetails } from '@/config/errors'
import { ExplorerItemType } from '@/config/explorers'
import type { UpdateTransactionStatus } from '@/lib/account'
import { cn } from '@/lib/utils'
import { cannotCoverFee } from '@/lib/utils/balance'
import { formatBalance } from '@/lib/utils/format'
import { getGovernanceDepositBadgeProps } from '@/lib/utils/governance'
import { ledgerState$ } from '@/state/ledger'
import type { Address, GovernanceDeposit } from '@/state/types/ledger'
import { BN } from '@polkadot/util'
import { useEffect, useMemo } from 'react'
import { DialogError, DialogEstimatedFeeContent, DialogField, DialogLabel, DialogNetworkContent } from './common-dialog-fields'
import { TransactionDialogFooter, TransactionStatusBody } from './transaction-dialog'

interface GovernanceRefundDialogProps {
  open: boolean
  setOpen: (open: boolean) => void
  account: Address
  appId: AppId
  token: Token
  transferableBalance: BN
  deposits: GovernanceDeposit[]
}

interface GovernanceRefundFormProps {
  account: Address
  appId: AppId
  token: Token
  deposits: GovernanceDeposit[]
  refundableDeposits: GovernanceDeposit[]
  estimatedFee: BN | undefined
  estimatedFeeLoading: boolean
  insufficientBalance: boolean
}

function GovernanceRefundForm({
  account,
  appId,
  token,
  deposits,
  refundableDeposits,
  estimatedFee,
  estimatedFeeLoading,
  insufficientBalance,
}: GovernanceRefundFormProps) {
  const totalRefundAmount = refundableDeposits.reduce((sum, deposit) => sum.add(deposit.deposit), new BN(0))
  const ongoingDeposits = deposits.filter(d => d.referendumStatus === 'ongoing')
  const nonRefundableNonOngoing = deposits.filter(d => !d.canRefund && d.referendumStatus !== 'ongoing')

  // Helper to get badge styles based on deposit status
  const getDepositBadgeStyle = (deposit: GovernanceDeposit) => {
    if (deposit.canRefund) {
      return 'bg-green-50 border-green-200'
    }
    if (deposit.referendumStatus === 'ongoing') {
      return 'bg-blue-50 border-blue-200'
    }
    return 'bg-gray-50 border-gray-200'
  }

  const getDepositBadge = (deposit: GovernanceDeposit) => {
    const { label, className } = getGovernanceDepositBadgeProps(deposit)
    return <Badge className={cn(className, 'text-xs')}>{label}</Badge>
  }

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

      {/* All Deposits */}
      <DialogField>
        <DialogLabel>
          Governance Deposits ({deposits.length}){refundableDeposits.length > 0 && ` - ${refundableDeposits.length} refundable`}
        </DialogLabel>
        <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
          {deposits.map(deposit => (
            <div
              key={`${deposit.type}-${deposit.referendumIndex}`}
              className={cn('flex items-center justify-between text-xs p-2 rounded-lg', getDepositBadgeStyle(deposit))}
            >
              <span className="flex items-center gap-1.5">
                <Badge className="bg-white border-gray-300 text-gray-700 text-xs capitalize hover:bg-white">{deposit.type}</Badge>
                <span className="text-gray-700">Ref #{deposit.referendumIndex}</span>
                {getDepositBadge(deposit)}
              </span>
              <span className="font-mono font-medium">{formatBalance(deposit.deposit, token, token?.decimals, true)}</span>
            </div>
          ))}
        </div>
        {ongoingDeposits.length > 0 && (
          <p className="text-xs text-blue-600 mt-1">
            {ongoingDeposits.length} deposit{ongoingDeposits.length > 1 ? 's are' : ' is'} in ongoing referendums and cannot be refunded yet
          </p>
        )}
        {nonRefundableNonOngoing.length > 0 && (
          <p className="text-xs text-gray-600 mt-1">
            {nonRefundableNonOngoing.length} deposit{nonRefundableNonOngoing.length > 1 ? 's are' : ' is'} not refundable
          </p>
        )}
      </DialogField>

      {/* Total Amount to Refund */}
      {refundableDeposits.length > 0 && (
        <DialogField>
          <DialogLabel>Total Amount to Refund</DialogLabel>
          <span className="font-mono text-base font-semibold">{formatBalance(totalRefundAmount, token)}</span>
        </DialogField>
      )}

      {/* Estimated Fee - Only show if there are refundable deposits */}
      {refundableDeposits.length > 0 && (
        <DialogField>
          <DialogLabel>Estimated Fee</DialogLabel>
          <DialogEstimatedFeeContent
            token={token}
            estimatedFee={estimatedFee ? new BN(estimatedFee) : undefined}
            loading={estimatedFeeLoading}
          />
          {!estimatedFeeLoading && insufficientBalance && <DialogError error={errorDetails.insufficient_balance.description} />}
        </DialogField>
      )}
    </>
  )
}

export default function GovernanceRefundDialog({
  open,
  setOpen,
  account,
  appId,
  token,
  transferableBalance,
  deposits,
}: GovernanceRefundDialogProps) {
  // Filter refundable deposits - memoized to prevent unnecessary re-renders
  const refundableDeposits = useMemo(() => deposits.filter(d => d.canRefund), [deposits])

  // Wrap ledgerState$.refundGovernanceDeposits to match the generic hook's expected signature
  const refundGovernanceDepositsTxFn = async (
    updateTxStatus: UpdateTransactionStatus,
    appId: AppId,
    address: string,
    path: string,
    deposits: GovernanceDeposit[]
  ) => {
    await ledgerState$.refundGovernanceDeposits(appId, address, path, deposits, updateTxStatus)
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
  } = useTransactionStatus(refundGovernanceDepositsTxFn, ledgerState$.getGovernanceRefundFee)

  // Estimate fee on mount (only for refundable deposits)
  useEffect(() => {
    if (!open || refundableDeposits.length === 0) return
    getEstimatedFee(appId, account.address, refundableDeposits)
  }, [open, appId, account.address, refundableDeposits, getEstimatedFee])

  const signRefundGovernanceDepositsTx = async () => {
    await runTransaction(appId, account.address, account.path, refundableDeposits)
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

  // Show dialog even if no refundable deposits (to show ongoing deposits)
  if (deposits.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Governance Deposits</DialogTitle>
          <DialogDescription>
            {refundableDeposits.length > 0 ? (
              <>
                Reclaim your refundable governance deposits from {refundableDeposits.length} referendum
                {refundableDeposits.length > 1 ? 's' : ''}. The deposits will be returned to your transferable balance.
              </>
            ) : (
              <>View your governance deposits. Deposits from ongoing referendums cannot be refunded yet.</>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {txStatus ? (
            <TransactionStatusBody {...txStatus} appId={appId} />
          ) : (
            <GovernanceRefundForm
              account={account}
              appId={appId}
              token={token}
              deposits={deposits}
              refundableDeposits={refundableDeposits}
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
            signTransfer={signRefundGovernanceDepositsTx}
            isSignDisabled={refundableDeposits.length === 0 || !isValidFee || Boolean(txStatus)}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
