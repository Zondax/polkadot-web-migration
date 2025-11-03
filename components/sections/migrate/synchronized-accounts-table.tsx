import type { ToggleAccountSelection, UpdateTransaction } from '@/components/hooks/useSynchronization'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AppId, Token } from '@/config/apps'
import { observer } from '@legendapp/state/react'
import { motion } from 'framer-motion'
import { useCallback } from 'react'
import type { Collections } from 'state/ledger'
import type { Address, AddressBalance, MultisigAddress } from 'state/types/ledger'
import SynchronizedAccountRow from './synchronized-account-row'

interface SynchronizedAccountsTableProps {
  accounts: Address[] | MultisigAddress[] | undefined
  token: Token
  polkadotAddresses: string[]
  collections?: Collections
  appId: AppId
  updateTransaction: UpdateTransaction
  isMultisig?: boolean
  toggleAccountSelection: ToggleAccountSelection
}

function SynchronizedAccountsTable({
  accounts,
  token,
  polkadotAddresses,
  collections,
  appId,
  updateTransaction,
  isMultisig,
  toggleAccountSelection,
}: SynchronizedAccountsTableProps) {
  const renderAccounts = useCallback(() => {
    if (!accounts || accounts.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={8} className="text-center text-muted-foreground">
            There are no accounts available for migration in this network. Please check your Ledger device for accounts with a balance to
            migrate.
          </TableCell>
        </TableRow>
      )
    }

    return accounts.map((account, accountIndex) => {
      const balances = account.balances ?? []

      if (balances.length === 0 && account.error) {
        return (
          <SynchronizedAccountRow
            key={`${account.address ?? accountIndex}`}
            account={account}
            accountIndex={accountIndex}
            rowSpan={balances.length}
            collections={collections}
            token={token}
            polkadotAddresses={polkadotAddresses}
            updateTransaction={updateTransaction}
            appId={appId}
            isSelected={account.selected ?? false}
            toggleAccountSelection={toggleAccountSelection}
          />
        )
      }

      return balances.map((balance: AddressBalance, balanceIndex: number) => (
        <SynchronizedAccountRow
          key={`${account.address ?? accountIndex}-${balance.type}`}
          account={account}
          accountIndex={accountIndex}
          balance={balance}
          balanceIndex={balanceIndex}
          rowSpan={balances.length}
          collections={collections}
          token={token}
          polkadotAddresses={polkadotAddresses}
          updateTransaction={updateTransaction}
          appId={appId}
          isSelected={account.selected ?? false}
          toggleAccountSelection={toggleAccountSelection}
        />
      ))
    })
  }, [accounts, collections, token, polkadotAddresses, updateTransaction, appId, toggleAccountSelection])

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
            <TableHead className="text-left">Destination Address</TableHead>
            {isMultisig && <TableHead className="text-left">Signatory Address</TableHead>}
            <TableHead className="text-right">Balance</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{renderAccounts()}</TableBody>
      </Table>
    </motion.div>
  )
}

export default observer(SynchronizedAccountsTable)
