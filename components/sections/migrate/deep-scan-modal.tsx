'use client'

import { use$ } from '@legendapp/state/react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AppStatus } from 'state/ledger'
import { uiState$ } from 'state/ui'
import { CustomTooltip } from '@/components/CustomTooltip'
import TokenIcon from '@/components/TokenIcon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AppId } from '@/config/apps'
import { appsConfigs, getChainName, polkadotAppConfig } from '@/config/apps'
import type { RangeField, ScanType } from '@/lib/types/scan'
import { RangeFieldEnum, SCAN_LIMITS, ScanTypeEnum } from '@/lib/types/scan'
import { cn, getAppTotalAccounts } from '@/lib/utils'
import { formatIndexDisplay, parseIndexConfig, validateIndexConfig } from '@/lib/utils/scan-indices'
import type { App } from '@/state/ledger'
import { IndexInputSection } from './index-input-section'
import { LedgerUnlockReminder } from './ledger-unlock-reminder'

interface DeepScanModalProps {
  isOpen: boolean
  onClose: () => void
  onScan: (options: DeepScanOptions) => void
  isScanning?: boolean
  isCancelling?: boolean
  isCompleted?: boolean
  progress?: {
    scanned: number
    total: number
    percentage: number
    currentChain: string
  }
  scanningApps?: App[]
  onCancel?: () => void
  onDone?: () => void
}

export interface DeepScanOptions {
  accountType: ScanType
  addressType: ScanType
  accountIndex?: number
  accountStartIndex?: number
  accountEndIndex?: number
  addressIndex?: number
  addressStartIndex?: number
  addressEndIndex?: number
  selectedChain?: AppId | 'all'
}

