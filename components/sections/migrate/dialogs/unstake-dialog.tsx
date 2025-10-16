import { ExplorerLink } from '@/components/ExplorerLink'
import { useTransactionStatus } from '@/components/hooks/useTransactionStatus'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { AppId, Token } from '@/config/apps'
import { errorDetails } from '@/config/errors'
import { ExplorerItemType } from '@/config/explorers'
import type { UpdateTransactionStatus } from '@/lib/account'
import { cannotCoverFee } from '@/lib/utils/balance'
import { convertToRawUnits, formatBalance } from '@/lib/utils/format'
import { ledgerState$ } from '@/state/ledger'
import { zodResolver } from '@hookform/resolvers/zod'
import { BN } from '@polkadot/util'
import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { Address } from 'state/types/ledger'
import z from 'zod'
import { DialogError, DialogEstimatedFeeContent, DialogField, DialogLabel, DialogNetworkContent } from './common-dialog-fields'
import { TransactionDialogFooter, TransactionStatusBody } from './transaction-dialog'

interface UnstakeDialogProps {
  appId: AppId
  open: boolean
  setOpen: (open: boolean) => void
  maxUnstake: BN
  transferableBalance: BN
  token: Token
  account: Address
}

interface UnstakeFormData {
  unstakeAmount: number
  estimatedFee: BN
}

function createUnstakeSchema(maxUnstake: BN, transferableBalance: BN, token: Token) {
  return z.object({
    unstakeAmount: z
      .number({ required_error: 'Amount is required', invalid_type_error: 'Amount must be a number' })
      .min(1 / 10 ** token.decimals, 'Amount must be greater than 0')
      .refine(
        val => {
          const raw = convertToRawUnits(val, token)
          return new BN(raw).lte(maxUnstake)
        },
        { message: 'Amount exceeds maximum unstakable balance' }
      ),
    estimatedFee: z.instanceof(BN).refine(
      val => {
        if (cannotCoverFee(transferableBalance, val)) {
          return false
        }
        return true
      },
      { message: `${errorDetails.insufficient_balance.description}. Transferable: ${formatBalance(transferableBalance, token)}` }
    ),
  })
}

function UnstakeForm({
  form,
  onSubmit,
  maxUnstake,
  token,
  account,
  appId,
  estimatedFeeLoading,
}: {
  form: ReturnType<typeof useForm<UnstakeFormData>>
  onSubmit: (data: UnstakeFormData) => void
  maxUnstake: BN
  token: Token
  account: Address
  appId: AppId
  estimatedFeeLoading: boolean
}): React.ReactElement {
  const maxUnstakeFormatted = useMemo(() => formatBalance(maxUnstake, token), [maxUnstake, token])
  const {
    control,
    watch,
    formState: { errors },
  } = form
  const unstakeAmount = watch('unstakeAmount')
  const estimatedFee = watch('estimatedFee')

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
        <Controller
          name="unstakeAmount"
          control={control}
          render={({ field }) => (
            <Input
              type="number"
              min={0}
              max={maxUnstake.toNumber()}
              value={field.value ?? ''}
              onChange={e => {
                const val = e.target.value
                field.onChange(val ? Number(val) : undefined)
              }}
              placeholder="Amount"
              className="font-mono"
              error={Boolean(errors.unstakeAmount)}
              helperText={errors.unstakeAmount?.message as string}
            />
          )}
        />
      </DialogField>
      {/* Estimated Fee */}
      {!errors.unstakeAmount && typeof unstakeAmount === 'number' ? (
        <DialogField>
          <DialogLabel>Estimated Fee</DialogLabel>
          <DialogEstimatedFeeContent token={token} estimatedFee={estimatedFee} loading={estimatedFeeLoading} />
          <DialogError error={!estimatedFeeLoading && errors.estimatedFee?.message ? errors.estimatedFee.message : undefined} />
        </DialogField>
      ) : null}
    </form>
  )
}

export default function UnstakeDialog({ open, setOpen, maxUnstake, transferableBalance, token, account, appId }: UnstakeDialogProps) {
  const form = useForm<UnstakeFormData>({
    mode: 'onChange',
    defaultValues: { unstakeAmount: undefined, estimatedFee: undefined },
    resolver: zodResolver(createUnstakeSchema(maxUnstake, transferableBalance, token)),
  })

  const unstakeAmount = form.watch('unstakeAmount')

  // Wrap ledgerState$.unstakeBalance to match the generic hook's expected signature
  const unstakeTxFn = async (updateTxStatus: UpdateTransactionStatus, appId: AppId, address: string, path: string, amount: BN) => {
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
    estimatedFeeLoading,
  } = useTransactionStatus(unstakeTxFn, ledgerState$.getUnstakeFee)

  // Estimate fee on mount and when amount to unstake changes
  useEffect(() => {
    const calculateAndValidateFee = async (unstakeAmount: number) => {
      form.clearErrors('estimatedFee')

      const fee = await getEstimatedFee(appId, account.address, unstakeAmount)
      if (!fee) {
        form.unregister('estimatedFee')
        return
      }
      form.setValue('estimatedFee', fee, { shouldValidate: true })
    }

    if (!open || form.formState.errors.unstakeAmount || typeof unstakeAmount !== 'number') return

    const rawUnstakeAmount = convertToRawUnits(unstakeAmount, token)
    calculateAndValidateFee(rawUnstakeAmount)
  }, [open, getEstimatedFee, appId, account.address, form, unstakeAmount, token, form.setValue, form.clearErrors])

  const signUnstakeTx = async () => {
    const rawUnstakeAmount = convertToRawUnits(unstakeAmount, token)
    await runTransaction(appId, account.address, account.path, rawUnstakeAmount)
  }

  const synchronizeAccount = async () => {
    await updateSynchronization(ledgerState$.synchronizeAccount, appId)
    closeDialog()
  }

  const closeDialog = () => {
    form.reset()
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
          <DialogDescription className="pt-1!">
            After unbonding, your tokens enter a withdrawal period. Once this period ends, you can withdraw your unbonded balance to your
            account.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {txStatus ? (
            <TransactionStatusBody {...txStatus} appId={appId} />
          ) : (
            <UnstakeForm
              form={form}
              onSubmit={() => form.handleSubmit(signUnstakeTx)()}
              maxUnstake={maxUnstake}
              token={token}
              account={account}
              appId={appId}
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
            signTransfer={form.handleSubmit(signUnstakeTx)}
            isSignDisabled={!form.formState.isValid || Boolean(txStatus) || estimatedFeeLoading}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
