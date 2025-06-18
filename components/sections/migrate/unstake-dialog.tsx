import { ledgerState$ } from '@/state/ledger'
import { useEffect, useMemo, useState } from 'react'
import type { Address, TransactionDetails, TransactionStatus } from 'state/types/ledger'

import { ExplorerLink } from '@/components/ExplorerLink'
import TokenIcon from '@/components/TokenIcon'
import { useTokenLogo } from '@/components/hooks/useTokenLogo'
import { useTransactionStatus } from '@/components/hooks/useTransactionStatus'
import { Spinner } from '@/components/icons'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { type AppId, type Token, getChainName } from '@/config/apps'
import { ExplorerItemType } from '@/config/explorers'
import { convertToRawUnits, formatBalance } from '@/lib/utils/format'
import { validateNumberInput } from '@/lib/utils/ui'
import { BN } from '@polkadot/util'
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
  estimatedFee: string | undefined
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
  const icon = useTokenLogo(token.logoId)
  const appName = getChainName(appId)

  const [helperText, setHelperText] = useState<string>('')
  const maxUnstakeFormatted = useMemo(() => formatBalance(maxUnstake, token, undefined, true), [maxUnstake, token])

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
      {/* Amount to Unstake */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-muted-foreground">Amount to Unstake</span>
          <span className="text-xs text-muted-foreground">Available Balance: {maxUnstakeFormatted}</span>
        </div>
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
      </div>
      {/* Estimated Fee */}
      {!helperText && unstakeAmount ? (
        <div className="flex flex-col items-start justify-start">
          <div className="text-xs text-muted-foreground mb-1">Estimated Fee</div>
          {estimatedFeeLoading ? (
            <Spinner className="w-4 h-4" />
          ) : (
            <span className={`text-sm ${estimatedFee ? ' font-mono' : ''}`}>{estimatedFee ?? 'Could not be calculated at this time'}</span>
          )}
        </div>
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

  const formattedFee = useMemo(() => (estimatedFee ? formatBalance(new BN(estimatedFee), token) : undefined), [estimatedFee, token])

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
              estimatedFee={formattedFee}
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