export function DeepScanModal({
  isOpen,
  onClose,
  onScan,
  isScanning = false,
  isCancelling = false,
  isCompleted = false,
  progress,
  scanningApps,
  onCancel,
  onDone,
}: DeepScanModalProps) {
  const icons = use$(uiState$.icons)
  const [accountScanType, setAccountScanType] = useState<ScanType>(ScanTypeEnum.SINGLE)
  const [addressScanType, setAddressScanType] = useState<ScanType>(ScanTypeEnum.SINGLE)
  const [accountIndex, setAccountIndex] = useState<string>(SCAN_LIMITS.DEFAULT_SINGLE.toString())
  const [accountStartIndex, setAccountStartIndex] = useState<string>(SCAN_LIMITS.DEFAULT_RANGE_START.toString())
  const [accountEndIndex, setAccountEndIndex] = useState<string>(SCAN_LIMITS.DEFAULT_RANGE_END.toString())
  const [addressIndex, setAddressIndex] = useState<string>(SCAN_LIMITS.DEFAULT_SINGLE.toString())
  const [addressStartIndex, setAddressStartIndex] = useState<string>(SCAN_LIMITS.DEFAULT_RANGE_START.toString())
  const [addressEndIndex, setAddressEndIndex] = useState<string>(SCAN_LIMITS.DEFAULT_RANGE_END.toString())
  const [selectedChain, setSelectedChain] = useState<AppId | 'all'>('all')

  // Get available chains from config
  const availableChains = useMemo(() => {
    const chains = Array.from(appsConfigs.values())
    // Add polkadot if not already in the list
    const hasPolkadot = chains.some(c => c.id === 'polkadot')
    if (!hasPolkadot) {
      chains.unshift(polkadotAppConfig)
    }
    return chains
  }, [])

  // Generate live derivation path based on current values
  const derivationPathExample = useMemo(() => {
    const chain =
      selectedChain === 'all'
        ? availableChains.find(c => c.id === 'polkadot') || availableChains[0]
        : availableChains.find(c => c.id === selectedChain)
    if (!chain) return "m/44'/coin_type'/account'/0'/address_index'"

    const pathParts = chain.bip44Path.split('/')
    const coinType = pathParts[2] // e.g., "354'"

    // Use utility functions for formatting
    const accountPart = formatIndexDisplay(accountScanType, accountIndex, accountStartIndex, accountEndIndex)

    const addressPart = formatIndexDisplay(addressScanType, addressIndex, addressStartIndex, addressEndIndex)

    return `m/44'/${coinType}/${accountPart}'/0'/${addressPart}'`
  }, [
    accountScanType,
    addressScanType,
    accountIndex,
    accountStartIndex,
    accountEndIndex,
    addressIndex,
    addressStartIndex,
    addressEndIndex,
    selectedChain,
    availableChains,
  ])

  const handleScan = () => {
    // Parse and validate configurations using utilities
    const accountConfig = parseIndexConfig(accountScanType, accountIndex, accountStartIndex, accountEndIndex)

    const addressConfig = parseIndexConfig(addressScanType, addressIndex, addressStartIndex, addressEndIndex)

    if (!accountConfig || !addressConfig) return

    // Convert to DeepScanOptions format
    const scanOptions: DeepScanOptions = {
      accountType: accountConfig.type,
      addressType: addressConfig.type,
      selectedChain,
      ...(accountConfig.type === ScanTypeEnum.SINGLE
        ? { accountIndex: accountConfig.value }
        : {
            accountStartIndex: accountConfig.start,
            accountEndIndex: accountConfig.end,
          }),
      ...(addressConfig.type === ScanTypeEnum.SINGLE
        ? { addressIndex: addressConfig.value }
        : {
            addressStartIndex: addressConfig.start,
            addressEndIndex: addressConfig.end,
          }),
    }

    onScan(scanOptions)
  }

  const handleClose = () => {
    if (isCompleted) {
      if (typeof onDone === 'function') {
        onDone()
      }
      return
    }
    // Just close the modal without canceling the scan
    // Let the scan continue in background
    onClose()
  }

  const isValidScan = () => {
    // Use utility functions for validation
    const accountValidation = validateIndexConfig(accountScanType, accountIndex, accountStartIndex, accountEndIndex)

    const addressValidation = validateIndexConfig(addressScanType, addressIndex, addressStartIndex, addressEndIndex)

    return accountValidation.isValid && addressValidation.isValid
  }

  // Handlers for account index changes
  const handleAccountRangeChange = (field: RangeField, value: string) => {
    if (field === RangeFieldEnum.START) {
      setAccountStartIndex(value)
    } else {
      setAccountEndIndex(value)
    }
  }

  // Handlers for address index changes
  const handleAddressRangeChange = (field: RangeField, value: string) => {
    if (field === RangeFieldEnum.START) {
      setAddressStartIndex(value)
    } else {
      setAddressEndIndex(value)
    }
  }

  // Render progress view during scanning
  const renderProgressView = () => (
    <>
      <DialogHeader>
        <DialogTitle>{isCompleted ? 'Deep Scan Complete' : 'Deep Scanning Accounts'}</DialogTitle>
        <DialogDescription>
          {isCompleted
            ? 'Review the scan results below. Chains with accounts found are highlighted in green.'
            : 'Scanning for additional accounts beyond the default range. Please keep your Ledger device unlocked.'}
        </DialogDescription>
      </DialogHeader>

      {/* Progress Section */}
      {progress && (
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {isCompleted
                ? `Scanned ${progress.total} chain${progress.total !== 1 ? 's' : ''} successfully`
                : isCancelling
                  ? 'Cancelling deep scan...'
                  : `Deep scanning chains ${progress.total > 0 ? `(${progress.scanned} / ${progress.total})` : ''}`}
              {!isCancelling && !isCompleted && progress.currentChain && ` - ${progress.currentChain}`}
            </span>
            <span className="text-sm text-gray-600">{progress.percentage}%</span>
          </div>
          <Progress value={progress.percentage} />
        </div>
      )}

      {/* Ledger Unlock Reminder */}
      <LedgerUnlockReminder isVisible={isScanning && !isCompleted} />

      {/* Scanning Apps Grid */}
      {scanningApps && scanningApps.length > 0 && (
        <div className="pt-2 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {scanningApps.map(app => (
              <DeepScanAppItem key={app.id} app={app} />
            ))}
          </div>
        </div>
      )}
    </>
  )

  // Deep scan app item component with proper icons and status
  const DeepScanAppItem = ({ app }: { app: App & { originalAccountCount?: number } }) => {
    const icons = use$(uiState$.icons)
    const icon = icons[app.id]
    const appName = app.name || getChainName(app.id) || app.id
    const { status } = app
    const totalAccounts = getAppTotalAccounts(app)
    const originalCount = app.originalAccountCount || 0
    const newAccountsFound = Math.max(0, totalAccounts - originalCount)

    let displayBadge = true
    let statusIcon: React.ReactNode
    let statusClass = 'border-gray-200 bg-white'
    let statusText = 'Waiting'

    // Define different app states for UI
    switch (status) {
      case AppStatus.SYNCHRONIZED:
        if (newAccountsFound > 0) {
          statusIcon = newAccountsFound
          statusClass = 'border-green-200 bg-green-50 opacity-100'
          statusText = `Deep scan complete (${newAccountsFound} new ${newAccountsFound === 1 ? 'account' : 'accounts'} found)`
        } else {
          statusIcon = 0
          statusClass = 'border-gray-200 bg-white opacity-80'
          statusText = 'Deep scan complete - no new accounts found'
        }
        break
      case AppStatus.ERROR:
        statusIcon = <AlertCircle className="h-3.5 w-3.5 text-red-500" />
        statusClass = 'border-red-200 bg-red-50 opacity-100'
        statusText = 'Deep scan failed'
        break
      case AppStatus.LOADING:
        statusIcon = <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
        statusClass = 'border-indigo-200 bg-indigo-50 opacity-100 animate-pulse'
        statusText = 'Deep scanning...'
        break
      default:
        statusIcon = undefined
        statusClass = 'border-gray-200 bg-white opacity-20'
        statusText = 'Waiting to scan'
        displayBadge = false
        break
    }

    return (
      <CustomTooltip tooltipBody={statusText}>
        <div className={cn('flex flex-col items-center p-3 rounded-lg border transition-all', statusClass)}>
          <div className="relative mb-2">
            <TokenIcon icon={icon} symbol={appName.substring(0, 3)} size="md" />
            {displayBadge && (
              <div className="absolute -right-2 -bottom-2">
                <Badge
                  variant="outline"
                  className="bg-white h-5 min-w-5 px-0 justify-center rounded-full text-xs"
                  data-testid="app-sync-badge"
                >
                  {statusIcon}
                </Badge>
              </div>
            )}
          </div>
          <span className="text-xs font-medium truncate max-w-full">{appName}</span>
        </div>
      </CustomTooltip>
    )
  }

  // Render configuration form
  const renderConfigView = () => (
    <>
      <DialogHeader>
        <DialogTitle>Deep Account Scan</DialogTitle>
        <DialogDescription>Scan for additional accounts beyond the default range (0-9)</DialogDescription>
      </DialogHeader>

      {/* Live Derivation Path Display */}
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4">
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">Derivation Path Preview:</div>
        <div className="font-mono text-lg text-gray-900 dark:text-gray-100 break-all">{derivationPathExample}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-3 space-y-1">
          <div>
            <span className="font-semibold">Format:</span> m/44'/coin_type'/
            <span className="text-blue-600 dark:text-blue-400 font-semibold">account'</span>/change'/address_index'
          </div>
          <div className="text-gray-600 dark:text-gray-300">
            • <span className="font-semibold">account'</span>: The account index you're scanning (modifiable)
          </div>
          <div className="text-gray-600 dark:text-gray-300">
            • <span className="font-semibold">change'</span>: External (0) or internal (1) chain
          </div>
          <div className="text-gray-600 dark:text-gray-300">
            • <span className="font-semibold">address_index'</span>: Address within the account
          </div>
        </div>
      </div>

      {/* Chain Selection */}
      <div className="mb-4">
        <label htmlFor="chain-select" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
          Select Chain
        </label>
        <Select value={selectedChain} onValueChange={v => setSelectedChain(v as AppId | 'all')}>
          <SelectTrigger id="chain-select">
            <SelectValue placeholder="Select a chain" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <span className="text-lg">🌍</span>
                <span>All Chains</span>
              </div>
            </SelectItem>
            {availableChains.map(chain => {
              const icon = icons[chain.id]
              return (
                <SelectItem key={chain.id} value={chain.id}>
                  <div className="flex items-center gap-2">
                    <TokenIcon icon={icon} symbol={chain.name.substring(0, 3)} size="sm" />
                    <span>{chain.name}</span>
                    <span className="text-xs text-gray-500">({chain.token.symbol})</span>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Account Index Section */}
      <IndexInputSection
        title="Account Index"
        helpText="The account index is the third component in the BIP44 path"
        scanType={accountScanType}
        singleValue={accountIndex}
        rangeStart={accountStartIndex}
        rangeEnd={accountEndIndex}
        onScanTypeChange={setAccountScanType}
        onSingleChange={setAccountIndex}
        onRangeChange={handleAccountRangeChange}
        testIdPrefix="account"
        unitSingular="account"
      />

      {/* Address Index Section */}
      <IndexInputSection
        title="Address Index"
        helpText="The address index is the fifth component in the BIP44 path"
        scanType={addressScanType}
        singleValue={addressIndex}
        rangeStart={addressStartIndex}
        rangeEnd={addressEndIndex}
        onScanTypeChange={setAddressScanType}
        onSingleChange={setAddressIndex}
        onRangeChange={handleAddressRangeChange}
        testIdPrefix="address"
        unitSingular="address"
        unitPlural="addresses"
      />
    </>
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn('max-h-[90vh] overflow-y-auto', isScanning || isCompleted ? 'max-w-2xl' : 'sm:max-w-lg')}>
        {isScanning || isCompleted ? renderProgressView() : renderConfigView()}

        <DialogFooter>
          {isCompleted ? (
            <Button onClick={onDone}>Done</Button>
          ) : isScanning ? (
            <Button variant="outline" onClick={onCancel} disabled={isCancelling}>
              {isCancelling ? 'Cancelling...' : 'Cancel Scan'}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleScan} disabled={!isValidScan()}>
                Start Deep Scan
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
