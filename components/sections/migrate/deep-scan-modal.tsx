'use client'

import { Plus, Minus } from 'lucide-react'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { appsConfigs } from '@/config/apps'
import type { AppId } from '@/config/apps'

interface DeepScanModalProps {
  isOpen: boolean
  onClose: () => void
  onScan: (options: DeepScanOptions) => void
  isScanning?: boolean
}

export interface DeepScanOptions {
  type: 'single' | 'range'
  accountIndex?: number
  startIndex?: number
  endIndex?: number
  selectedChain?: AppId | 'all'
}

export function DeepScanModal({ isOpen, onClose, onScan, isScanning = false }: DeepScanModalProps) {
  const [scanType, setScanType] = useState<'single' | 'range'>('single')
  const [accountIndex, setAccountIndex] = useState<string>('1')
  const [startIndex, setStartIndex] = useState<string>('1')
  const [endIndex, setEndIndex] = useState<string>('5')
  const [selectedChain, setSelectedChain] = useState<AppId | 'all'>('all')
  
  // Get available chains from config
  const availableChains = useMemo(() => {
    const chains = Array.from(appsConfigs.values())
    // Add polkadot if not already in the list
    const hasPolkadot = chains.some(c => c.id === 'polkadot')
    if (!hasPolkadot) {
      chains.unshift({
        id: 'polkadot' as AppId,
        name: 'Polkadot',
        bip44Path: "m/44'/354'/0'/0'/0'",
        ss58Prefix: 0,
        rpcEndpoint: 'wss://polkadot-rpc.polkadot.io',
        token: {
          symbol: 'DOT',
          decimals: 10
        }
      })
    }
    return chains
  }, [])

  // Generate live derivation path based on current values
  const derivationPathExample = useMemo(() => {
    const chain = selectedChain === 'all' ? availableChains[0] : availableChains.find(c => c.id === selectedChain)
    if (!chain) return "m/44'/coin_type'/account'/0'/0'"
    
    const pathParts = chain.bip44Path.split('/')
    const coinType = pathParts[2] // e.g., "354'"
    
    if (scanType === 'single') {
      const index = Number.parseInt(accountIndex, 10) || 0
      return `m/44'/${coinType}/${index}'/0'/0'`
    } else {
      const start = Number.parseInt(startIndex, 10) || 0
      const end = Number.parseInt(endIndex, 10) || 0
      if (start === end) {
        return `m/44'/${coinType}/${start}'/0'/0'`
      }
      return `m/44'/${coinType}/{${start}...${end}}'/0'/0'`
    }
  }, [scanType, accountIndex, startIndex, endIndex, selectedChain, availableChains])

  const handleScan = () => {
    if (scanType === 'single') {
      const index = Number.parseInt(accountIndex, 10)
      if (Number.isNaN(index) || index < 0) return
      
      onScan({
        type: 'single',
        accountIndex: index,
        selectedChain
      })
    } else {
      const start = Number.parseInt(startIndex, 10)
      const end = Number.parseInt(endIndex, 10)
      if (Number.isNaN(start) || Number.isNaN(end) || start < 0 || end < start) return
      
      onScan({
        type: 'range',
        startIndex: start,
        endIndex: end,
        selectedChain
      })
    }
  }

  const handleClose = () => {
    if (!isScanning) {
      onClose()
    }
  }

  const isValidSingle = () => {
    const index = Number.parseInt(accountIndex, 10)
    return !Number.isNaN(index) && index >= 0
  }

  const isValidRange = () => {
    const start = Number.parseInt(startIndex, 10)
    const end = Number.parseInt(endIndex, 10)
    return !Number.isNaN(start) && !Number.isNaN(end) && start >= 0 && end >= start && (end - start) < 50 // Limit range to 50 accounts
  }

  const adjustAccountIndex = (increment: number) => {
    const current = Number.parseInt(accountIndex, 10) || 0
    const newValue = Math.max(0, current + increment)
    setAccountIndex(newValue.toString())
  }

  const adjustRange = (field: 'start' | 'end', increment: number) => {
    if (field === 'start') {
      const current = Number.parseInt(startIndex, 10) || 0
      const newValue = Math.max(0, current + increment)
      setStartIndex(newValue.toString())
    } else {
      const current = Number.parseInt(endIndex, 10) || 0
      const newValue = Math.max(0, current + increment)
      setEndIndex(newValue.toString())
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Deep Account Scan</DialogTitle>
          <DialogDescription>
            Scan for additional accounts beyond the default range (0-9)
          </DialogDescription>
        </DialogHeader>
        
        {/* Live Derivation Path Display */}
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">Derivation Path Preview:</div>
          <div className="font-mono text-lg text-gray-900 dark:text-gray-100 break-all">
            {derivationPathExample}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-3 space-y-1">
            <div>
              <span className="font-semibold">Format:</span> m/44'/coin_type'/<span className="text-blue-600 dark:text-blue-400 font-semibold">account'</span>/change'/address_index'
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
          <Select value={selectedChain} onValueChange={(v) => setSelectedChain(v as AppId | 'all')}>
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
              {availableChains.map((chain) => (
                <SelectItem key={chain.id} value={chain.id}>
                  <div className="flex items-center gap-2">
                    {chain.token.logoId ? (
                      <img 
                        src={`/images/logos/${chain.token.logoId}.svg`} 
                        alt={chain.name} 
                        className="w-5 h-5"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <img 
                        src={`/images/logos/${chain.id}.svg`} 
                        alt={chain.name} 
                        className="w-5 h-5"
                        onError={(e) => {
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
        
        <Tabs value={scanType} onValueChange={(value) => setScanType(value as 'single' | 'range')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single Account</TabsTrigger>
            <TabsTrigger value="range">Account Range</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="account-index" className="text-sm font-medium">Account Index</label>
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
                  onChange={(e) => setAccountIndex(e.target.value)}
                  className="text-center"
                  placeholder="1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => adjustAccountIndex(1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                The account index is the third component in the BIP44 path
              </p>
            </div>
          </TabsContent>

          <TabsContent value="range" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="start-index" className="text-sm font-medium">Start Index</label>
                <div className="flex items-center space-x-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => adjustRange('start', -1)}
                    disabled={Number.parseInt(startIndex, 10) <= 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="start-index"
                    type="number"
                    min="0"
                    value={startIndex}
                    onChange={(e) => setStartIndex(e.target.value)}
                    className="text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => adjustRange('start', 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="end-index" className="text-sm font-medium">End Index</label>
                <div className="flex items-center space-x-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => adjustRange('end', -1)}
                    disabled={Number.parseInt(endIndex, 10) <= Number.parseInt(startIndex, 10)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="end-index"
                    type="number"
                    min={startIndex}
                    value={endIndex}
                    onChange={(e) => setEndIndex(e.target.value)}
                    className="text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => adjustRange('end', 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Scanning {Math.max(0, Number.parseInt(endIndex, 10) - Number.parseInt(startIndex, 10) + 1)} account{Math.max(0, Number.parseInt(endIndex, 10) - Number.parseInt(startIndex, 10) + 1) !== 1 ? 's' : ''}
            </p>
            {(Number.parseInt(endIndex, 10) - Number.parseInt(startIndex, 10)) >= 50 && (
              <Alert>
                <AlertDescription className="text-amber-900 dark:text-amber-200">
                  Large ranges may take a long time to scan. Consider smaller ranges for better performance.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isScanning}>
            Cancel
          </Button>
          <Button
            onClick={handleScan}
            disabled={isScanning || (scanType === 'single' ? !isValidSingle() : !isValidRange())}
          >
            {isScanning ? 'Scanning...' : 'Start Deep Scan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}