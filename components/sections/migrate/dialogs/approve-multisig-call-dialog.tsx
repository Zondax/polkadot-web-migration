import { zodResolver } from '@hookform/resolvers/zod'
import { Info } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { MultisigAddress, MultisigCall, MultisigMember, TransactionDetails, TransactionStatus } from 'state/types/ledger'
import { z } from 'zod'
import type { UpdateTransactionStatus } from '@/lib/account'
import { CustomTooltip } from '@/components/CustomTooltip'
import { ExplorerLink } from '@/components/ExplorerLink'
import { useTokenLogo } from '@/components/hooks/useTokenLogo'
import { useTransactionStatus } from '@/components/hooks/useTransactionStatus'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Switch from '@/components/ui/switch'
import { type AppId, getChainName, type Token } from '@/config/apps'
import { ExplorerItemType } from '@/config/explorers'
import { formatBalance } from '@/lib/utils/format'
import { callDataValidationMessages, getAvailableSigners, validateCallData, type EnhancedMultisigMember } from '@/lib/utils/multisig'
import { type App, ledgerState$ } from '@/state/ledger'
import { DialogField, DialogLabel, DialogNetworkContent } from './common-dialog-fields'
import { TransactionDialogFooter, TransactionStatusBody } from './transaction-dialog'

