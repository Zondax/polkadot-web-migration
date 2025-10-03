import { CustomTooltip } from '@/components/CustomTooltip'
import { ExplorerLink } from '@/components/ExplorerLink'
import { useTransactionStatus } from '@/components/hooks/useTransactionStatus'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AppId, Token } from '@/config/apps'
import { MULTISIG_TRANSFER_AMOUNT } from '@/config/config'
import { ExplorerItemType } from '@/config/explorers'
import { ledgerState$ } from '@/state/ledger'
import { zodResolver } from '@hookform/resolvers/zod'
import { Info } from 'lucide-react'
import { useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { MultisigAddress, MultisigMember, TransactionDetails, TransactionStatus } from 'state/types/ledger'
import { z } from 'zod'
import { DialogField, DialogLabel, DialogNetworkContent } from './common-dialog-fields'
import { TransactionDialogFooter, TransactionStatusBody } from './transaction-dialog'

// Zod schema for form validation
const transferMultisigFormSchema = z.object({
  recipient: z.string().min(1, 'Recipient is required'),
  signer: z.string().min(1, 'Signer is required'),
})

export type TransferMultisigFormData = z.infer<typeof transferMultisigFormSchema>

interface TransferMultisigDialogProps {
  open: boolean
  setOpen: (open: boolean) => void
  token: Token
  appId: AppId
  account: MultisigAddress
}

function TransferMultisigForm({
  form,
  onSubmit,
  token,
  appId,
  account,
  internalMembers,
  availableSigners,
}: {
  form: ReturnType<typeof useForm<TransferMultisigFormData>>
  onSubmit: (data: TransferMultisigFormData) => void
  token: Token
  appId: AppId
  account: MultisigAddress
  internalMembers: MultisigMember[]
  availableSigners: MultisigMember[]
}) {
  const {
    control,
    formState: { errors },
  } = form

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Multisig Address */}
      <DialogField>
        <DialogLabel>From Multisig Address</DialogLabel>
        <ExplorerLink value={account.address} appId={appId as AppId} explorerLinkType={ExplorerItemType.Address} size="xs" />
      </DialogField>

      {/* Recipient Selector */}
      <DialogField>
        <DialogLabel>Recipient (Ledger-derived signatory)</DialogLabel>
        <Controller
          name="recipient"
          control={control}
          render={({ field }) => (
            <div>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={errors.recipient ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select Recipient" />
                </SelectTrigger>
                <SelectContent>
                  {internalMembers.map(member => (
                    <SelectItem key={member.address} value={member.address}>
                      <ExplorerLink
                        value={member.address}
                        appId={appId as AppId}
                        explorerLinkType={ExplorerItemType.Address}
                        disableTooltip
                        disableLink
                        hasCopyButton={false}
                        size="xs"
                      />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />
      </DialogField>

      {/* Transfer Amount */}
      <DialogField>
        <DialogLabel>Transfer Amount</DialogLabel>
        <CustomTooltip tooltipBody={`${MULTISIG_TRANSFER_AMOUNT} ${token.symbol}`}>
          <span className="font-mono">
            {MULTISIG_TRANSFER_AMOUNT} {token.symbol}
          </span>
        </CustomTooltip>
      </DialogField>

      {/* Network */}
      <DialogField>
        <DialogLabel>Network</DialogLabel>
        <DialogNetworkContent token={token} appId={appId} />
      </DialogField>

      {/* Signer Selector */}
      <DialogField>
        <DialogLabel>Initial Signer</DialogLabel>
        <Controller
          name="signer"
          control={control}
          render={({ field }) => (
            <div>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={errors.signer ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select Signer" />
                </SelectTrigger>
                <SelectContent>
                  {availableSigners.map(member => (
                    <SelectItem key={member.address} value={member.address}>
                      <ExplorerLink
                        value={member.address}
                        appId={appId as AppId}
                        hasCopyButton={false}
                        disableTooltip
                        disableLink
                        size="xs"
                      />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableSigners.length === 0 && (
                <div className="mt-1 text-xs text-red-500">
                  No signers available. Only the address used to synchronize this multisig can initiate transfers.
                </div>
              )}
            </div>
          )}
        />
      </DialogField>

      {/* Info about multisig approval process */}
      <div className="p-3 bg-muted/50 rounded-md text-xs text-muted-foreground">
        <Info className="text-muted-foreground h-3.5 w-3.5 inline mr-1" />
        This will create a multisig transaction that requires {account.threshold} of {account.members.length} signatures to complete. After
        submitting, other signers will need to approve the transaction.
      </div>
    </form>
  )
}

function TransferMultisigDialogInner({ open, setOpen, token, appId, account }: TransferMultisigDialogProps) {
  const internalMembers = useMemo(() => account.members?.filter(member => member.internal) ?? [], [account.members])

  // For signing, we can only use members that have a derivation path
  const availableSigners = useMemo(() => internalMembers.filter(member => member.path), [internalMembers])

  // Initialize form with React Hook Form + Zod
  const form = useForm<TransferMultisigFormData>({
    resolver: zodResolver(transferMultisigFormSchema),
    defaultValues: {
      recipient: internalMembers[0]?.address ?? '',
      signer: availableSigners[0]?.address ?? '',
    },
  })

  // Calculate transfer amount with proper decimals
  const transferAmount = useMemo(() => {
    const baseAmount = Number.parseFloat(MULTISIG_TRANSFER_AMOUNT)
    const decimals = token.decimals || 0
    return (baseAmount * 10 ** decimals).toString()
  }, [token.decimals])

  // Wrap ledgerState$.createMultisigTransfer to match the generic hook's expected signature
  const createMultisigTransferTxFn = async (
    updateTxStatus: (status: TransactionStatus, message?: string, txDetails?: TransactionDetails) => void,
    appId: AppId
  ) => {
    await ledgerState$.createMultisigTransfer(appId, account, form.getValues(), transferAmount, updateTxStatus)
  }

  const { runTransaction, txStatus, clearTx, isTxFinished, isTxFailed, updateSynchronization, isSynchronizing } =
    useTransactionStatus(createMultisigTransferTxFn)

  // Handle form submission
  const onSubmit = async (_data: TransferMultisigFormData) => {
    await runTransaction(appId, account.address, account.path)
  }

  const synchronizeAccount = async () => {
    await updateSynchronization(ledgerState$.synchronizeAccount, appId)
    closeDialog()
  }

  // Reset state when dialog is closed
  const closeDialog = () => {
    form.reset()
    clearTx()
    setOpen(false)
  }

  // Check if form is ready for submission
  const recipient = form.watch('recipient')
  const signer = form.watch('signer')
  const isFormReadyForSubmission = Boolean(recipient && signer && !Object.keys(form.formState.errors).length && availableSigners.length > 0)

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent onOpenAutoFocus={e => e.preventDefault()} className="overflow-y-auto max-h-[100vh]">
        <DialogHeader>
          <DialogTitle>Transfer to Signatory</DialogTitle>
          <DialogDescription>
            Create a multisig transfer of {MULTISIG_TRANSFER_AMOUNT} {token.symbol} to a Ledger-derived signatory. This transaction will
            require approval from {account.threshold} of {account.members.length} signers.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {txStatus ? (
            <TransactionStatusBody {...txStatus} appId={appId} callHash={txStatus.callHash} />
          ) : (
            <TransferMultisigForm
              form={form}
              onSubmit={onSubmit}
              token={token}
              appId={appId}
              account={account}
              internalMembers={internalMembers}
              availableSigners={availableSigners}
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
            signTransfer={() => form.handleSubmit(onSubmit)()}
            isSignDisabled={Boolean(txStatus) || !isFormReadyForSubmission}
            mainButtonLabel="Create Transfer"
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function TransferMultisigDialog(props: TransferMultisigDialogProps) {
  const internalMembers = props.account.members?.filter(member => member.internal) ?? []
  if (internalMembers.length === 0) return null

  return <TransferMultisigDialogInner {...props} />
}
