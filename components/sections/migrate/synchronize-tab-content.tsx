'use client'

import type { CheckedState } from '@radix-ui/react-checkbox'
import { FolderSync, Info, Loader2, RefreshCw, Search, User, Users, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { type App, AppStatus } from 'state/ledger'
import { CustomTooltip } from '@/components/CustomTooltip'
import { ExplorerLink } from '@/components/ExplorerLink'
import { useSynchronization } from '@/components/hooks/useSynchronization'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { type AppConfig, appsConfigs, polkadotAppConfig } from '@/config/apps'
import { ExplorerItemType } from '@/config/explorers'
import type { Address, MultisigAddress } from '@/state/types/ledger'
import AppScanningGrid from './app-scanning-grid'
import { DeepScanModal, type DeepScanOptions } from './deep-scan-modal'
import EmptyStateRow from './empty-state-row'
import { LedgerUnlockReminder } from './ledger-unlock-reminder'
import SynchronizedApp from './synchronized-app'

interface SynchronizeTabContentProps {
  onContinue: () => void
}

enum AccountViewType {
  ALL = 'all',
  ACCOUNTS = 'accounts',
  MULTISIG = 'multisig',
}

/**
 * Extract account and address indices to scan from DeepScanOptions
 */
function getIndicesToScan(options: DeepScanOptions): { accountIndices: number[]; addressIndices: number[] } {
  const accountIndices: number[] = []
  if (options.accountType === 'single' && options.accountIndex !== undefined) {
    accountIndices.push(options.accountIndex)
  } else if (options.accountType === 'range' && options.accountStartIndex !== undefined && options.accountEndIndex !== undefined) {
    for (let i = options.accountStartIndex; i <= options.accountEndIndex; i++) {
      accountIndices.push(i)
    }
  }

  const addressIndices: number[] = []
  if (options.addressType === 'single' && options.addressIndex !== undefined) {
    addressIndices.push(options.addressIndex)
  } else if (options.addressType === 'range' && options.addressStartIndex !== undefined && options.addressEndIndex !== undefined) {
    for (let i = options.addressStartIndex; i <= options.addressEndIndex; i++) {
      addressIndices.push(i)
    }
  }

  return { accountIndices, addressIndices }
}

/**
 * Result of scanning a single app for new accounts
 */
interface SingleAppScanResult {
  newAccounts: Address[]
  newMultisigAccounts: MultisigAddress[]
}

/**
 * Scan a single app for new accounts using the provided account and address indices
 */
async function scanSingleApp(
  app: App,
  accountIndices: number[],
  addressIndices: number[],
  appConfig: AppConfig,
  polkadotAddresses: string[]
): Promise<SingleAppScanResult> {
  const result: SingleAppScanResult = {
    newAccounts: [],
    newMultisigAccounts: [],
  }

  if (!appConfig.rpcEndpoints || appConfig.rpcEndpoints.length === 0) {
    return result
  }

  // Import required services
  const { getApiAndProvider } = await import('@/lib/account')
  const { getBip44PathWithAccount } = await import('@/lib/utils/address')
  const { ledgerService } = await import('@/lib/ledger/ledgerService')
  const { processAccountsForApp } = await import('@/lib/services/account-processing.service')

  // Derive addresses for all account/address combinations
  const newAddresses = []
  for (const accountIndex of accountIndices) {
    for (const addressIndex of addressIndices) {
      try {
        // Build the derivation path with both account and address indices
        const basePath = getBip44PathWithAccount(appConfig.bip44Path, accountIndex)
        // Replace the last component (address index) in the path
        const pathParts = basePath.split('/')
        pathParts[pathParts.length - 1] = `${addressIndex}'`
        const derivedPath = pathParts.join('/')

        const address = await ledgerService.getAccountAddress(derivedPath, appConfig.ss58Prefix, false)
        if (address) {
          newAddresses.push({ ...address, path: derivedPath })
        }
      } catch (error) {
        console.warn(`Failed to get address for account index ${accountIndex}, address index ${addressIndex} on ${app.name}:`, error)
      }
    }
  }

  if (newAddresses.length === 0) {
    return result
  }

  // Connect to blockchain and process new accounts
  const { api, provider } = await getApiAndProvider(appConfig.rpcEndpoints)
  if (!api) {
    return result
  }

  try {
    // Process the new accounts
    const { success, data } = await processAccountsForApp(
      newAddresses,
      appConfig,
      api,
      polkadotAddresses,
      true // Filter by balance
    )

    if (success && data) {
      const { accounts, multisigAccounts } = data

      // Check for existing addresses to avoid duplicates
      const existingAddresses = new Set([
        ...(app.accounts || []).map(acc => acc.address),
        ...(app.multisigAccounts || []).map(acc => acc.address),
      ])

      // Only add accounts that don't already exist
      result.newAccounts = accounts.filter(acc => !existingAddresses.has(acc.address))
      result.newMultisigAccounts = multisigAccounts.filter(acc => !existingAddresses.has(acc.address))
    }
  } finally {
    // Always disconnect the API
    if (api) {
      await api.disconnect()
    } else if (provider) {
      await provider.disconnect()
    }
  }

  return result
}

/**
 * Update the application state with the results from the deep scan
 */
async function updateStateWithScanResults(updatedApps: App[], newAccountsFound: number): Promise<void> {
  if (newAccountsFound > 0) {
    // Import the ledger state to update it
    const { ledgerState$ } = await import('@/state/ledger')
    ledgerState$.apps.apps.set(updatedApps)
  }
}

/**
 * Show appropriate notifications based on scan results
 */
async function showScanNotifications(newAccountsFound: number, chainInfo: string, error?: Error): Promise<void> {
  const { notifications$ } = await import('@/state/notifications')

  if (error) {
    notifications$.push({
      title: 'Deep Scan Failed',
      description: error.message || 'An error occurred during deep scan.',
      type: 'error',
      autoHideDuration: 5000,
    })
  } else if (newAccountsFound > 0) {
    notifications$.push({
      title: 'Deep Scan Complete',
      description: `Found ${newAccountsFound} new account${newAccountsFound === 1 ? '' : 's'} with balances on ${chainInfo}.`,
      type: 'success',
      autoHideDuration: 5000,
    })
  } else {
    notifications$.push({
      title: 'Deep Scan Complete',
      description: 'No new accounts with balances were found in the specified range.',
      type: 'info',
      autoHideDuration: 5000,
    })
  }
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

    // Actions
    rescanFailedAccounts,
    restartSynchronization,
    cancelSynchronization,
    updateTransaction,

    // Selection actions
    toggleAllAccounts,
    toggleAccountSelection,
  } = useSynchronization()

  const [activeView, setActiveView] = useState<AccountViewType>(AccountViewType.ALL)
  const [isDeepScanModalOpen, setIsDeepScanModalOpen] = useState(false)
  const [isDeepScanning, setIsDeepScanning] = useState(false)

  const handleMigrate = () => {
    onContinue()
  }

  const handleDeepScan = async (options: DeepScanOptions) => {
    setIsDeepScanning(true)
    try {
      // Extract indices to scan from options
      const { accountIndices, addressIndices } = getIndicesToScan(options)

      if (accountIndices.length === 0 || addressIndices.length === 0) {
        throw new Error('No valid account or address indices to scan')
      }

      // Get polkadot addresses for cross-chain migration
      const polkadotApp = appsWithoutErrors.find(app => app.id === 'polkadot')
      const polkadotAddressesArray = polkadotApp?.accounts?.map(account => account.address) || polkadotAddresses || []

      // Determine which apps to scan
      const appsToScan =
        options.selectedChain === 'all' ? appsWithoutErrors : appsWithoutErrors.filter(app => app.id === options.selectedChain)

      // Scan additional accounts for selected apps
      const updatedApps = [...appsWithoutErrors]
      let newAccountsFound = 0

      for (const app of appsToScan) {
        const appConfig = appsConfigs.get(app.id)
        if (!appConfig) continue

        // Scan the single app for new accounts
        const scanResult = await scanSingleApp(app, accountIndices, addressIndices, appConfig, polkadotAddressesArray)

        // Merge results with existing app data
        const existingApp = updatedApps.find(a => a.id === app.id)
        if (existingApp && (scanResult.newAccounts.length > 0 || scanResult.newMultisigAccounts.length > 0)) {
          existingApp.accounts = [...(existingApp.accounts || []), ...scanResult.newAccounts]
          existingApp.multisigAccounts = [...(existingApp.multisigAccounts || []), ...scanResult.newMultisigAccounts]
          newAccountsFound += scanResult.newAccounts.length + scanResult.newMultisigAccounts.length
        }
      }

      // Update state with results
      await updateStateWithScanResults(updatedApps, newAccountsFound)

      // Show appropriate notifications
      const chainInfo = options.selectedChain === 'all' ? 'all networks' : appsToScan[0]?.name || 'selected network'
      await showScanNotifications(newAccountsFound, chainInfo)

      setIsDeepScanModalOpen(false)
    } catch (error) {
      console.error('Deep scan failed:', error)

      // Show error notification
      await showScanNotifications(0, '', error instanceof Error ? error : new Error('An error occurred during deep scan'))
    } finally {
      setIsDeepScanning(false)
    }
  }

  // Check if all apps are selected
  const areAllAppsSelected = useMemo(() => {
    if (appsWithoutErrors.length === 0) return false

    const allAccountsSelected = appsWithoutErrors.every(app => app.accounts?.every(account => account.selected))
    const allMultisigAccountsSelected = appsWithoutErrors.every(app => app.multisigAccounts?.every(account => account.selected))
    return allAccountsSelected && allMultisigAccountsSelected
  }, [appsWithoutErrors])

  // Handle "Select All" checkbox change
  const handleSelectAllChange = useCallback(
    (checked: CheckedState) => {
      toggleAllAccounts(checked === true)
    },
    [toggleAllAccounts]
  )

  const renderDestinationAddressesInfo = () => {
    if (polkadotAddresses.length === 0) {
      return null
    }
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center text-sm text-gray-600 gap-2 p-3 border border-polkadot-cyan bg-polkadot-cyan-light rounded-lg">
        <Info className="h-5 w-5 sm:h-8 sm:w-8 text-polkadot-cyan shrink-0" />
        <span>
          <CustomTooltip
            tooltipBody={
              <div className="max-w-xs">
                <ul className="space-y-1">
                  {polkadotAddresses.slice(0, 5).map((address, index) => (
                    <li key={address} className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Polkadot {index + 1}:</span>
                        <ExplorerLink
                          value={address}
                          appId={polkadotAppConfig.id}
                          explorerLinkType={ExplorerItemType.Address}
                          disableTooltip
                          className="break-all"
                          hasCopyButton
                        />
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
          data-testid="filters-toggle-group"
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

  const renderRestartSynchronizationButton = () => {
    if (status === AppStatus.LOADING) {
      return null
    }

    return (
      <CustomTooltip tooltipBody="Synchronize Again">
        <Button
          onClick={restartSynchronization}
          variant="outline"
          className="flex items-center gap-1"
          disabled={isRescaning}
          data-testid="retry-synchronize-button"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CustomTooltip>
    )
  }

  const renderStopSynchronizationButton = () => {
    if (isLoading) {
      return (
        <Button onClick={cancelSynchronization} variant="destructive" className="flex items-center gap-1" disabled={isSyncCancelRequested}>
          {isSyncCancelRequested ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Stop Synchronization
        </Button>
      )
    }
  }

  const renderMigrateButton = () => {
    if (isLoading || appsWithoutErrors.length === 0) {
      return null
    }

    return (
      <Button onClick={handleMigrate} disabled={isLoading || appsWithoutErrors.length === 0} variant="purple" data-testid="migrate-button">
        Migrate
      </Button>
    )
  }

  const renderDeepScanButton = () => {
    if (isLoading) {
      return null
    }

    return (
      <CustomTooltip tooltipBody="Scan additional account indices">
        <Button
          onClick={() => setIsDeepScanModalOpen(true)}
          variant="outline"
          className="flex items-center gap-1"
          disabled={isRescaning}
          data-testid="deep-scan-button"
        >
          <Search className="h-4 w-4" />
          Deep Scan
        </Button>
      </CustomTooltip>
    )
  }

  const renderActionButtons = () => {
    return (
      <div className="flex gap-2 self-start">
        {renderRestartSynchronizationButton()}
        {renderDeepScanButton()}
        {renderStopSynchronizationButton()}
        {renderMigrateButton()}
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 md:gap-4 mb-6 md:mb-4">
        <div className="w-full md:w-auto">
          <h2 className="text-2xl font-bold">Synchronized Accounts</h2>
          <p className="text-gray-600">Click Migrate All to start migrating your accounts.</p>
          <div className="md:hidden mt-2">{renderDestinationAddressesInfo()}</div>
        </div>
        {renderActionButtons()}
      </div>
      <div className="hidden md:block mb-4">{renderDestinationAddressesInfo()}</div>

      {/* Show apps scanning status */}
      {isLoading && (
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600" data-testid="">
              Synchronizing apps {syncProgress.total > 0 && `(${syncProgress.scanned} / ${syncProgress.total})`}
            </span>
            <span className="text-sm text-gray-600">{syncProgress.percentage}%</span>
          </div>
          <Progress value={syncProgress.percentage} data-testid="app-sync-progress-bar" />
          <LedgerUnlockReminder isVisible={isLoading} />
          <div className="pt-2">
            <AppScanningGrid />
          </div>
        </div>
      )}

      {!isLoading && isSynchronized && appsWithoutErrors.length > 0 && (
        <div className="flex items-center mb-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Checkbox id="select-all-checkbox" checked={areAllAppsSelected} onCheckedChange={handleSelectAllChange} />
            <label htmlFor="select-all-checkbox" className="ml-2 text-sm font-medium cursor-pointer">
              Select All Accounts
            </label>
          </div>
        </div>
      )}

      {!isLoading && (
        <>
          {renderFilters()}
          {isSynchronized && appsWithoutErrors.length ? (
            appsWithoutErrors.map(app => (
              <div key={app.id.toString()} data-testid="synchronized-app-container">
                {app.accounts && app.accounts.length > 0 && ['all', 'accounts'].includes(activeView) && (
                  <SynchronizedApp
                    key={app.id.toString()}
                    app={app}
                    updateTransaction={updateTransaction}
                    toggleAccountSelection={toggleAccountSelection}
                  />
                )}
                {app.multisigAccounts && app.multisigAccounts.length > 0 && ['all', 'multisig'].includes(activeView) && (
                  <SynchronizedApp
                    key={`${app.id}-multisig`}
                    app={app}
                    isMultisig
                    updateTransaction={updateTransaction}
                    toggleAccountSelection={toggleAccountSelection}
                  />
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
        <div data-testid="failed-synchronization-container">
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
            <div key={app.id.toString()}>
              {(app.error || (app.accounts && app.accounts.length > 0)) && (
                <SynchronizedApp
                  key={app.id.toString()}
                  app={app}
                  failedSync
                  updateTransaction={updateTransaction}
                  toggleAccountSelection={toggleAccountSelection}
                />
              )}
              {app.multisigAccounts && app.multisigAccounts.length > 0 && (
                <SynchronizedApp
                  key={`${app.id}-multisig`}
                  app={app}
                  failedSync
                  isMultisig
                  updateTransaction={updateTransaction}
                  toggleAccountSelection={toggleAccountSelection}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <DeepScanModal
        isOpen={isDeepScanModalOpen}
        onClose={() => setIsDeepScanModalOpen(false)}
        onScan={handleDeepScan}
        isScanning={isDeepScanning}
      />
    </div>
  )
}
