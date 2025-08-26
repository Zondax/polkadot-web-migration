'use client'

import { Minus, Plus } from 'lucide-react'
import Image from 'next/image'
import { useMemo, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AppId } from '@/config/apps'
import { appsConfigs, polkadotAppConfig } from '@/config/apps'

interface DeepScanModalProps {
  isOpen: boolean
  onClose: () => void
  onScan: (options: DeepScanOptions) => void
  isScanning?: boolean
}

export interface DeepScanOptions {
  accountType: 'single' | 'range'
  addressType: 'single' | 'range'
  accountIndex?: number
  accountStartIndex?: number
  accountEndIndex?: number
  addressIndex?: number
  addressStartIndex?: number
  addressEndIndex?: number
  selectedChain?: AppId | 'all'
}

export function DeepScanModal({ isOpen, onClose, onScan, isScanning = false }: DeepScanModalProps) {
  const [accountScanType, setAccountScanType] = useState<'single' | 'range'>('single')
  const [addressScanType, setAddressScanType] = useState<'single' | 'range'>('single')
  const [accountIndex, setAccountIndex] = useState<string>('1')
  const [accountStartIndex, setAccountStartIndex] = useState<string>('1')
  const [accountEndIndex, setAccountEndIndex] = useState<string>('5')
  const [addressIndex, setAddressIndex] = useState<string>('0')
  const [addressStartIndex, setAddressStartIndex] = useState<string>('0')
  const [addressEndIndex, setAddressEndIndex] = useState<string>('5')
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

    // Handle account part based on account scan type
    let accountPart: string
    if (accountScanType === 'single') {
      const accIndex = Number.parseInt(accountIndex, 10) || 0
      accountPart = `${accIndex}`
    } else {
      const accStart = Number.parseInt(accountStartIndex, 10) || 0
      const accEnd = Number.parseInt(accountEndIndex, 10) || 0
      accountPart = accStart === accEnd ? `${accStart}` : `{${accStart}...${accEnd}}`
    }

    // Handle address part based on address scan type
    let addressPart: string
    if (addressScanType === 'single') {
      const addrIndex = Number.parseInt(addressIndex, 10) || 0
      addressPart = `${addrIndex}`
    } else {
      const addrStart = Number.parseInt(addressStartIndex, 10) || 0
      const addrEnd = Number.parseInt(addressEndIndex, 10) || 0
      addressPart = addrStart === addrEnd ? `${addrStart}` : `{${addrStart}...${addrEnd}}`
    }

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
    const scanOptions: DeepScanOptions = {
      accountType: accountScanType,
      addressType: addressScanType,
      selectedChain,
    }

    // Add account values based on type
    if (accountScanType === 'single') {
      const accIndex = Number.parseInt(accountIndex, 10)
      if (Number.isNaN(accIndex) || accIndex < 0) return
      scanOptions.accountIndex = accIndex
    } else {
      const accStart = Number.parseInt(accountStartIndex, 10)
      const accEnd = Number.parseInt(accountEndIndex, 10)
      if (Number.isNaN(accStart) || Number.isNaN(accEnd) || accStart < 0 || accEnd < accStart) return
      scanOptions.accountStartIndex = accStart
      scanOptions.accountEndIndex = accEnd
    }

    // Add address values based on type
    if (addressScanType === 'single') {
      const addrIndex = Number.parseInt(addressIndex, 10)
      if (Number.isNaN(addrIndex) || addrIndex < 0) return
      scanOptions.addressIndex = addrIndex
    } else {
      const addrStart = Number.parseInt(addressStartIndex, 10)
      const addrEnd = Number.parseInt(addressEndIndex, 10)
      if (Number.isNaN(addrStart) || Number.isNaN(addrEnd) || addrStart < 0 || addrEnd < addrStart) return
      scanOptions.addressStartIndex = addrStart
      scanOptions.addressEndIndex = addrEnd
    }

    onScan(scanOptions)
  }

  const handleClose = () => {
    if (!isScanning) {
      onClose()
    }
  }

  const isValidScan = () => {
    // Validate account settings
    let accountValid = false
    if (accountScanType === 'single') {
      const accIndex = Number.parseInt(accountIndex, 10)
      accountValid = !Number.isNaN(accIndex) && accIndex >= 0
    } else {
      const accStart = Number.parseInt(accountStartIndex, 10)
      const accEnd = Number.parseInt(accountEndIndex, 10)
      accountValid = !Number.isNaN(accStart) && !Number.isNaN(accEnd) && accStart >= 0 && accEnd >= accStart && accEnd - accStart < 50
    }

    // Validate address settings
    let addressValid = false
    if (addressScanType === 'single') {
      const addrIndex = Number.parseInt(addressIndex, 10)
      addressValid = !Number.isNaN(addrIndex) && addrIndex >= 0
    } else {
      const addrStart = Number.parseInt(addressStartIndex, 10)
      const addrEnd = Number.parseInt(addressEndIndex, 10)
      addressValid = !Number.isNaN(addrStart) && !Number.isNaN(addrEnd) && addrStart >= 0 && addrEnd >= addrStart
    }

    return accountValid && addressValid
  }

  const adjustAccountIndex = (increment: number) => {
    const current = Number.parseInt(accountIndex, 10) || 0
    const newValue = Math.max(0, current + increment)
    setAccountIndex(newValue.toString())
  }

  const adjustAccountRange = (field: 'start' | 'end', increment: number) => {
    if (field === 'start') {
      const current = Number.parseInt(accountStartIndex, 10) || 0
      const newValue = Math.max(0, current + increment)
      setAccountStartIndex(newValue.toString())
    } else {
      const current = Number.parseInt(accountEndIndex, 10) || 0
      const newValue = Math.max(0, current + increment)
      setAccountEndIndex(newValue.toString())
    }
  }

  const adjustAddressIndex = (increment: number) => {
    const current = Number.parseInt(addressIndex, 10) || 0
    const newValue = Math.max(0, current + increment)
    setAddressIndex(newValue.toString())
  }

  const adjustAddressRange = (field: 'start' | 'end', increment: number) => {
    if (field === 'start') {
      const current = Number.parseInt(addressStartIndex, 10) || 0
      const newValue = Math.max(0, current + increment)
      setAddressStartIndex(newValue.toString())
    } else {
      const current = Number.parseInt(addressEndIndex, 10) || 0
      const newValue = Math.max(0, current + increment)
      setAddressEndIndex(newValue.toString())
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
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
              {availableChains.map(chain => (
                <SelectItem key={chain.id} value={chain.id}>
                  <div className="flex items-center gap-2">
                    {chain.token.logoId ? (
                      <Image
                        src={`/images/logos/${chain.token.logoId}.svg`}
                        alt={chain.name}
                        width={20}
                        height={20}
                        className="w-5 h-5"
                        onError={e => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <Image
                        src={`/images/logos/${chain.id}.svg`}
                        alt={chain.name}
                        width={20}
                        height={20}
                        className="w-5 h-5"
                        onError={e => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    )}
                    <span>{chain.name}</span>
                    <span className="text-xs text-gray-500">({chain.token.symbol})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Account Index Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Account Index</div>
            <Tabs
              value={accountScanType}
              onValueChange={value => setAccountScanType(value as 'single' | 'range')}
              data-testid="account-tabs"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="single" data-testid="account-single-tab">
                  Single Account
                </TabsTrigger>
                <TabsTrigger value="range" data-testid="account-range-tab">
                  Account Range
                </TabsTrigger>
              </TabsList>

              <TabsContent value="single" className="space-y-2 mt-4">
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => adjustAccountIndex(-1)}
                    disabled={Number.parseInt(accountIndex, 10) <= 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="account-index"
                    type="number"
                    min="0"
                    value={accountIndex}
                    onChange={e => setAccountIndex(e.target.value)}
                    className="text-center"
                    placeholder="1"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => adjustAccountIndex(1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">The account index is the third component in the BIP44 path</p>
              </TabsContent>

              <TabsContent value="range" className="space-y-2 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="account-start-index" className="text-sm font-medium">
                      Start Index
                    </label>
                    <div className="flex items-center space-x-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => adjustAccountRange('start', -1)}
                        disabled={Number.parseInt(accountStartIndex, 10) <= 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        id="account-start-index"
                        type="number"
                        min="0"
                        value={accountStartIndex}
                        onChange={e => setAccountStartIndex(e.target.value)}
                        className="text-center"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => adjustAccountRange('start', 1)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="account-end-index" className="text-sm font-medium">
                      End Index
                    </label>
                    <div className="flex items-center space-x-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => adjustAccountRange('end', -1)}
                        disabled={Number.parseInt(accountEndIndex, 10) <= Number.parseInt(accountStartIndex, 10)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        id="account-end-index"
                        type="number"
                        min={accountStartIndex}
                        value={accountEndIndex}
                        onChange={e => setAccountEndIndex(e.target.value)}
                        className="text-center"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => adjustAccountRange('end', 1)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Scanning {Math.max(0, Number.parseInt(accountEndIndex, 10) - Number.parseInt(accountStartIndex, 10) + 1)} account
                  {Math.max(0, Number.parseInt(accountEndIndex, 10) - Number.parseInt(accountStartIndex, 10) + 1) !== 1 ? 's' : ''}
                </p>
                {Number.parseInt(accountEndIndex, 10) - Number.parseInt(accountStartIndex, 10) >= 50 && (
                  <Alert>
                    <AlertDescription className="text-amber-900 dark:text-amber-200">
                      Large account ranges may take a long time to scan. Consider smaller ranges for better performance.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Address Index Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Address Index</div>
            <Tabs
              value={addressScanType}
              onValueChange={value => setAddressScanType(value as 'single' | 'range')}
              data-testid="address-tabs"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="single" data-testid="address-single-tab">
                  Single Address
                </TabsTrigger>
                <TabsTrigger value="range" data-testid="address-range-tab">
                  Address Range
                </TabsTrigger>
              </TabsList>

              <TabsContent value="single" className="space-y-2 mt-4">
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => adjustAddressIndex(-1)}
                    disabled={Number.parseInt(addressIndex, 10) <= 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="address-index"
                    type="number"
                    min="0"
                    value={addressIndex}
                    onChange={e => setAddressIndex(e.target.value)}
                    className="text-center"
                    placeholder="0"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => adjustAddressIndex(1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">The address index is the fifth component in the BIP44 path</p>
              </TabsContent>

              <TabsContent value="range" className="space-y-2 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="address-start-index" className="text-sm font-medium">
                      Start Index
                    </label>
                    <div className="flex items-center space-x-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => adjustAddressRange('start', -1)}
                        disabled={Number.parseInt(addressStartIndex, 10) <= 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        id="address-start-index"
                        type="number"
                        min="0"
                        value={addressStartIndex}
                        onChange={e => setAddressStartIndex(e.target.value)}
                        className="text-center"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => adjustAddressRange('start', 1)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="address-end-index" className="text-sm font-medium">
                      End Index
                    </label>
                    <div className="flex items-center space-x-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => adjustAddressRange('end', -1)}
                        disabled={Number.parseInt(addressEndIndex, 10) <= Number.parseInt(addressStartIndex, 10)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        id="address-end-index"
                        type="number"
                        min={addressStartIndex}
                        value={addressEndIndex}
                        onChange={e => setAddressEndIndex(e.target.value)}
                        className="text-center"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => adjustAddressRange('end', 1)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Scanning {Math.max(0, Number.parseInt(addressEndIndex, 10) - Number.parseInt(addressStartIndex, 10) + 1)} address
                  {Math.max(0, Number.parseInt(addressEndIndex, 10) - Number.parseInt(addressStartIndex, 10) + 1) !== 1 ? 'es' : ''} per
                  account
                </p>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isScanning}>
            Cancel
          </Button>
          <Button onClick={handleScan} disabled={isScanning || !isValidScan()}>
            {isScanning ? 'Scanning...' : 'Start Deep Scan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
