import type { BN } from '@polkadot/util'
import { useEffect, useMemo, useState } from 'react'
import type { Address, TransactionDetails, TransactionStatus } from 'state/types/ledger'

import { ExplorerLink } from '@/components/ExplorerLink'
import { useTransactionStatus } from '@/components/hooks/useTransactionStatus'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { AppId, Token } from '@/config/apps'
import { ExplorerItemType } from '@/config/explorers'
import { convertToRawUnits, formatBalance } from '@/lib/utils/format'
import { validateNumberInput } from '@/lib/utils/ui'
import { ledgerState$ } from '@/state/ledger'
import { DialogEstimatedFeeContent, DialogField, DialogLabel, DialogNetworkContent } from './common-dialog-fields'
import { TransactionDialogFooter, TransactionStatusBody } from './transaction-dialog'

interface UnstakeDialogProps {
  appId: AppId
  open: boolean
  setOpen: (open: boolean) => void
  maxUnstake: BN
  token: Token
  account: Address
}

interface UnstakeFormProps {
  unstakeAmount?: number
  setUnstakeAmount: (amount: number | undefined) => void
  maxUnstake: BN
  token: Token
  account: Address
  appId: AppId
  estimatedFee: BN | undefined
  estimatedFeeLoading: boolean
  setIsUnstakeAmountValid: (valid: boolean) => void
}

function UnstakeForm({
  unstakeAmount,
  setUnstakeAmount,
  maxUnstake,
  token,
  account,
  appId,
  estimatedFee,
  estimatedFeeLoading,
  setIsUnstakeAmountValid,
}: UnstakeFormProps) {
  const [helperText, setHelperText] = useState<string>('')
  const maxUnstakeFormatted = useMemo(() => formatBalance(maxUnstake, token), [maxUnstake, token])

  const handleUnstakeAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    const { valid, helperText } = validateNumberInput(convertToRawUnits(Number(val), token), maxUnstake, token)
    setIsUnstakeAmountValid(valid)
    setUnstakeAmount(Number(val))
    setHelperText(helperText)
  }

  return (
    <>
      {/* Source Address */}
      <DialogField>
        <DialogLabel>Source Address</DialogLabel>
        <ExplorerLink value={account.address} explorerLinkType={ExplorerItemType.Address} appId={appId} size="xs" />
      </DialogField>
      {/* Network */}
      <DialogField>
        <DialogLabel>Network</DialogLabel>
        <DialogNetworkContent token={token} appId={appId} />
      </DialogField>
      {/* Amount to Unstake */}
      <DialogField>
        <DialogLabel className="flex justify-between items-center">
          <span>Amount to Unstake</span>
          <span>Available Balance: {maxUnstakeFormatted}</span>
        </DialogLabel>
        <Input
          type="number"
          min={0}
          max={maxUnstake.toNumber()}
          value={unstakeAmount}
          onChange={handleUnstakeAmountChange}
          placeholder="Amount"
          className="font-mono"
          error={Boolean(helperText)}
          helperText={helperText}
        />
      </DialogField>
      {/* Estimated Fee */}
      {!helperText && unstakeAmount ? (
        <DialogField>
          <DialogLabel>Estimated Fee</DialogLabel>
          <DialogEstimatedFeeContent token={token} estimatedFee={estimatedFee} loading={estimatedFeeLoading} />
        </DialogField>
      ) : null}
    </>
  )
}

export default function UnstakeDialog({ open, setOpen, maxUnstake, token, account, appId }: UnstakeDialogProps) {
  const [unstakeAmount, setUnstakeAmount] = useState<number | undefined>(undefined)
  const [isUnstakeAmountValid, setIsUnstakeAmountValid] = useState<boolean>(true)

  // Wrap ledgerState$.unstakeBalance to match the generic hook's expected signature
  const unstakeTxFn = async (
    updateTxStatus: (status: TransactionStatus, message?: string, txDetails?: TransactionDetails) => void,
    appId: AppId,
    address: string,
    path: string,
    amount: BN
  ) => {
    await ledgerState$.unstakeBalance(appId, address, path, amount, updateTxStatus)
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
  } = useTransactionStatus(unstakeTxFn, ledgerState$.getUnstakeFee)

  // Estimate fee on mount and when amount to unstake changes
  useEffect(() => {
    if (!open || !unstakeAmount) return

    const rawUnstakeAmount = convertToRawUnits(unstakeAmount, token)
    getEstimatedFee(appId, account.address, rawUnstakeAmount)
  }, [open, getEstimatedFee, appId, account.address, unstakeAmount, token])

  const signUnstakeTx = async () => {
    if (!unstakeAmount) return

    const rawUnstakeAmount = convertToRawUnits(unstakeAmount, token)
    await runTransaction(appId, account.address, account.path, rawUnstakeAmount)
  }

  const synchronizeAccount = async () => {
    await updateSynchronization(ledgerState$.synchronizeAccount, appId)
    closeDialog()
  }

  const closeDialog = () => {
    setUnstakeAmount(0)
    clearTx()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unstake your balance</DialogTitle>
          <DialogDescription>
            Unstake tokens from your balance to make them available for use. Enter the amount you wish to unstake below.
          </DialogDescription>
          <DialogDescription>
            After unbonding, your tokens enter a withdrawal period. Once this period ends, you can withdraw your unbonded balance to your
            account.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {txStatus ? (
            <TransactionStatusBody {...txStatus} appId={appId} />
          ) : (
            <UnstakeForm
              unstakeAmount={unstakeAmount}
              setUnstakeAmount={setUnstakeAmount}
              maxUnstake={maxUnstake}
              token={token}
              account={account}
              appId={appId}
              estimatedFee={estimatedFee}
              estimatedFeeLoading={estimatedFeeLoading}
              setIsUnstakeAmountValid={setIsUnstakeAmountValid}
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
            signTransfer={signUnstakeTx}
            isSignDisabled={!isUnstakeAmountValid || Boolean(txStatus)}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
