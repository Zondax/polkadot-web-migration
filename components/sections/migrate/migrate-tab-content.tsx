'use client'

import { ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { CustomTooltip } from '@/components/CustomTooltip'
import { ExplorerLink } from '@/components/ExplorerLink'
import { useMigration } from '@/components/hooks/useMigration'
import { Button } from '@/components/ui/button'
import { hasBalance } from '@/lib/utils'

import { ExplorerItemType } from '@/config/explorers'
import { AddressVerificationDialog } from './address-verification-dialog'
import MigratedAccountsTable from './migrated-accounts-table'
import { MigrationProgressDialog } from './migration-progress-dialog'
import { SuccessDialog } from './success-dialog'

interface MigrateTabContentProps {
  onBack: () => void
  onContinue: () => void
}

export function MigrateTabContent({ onBack }: MigrateTabContentProps) {
  const router = useRouter()
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [showVerificationDialog, setShowVerificationDialog] = useState(false)
  const [showMigrationProgressDialog, setShowMigrationProgressDialog] = useState(false)
  const [migrationStatus, setMigrationStatus] = useState<undefined | 'loading' | 'finished'>()
  const {
    filteredAppsWithoutErrors,
    migrateAll,
    migrationResults,
    restartSynchronization,
    allVerified,
    verifyDestinationAddresses,
    migratingItem,
  } = useMigration()
  const userDismissedDialog = useRef(false)

  useEffect(() => {
    if (migratingItem && !userDismissedDialog.current) {
      setShowMigrationProgressDialog(true)
    } else if (!migratingItem) {
      setShowMigrationProgressDialog(false)
      // Reset the flag when there are no loading items
      userDismissedDialog.current = false
    }
  }, [migratingItem])

  const handleMigrate = async () => {
    setMigrationStatus('loading')
    await migrateAll()
    setShowSuccessDialog(true)
    setMigrationStatus('finished')
  }

  const handleReturnHome = () => {
    setShowSuccessDialog(false)
    setMigrationStatus(undefined)
    router.push('/')
  }

  const handleRestartSynchronization = () => {
    restartSynchronization()
    onBack()
  }

  const handleOpenVerificationDialog = () => {
    setShowVerificationDialog(true)
    verifyDestinationAddresses()
  }

  const handleCloseMigrationDialog = () => {
    userDismissedDialog.current = true
    setShowMigrationProgressDialog(false)
  }

  const hasAddressesToVerify = filteredAppsWithoutErrors.length > 0
  // Filter accounts and multisigAccounts that have a balance and destination address (and signatory address if multisig)
  const validApps = filteredAppsWithoutErrors
    .map(app => {
      // Filter regular accounts
      const filteredAccounts = (app.accounts || []).filter(account =>
        (account.balances || []).some(balance => hasBalance([balance], true) && balance.transaction?.destinationAddress)
      )

      // Filter multisigAccounts (requires destinationAddress and signatoryAddress)
      const filteredMultisigAccounts = (app.multisigAccounts || []).filter(account =>
        (account.balances || []).some(
          balance => hasBalance([balance], true) && balance.transaction?.destinationAddress && balance.transaction?.signatoryAddress
        )
      )

      return {
        ...app,
        accounts: filteredAccounts,
        multisigAccounts: filteredMultisigAccounts,
      }
    })
    .filter(app => app.accounts.length > 0 || app.multisigAccounts?.length > 0)

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Migrate Accounts</h2>
        <p className="text-gray-600">Review your accounts and verify addresses before migration.</p>
        {allVerified && (
          <div className="mt-2 flex items-center gap-2 text-green-600">
            <ShieldCheck className="h-5 w-5" />
            <span>All addresses have been verified successfully</span>
          </div>
        )}
      </div>

      {validApps.length > 0 ? (
        <>
          {validApps.some(app => app.accounts?.length > 0) && <MigratedAccountsTable apps={validApps} />}
          {validApps.some(app => app.multisigAccounts?.length > 0) && <MigratedAccountsTable apps={validApps} multisigAddresses />}
        </>
      ) : (
        <div className="border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            There are no accounts available for migration. Please ensure your Ledger device is connected and contains accounts with a
            balance to migrate.
          </p>
        </div>
      )}

      <div className="flex justify-center gap-4 mt-8">
        {migrationStatus === 'finished' ? (
          <>
            <Button variant="outline" onClick={handleRestartSynchronization}>
              Synchronize Again
            </Button>
            <Button variant="purple" size="wide" onClick={handleReturnHome}>
              Go Home
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button
              variant="purple"
              onClick={handleOpenVerificationDialog}
              disabled={!hasAddressesToVerify || allVerified}
              className="flex items-center gap-2"
            >
              <ShieldCheck className="h-4 w-4" />
              {allVerified ? 'Addresses Verified' : 'Verify Addresses'}
            </Button>
            <Button
              variant="purple"
              size="wide"
              onClick={handleMigrate}
              disabled={filteredAppsWithoutErrors.length === 0 || !allVerified || migrationStatus === 'loading'}
            >
              {migrationStatus === 'loading' ? 'Migrating...' : 'Migrate Accounts'}
            </Button>
          </>
        )}
      </div>

      {/* Success Dialog */}
      <SuccessDialog
        open={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        onReturn={handleReturnHome}
        successCount={migrationResults.success}
        totalCount={migrationResults.total}
      />

      {/* Address Verification Dialog */}
      <AddressVerificationDialog open={showVerificationDialog} onClose={() => setShowVerificationDialog(false)} />

      {/* Migration Progress Dialog */}
      <MigrationProgressDialog open={showMigrationProgressDialog} onClose={handleCloseMigrationDialog} migratingItem={migratingItem} />
    </div>
  )
}
