'use client'

import { Info } from 'lucide-react'
import type { App } from 'state/ledger'

import { CustomTooltip } from '@/components/CustomTooltip'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import MigratedAccountRows from './migrated-accounts-rows'

interface MigratedAccountsTableProps {
  apps: App[]
  multisigAddresses?: boolean
}

// It is assumed that the addresses shown here have a balance and are valid to display.
const MigratedAccountsTable = ({ apps, multisigAddresses }: MigratedAccountsTableProps) => {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4">{multisigAddresses ? 'Multisig Addresses' : 'Regular Addresses'}</h3>
      <Table className="shadow-xs border border-gray-200">
        <TableHeader>
          <TableRow>
            <TableHead className="hidden sm:table-cell">Chain</TableHead>
            <TableHead>Source Address</TableHead>
            {!multisigAddresses && <TableHead>Public Key</TableHead>}
            {multisigAddresses && <TableHead>Signatory Address</TableHead>}
            {multisigAddresses && <TableHead>Threshold</TableHead>}
            <TableHead>Destination Address</TableHead>
            <TableHead className="flex items-center">
              Balance
              <CustomTooltip
                tooltipBody="Balance to be transferred. The transaction fee will be deducted from this amount."
                className="normal-case! font-normal"
              >
                <Info className="h-4 w-4 inline-block ml-1 text-gray-400" />
              </CustomTooltip>
            </TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {apps.map((app, index) => (
            <MigratedAccountRows key={app.id?.toString() || `app-${index}`} app={app} multisigAddresses={multisigAddresses} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default MigratedAccountsTable
