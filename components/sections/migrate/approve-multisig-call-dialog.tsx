import { ExplorerLink } from '@/components/ExplorerLink'
import { useTokenLogo } from '@/components/hooks/useTokenLogo'
import { useTransactionStatus } from '@/components/hooks/useTransactionStatus'
import TokenIcon from '@/components/TokenIcon'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { type AppId, type Token, getChainName } from '@/config/apps'
import { ExplorerItemType } from '@/config/explorers'
import { formatBalance } from '@/lib/utils/format'
import { callDataValidationMessages, validateCallData } from '@/lib/utils/multisig'
import { ledgerState$ } from '@/state/ledger'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { MultisigAddress, MultisigCall, MultisigMember, TransactionDetails, TransactionStatus } from 'state/types/ledger'
import { z } from 'zod'
import { TransactionDialogFooter, TransactionStatusBody } from './transaction-dialog'

// Enhanced Zod schema for form validation
const multisigCallFormSchema = z.object({
  callHash: z.string().min(1, 'Call hash is required'),
  signer: z.string().min(1, 'Signer is required'),
  callData: z
    .string()
    .min(1, callDataValidationMessages.isRequired)
    .regex(/^0x[a-fA-F0-9]+$/, callDataValidationMessages.isInvalidFormat),
})

export type MultisigCallFormData = z.infer<typeof multisigCallFormSchema>

interface ApproveMultisigCallDialogProps {
  open: boolean
  setOpen: (open: boolean) => void
  token: Token
  appId: AppId
  account: MultisigAddress
}

interface MultisigCallFormProps {
  pendingCalls: MultisigCall[]
  internalMembers: MultisigMember[]
  token: Token
  appId: AppId
  account: MultisigAddress
  onClose: () => void
  form: ReturnType<typeof useForm<MultisigCallFormData>>
  onSubmit: (data: MultisigCallFormData) => void
  isValidatingCallData: boolean
}

