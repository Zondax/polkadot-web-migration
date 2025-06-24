import { CustomTooltip } from '@/components/CustomTooltip'
import { ExplorerLink } from '@/components/ExplorerLink'
import TokenIcon from '@/components/TokenIcon'
import { useTokenLogo } from '@/components/hooks/useTokenLogo'
import { useTransactionStatus } from '@/components/hooks/useTransactionStatus'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Switch from '@/components/ui/switch'
import { type AppId, type Token, getChainName } from '@/config/apps'
import { ExplorerItemType } from '@/config/explorers'
import { formatBalance } from '@/lib/utils/format'
import { callDataValidationMessages, getAvailableSigners, validateCallData } from '@/lib/utils/multisig'
import { ledgerState$ } from '@/state/ledger'
import { zodResolver } from '@hookform/resolvers/zod'
import { Info } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { MultisigAddress, MultisigCall, MultisigMember, TransactionDetails, TransactionStatus } from 'state/types/ledger'
import { z } from 'zod'
import { TransactionDialogFooter, TransactionStatusBody } from './transaction-dialog'

// Enhanced Zod schema for form validation
const multisigCallFormSchema = z.object({
  callHash: z.string().min(1, 'Call hash is required'),
  signer: z.string().min(1, 'Signer is required'),
  isFinalApprovalWithCall: z.boolean().optional(),
  callData: z.string().optional().or(z.literal('')),
})

export type MultisigCallFormData = z.infer<typeof multisigCallFormSchema>

interface ApproveMultisigCallDialogProps {
  open: boolean
  setOpen: (open: boolean) => void
  token: Token
  appId: AppId
  account: MultisigAddress
}

function MultisigCallForm({
  form,
  onSubmit,
  token,
  appId,
  account,
  pendingCalls,
  availableSigners,
  selectedCall,
  approvers,
  isLastApproval,
  isCallDataRequired,
  isValidatingCallData,
}: {
  form: ReturnType<typeof useForm<MultisigCallFormData>>
  onSubmit: (data: MultisigCallFormData) => void
  token: Token
  appId: AppId
  account: MultisigAddress
  pendingCalls: MultisigCall[]
  availableSigners: MultisigMember[]
  selectedCall: MultisigCall | undefined
  approvers: string[]
  isLastApproval: boolean
  isCallDataRequired: boolean
  isValidatingCallData: boolean
}) {
  const icon = useTokenLogo(token.logoId)
  const appName = getChainName(appId)

  const {
    control,
    watch,
    setValue,
    clearErrors,
    formState: { errors },
  } = form

  const selectedCallHash = watch('callHash')
  const callData = watch('callData')

  const depositorAddress = selectedCall?.depositor
  const deposit = selectedCall?.deposit

  // Handle call hash change
  const handleCallHashChange = useCallback(
    (value: string) => {
      setValue('callHash', value)
      setValue('callData', '') // Reset call data when hash changes
      clearErrors('callData')
    },
    [setValue, clearErrors]
  )

  const renderCallDataHelperText = useCallback((): string | undefined => {
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
  }, [isValidatingCallData, errors.callData?.message, callData, selectedCallHash])

  const noAvailableSigners = availableSigners.length === 0

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
                    <ExplorerLink
                      value={call.callHash}
                      appId={appId as AppId}
                      explorerLinkType={ExplorerItemType.Address}
                      disableTooltip
                      disableLink
                      hasCopyButton={false}
                    />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Approvers */}
      {depositorAddress && approvers && approvers.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Approvers ({approvers.length}/{account.threshold})
          </div>
          <div className="space-y-1">
            {approvers.map(approval => (
              <div key={approval} className="flex items-center gap-1">
                <ExplorerLink value={approval} appId={appId as AppId} explorerLinkType={ExplorerItemType.Address} />
                {approval === depositorAddress && (
                  <CustomTooltip tooltipBody="The depositor is the account that submitted the multisig call and paid the initial deposit.">
                    <Badge variant="light-gray" className="text-[10px] leading-tight shrink-0">
                      Depositor
                    </Badge>
                  </CustomTooltip>
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
            <div>
              <Select value={field.value} onValueChange={field.onChange} disabled={noAvailableSigners}>
                <SelectTrigger className={errors.signer || noAvailableSigners ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select Signer" />
                </SelectTrigger>
                <SelectContent>
                  {availableSigners.length > 0 ? (
                    availableSigners.map(member => (
                      <SelectItem key={member.address} value={member.address}>
                        <ExplorerLink value={member.address} appId={appId as AppId} hasCopyButton={false} disableTooltip disableLink />
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-muted-foreground">No available signers</div>
                  )}
                </SelectContent>
              </Select>
              {availableSigners.length === 0 && (
                <div className="mt-1 text-xs text-red-500">
                  None of your addresses are enabled to sign. All your addresses have already approved this call.
                </div>
              )}
            </div>
          )}
        />
      </div>

      {/* Switch for multisig message with call (for final approval) */}
      {isLastApproval && (
        <div className="flex items-center gap-3 mt-2">
          <Controller
            name="isFinalApprovalWithCall"
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Switch
                  checked={Boolean(field.value)}
                  onCheckedChange={field.onChange}
                  id="final-approval-switch"
                  aria-labelledby="final-approval-switch-label"
                />
                <label htmlFor="final-approval-switch" id="final-approval-switch-label" className="text-sm cursor-pointer">
                  Multisig message with call (for final approval)
                </label>
                <CustomTooltip
                  tooltipBody="Swap to a non-executing approval type, with subsequent calls providing the actual call data."
                  className="ml-1"
                >
                  <Info className="h-4 w-4 text-muted-foreground" aria-label="Info" />
                </CustomTooltip>
              </div>
            )}
          />
        </div>
      )}

      {/* Multisig Call Data Input with Validation */}
      {isCallDataRequired && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="text-xs text-muted-foreground">Multisig Call Data</div>
            <CustomTooltip
              tooltipBody="The multisig call data is required to be supplied to a final call to multi approvals. This should have been returned when the multisig call was originally created."
              className="mb-1"
            >
              <Info className="h-3.5 w-3.5 text-muted-foreground" aria-label="Info" />
            </CustomTooltip>
          </div>
          <Controller
            name="callData"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="text"
                placeholder="Enter multisigcall data for approval (e.g., 0x1234...)"
                error={!!errors.callData && !isValidatingCallData}
                helperText={renderCallDataHelperText()}
                className={`${
                  callData && selectedCallHash && !isValidatingCallData && !errors.callData ? 'border-green-500 focus:border-green-500' : ''
                }`}
              />
            )}
          />
        </div>
      )}
    </form>
  )
}

