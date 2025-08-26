'use client'

import type { CheckedState } from '@radix-ui/react-checkbox'
import { FolderSync, Info, Loader2, RefreshCw, Search, User, Users, X } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
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

  // Derive addresses for all account/address combinations in parallel
  const addressPromises = accountIndices.flatMap(accountIndex =>
    addressIndices.map(async addressIndex => {
      try {
        // Build the derivation path with both account and address indices
        const basePath = getBip44PathWithAccount(appConfig.bip44Path, accountIndex)
        // Replace the last component (address index) in the path
        const pathParts = basePath.split('/')
        pathParts[pathParts.length - 1] = `${addressIndex}'`
        const derivedPath = pathParts.join('/')

        const address = await ledgerService.getAccountAddress(derivedPath, appConfig.ss58Prefix, false)
        if (address) {
          return { ...address, path: derivedPath }
        }
      } catch (error) {
        console.warn(`Failed to get address for account index ${accountIndex}, address index ${addressIndex} on ${app.name}:`, error)
      }
      return null
    })
  )

  // Wait for all address derivations to complete in parallel
  const addressResults = await Promise.all(addressPromises)

  // Filter out null results from failed derivations
  const newAddresses = addressResults.filter((addr): addr is Address => addr !== null)

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
  const [deepScanProgress, setDeepScanProgress] = useState({
    scanned: 0,
    total: 0,
    percentage: 0,
    currentChain: '',
  })
  const [deepScanApps, setDeepScanApps] = useState<App[]>([])
  const [deepScanCancelled, setDeepScanCancelled] = useState(false)
  const [isDeepScanCancelling, setIsDeepScanCancelling] = useState(false)
  const [isDeepScanCompleted, setIsDeepScanCompleted] = useState(false)
  const deepScanCancelledRef = useRef(false)
  const modalClosedManuallyRef = useRef(false)

  const handleMigrate = () => {
    onContinue()
  }

  const handleDeepScan = async (options: DeepScanOptions) => {
    setIsDeepScanning(true)
    setDeepScanCancelled(false)
    setIsDeepScanCancelling(false)
    setIsDeepScanCompleted(false)
    deepScanCancelledRef.current = false
    modalClosedManuallyRef.current = false
    try {
      // Extract indices to scan from options
      const { accountIndices, addressIndices } = getIndicesToScan(options)

      if (accountIndices.length === 0 || addressIndices.length === 0) {
        throw new Error('No valid account or address indices to scan')
      }

      // Get polkadot addresses for cross-chain migration
      // Look for Polkadot app in both successful and failed apps
      const allSyncedApps = [...appsWithoutErrors, ...appsWithErrors]
      const polkadotApp = allSyncedApps.find(app => app.id === 'polkadot')
      const polkadotAddressesArray = polkadotApp?.accounts?.map(account => account.address) || polkadotAddresses || []

      // Get all available apps from config that have RPC endpoints (scannable chains)
      const allApps = Array.from(appsConfigs.values())
      const scannableApps = allApps.filter(appConfig => appConfig?.rpcEndpoints && appConfig.rpcEndpoints.length > 0)

      // Determine which apps to scan based on selection
      const appsToScan =
        options.selectedChain === 'all' ? scannableApps : scannableApps.filter(appConfig => appConfig.id === options.selectedChain)

      // Initialize progress tracking
      const totalApps = appsToScan.length
      setDeepScanProgress({ scanned: 0, total: totalApps, percentage: 0, currentChain: '' })

      // Initialize apps for scanning grid display (create App objects from AppConfig)
      const initialDeepScanApps = appsToScan.map(appConfig => {
        // Check if we have existing synchronized data for this app (in both successful and failed apps)
        const existingApp = allSyncedApps.find(app => app.id === appConfig.id)
        const originalAccountCount = (existingApp?.accounts?.length || 0) + (existingApp?.multisigAccounts?.length || 0)

        return {
          id: appConfig.id,
          name: appConfig.name,
          token: appConfig.token,
          accounts: existingApp?.accounts || [],
          multisigAccounts: existingApp?.multisigAccounts || [],
          status: AppStatus.LOADING,
          // Store original count for calculating new accounts found
          originalAccountCount,
        } as App & { originalAccountCount: number }
      })
      setDeepScanApps(initialDeepScanApps)

      // Scan additional accounts for selected apps
      // Include all apps (both successful and failed) so deep scan can recover failed chains
      const updatedApps = [...allSyncedApps]
      let newAccountsFound = 0

      for (let i = 0; i < appsToScan.length; i++) {
        // Check if scan was cancelled (using both ref for immediate detection and state)
        if (deepScanCancelledRef.current || deepScanCancelled) {
          throw new Error('Deep scan was cancelled')
        }

        const appConfig = appsToScan[i]

        // Find existing app data or create a minimal app object for scanning
        // Look in all synced apps, not just successful ones
        const existingSyncedApp = allSyncedApps.find(app => app.id === appConfig.id)
        const appForScanning =
          existingSyncedApp ||
          ({
            id: appConfig.id,
            name: appConfig.name,
            token: appConfig.token,
            accounts: [],
            multisigAccounts: [],
          } as App)

        // Update progress
        const progress = {
          scanned: i,
          total: totalApps,
          percentage: Math.round((i / totalApps) * 100),
          currentChain: appConfig.name || appConfig.id,
        }
        setDeepScanProgress(progress)

        // Update app status in the scanning grid
        setDeepScanApps(prev => prev.map(scanApp => (scanApp.id === appConfig.id ? { ...scanApp, status: AppStatus.LOADING } : scanApp)))

        // Scan the single app for new accounts (with individual error handling)
        let scanResult: SingleAppScanResult
        try {
          scanResult = await scanSingleApp(appForScanning, accountIndices, addressIndices, appConfig, polkadotAddressesArray)

          // Update app status based on scan result
          const hasNewAccounts = scanResult.newAccounts.length > 0 || scanResult.newMultisigAccounts.length > 0
          setDeepScanApps(prev =>
            prev.map(scanApp =>
              scanApp.id === appConfig.id
                ? {
                    ...scanApp,
                    status: AppStatus.SYNCHRONIZED,
                    accounts: [...(scanApp.accounts || []), ...scanResult.newAccounts],
                    multisigAccounts: [...(scanApp.multisigAccounts || []), ...scanResult.newMultisigAccounts],
                    // Preserve original count for new accounts calculation
                    originalAccountCount: (scanApp as any).originalAccountCount,
                  }
                : scanApp
            )
          )
        } catch (chainError) {
          // Handle individual chain failures gracefully
          console.warn(`Deep scan failed for chain ${appConfig.name || appConfig.id}:`, chainError)

          // Mark this chain as failed in the scanning grid
          setDeepScanApps(prev =>
            prev.map(scanApp =>
              scanApp.id === appConfig.id
                ? {
                    ...scanApp,
                    status: AppStatus.ERROR,
                    // Preserve original count for new accounts calculation
                    originalAccountCount: (scanApp as any).originalAccountCount,
                  }
                : scanApp
            )
          )

          // Create empty result to continue with other chains
          scanResult = { newAccounts: [], newMultisigAccounts: [] }
        }

        // Merge results with existing app data
        const hasNewAccounts = scanResult.newAccounts.length > 0 || scanResult.newMultisigAccounts.length > 0
        if (hasNewAccounts) {
          // Find the app in the updated apps array
          let existingAppInUpdated = updatedApps.find(a => a.id === appConfig.id)

          // If the app doesn't exist in updatedApps, create it
          if (!existingAppInUpdated) {
            existingAppInUpdated = {
              id: appConfig.id,
              name: appConfig.name,
              token: appConfig.token,
              status: AppStatus.SYNCHRONIZED, // Set to synchronized since we found accounts
              accounts: [],
              multisigAccounts: [],
            } as App
            updatedApps.push(existingAppInUpdated)
          }

          // Add the new accounts
          existingAppInUpdated.accounts = [...(existingAppInUpdated.accounts || []), ...scanResult.newAccounts]
          existingAppInUpdated.multisigAccounts = [...(existingAppInUpdated.multisigAccounts || []), ...scanResult.newMultisigAccounts]

          // Clear any error status since we successfully found accounts
          if (existingAppInUpdated.status === AppStatus.ERROR) {
            existingAppInUpdated.status = AppStatus.SYNCHRONIZED
            delete existingAppInUpdated.error
          }

          newAccountsFound += scanResult.newAccounts.length + scanResult.newMultisigAccounts.length
        }
      }

      // Final progress update
      setDeepScanProgress({
        scanned: totalApps,
        total: totalApps,
        percentage: 100,
        currentChain: '',
      })

      // Update state with results
      await updateStateWithScanResults(updatedApps, newAccountsFound)

      // Show appropriate notifications
      const chainInfo = options.selectedChain === 'all' ? 'all networks' : appsToScan[0]?.name || 'selected network'
      await showScanNotifications(newAccountsFound, chainInfo)

      // Mark scan as completed instead of closing modal
      setIsDeepScanCompleted(true)
    } catch (error) {
      console.error('Deep scan failed with critical error:', error)

      // Check if this was a cancellation vs a critical system error
      if (error instanceof Error && error.message === 'Deep scan was cancelled') {
        // Show cancellation notification
        const { notifications$ } = await import('@/state/notifications')
        notifications$.push({
          title: 'Deep Scan Cancelled',
          description: 'The deep scan was cancelled by the user.',
          type: 'info',
          autoHideDuration: 3000,
        })
      } else {
        // Show critical system error notification (not individual chain failures)
        const { notifications$ } = await import('@/state/notifications')
        notifications$.push({
          title: 'Deep Scan System Error',
          description: error instanceof Error ? error.message : 'A critical system error occurred during deep scan.',
          type: 'error',
          autoHideDuration: 5000,
        })
      }
    } finally {
      // Clean up scanning state but preserve results if completed successfully
      setIsDeepScanning(false)
      setDeepScanCancelled(false)
      setIsDeepScanCancelling(false)
      deepScanCancelledRef.current = false

      // Only clear results and close modal if scan was cancelled or had critical errors
      // Individual chain failures are handled gracefully and should not close the modal
      if (!isDeepScanCompleted) {
        // Check if this was a user cancellation
        const wasCancelled = deepScanCancelled || deepScanCancelledRef.current

        if (wasCancelled) {
          // User cancelled - clear everything and close modal
          setDeepScanProgress({ scanned: 0, total: 0, percentage: 0, currentChain: '' })
          setDeepScanApps([])

          // Close modal only if user didn't manually close it during scanning
          if (!modalClosedManuallyRef.current) {
            setIsDeepScanModalOpen(false)
          }
        } else {
          // Critical system error occurred - show completion state with any results
          // This allows users to see which chains succeeded before the critical error
          setIsDeepScanCompleted(true)
        }
      }
      modalClosedManuallyRef.current = false
    }
  }

  const handleCancelDeepScan = () => {
    // Set both ref (for immediate detection) and state (for UI updates)
    deepScanCancelledRef.current = true
    setDeepScanCancelled(true)
    setIsDeepScanCancelling(true)

    // Add backup timeout in case cancellation doesn't complete properly
    setTimeout(() => {
      if (isDeepScanning) {
        console.warn('Deep scan cancellation timed out, forcing cleanup')
        setIsDeepScanning(false)
        setIsDeepScanCancelling(false)
        setDeepScanCancelled(false)
        setIsDeepScanModalOpen(false)
        deepScanCancelledRef.current = false
      }
    }, 5000) // 5 second timeout
  }

  const handleDeepScanDone = () => {
    // Reset all deep scan states and close modal
    setIsDeepScanCompleted(false)
    setDeepScanProgress({ scanned: 0, total: 0, percentage: 0, currentChain: '' })
    setDeepScanApps([])
    setIsDeepScanModalOpen(false)
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
        onClose={() => {
          // Track if modal was closed manually during scanning
          if (isDeepScanning && !isDeepScanCancelling) {
            modalClosedManuallyRef.current = true
          }
          setIsDeepScanModalOpen(false)
        }}
        onScan={handleDeepScan}
        isScanning={isDeepScanning}
        isCancelling={isDeepScanCancelling}
        isCompleted={isDeepScanCompleted}
        progress={deepScanProgress}
        scanningApps={deepScanApps}
        onCancel={handleCancelDeepScan}
        onDone={handleDeepScanDone}
      />
    </div>
  )
}
