'use client'

import { ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { CustomTooltip } from '@/components/CustomTooltip'
import { ExplorerLink } from '@/components/ExplorerLink'
import { useMigration } from '@/components/hooks/useMigration'
import { Button } from '@/components/ui/button'
import { hasBalance } from '@/lib/utils'

import { AddressVerificationDialog } from './dialogs/address-verification-dialog'
import { MigrationProgressDialog } from './dialogs/migration-progress-dialog'
import { SuccessDialog } from './dialogs/success-dialog'
import MigratedAccountsTable from './migrated-accounts-table'

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
    appsForMigration,
    migrateSelected,
    migrationResults,
    restartSynchronization,
    allVerified,
    verifySelectedAppsAddresses,
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
    await migrateSelected()
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
    verifySelectedAppsAddresses()
  }

  const handleCloseMigrationDialog = () => {
    userDismissedDialog.current = true
    setShowMigrationProgressDialog(false)
  }

  const hasAddressesToVerify = appsForMigration.length > 0
  // Filter accounts and multisigAccounts that have a balance and destination address (and signatory address if multisig)
  const validApps = appsForMigration
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
            <Button variant="outline" onClick={handleRestartSynchronization} data-testid="migrate-restart-synchronization-button">
              Synchronize Again
            </Button>
            <Button variant="purple" size="wide" onClick={handleReturnHome} data-testid="migrate-go-home-button">
              Go Home
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={onBack} data-testid="migrate-back-button">
              Back
            </Button>
            <Button
              variant="purple"
              onClick={handleOpenVerificationDialog}
              disabled={!hasAddressesToVerify || allVerified}
              className="flex items-center gap-2"
              data-testid="migrate-verify-addresses-button"
            >
              <ShieldCheck className="h-4 w-4" />
              {allVerified ? 'Addresses Verified' : 'Verify Addresses'}
            </Button>
            <Button
              variant="purple"
              size="wide"
              onClick={handleMigrate}
              disabled={appsForMigration.length === 0 || !allVerified || migrationStatus === 'loading'}
              data-testid="migrate-migrate-button"
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
