import { observer } from '@legendapp/state/react'
import { motion } from 'framer-motion'
import type { Collections } from 'state/ledger'
import type { Address, MultisigAddress } from 'state/types/ledger'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AppId, Token } from '@/config/apps'

import type { UpdateTransaction } from '@/components/hooks/useSynchronization'
import { useCallback } from 'react'
import InvalidSynchronizedAccountRow from './invalid-synchronized-account-row'

interface InvalidSynchronizedAccountsTableProps {
  accounts: Address[] | MultisigAddress[] | undefined
  token: Token
  polkadotAddresses: string[]
  collections?: Collections
  appId: AppId
  updateTransaction: UpdateTransaction
  isMultisig?: boolean
}

function InvalidSynchronizedAccountsTable({
  accounts,
  token,
  polkadotAddresses,
  collections,
  appId,
  updateTransaction,
  isMultisig,
}: InvalidSynchronizedAccountsTableProps) {
  const renderAccounts = useCallback(() => {
    if (!accounts || accounts.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={7} className="text-center text-muted-foreground">
            There are no accounts available for migration in this network. Please check your Ledger device for accounts with a balance to
            migrate.
          </TableCell>
        </TableRow>
      )
    }

    return accounts.map((account, accountIndex) => (
      <InvalidSynchronizedAccountRow
        key={`${account.address ?? accountIndex}`}
        account={account}
        accountIndex={accountIndex}
        rowSpan={1}
        appId={appId}
      />
    ))
  }, [accounts, appId])

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="text-left">Source Address</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{renderAccounts()}</TableBody>
      </Table>
    </motion.div>
  )
}

export default observer(InvalidSynchronizedAccountsTable)