function MultisigCallForm({
  pendingCalls,
  internalMembers,
  token,
  appId,
  account,
  form,
  onSubmit,
  isValidatingCallData,
}: MultisigCallFormProps) {
  const icon = useTokenLogo(token.logoId)
  const appName = getChainName(appId)

  const {
    control,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = form

  const selectedCallHash = watch('callHash')
  const callData = watch('callData')

  const selectedCall: MultisigCall | undefined = useMemo(
    () => pendingCalls.find(call => call.callHash === selectedCallHash),
    [pendingCalls, selectedCallHash]
  )

  const depositorAddress = selectedCall?.depositor
  const existingApprovals = selectedCall?.signatories
  const deposit = selectedCall?.deposit

  // Handle call hash change
  const handleCallHashChange = (value: string) => {
    setValue('callHash', value)
    setValue('callData', '') // Reset call data when hash changes
    clearErrors('callData')
  }

  // Filter available signers (exclude those who already approved)
  const availableSigners = internalMembers.filter(member => !existingApprovals?.includes(member.address))

  const renderCallDataHelperText = (): string | undefined => {
    if (isValidatingCallData) {
      return callDataValidationMessages.validating
    }
    if (errors.callData?.message) {
      return errors.callData.message
    }
    if (callData && selectedCallHash && !isValidatingCallData) {
      return callDataValidationMessages.correct
    }
    return undefined
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Multisig Address */}
      <div>
        <div className="text-xs text-muted-foreground mb-1">Multisig Address</div>
        <ExplorerLink value={account.address} appId={appId as AppId} explorerLinkType={ExplorerItemType.Address} />
      </div>

      {/* Call Hash Selector */}
      <div>
        <div className="text-xs text-muted-foreground mb-1">Pending Call Hash</div>
        {pendingCalls.length > 1 ? (
          <Controller
            name="callHash"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={handleCallHashChange}>
                <SelectTrigger className={errors.callHash ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select Call Hash" />
                </SelectTrigger>
                <SelectContent>
                  {pendingCalls.map(call => (
                    <SelectItem key={call.callHash} value={call.callHash}>
                      {call.callHash}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        ) : (
          <ExplorerLink
            value={selectedCall?.callHash ?? '-'}
            appId={appId as AppId}
            explorerLinkType={ExplorerItemType.Address}
            disableTooltip
            disableLink
          />
        )}
      </div>

      {/* Existing Approvals */}
      {depositorAddress && existingApprovals && existingApprovals.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Existing Approvals</div>
          <div className="space-y-1">
            {existingApprovals.map(approval => (
              <div key={approval} className="flex items-center gap-1">
                <ExplorerLink value={approval} appId={appId as AppId} explorerLinkType={ExplorerItemType.Address} />
                {approval === depositorAddress && (
                  <Badge variant="light-gray" className="text-[10px] leading-tight shrink-0">
                    Depositor
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deposit */}
      {deposit !== undefined && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Deposit</div>
          <span className="text-sm font-mono">{formatBalance(deposit, token)}</span>
        </div>
      )}

      {/* Network */}
      <div>
        <div className="text-xs text-muted-foreground mb-1">Network</div>
        <div className="flex items-center gap-2">
          <TokenIcon icon={icon} symbol={token.symbol} size="md" />
          <span className="font-semibold text-base">{appName}</span>
        </div>
      </div>

      {/* Signer Selector */}
      <div>
        <div className="text-xs text-muted-foreground mb-1">Signer</div>
        <Controller
          name="signer"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className={errors.signer ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select Signer" />
              </SelectTrigger>
              <SelectContent>
                {availableSigners.map(member => (
                  <SelectItem key={member.address} value={member.address}>
                    <ExplorerLink value={member.address} appId={appId as AppId} hasCopyButton={false} disableTooltip disableLink />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Call Data Input with Validation */}
      <div>
        <div className="text-xs text-muted-foreground mb-1">Call Data</div>
        <Controller
          name="callData"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              type="text"
              placeholder="Enter call data for approval (e.g., 0x1234...)"
              error={!!errors.callData && !isValidatingCallData}
              helperText={renderCallDataHelperText()}
              className={`${
                callData && selectedCallHash && !isValidatingCallData && !errors.callData ? 'border-green-500 focus:border-green-500' : ''
              }`}
            />
          )}
        />
      </div>
    </form>
  )
}

export default function ApproveMultisigCallDialog({ open, setOpen, token, appId, account }: ApproveMultisigCallDialogProps) {
  const pendingCalls = account.pendingMultisigCalls ?? []
  const internalMembers: MultisigMember[] = account.members?.filter(m => m.internal) ?? []

  // Initialize form with React Hook Form + Zod
  const form = useForm<MultisigCallFormData>({
    resolver: zodResolver(multisigCallFormSchema),
    defaultValues: {
      callHash: pendingCalls[0]?.callHash ?? '',
      signer: internalMembers[0]?.address ?? '',
      callData: '',
    },
  })

  // State for call data validation (moved to parent)
  const [isValidatingCallData, setIsValidatingCallData] = useState(false)

  // Check if form is ready for submission
  const callData = form.watch('callData')
  const selectedCallHash = form.watch('callHash')
  const isFormReadyForSubmission = Boolean(callData && selectedCallHash && !Object.keys(form.formState.errors).length)

  // Validate call data using utility function
  const validateCallDataHandler = useCallback(
    async (callDataValue: string, callHashValue: string) => {
      setIsValidatingCallData(true)

      try {
        const result = await validateCallData(appId, callDataValue, callHashValue)

        if (!result.isValid && result.error) {
          form.setError('callData', {
            type: 'custom',
            message: result.error,
          })
        } else {
          form.clearErrors('callData')
        }
      } catch (error) {
        form.setError('callData', {
          type: 'custom',
          message: callDataValidationMessages.failed,
        })
      } finally {
        setIsValidatingCallData(false)
      }
    },
    [appId, form]
  )

  // Effect to validate call data when it changes
  useEffect(() => {
    validateCallDataHandler(callData, selectedCallHash)
  }, [callData, selectedCallHash, validateCallDataHandler])

  // Wrap ledgerState$.approveMultisigCall to match the generic hook's expected signature
  const approveMultisigCallTxFn = async (
    updateTxStatus: (status: TransactionStatus, message?: string, txDetails?: TransactionDetails) => void,
    appId: AppId
  ) => {
    await ledgerState$.approveMultisigCall(appId, account, form.getValues(), updateTxStatus)
  }

  const { runTransaction, txStatus, clearTx, isTxFinished, isTxFailed, updateSynchronization, isSynchronizing } =
    useTransactionStatus(approveMultisigCallTxFn)

  // Handle form submission
  const onSubmit = async (data: MultisigCallFormData) => {
    await runTransaction(appId, account.address, account.path)
  }

  const synchronizeAccount = async () => {
    await updateSynchronization(ledgerState$.synchronizeAccount, appId)
    closeDialog()
  }

  // Reset state when dialog is closed
  const closeDialog = () => {
    form.reset()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve Multisig Call</DialogTitle>
          <DialogDescription>
            Approve a pending multisig call for this address. Select the call, signer, and provide the call data for final approval.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {txStatus ? (
            <TransactionStatusBody {...txStatus} />
          ) : (
            <MultisigCallForm
              pendingCalls={pendingCalls}
              internalMembers={internalMembers}
              token={token}
              appId={appId}
              account={account}
              onClose={closeDialog}
              form={form}
              onSubmit={onSubmit}
              isValidatingCallData={isValidatingCallData}
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
            isSignDisabled={Boolean(txStatus) || !isFormReadyForSubmission || isValidatingCallData}
            mainButtonLabel="Approve"
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
