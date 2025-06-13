'use client'

import { FolderSync, Info, Loader2, RefreshCw, User, Users, X } from 'lucide-react'
import { useState } from 'react'
import { AppStatus } from 'state/ledger'

import { CustomTooltip } from '@/components/CustomTooltip'
import { ExplorerLink } from '@/components/ExplorerLink'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

import { useSynchronization } from '@/components/hooks/useSynchronization'
import AppScanningGrid from './app-scanning-grid'
import EmptyStateRow from './empty-state-row'
import SynchronizedApp from './synchronized-app'

interface SynchronizeTabContentProps {
  onContinue: () => void
}

enum AccountViewType {
  ALL = 'all',
  ACCOUNTS = 'accounts',
  MULTISIG = 'multisig',
}

export function SynchronizeTabContent({ onContinue }: SynchronizeTabContentProps) {
  const {
    // State
    status,
    syncProgress,
    isRescaning,
    isSyncCancelRequested,

    // Computed values
    hasAccountsWithErrors: accountsWithErrors,
    filteredAppsWithoutErrors: appsWithoutErrors,
    filteredAppsWithErrors: appsWithErrors,
    polkadotAddresses,
    hasMultisigAccounts,

    // Actions
    rescanFailedAccounts,
    restartSynchronization,
    cancelSynchronization,
    updateTransaction,
  } = useSynchronization()

  const [activeView, setActiveView] = useState<AccountViewType>(AccountViewType.ALL)

  const handleMigrate = () => {
    onContinue()
  }

  const renderDestinationAddressesInfo = () => {
    if (polkadotAddresses.length === 0) {
      return null
    }
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center text-sm text-gray-600 gap-2 p-3 border border-polkadot-cyan rounded-lg bg-polkadot-cyan bg-opacity-10">
        <Info className="h-5 w-5 sm:h-8 sm:w-8 text-polkadot-cyan flex-shrink-0" />
        <span>
          <CustomTooltip
            tooltipBody={
              <div className="max-w-xs">
                <ul className="space-y-1">
                  {polkadotAddresses.slice(0, 5).map((address, index) => (
                    <li key={address} className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Polkadot {index + 1}:</span>
                        <ExplorerLink value={address} disableTooltip className="break-all" hasCopyButton />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            }
            className="min-w-[250px]"
          >
            <span className="font-semibold cursor-help">Destination addresses</span>
          </CustomTooltip>{' '}
          come from the Polkadot HD path. These addresses are shown with different encodings based on each network&apos;s unique prefix, so
          the same key looks different depending on the network. You will have to verify all addresses before migration for security
          reasons.
        </span>
      </div>
    )
  }

  // Account/Multisig Filters
  const renderFilters = () => {
    const numberIcon = (number: number) => {
      return <span className="ml-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-full font-medium">{number}</span>
    }
    return (
      <div className="mb-4">
        <ToggleGroup
          type="single"
          value={activeView}
          onValueChange={(value: AccountViewType) => {
            if (value) setActiveView(value)
          }}
          className="justify-start"
        >
          <ToggleGroupItem value={AccountViewType.ALL}>All</ToggleGroupItem>
          <ToggleGroupItem value={AccountViewType.ACCOUNTS}>
            <User className="h-4 w-4" />
            <span>My Accounts</span>
            {appsWithoutErrors.length > 0 && numberIcon(appsWithoutErrors.reduce((total, app) => total + (app.accounts?.length || 0), 0))}
          </ToggleGroupItem>
          <ToggleGroupItem value={AccountViewType.MULTISIG}>
            <Users className="h-4 w-4" />
            <span>Multisig Accounts</span>
            {appsWithoutErrors.length > 0 &&
              numberIcon(appsWithoutErrors.reduce((total, app) => total + (app.multisigAccounts?.length || 0), 0))}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    )
  }

  const isLoading = status === AppStatus.LOADING
  const isSynchronized = status === AppStatus.SYNCHRONIZED

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 md:gap-4 mb-6 md:mb-4">
        <div className="w-full md:w-auto">
          <h2 className="text-2xl font-bold">Synchronized Accounts</h2>
          <p className="text-gray-600">Click Migrate All to start migrating your accounts.</p>
          <div className="md:hidden mt-2">{renderDestinationAddressesInfo()}</div>
        </div>
        <div className="flex gap-2 self-start">
          {status !== AppStatus.LOADING && (
            <CustomTooltip tooltipBody="Synchronize Again">
              <Button onClick={restartSynchronization} variant="outline" className="flex items-center gap-1" disabled={isRescaning}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CustomTooltip>
          )}

          {isLoading ? (
            <Button
              onClick={cancelSynchronization}
              variant="destructive"
              className="flex items-center gap-1"
              disabled={isSyncCancelRequested}
            >
              {isSyncCancelRequested ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Stop Synchronization
            </Button>
          ) : (
            <Button onClick={handleMigrate} disabled={isLoading || appsWithoutErrors.length === 0} variant="purple">
              Migrate All
            </Button>
          )}
        </div>
      </div>
      <div className="hidden md:block mb-4">{renderDestinationAddressesInfo()}</div>

      {/* Show apps scanning status */}
      {isLoading && (
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              Synchronizing apps {syncProgress.total > 0 && `(${syncProgress.scanned} / ${syncProgress.total})`}
            </span>
            <span className="text-sm text-gray-600">{syncProgress.percentage}%</span>
          </div>
          <Progress value={syncProgress.percentage} />
          <div className="pt-2">
            <AppScanningGrid />
          </div>
        </div>
      )}

      {!isLoading && (
        <>
          {renderFilters()}
          {isSynchronized && appsWithoutErrors.length ? (
            appsWithoutErrors.map(app => (
              <div key={app.id.toString()}>
                {app.accounts && app.accounts.length > 0 && ['all', 'accounts'].includes(activeView) && (
                  <SynchronizedApp key={app.id.toString()} app={app} updateTransaction={updateTransaction} />
                )}
                {app.multisigAccounts && app.multisigAccounts.length > 0 && ['all', 'multisig'].includes(activeView) && (
                  <SynchronizedApp key={`${app.id}-multisig`} app={app} isMultisig updateTransaction={updateTransaction} />
                )}
              </div>
            ))
          ) : (
            <EmptyStateRow
              label={
                isSynchronized
                  ? 'There are no accounts available for migration. Please make sure your Ledger device contains accounts with a balance to migrate.'
                  : 'No accounts with funds have been synchronized yet.'
              }
              icon={<FolderSync className="h-8 w-8 text-gray-300" />}
            />
          )}
        </>
      )}

      {isSynchronized && accountsWithErrors && (
        <>
          <div className="flex justify-between items-start gap-2 mb-6 mt-6">
            <div>
              <h2 className="text-2xl font-bold">Failed Synchronization</h2>
              <p className="text-gray-600">
                The account couldn&apos;t be scanned successfully. Please try again or continue with the successfully scanned accounts.
              </p>
            </div>
            <Button onClick={rescanFailedAccounts} variant="purple">
              {isRescaning ? 'Loading...' : 'Rescan'}
            </Button>
          </div>
          {/* Filter and show only apps with error accounts */}
          {appsWithErrors.map(app => (
            <SynchronizedApp key={app.id.toString()} app={app} failedSync updateTransaction={updateTransaction} />
          ))}
        </>
      )}
    </div>
  )
}
