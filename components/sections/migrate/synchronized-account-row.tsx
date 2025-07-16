import { observer } from '@legendapp/state/react'
import { BN } from '@polkadot/util'
import type { CheckedState } from '@radix-ui/react-checkbox'
import {
  AlertCircle,
  AlertTriangle,
  Banknote,
  BanknoteArrowDown,
  Check,
  Group,
  Hash,
  Info,
  KeyRound,
  LockOpen,
  Route,
  Shield,
  Trash2,
  User,
  UserCog,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { Collections } from 'state/ledger'
import type { Address, AddressBalance, MultisigAddress, MultisigMember } from 'state/types/ledger'
import { CustomTooltip, TooltipBody, type TooltipItem } from '@/components/CustomTooltip'
import { ExplorerLink } from '@/components/ExplorerLink'
import type { ToggleAccountSelection, UpdateTransaction } from '@/components/hooks/useSynchronization'
import { Spinner } from '@/components/icons'
import { Badge } from '@/components/ui/badge'
import { Button, type ButtonProps } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TableCell, TableRow } from '@/components/ui/table'
import type { AppId, Token } from '@/config/apps'
import { ExplorerItemType } from '@/config/explorers'
import { formatBalance, isMultisigAddress as isMultisigAddressFunction } from '@/lib/utils'
import { canUnstake, hasStakedBalance, isNativeBalance } from '@/lib/utils/balance'
import { getAvailableSigners, getRemainingInternalSigners, getRemainingSigners } from '@/lib/utils/multisig'
import { getIdentityItems } from '@/lib/utils/ui'
import { BalanceHoverCard, NativeBalanceHoverCard } from './balance-hover-card'
import { BalanceType } from './balance-visualizations'
import DestinationAddressSelect from './destination-address-select'
import ApproveMultisigCallDialog from './dialogs/approve-multisig-call-dialog'
import RemoveAccountIndexDialog from './dialogs/remove-account-index-dialog'
import RemoveIdentityDialog from './dialogs/remove-identity-dialog'
import RemoveProxyDialog from './dialogs/remove-proxy-dialog'
import UnstakeDialog from './dialogs/unstake-dialog'
import WithdrawDialog from './dialogs/withdraw-dialog'

// Component for rendering a single synchronized account row
interface AccountBalanceRowProps {
  account: MultisigAddress | Address
  accountIndex: number
  balance?: AddressBalance
  balanceIndex?: number
  rowSpan: number
  collections?: Collections
  token: Token
  polkadotAddresses: string[]
  updateTransaction: UpdateTransaction
  appId: AppId
  toggleAccountSelection: ToggleAccountSelection
  isSelected: boolean
}

interface Action {
  label: string
  tooltip?: string
  onClick: () => void
  disabled: boolean
  icon?: React.ReactNode
  variant?: ButtonProps['variant']
}

