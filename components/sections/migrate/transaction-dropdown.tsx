import { ChevronDown, Info } from 'lucide-react'
import type { Transaction } from 'state/types/ledger'

import { CustomTooltip } from '@/components/CustomTooltip'
import { ExplorerLink } from '@/components/ExplorerLink'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { AppId } from '@/config/apps'
import { ExplorerItemType } from '@/config/explorers'

interface TransactionDropdownProps {
  transaction: Transaction | undefined
  appId: AppId
}

function TransactionDropdown({ transaction, appId }: TransactionDropdownProps) {
  if (!transaction?.txHash) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ChevronDown className="h-4 w-4 text-muted-foreground cursor-pointer" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[300px]">
        {/* Transaction Details */}
        {transaction.callData && (
          <DropdownMenuItem className="gap-2">
            Call Data:
            <ExplorerLink value={transaction.callData ?? ''} tooltipBody={transaction.callData} className="break-all" disableLink />
            <CustomTooltip
              tooltipBody="The full call data that can be supplied to a final call to multi approvals."
              className="normal-case! font-normal"
            >
              <Info className="h-4 w-4 inline-block ml-1 text-gray-400" />
            </CustomTooltip>
          </DropdownMenuItem>
        )}
        {transaction.txHash && (
          <DropdownMenuItem className="gap-2">
            Transaction Hash:
            <ExplorerLink
              value={transaction.txHash}
              appId={appId}
              explorerLinkType={ExplorerItemType.Transaction}
              tooltipBody={`View transaction ${transaction.txHash} on explorer`}
              className="break-all"
            />
          </DropdownMenuItem>
        )}
        {transaction.blockHash && (
          <DropdownMenuItem className="gap-2">
            Block Hash:
            <ExplorerLink
              value={transaction.blockHash}
              appId={appId}
              explorerLinkType={ExplorerItemType.BlockHash}
              tooltipBody={`View block ${transaction.blockHash} on explorer`}
              className="break-all"
            />
          </DropdownMenuItem>
        )}
        {transaction.blockNumber && (
          <DropdownMenuItem className="gap-2">
            Block Number:
            <ExplorerLink
              value={transaction.blockNumber ?? ''}
              appId={appId}
              explorerLinkType={ExplorerItemType.BlockNumber}
              tooltipBody={transaction.blockNumber}
              className="break-all"
            />
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default TransactionDropdown
