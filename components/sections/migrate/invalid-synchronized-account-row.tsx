import { observer } from '@legendapp/state/react'
import { AlertCircle, Info, KeyRound, Route, User } from 'lucide-react'
import type { Address, MultisigAddress } from 'state/types/ledger'

import { CustomTooltip, TooltipBody, type TooltipItem } from '@/components/CustomTooltip'
import { TableCell, TableRow } from '@/components/ui/table'
import type { AppId } from '@/config/apps'

import { ExplorerLink } from '@/components/ExplorerLink'
import { Spinner } from '@/components/icons'
import { ExplorerItemType } from '@/config/explorers'

// Component for rendering a single synchronized account row
interface AccountBalanceRowProps {
  account: MultisigAddress | Address
  accountIndex: number
  rowSpan: number
  appId: AppId
}

const InvalidSynchronizedAccountRow = ({ account, accountIndex, rowSpan, appId }: AccountBalanceRowProps) => {
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

    if (account.path) {
      items.push({ label: 'Derivation Path', value: account.path, icon: Route })
    }
    if (account.pubKey) {
      items.push({ label: 'Public Key', value: account.pubKey, icon: KeyRound, hasCopyButton: true })
    }

    return (
      <div className="p-2 min-w-[320px]">
        <TooltipBody items={items} />
      </div>
    )
  }

  const renderStatusIcon = (account: Address): React.ReactNode | null => {
    if (account.isLoading) {
      return (
        <CustomTooltip tooltipBody={'Loading...'}>
          <Spinner />
        </CustomTooltip>
      )
    }

    if (account.error?.description) {
      return (
        <CustomTooltip tooltipBody={account.error?.description ?? ''}>
          <AlertCircle className="h-4 w-4 text-destructive cursor-help" />
        </CustomTooltip>
      )
    }

    return null
  }

  return (
    <TableRow key={`${account.address ?? accountIndex}`}>
      {/* Source Address */}
      <TableCell className="py-2 text-sm" rowSpan={rowSpan}>
        <div className="flex items-center gap-2">
          <ExplorerLink
            value={account.address ?? ''}
            appId={appId}
            explorerLinkType={ExplorerItemType.Address}
            disableTooltip
            className="break-all"
          />
          {/* Address Info Icon and Tooltip */}
          <CustomTooltip tooltipBody={tooltipAddress()}>
            <Info className="h-4 w-4 text-muted-foreground" />
          </CustomTooltip>
        </div>
      </TableCell>
      {/* Actions */}
      <TableCell>
        <div className="flex gap-2 justify-end items-center">{renderStatusIcon(account)}</div>
      </TableCell>
    </TableRow>
  )
}

export default observer(InvalidSynchronizedAccountRow)