// Enhanced Zod schema for form validation
const multisigCallFormSchema = z.object({
  callHash: z.string().min(1, 'Call hash is required'),
  signer: z.string().min(1, 'Signer is required'),
  nestedSigner: z.string().optional(), // Required when signer is a multisig
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
  const _icon = useTokenLogo(token.logoId)
  const _appName = getChainName(appId)

  const {
    control,
    watch,
    setValue,
    clearErrors,
    formState: { errors },
  } = form

  const selectedCallHash = watch('callHash')
  const callData = watch('callData')
  const selectedSigner = watch('signer')

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
  
  // Handle signer change
  const handleSignerChange = useCallback(
    (value: string) => {
      setValue('signer', value)
      setValue('nestedSigner', '') // Reset nested signer when signer changes
      clearErrors('nestedSigner')
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

  // Check if any available signers are multisig accounts with available nested signers
  const hasMultisigSignersWithAvailableMembers = availableSigners.some(signer => {
    const enhanced = signer as EnhancedMultisigMember
    return enhanced.isMultisig && enhanced.multisigData?.availableSigners && enhanced.multisigData.availableSigners.length > 0
  })
  
  // Consider signers available if there are multisig signers with members, even if they're not internal
  const hasUsableSigners = availableSigners.some(s => s.internal) || hasMultisigSignersWithAvailableMembers
  const noAvailableSigners = availableSigners.length === 0 || !hasUsableSigners
  
  // Find the selected signer and check if it's a multisig
  const selectedSignerData = availableSigners.find(s => s.address === selectedSigner) as EnhancedMultisigMember | undefined
  const isSelectedSignerMultisig = selectedSignerData?.isMultisig ?? false
  const nestedSigners = selectedSignerData?.multisigData?.availableSigners ?? []

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Multisig Address */}
      <DialogField>
        <DialogLabel>Multisig Address</DialogLabel>
        <ExplorerLink value={account.address} appId={appId as AppId} explorerLinkType={ExplorerItemType.Address} size="xs" />
      </DialogField>

      {/* Call Hash Selector */}
      <DialogField>
        <DialogLabel>Pending Call Hash</DialogLabel>
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
                      size="xs"
                    />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </DialogField>
      
      {/* Display Call Hash for Copy */}
      {selectedCallHash && (
        <DialogField>
          <DialogLabel>Call Hash (for sharing)</DialogLabel>
          <div className="p-2 bg-muted rounded text-xs font-mono break-all select-all">
            {selectedCallHash}
          </div>
          <div className="mt-2 p-3 bg-yellow-500/10 rounded-md">
            <div className="text-xs text-yellow-600 dark:text-yellow-400">
              <Info className="h-3.5 w-3.5 inline mr-1" />
              <span className="font-medium">Important:</span> 
              {isSelectedSignerMultisig ? (
                <> If this is the first approval using a nested multisig, the call data will be shown during signing. Save it for other signers.</>
              ) : (
                <> This is approving an existing multisig call. The call data should have been provided by whoever created this call.</>
              )}
            </div>
          </div>
        </DialogField>
      )}

      {/* Approvers */}
      {depositorAddress && approvers && approvers.length > 0 && (
        <DialogField>
          <DialogLabel>
            Approvers ({approvers.length}/{account.threshold})
          </DialogLabel>
          <div className="space-y-1">
            {approvers.map(approval => (
              <div key={approval} className="flex items-center gap-1">
                <ExplorerLink value={approval} appId={appId as AppId} explorerLinkType={ExplorerItemType.Address} size="xs" />
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
        </DialogField>
      )}

      {/* Deposit */}
      {deposit !== undefined && (
        <DialogField>
          <DialogLabel>Deposit</DialogLabel>
          <CustomTooltip tooltipBody={formatBalance(deposit, token, token?.decimals, true)}>
            <span className="font-mono">{formatBalance(deposit, token)}</span>
          </CustomTooltip>
        </DialogField>
      )}

      {/* Network */}
      <DialogField>
        <DialogLabel>Network</DialogLabel>
        <DialogNetworkContent token={token} appId={appId} />
      </DialogField>

      {/* Signer Selector */}
      <DialogField>
        <DialogLabel>Signer</DialogLabel>
        <Controller
          name="signer"
          control={control}
          render={({ field }) => (
            <div>
              <Select value={field.value} onValueChange={handleSignerChange} disabled={noAvailableSigners}>
                <SelectTrigger className={errors.signer || noAvailableSigners ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select Signer" />
                </SelectTrigger>
                <SelectContent>
                  {availableSigners.length > 0 ? (
                    availableSigners.map(member => {
                      const enhancedMember = member as EnhancedMultisigMember
                      return (
                        <SelectItem key={member.address} value={member.address}>
                          <div className="flex items-center gap-2">
                            <ExplorerLink
                              value={member.address}
                              appId={appId as AppId}
                              hasCopyButton={false}
                              disableTooltip
                              disableLink
                              size="xs"
                            />
                            {enhancedMember.isMultisig && (
                              <Badge variant="light-gray" className="text-[10px] leading-tight shrink-0">
                                Multisig
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      )
                    })
                  ) : (
                    <div className="px-3 py-2 text-xs text-muted-foreground">No available signers</div>
                  )}
                </SelectContent>
              </Select>
              {noAvailableSigners && availableSigners.length === 0 && (
                <div className="mt-1 text-xs text-red-500">
                  None of your addresses are enabled to sign. All your addresses have already approved this call.
                </div>
              )}
            </div>
          )}
        />
      </DialogField>

      {/* Nested Signer Selector - shows when selected signer is a multisig */}
      {isSelectedSignerMultisig && nestedSigners.length > 0 && (
        <DialogField>
          <DialogLabel>Nested Multisig Signer</DialogLabel>
          <Controller
            name="nestedSigner"
            control={control}
            render={({ field }) => (
              <div>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={errors.nestedSigner ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select Nested Signer" />
                  </SelectTrigger>
                  <SelectContent>
                    {nestedSigners.map(member => (
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
                <div className="mt-1 text-xs text-muted-foreground">
                  Select which member of the {selectedSignerData?.multisigData?.threshold} of {nestedSigners.length} multisig will sign
                </div>
              </div>
            )}
          />
        </DialogField>
      )}

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
                  align="end"
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
        <DialogField>
          <DialogLabel className="flex items-center gap-2 mb-1">
            Multisig Call Data
            <CustomTooltip
              tooltipBody="The multisig call data is required to be supplied to a final call to multi approvals. This should have been returned when the multisig call was originally created."
              className="mb-1"
            >
              <Info className="h-3.5 w-3.5 text-muted-foreground" aria-label="Info" />
            </CustomTooltip>
          </DialogLabel>
          <Controller
            name="callData"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="text"
                placeholder="Enter multisig call data for approval (e.g., 0x1234...)"
                error={!!errors.callData && !isValidatingCallData}
                helperText={renderCallDataHelperText()}
                className={`${
                  callData && selectedCallHash && !isValidatingCallData && !errors.callData ? 'border-green-500 focus:border-green-500' : ''
                }`}
              />
            )}
          />
        </DialogField>
      )}
    </form>
  )
}

// Helper to enhance members with multisig data
function enhanceMembers(members: MultisigMember[], app: App | undefined): EnhancedMultisigMember[] {
  if (!app?.multisigAccounts) return members.map(m => ({ ...m, isMultisig: false }))
  
  return members.map(member => {
    const multisigAccount = app.multisigAccounts?.find(ms => ms.address === member.address)
    
    if (multisigAccount) {
      // Get available signers from the nested multisig who have paths
      const availableSigners = multisigAccount.members.filter(m => m.internal && m.path)
      
      return {
        ...member,
        isMultisig: true,
        multisigData: {
          threshold: multisigAccount.threshold,
          availableSigners,
        },
      }
    }
    
    return { ...member, isMultisig: false }
  })
}

function ApproveMultisigCallDialogInner({ open, setOpen, token, appId, account }: ApproveMultisigCallDialogProps) {
  const pendingCalls = account.pendingMultisigCalls ?? []
  
  // Get app data to access multisig accounts
  const apps = ledgerState$.apps.apps.get()
  const currentApp = apps.find(app => app.id === appId)

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
  
  // Debug log to see form values
  useEffect(() => {
    console.log('[ApproveMultisigCallDialog] Form values changed:', {
      callHash: selectedCallHash,
      isFinalApprovalWithCall,
      callData,
      allFormValues: form.getValues()
    })
  }, [selectedCallHash, isFinalApprovalWithCall, callData, form])

  // Compute derived values only once per render
  const selectedCall = useMemo(() => pendingCalls.find(call => call.callHash === selectedCallHash), [pendingCalls, selectedCallHash])
  const approvers = useMemo(() => selectedCall?.signatories || [], [selectedCall])
  const isAllApproved = approvers.length === account.threshold
  const isLastApproval = approvers.length === account.threshold - 1
  const isCallDataRequired = (isLastApproval && isFinalApprovalWithCall) || isAllApproved
  
  console.log('[ApproveMultisigCallDialog] Approval state:', {
    approvers: approvers.length,
    threshold: account.threshold,
    isAllApproved,
    isLastApproval,
    isFinalApprovalWithCall,
    isCallDataRequired
  })

  // Enhance members with multisig data
  const enhancedMembers = useMemo(() => enhanceMembers(account.members, currentApp), [account.members, currentApp])
  
  const availableSigners = useMemo(() => {
    if (isAllApproved) return enhancedMembers
    return selectedCall ? getAvailableSigners(selectedCall, enhancedMembers) : []
  }, [isAllApproved, enhancedMembers, selectedCall])

  // State for call data validation (moved to parent)
  const [isValidatingCallData, setIsValidatingCallData] = useState(false)

  // Check if selected signer is a multisig
  const selectedSignerMember = availableSigners.find(s => s.address === form.watch('signer')) as EnhancedMultisigMember | undefined
  const isSignerMultisig = selectedSignerMember?.isMultisig ?? false
  const nestedSigner = form.watch('nestedSigner')
  
  // Check if form is ready for submission
  const isFormReadyForSubmission = Boolean(
    !(!callData && isCallDataRequired) && 
    selectedCallHash && 
    !Object.keys(form.formState.errors).length && 
    availableSigners.length > 0 &&
    (!isSignerMultisig || nestedSigner) // If signer is multisig, nested signer must be selected
  )
  
  console.log('[ApproveMultisigCallDialog] Form readiness:', {
    isFormReadyForSubmission,
    hasCallData: !!callData,
    isCallDataRequired,
    selectedCallHash: !!selectedCallHash,
    formErrors: Object.keys(form.formState.errors),
    availableSignersCount: availableSigners.length,
    isSignerMultisig,
    hasNestedSigner: !!nestedSigner
  })

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
      } catch (_error) {
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
    const formData = form.getValues()
    console.log('[ApproveMultisigCallDialog] Form data:', JSON.stringify(formData, null, 2))
    console.log('[ApproveMultisigCallDialog] Call Hash:', formData.callHash)
    console.log('[ApproveMultisigCallDialog] Call Data:', formData.callData)
    console.log('[ApproveMultisigCallDialog] Call Data length:', formData.callData?.length)
    console.log('[ApproveMultisigCallDialog] Is Final Approval:', formData.isFinalApprovalWithCall)
    console.log('[ApproveMultisigCallDialog] All form field values:', {
      callHash: form.getFieldState('callHash'),
      callData: form.getFieldState('callData'),
      isFinalApprovalWithCall: form.getFieldState('isFinalApprovalWithCall')
    })
    
    // Create a wrapper that always includes the callHash and callData from the form
    const updateTxStatusWithFormData: UpdateTransactionStatus = (status, message, txDetails) => {
      const updatedDetails = {
        ...txDetails,
        callHash: formData.callHash || txDetails?.callHash,
        callData: formData.callData || txDetails?.callData,
      }
      console.log('[ApproveMultisigCallDialog] Updating status:', status)
      console.log('[ApproveMultisigCallDialog] Message:', message)
      console.log('[ApproveMultisigCallDialog] Updated details:', updatedDetails)
      
      updateTxStatus(status, message, updatedDetails)
    }
    try {
      await ledgerState$.approveMultisigCall(appId, account, formData, updateTxStatusWithFormData)
    } catch (error) {
      console.error('[ApproveMultisigCallDialog] Error in approveMultisigCall:', error)
      throw error
    }
  }

  const { runTransaction, txStatus, clearTx, isTxFinished, isTxFailed, updateSynchronization, isSynchronizing } =
    useTransactionStatus(approveMultisigCallTxFn)

  // Handle form submission
  const onSubmit = async (_data: MultisigCallFormData) => {
    try {
      console.log('[ApproveMultisigCallDialog] onSubmit called with appId:', appId)
      await runTransaction(appId, account.address, account.path)
    } catch (error) {
      console.error('[ApproveMultisigCallDialog] Error in onSubmit:', error)
    }
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
            <>
              {console.log('[ApproveMultisigCallDialog] Rendering with txStatus:', txStatus)}
              <TransactionStatusBody {...txStatus} appId={appId} />
            </>
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

export default function ApproveMultisigCallDialog(props: ApproveMultisigCallDialogProps) {
  const pendingCalls = props.account.pendingMultisigCalls ?? []
  if (pendingCalls.length === 0) return null

  return <ApproveMultisigCallDialogInner {...props} />
}