const SynchronizedAccountRow = ({
  account,
  accountIndex,
  balance,
  balanceIndex,
  rowSpan,
  collections,
  token,
  polkadotAddresses,
  updateTransaction,
  appId,
  toggleAccountSelection,
  isSelected,
}: AccountBalanceRowProps) => {
  const [unstakeOpen, setUnstakeOpen] = useState<boolean>(false)
  const [withdrawOpen, setWithdrawOpen] = useState<boolean>(false)
  const [removeIdentityOpen, setRemoveIdentityOpen] = useState<boolean>(false)
  const [approveMultisigCallOpen, setApproveMultisigCallOpen] = useState<boolean>(false)
  const [removeProxyOpen, setRemoveProxyOpen] = useState<boolean>(false)
  const [removeAccountIndexOpen, setRemoveAccountIndexOpen] = useState<boolean>(false)
  const isNoBalance: boolean = balance === undefined
  const isFirst: boolean = balanceIndex === 0 || isNoBalance
  const isNative = isNativeBalance(balance)
  const hasStaked: boolean = isNative && hasStakedBalance(balance)
  const stakingActive: BN | undefined = isNative ? balance?.balance.staking?.active : undefined
  const maxUnstake: BN = stakingActive ?? new BN(0)
  const isUnstakeAvailable: boolean = isNative ? canUnstake(balance) : false
  const totalBalance: BN = isNative ? balance.balance.total : new BN(0)
  const isMultisigMember: boolean = (account.memberMultisigAddresses && account.memberMultisigAddresses.length > 0) ?? false
  const isMultisigAddress: boolean = isMultisigAddressFunction(account)
  const internalMultisigMembers: MultisigMember[] = (account as MultisigAddress).members?.filter(member => member.internal) ?? []
  const signatoryAddress: string = balance?.transaction?.signatoryAddress ?? ''
  const isProxied: boolean = (account.proxy?.proxies.length ?? 0) > 0

  const actions: Action[] = []
  if (hasStaked) {
    actions.push({
      label: 'Unstake',
      tooltip: !isUnstakeAvailable ? 'Only the controller address can unstake this balance' : 'Unlock your staked assets',
      onClick: () => setUnstakeOpen(true),
      disabled: !isUnstakeAvailable,
      icon: <LockOpen className="h-4 w-4" />,
    })
  }
  const canWithdraw: boolean = isNative ? (balance?.balance.staking?.unlocking?.some(u => u.canWithdraw) ?? false) : false
  if (canWithdraw) {
    actions.push({
      label: 'Withdraw',
      tooltip: 'Move your unstaked assets to your available balance',
      onClick: () => setWithdrawOpen(true),
      disabled: false,
      icon: <BanknoteArrowDown className="h-4 w-4" />,
    })
  }

  if (account.registration?.identity) {
    const identityItems = getIdentityItems(account.registration, appId)
    if (identityItems.length > 0) {
      actions.push({
        label: 'Identity',
        tooltip: account.registration?.canRemove
          ? 'Remove account identity'
          : 'Account identity cannot be removed because it has a parent account',
        onClick: () => setRemoveIdentityOpen(true),
        disabled: !account.registration?.canRemove,
        icon: <Trash2 className="h-4 w-4" />,
      })
    }
  }

  // --- Multisig pending call action logic ---
  let hasMultisigPending = false
  let hasRemainingInternalSigners = false
  let hasRemainingSigners = false
  let hasAvailableSigners = false
  let multisigPendingTooltip: React.ReactNode = null
  if (isMultisigAddress && (account as MultisigAddress).pendingMultisigCalls.length > 0) {
    hasMultisigPending = true
    // For each pending call, check if there are available signers
    const pendingCalls = (account as MultisigAddress).pendingMultisigCalls
    const members = (account as MultisigAddress).members
    // If at least one call has available signers, allow action
    hasRemainingInternalSigners = pendingCalls.some(call => getRemainingInternalSigners(call, members).length > 0)
    hasRemainingSigners = pendingCalls.some(call => getRemainingSigners(call, members).length > 0)
    hasAvailableSigners = getAvailableSigners(members).length > 0

    if (!hasRemainingInternalSigners) {
      // Compose tooltip for all pending calls
      multisigPendingTooltip = (
        <div className="p-2 min-w-[320px]">
          <div className="font-semibold mb-2">Pending multisig approvals</div>
          {pendingCalls.map(call => {
            const approvers = call.signatories
            const notApproved = members.filter(m => !approvers.includes(m.address))
            return (
              <div key={call.callHash} className="mb-3 last:mb-0">
                <div className="text-xs text-muted-foreground mb-1">Call Hash:</div>
                <ExplorerLink value={call.callHash} appId={appId} explorerLinkType={ExplorerItemType.Address} size="xs" />
                <div className="flex flex-col gap-1 mt-2">
                  <div className="text-xs text-muted-foreground">
                    Approvers ({approvers.length}/{(account as MultisigAddress).threshold}):
                  </div>
                  <div className="flex flex-col flex-wrap gap-1">
                    {approvers.map(addr => (
                      <span key={addr} className="flex items-center gap-1">
                        <ExplorerLink value={addr} appId={appId} explorerLinkType={ExplorerItemType.Address} size="xs" />
                        {addr === call.depositor && (
                          <Badge variant="light-gray" className="text-[10px] leading-tight shrink-0">
                            Depositor
                          </Badge>
                        )}
                      </span>
                    ))}
                  </div>
                  {!hasRemainingSigners && <div className="text-xs text-yellow-500 mt-2">Waiting for a signer to submit the call data</div>}
                  {hasRemainingSigners && (
                    <>
                      <div className="text-xs text-yellow-500 mt-2">Still needs approval from:</div>
                      <div className="flex flex-wrap gap-1">
                        {notApproved.map(member => (
                          <span key={member.address} className="flex items-center gap-1">
                            <ExplorerLink value={member.address} appId={appId} explorerLinkType={ExplorerItemType.Address} size="xs" />
                            {member.internal && (
                              <Badge variant="light-gray" className="text-[10px] leading-tight shrink-0">
                                Own
                              </Badge>
                            )}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )
    }
  }
  if (hasMultisigPending && hasAvailableSigners && !hasRemainingSigners) {
    actions.push({
      label: 'Multisig Call',
      tooltip: 'Approve multisig pending calls',
      onClick: () => setApproveMultisigCallOpen(true),
      disabled: false,
      icon: <Users className="h-4 w-4" />,
    })
  }

  if (account.index?.index) {
    actions.push({
      label: 'Account Index',
      tooltip: 'Remove account index',
      onClick: () => setRemoveAccountIndexOpen(true),
      disabled: false,
      icon: <Trash2 className="h-4 w-4" />,
    })
  }

  // Determine if multisig account is not ready to migrate
  const isMultisigNotReadyToMigrate = isMultisigAddress && hasMultisigPending && !hasRemainingInternalSigners

  // Deselect and disable checkbox if multisig is not ready to migrate
  const effectiveIsSelected = isMultisigNotReadyToMigrate ? false : isSelected
  const isCheckboxDisabled = isMultisigNotReadyToMigrate

  useEffect(() => {
    if (isMultisigNotReadyToMigrate) {
      toggleAccountSelection(appId, account.address, false)
    }
  }, [isMultisigNotReadyToMigrate, toggleAccountSelection, appId, account.address])

  const handleCheckboxChange = useCallback(
    (checked: CheckedState) => {
      // Don't allow selection if multisig is not ready to migrate
      if (isMultisigNotReadyToMigrate) {
        return
      }
      toggleAccountSelection(appId, account.address, checked === true)
    },
    [toggleAccountSelection, appId, account.address, isMultisigNotReadyToMigrate]
  )

  if (isMultisigAddress && internalMultisigMembers.length === 0) {
    // it shouldn't happen, but if it does, we don't want to render the row
    return null
  }

  if (isProxied) {
    actions.push({
      label: 'Proxy',
      tooltip: 'Remove proxy',
      onClick: () => setRemoveProxyOpen(true),
      disabled: false,
      icon: <Trash2 className="h-4 w-4" />,
    })
  }

  const renderStatusIcon = (account: Address): React.ReactNode | null => {
    let statusIcon: React.ReactNode | null = null
    let tooltipContent = 'Checking status...'

    if (account.isLoading) {
      statusIcon = <Spinner />
      tooltipContent = 'Loading...'
    }

    return statusIcon ? <CustomTooltip tooltipBody={tooltipContent}>{statusIcon}</CustomTooltip> : null
  }

  const transferableBalance: BN = isNative && balance?.balance.transferable ? balance.balance.transferable : new BN(0)

  const renderTransferableBalance = () => {
    const balances: AddressBalance[] = balance ? [balance] : []

    return (
      <div className="flex flex-row items-center justify-end gap-2">
        <CustomTooltip tooltipBody={formatBalance(transferableBalance, token, token?.decimals, true)}>
          <span className="font-mono">{formatBalance(transferableBalance, token)}</span>
        </CustomTooltip>
        {!isNative ? <BalanceHoverCard balances={balances} collections={collections} token={token} isMigration /> : null}
      </div>
    )
  }

  const tooltipAddress = (): React.ReactNode => {
    const items: TooltipItem[] = [
      {
        label: 'Source Address',
        value: (
          <ExplorerLink
            value={account.address ?? ''}
            appId={appId}
            explorerLinkType={ExplorerItemType.Address}
            disableTooltip
            truncate={false}
            className="break-all"
            size="xs"
          />
        ),
        icon: User,
      },
    ]

    if (!isMultisigAddress) {
      items.push(
        { label: 'Derivation Path', value: account.path, icon: Route },
        { label: 'Public Key', value: account.pubKey, icon: KeyRound, hasCopyButton: true }
      )
    }

    if (account.index?.index) {
      items.push({ label: 'Account Index', value: account.index.index, icon: Hash })
    }

    return (
      <div className="p-2 min-w-[320px]">
        <TooltipBody items={items} />
      </div>
    )
  }

  const tooltipMultisig = (): React.ReactNode => {
    const items: TooltipItem[] = []
    if (isMultisigAddress) {
      const multisigAccount = account as MultisigAddress
      const memberCount = multisigAccount.members?.length ?? 0

      // Create members component to display member addresses
      const membersComponent = (
        <div className="flex flex-col gap-1">
          {multisigAccount.members?.map(member => (
            <div key={member.address} className="flex items-center gap-1">
              <ExplorerLink
                value={member.address}
                appId={appId}
                explorerLinkType={ExplorerItemType.Address}
                truncate={false}
                disableTooltip
                className="break-all"
                size="xs"
              />
              {member.internal && (
                <Badge variant="light-gray" className="text-[10px] leading-tight shrink-0">
                  Own
                </Badge>
              )}
            </div>
          ))}
        </div>
      )

      items.push(
        {
          label: 'Multisig address',
          value: (
            <ExplorerLink
              value={account.address}
              appId={appId}
              explorerLinkType={ExplorerItemType.Address}
              truncate={false}
              disableTooltip
              hasCopyButton
              className="break-all"
              size="xs"
            />
          ),
          icon: User,
        },
        { label: 'Threshold', value: multisigAccount.threshold?.toString() ?? '-', icon: Shield },
        { label: `Members (${memberCount})`, value: membersComponent, icon: Users }
      )
    }
    if (isMultisigMember) {
      items.push({
        label: 'Multisig member of',
        value: (
          <ExplorerLink
            value={account.memberMultisigAddresses?.[0] ?? ''}
            appId={appId}
            explorerLinkType={ExplorerItemType.Address}
            truncate={false}
            disableTooltip
            hasCopyButton
            className="break-all"
            size="xs"
          />
        ),
        icon: User,
      })
    }
    return (
      <div className="p-2 min-w-[320px]">
        <TooltipBody items={items} />
      </div>
    )
  }

  const tooltipIdentity = (): React.ReactNode => {
    if (!account.registration?.identity) return null
    return (
      <div className="p-2 min-w-[240px]">
        <TooltipBody items={getIdentityItems(account.registration, appId)} />
      </div>
    )
  }

  const tooltipProxy = (): React.ReactNode => {
    const items: TooltipItem[] = []
    if (isProxied) {
      // Create members component to display member addresses
      const proxiesComponent = account.proxy?.proxies ? (
        <div className="flex flex-col gap-1">
          {account.proxy?.proxies?.map(proxy => (
            <div key={proxy.address} className="flex items-center gap-1">
              <ExplorerLink
                value={proxy.address}
                appId={appId}
                explorerLinkType={ExplorerItemType.Address}
                truncate={false}
                disableTooltip
                className="break-all"
                size="xs"
              />
            </div>
          ))}
        </div>
      ) : null

      items.push({ label: 'Proxied by', value: proxiesComponent ?? '-', icon: User, hasCopyButton: true })
      items.push({
        label: 'Deposit',
        value: formatBalance(account.proxy?.deposit ?? new BN(0), token),
        icon: Banknote,
        className: 'font-mono',
      })
    }
    return items.length > 0 ? (
      <div className="p-2 min-w-[240px]">
        <TooltipBody items={items} />
      </div>
    ) : null
  }

  const renderMultisigSignatoryAddress = () => {
    if (internalMultisigMembers.length === 1 && signatoryAddress) {
      // Single internal member - just show the address
      return (
        <ExplorerLink
          value={signatoryAddress}
          appId={appId as AppId}
          explorerLinkType={ExplorerItemType.Address}
          disableTooltip
          className="break-all"
        />
      )
    }

    // Multiple internal members - show a select dropdown
    return (
      <Select
        value={signatoryAddress}
        onValueChange={value =>
          balanceIndex !== undefined ? updateTransaction({ signatoryAddress: value }, appId, accountIndex, balanceIndex, true) : undefined
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select signatory address" />
        </SelectTrigger>
        <SelectContent>
          {internalMultisigMembers.map(member => (
            <SelectItem key={member.address} value={member.address}>
              <ExplorerLink
                value={member.address}
                appId={appId as AppId}
                explorerLinkType={ExplorerItemType.Address}
                disableTooltip
                hasCopyButton={false}
                className="break-all"
              />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  const renderAction = (action: Action): React.ReactNode => {
    const button = (
      <Button key={action.label} variant={action.variant ?? 'secondary'} size="sm" onClick={action.onClick} disabled={action.disabled}>
        {action.icon}
        {action.label}
      </Button>
    )
    return action.tooltip ? (
      <CustomTooltip tooltipBody={action.tooltip} key={action.label}>
        <div className="inline-block">{button}</div>
      </CustomTooltip>
    ) : (
      button
    )
  }

  return (
    <TableRow key={`${account.address ?? accountIndex}-${balance?.type}`}>
      {/* Source Address */}
      {isFirst && (
        <TableCell className="py-2 text-sm" rowSpan={rowSpan}>
          <div className="flex items-center gap-2">
            <Checkbox checked={effectiveIsSelected} onCheckedChange={handleCheckboxChange} disabled={isCheckboxDisabled} />

            <ExplorerLink
              value={account.address ?? ''}
              appId={appId}
              explorerLinkType={ExplorerItemType.Address}
              disableTooltip
              className="break-all"
            />
            {/* Identity Icon and Tooltip */}
            {account.registration?.identity ? (
              <CustomTooltip tooltipBody={tooltipIdentity()}>
                <User className="h-4 w-4 text-polkadot-pink" />
              </CustomTooltip>
            ) : null}
            {/* Address Info Icon and Tooltip */}
            <CustomTooltip tooltipBody={tooltipAddress()}>
              <Info className="h-4 w-4 text-muted-foreground" />
            </CustomTooltip>
            {isMultisigMember || isMultisigAddress ? (
              <CustomTooltip tooltipBody={tooltipMultisig()}>
                <Group className="h-4 w-4 text-polkadot-pink" />
              </CustomTooltip>
            ) : null}
            {isProxied && (
              <CustomTooltip tooltipBody={tooltipProxy()}>
                <UserCog className="h-4 w-4 text-polkadot-pink" />
              </CustomTooltip>
            )}
          </div>
        </TableCell>
      )}
      {/* Destination Address */}
      <TableCell className="py-2 text-sm">
        {balance !== undefined && balanceIndex !== undefined ? (
          <DestinationAddressSelect
            appId={appId}
            balance={balance}
            index={balanceIndex}
            polkadotAddresses={polkadotAddresses}
            onDestinationChange={value =>
              updateTransaction({ destinationAddress: value }, appId, accountIndex, balanceIndex, isMultisigAddress)
            }
          />
        ) : (
          '-'
        )}
      </TableCell>
      {/* Multisig Signatory Address */}
      {isMultisigAddress && internalMultisigMembers.length > 0 && (
        <TableCell className="py-2 text-sm">{renderMultisigSignatoryAddress()}</TableCell>
      )}
      {/* Total Balance */}
      <TableCell className="py-2 text-sm text-right w-1/4 font-mono">
        {balance !== undefined ? (
          <CustomTooltip tooltipBody={formatBalance(totalBalance, token, token?.decimals, true)}>
            <span>{formatBalance(totalBalance, token)}</span>
          </CustomTooltip>
        ) : (
          '-'
        )}
      </TableCell>
      {/* Transferable */}
      <TableCell className="py-2 text-sm text-right w-1/4">{balance !== undefined ? renderTransferableBalance() : '-'}</TableCell>
      {/* Staked */}
      <TableCell className="py-2 text-sm text-right w-1/4">
        {isNative && balance?.balance.staking?.total?.gt(new BN(0)) ? (
          <NativeBalanceHoverCard balance={balance.balance} token={token} type={BalanceType.Staking} />
        ) : (
          '-'
        )}
      </TableCell>
      {/* Reserved */}
      <TableCell className="py-2 text-sm text-right w-1/4">
        {isNative && balance?.balance.reserved?.total?.gt(new BN(0)) ? (
          <NativeBalanceHoverCard balance={balance.balance} token={token} type={BalanceType.Reserved} />
        ) : (
          '-'
        )}
      </TableCell>
      {/* Actions */}
      <TableCell>
        <div className="flex gap-2 justify-end items-center">
          {account.error?.description && (
            <CustomTooltip tooltipBody={account.error?.description ?? ''}>
              <AlertCircle className="h-4 w-4 text-destructive cursor-help" />
            </CustomTooltip>
          )}
          {renderStatusIcon(account)}
        </div>
        {/* Additional Actions */}
        {actions.length > 0 ? (
          <div className="flex gap-2 justify-start items-center">{actions.map(action => renderAction(action))}</div>
        ) : hasMultisigPending && !hasRemainingInternalSigners ? (
          <CustomTooltip tooltipBody={multisigPendingTooltip}>
            <div className="text-sm text-muted-foreground/60 font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Multisig pending
            </div>
          </CustomTooltip>
        ) : (
          <div className="text-sm text-muted-foreground/60 font-medium flex items-center gap-2">
            <Check className="h-4 w-4 text-polkadot-pink" />
            Ready to migrate
          </div>
        )}
      </TableCell>
      <UnstakeDialog
        open={unstakeOpen}
        setOpen={setUnstakeOpen}
        maxUnstake={maxUnstake}
        transferableBalance={transferableBalance}
        token={token}
        account={account}
        appId={appId}
      />
      <WithdrawDialog
        open={withdrawOpen}
        setOpen={setWithdrawOpen}
        token={token}
        account={account}
        appId={appId}
        transferableBalance={transferableBalance}
      />
      <RemoveIdentityDialog
        open={removeIdentityOpen}
        setOpen={setRemoveIdentityOpen}
        token={token}
        account={account}
        appId={appId}
        transferableBalance={transferableBalance}
      />
      <ApproveMultisigCallDialog
        open={approveMultisigCallOpen}
        setOpen={setApproveMultisigCallOpen}
        token={token}
        account={account as MultisigAddress}
        appId={appId}
      />
      <RemoveAccountIndexDialog
        open={removeAccountIndexOpen}
        setOpen={setRemoveAccountIndexOpen}
        token={token}
        account={account}
        appId={appId}
        transferableBalance={transferableBalance}
      />
      <RemoveProxyDialog
        open={removeProxyOpen}
        setOpen={setRemoveProxyOpen}
        token={token}
        account={account}
        appId={appId}
        transferableBalance={transferableBalance}
      />
    </TableRow>
  )
}

export default observer(SynchronizedAccountRow)