export default function ApproveMultisigCallDialog({ open, setOpen, token, appId, account }: ApproveMultisigCallDialogProps) {
  const pendingCalls = account.pendingMultisigCalls ?? []
  if (pendingCalls.length === 0) return null

  // Initialize form with React Hook Form + Zod
  const form = useForm<MultisigCallFormData>({
    resolver: zodResolver(multisigCallFormSchema),
    defaultValues: {
      callHash: pendingCalls[0]?.callHash ?? '',
      signer: getAvailableSigners(pendingCalls[0], account.members)[0]?.address ?? undefined,
      isFinalApprovalWithCall: pendingCalls[0].signatories.length === account.threshold,
      callData: '',
    },
  })

  // Watch only what you need
  const selectedCallHash = form.watch('callHash')
  const isFinalApprovalWithCall = form.watch('isFinalApprovalWithCall')
  const callData = form.watch('callData')

  // Compute derived values only once per render
  const selectedCall = useMemo(() => pendingCalls.find(call => call.callHash === selectedCallHash), [pendingCalls, selectedCallHash])
  const approvers = useMemo(() => selectedCall?.signatories || [], [selectedCall])
  const isAllApproved = approvers.length === account.threshold
  const isLastApproval = approvers.length === account.threshold - 1
  const isCallDataRequired = (isLastApproval && isFinalApprovalWithCall) || isAllApproved

  const availableSigners = useMemo(() => {
    if (isAllApproved) return account.members
    return selectedCall ? getAvailableSigners(selectedCall, account.members) : []
  }, [isAllApproved, account.members, selectedCall])

  // State for call data validation (moved to parent)
  const [isValidatingCallData, setIsValidatingCallData] = useState(false)

  // Check if form is ready for submission
  const isFormReadyForSubmission = Boolean(
    !(!callData && isCallDataRequired) && selectedCallHash && !Object.keys(form.formState.errors).length && availableSigners.length > 0
  )

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
    if (selectedCallHash && callData) {
      validateCallDataHandler(callData, selectedCallHash)
    }
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
    clearTx()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent onOpenAutoFocus={e => e.preventDefault()} className="overflow-y-auto max-h-[100vh]">
        <DialogHeader>
          <DialogTitle>Approve Multisig Call</DialogTitle>
          <DialogDescription>
            Approve a pending multisig call for this address. Select the call hash, signer, and provide the call data for final approval.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {txStatus ? (
            <TransactionStatusBody {...txStatus} />
          ) : (
            <MultisigCallForm
              form={form}
              onSubmit={onSubmit}
              token={token}
              appId={appId}
              account={account}
              pendingCalls={pendingCalls}
              availableSigners={availableSigners}
              selectedCall={selectedCall}
              approvers={approvers}
              isLastApproval={isLastApproval}
              isCallDataRequired={isCallDataRequired}
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
