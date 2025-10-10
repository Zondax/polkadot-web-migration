import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ScanTypeEnum } from '@/lib/types/scan'
import { DeepScanModal } from '../deep-scan-modal'

// Mock UI components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: any) => <div data-testid="dialog-description">{children}</div>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({ onChange, value, ...props }: any) => <input onChange={onChange} value={value} {...props} />,
}))

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange, 'data-testid': dataTestId }: any) => {
    const childrenWithProps = React.Children.map(children, child => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child as any, { currentValue: value, onValueChange })
      }
      return child
    })
    return (
      <div data-testid={dataTestId || 'tabs'} data-value={value}>
        {childrenWithProps}
      </div>
    )
  },
  TabsContent: ({ children, value, currentValue }: any) => {
    // Only render if this tab is active
    if (value === currentValue) {
      return <div data-testid={`tab-content-${value}`}>{children}</div>
    }
    return null
  },
  TabsList: ({ children, onValueChange }: any) => {
    const childrenWithProps = React.Children.map(children, child => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child as any, { onValueChange })
      }
      return child
    })
    return <div data-testid="tabs-list">{childrenWithProps}</div>
  },
  TabsTrigger: ({ children, value, onValueChange, 'data-testid': dataTestId }: any) => (
    <button type="button" data-testid={dataTestId || `tab-trigger-${value}`} onClick={() => onValueChange?.(value)}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value }: any) => (
    <div data-testid="select" data-value={value}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-testid={`select-item-${value}`}>{children}</div>,
  SelectTrigger: ({ children }: any) => (
    <button type="button" data-testid="select-trigger">
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}))

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: any) => <div data-testid="alert">{children}</div>,
  AlertDescription: ({ children }: any) => <div data-testid="alert-description">{children}</div>,
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Plus: () => <span>+</span>,
  Minus: () => <span>-</span>,
  Loader2: () => <span>Loading...</span>,
  AlertCircle: () => <span>!</span>,
  Check: () => <span>✓</span>,
}))

// Mock synchronization service
vi.mock('@/lib/services/synchronization.service', () => ({
  getValidApps: vi.fn(() => [
    {
      id: 'polkadot',
      name: 'Polkadot',
      bip44Path: "m/44'/354'/0'/0'/0'",
      ss58Prefix: 0,
      rpcEndpoints: ['wss://polkadot-rpc.polkadot.io'],
      token: {
        symbol: 'DOT',
        decimals: 10,
      },
    },
    {
      id: 'kusama',
      name: 'Kusama',
      bip44Path: "m/44'/434'/0'/0'/0'",
      ss58Prefix: 2,
      rpcEndpoints: ['wss://kusama-rpc.polkadot.io'],
      token: {
        symbol: 'KSM',
        decimals: 12,
      },
    },
  ]),
  getAppsToSkipMigration: vi.fn(() => []),
}))

// Mock sync-status utility
vi.mock('@/lib/utils/sync-status', () => ({
  getSyncStatusLabel: vi.fn((progress, label) => (
    <span className="text-sm text-gray-600">
      {label} {progress.total > 0 ? `(${progress.scanned} / ${progress.total})` : ''}
    </span>
  )),
}))

// Mock appsConfigs
vi.mock('@/config/apps', () => ({
  appsConfigs: new Map([
    [
      'polkadot',
      {
        id: 'polkadot',
        name: 'Polkadot',
        bip44Path: "m/44'/354'/0'/0'/0'",
        ss58Prefix: 0,
        rpcEndpoint: 'wss://polkadot-rpc.polkadot.io',
        token: {
          symbol: 'DOT',
          decimals: 10,
        },
      },
    ],
    [
      'kusama',
      {
        id: 'kusama',
        name: 'Kusama',
        bip44Path: "m/44'/434'/0'/0'/0'",
        ss58Prefix: 2,
        rpcEndpoint: 'wss://kusama-rpc.polkadot.io',
        token: {
          symbol: 'KSM',
          decimals: 12,
        },
      },
    ],
  ]),
  polkadotAppConfig: {
    id: 'polkadot',
    name: 'Polkadot',
    bip44Path: "m/44'/354'/0'/0'/0'",
    ss58Prefix: 0,
    rpcEndpoint: 'wss://polkadot-rpc.polkadot.io',
    token: {
      symbol: 'DOT',
      decimals: 10,
    },
  },
  getChainName: (id: string) => {
    const chainNames: { [key: string]: string } = {
      polkadot: 'Polkadot',
      kusama: 'Kusama',
    }
    return chainNames[id] || id
  },
}))

describe('DeepScanModal', () => {
  const mockOnClose = vi.fn()
  const mockOnScan = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Derivation Path Generation', () => {
    it('should generate correct path for single account + single address', () => {
      render(<DeepScanModal isOpen={true} onClose={mockOnClose} onScan={mockOnScan} />)

      // Check initial derivation path (defaults: account 0, address 0)
      const pathDisplay = screen.getByText(/m\/44'\/354'\/0'\/0'\/0'/i)
      expect(pathDisplay).toBeInTheDocument()
    })

    it('should update path when account index changes', () => {
      render(<DeepScanModal isOpen={true} onClose={mockOnClose} onScan={mockOnScan} />)

      // Find and update account index input
      const accountInput = screen.getByLabelText('Account Index') as HTMLInputElement
      fireEvent.change(accountInput, { target: { value: '5' } })

      // Check updated derivation path
      const pathDisplay = screen.getByText(/m\/44'\/354'\/5'\/0'\/0'/i)
      expect(pathDisplay).toBeInTheDocument()
    })

    it('should update path when address index changes', () => {
      render(<DeepScanModal isOpen={true} onClose={mockOnClose} onScan={mockOnScan} />)

      // Find and update address index input
      const addressInput = document.getElementById('address-index') as HTMLInputElement
      fireEvent.change(addressInput, { target: { value: '3' } })

      // Check updated derivation path
      const pathDisplay = screen.getByText(/m\/44'\/354'\/0'\/0'\/3'/i)
      expect(pathDisplay).toBeInTheDocument()
    })

    it('should generate correct path for account range + address range', async () => {
      render(<DeepScanModal isOpen={true} onClose={mockOnClose} onScan={mockOnScan} />)

      // Switch to account range tab
      const accountTabs = screen.getByTestId('account-tabs')
      const accountRangeTab = within(accountTabs).getByTestId('account-range-tab')
      fireEvent.click(accountRangeTab)

      // Switch to address range tab
      const addressTabs = screen.getByTestId('address-tabs')
      const addressRangeTab = within(addressTabs).getByTestId('address-range-tab')
      fireEvent.click(addressRangeTab)

      // Wait for re-render
      await waitFor(() => {
        // Check for range notation in path
        expect(screen.getByText(/m\/44'\/354'\/\{0\.\.\.5\}'\/0'\/\{0\.\.\.5\}'/i)).toBeInTheDocument()
      })
    })

    it('should handle same start and end indices in range', async () => {
      render(<DeepScanModal isOpen={true} onClose={mockOnClose} onScan={mockOnScan} />)

      // Switch to account range tab
      const accountTabs = screen.getByTestId('account-tabs')
      const accountRangeTab = within(accountTabs).getByTestId('account-range-tab')
      fireEvent.click(accountRangeTab)

      // Set same start and end for account range using label text
      const startInputs = screen.getAllByLabelText('Start Index')
      const endInputs = screen.getAllByLabelText('End Index')
      const accountStartInput = startInputs[0] // Account section comes first
      const accountEndInput = endInputs[0]

      fireEvent.change(accountStartInput, { target: { value: '3' } })
      fireEvent.change(accountEndInput, { target: { value: '3' } })

      await waitFor(() => {
        // When start equals end, should show single value, not range
        expect(screen.getByText(/m\/44'\/354'\/3'\/0'/i)).toBeInTheDocument()
      })
    })

    it('should update path when chain selection changes', () => {
      render(<DeepScanModal isOpen={true} onClose={mockOnClose} onScan={mockOnScan} />)

      // Initial path should use Polkadot coin type (354)
      expect(screen.getByText(/m\/44'\/354'/i)).toBeInTheDocument()
    })
  })

  describe('Validation Logic', () => {
    it('should disable scan button for negative account index', () => {
      render(<DeepScanModal isOpen={true} onClose={mockOnClose} onScan={mockOnScan} />)

      const accountInput = screen.getByLabelText('Account Index')
      fireEvent.change(accountInput, { target: { value: '-1' } })

      const scanButton = screen.getByText('Start Deep Scan')
      expect(scanButton).toBeDisabled()
    })

    it('should disable scan button for negative address index', () => {
      render(<DeepScanModal isOpen={true} onClose={mockOnClose} onScan={mockOnScan} />)

      const addressInput = screen.getByLabelText('Address Index')
      fireEvent.change(addressInput, { target: { value: '-1' } })

      const scanButton = screen.getByText('Start Deep Scan')
      expect(scanButton).toBeDisabled()
    })

    it('should disable scan button when range end is less than start', async () => {
      render(<DeepScanModal isOpen={true} onClose={mockOnClose} onScan={mockOnScan} />)

      // Switch to account range tab
      const accountTabs = screen.getByTestId('account-tabs')
      const accountRangeTab = within(accountTabs).getByTestId('account-range-tab')
      fireEvent.click(accountRangeTab)

      await waitFor(() => {
        const startInputs = screen.getAllByLabelText('Start Index')
        const endInputs = screen.getAllByLabelText('End Index')
        const accountStartInput = startInputs[0] // Account section comes first
        const accountEndInput = endInputs[0]

        fireEvent.change(accountStartInput, { target: { value: '5' } })
        fireEvent.change(accountEndInput, { target: { value: '3' } })

        const scanButton = screen.getByText('Start Deep Scan')
        expect(scanButton).toBeDisabled()
      })
    })

    it('should enable scan button for valid inputs', () => {
      render(<DeepScanModal isOpen={true} onClose={mockOnClose} onScan={mockOnScan} />)

      const accountInput = screen.getByLabelText('Account Index')
      const addressInput = screen.getByLabelText('Address Index')

      fireEvent.change(accountInput, { target: { value: '5' } })
      fireEvent.change(addressInput, { target: { value: '10' } })

      const scanButton = screen.getByText('Start Deep Scan')
      expect(scanButton).not.toBeDisabled()
    })
  })

  describe('Scan Options Generation', () => {
    it('should generate correct options for single account + single address', () => {
      render(<DeepScanModal isOpen={true} onClose={mockOnClose} onScan={mockOnScan} />)

      const accountInput = screen.getByLabelText('Account Index')
      const addressInput = screen.getByLabelText('Address Index')

      fireEvent.change(accountInput, { target: { value: '7' } })
      fireEvent.change(addressInput, { target: { value: '3' } })

      const scanButton = screen.getByText('Start Deep Scan')
      fireEvent.click(scanButton)

      expect(mockOnScan).toHaveBeenCalledWith({
        accountType: ScanTypeEnum.SINGLE,
        addressType: ScanTypeEnum.SINGLE,
        accountIndex: 7,
        addressIndex: 3,
        selectedChain: 'all',
      })
    })

    it('should generate correct options for account range + address range', async () => {
      render(<DeepScanModal isOpen={true} onClose={mockOnClose} onScan={mockOnScan} />)

      // Switch both to range mode
      const accountTabs = screen.getByTestId('account-tabs')
      const accountRangeTab = within(accountTabs).getByTestId('account-range-tab')
      fireEvent.click(accountRangeTab)

      const addressTabs = screen.getByTestId('address-tabs')
      const addressRangeTab = within(addressTabs).getByTestId('address-range-tab')
      fireEvent.click(addressRangeTab)

      await waitFor(() => {
        const startInputs = screen.getAllByLabelText('Start Index')
        const endInputs = screen.getAllByLabelText('End Index')

        // Set account range 2-5 (account inputs come first)
        fireEvent.change(startInputs[0], { target: { value: '2' } })
        fireEvent.change(endInputs[0], { target: { value: '5' } })

        // Set address range 1-10 (address inputs come second)
        fireEvent.change(startInputs[1], { target: { value: '1' } })
        fireEvent.change(endInputs[1], { target: { value: '10' } })

        const scanButton = screen.getByText('Start Deep Scan')
        fireEvent.click(scanButton)

        expect(mockOnScan).toHaveBeenCalledWith({
          accountType: ScanTypeEnum.RANGE,
          addressType: ScanTypeEnum.RANGE,
          accountStartIndex: 2,
          accountEndIndex: 5,
          addressStartIndex: 1,
          addressEndIndex: 10,
          selectedChain: 'all',
        })
      })
    })

    it('should generate correct options for mixed modes', async () => {
      render(<DeepScanModal isOpen={true} onClose={mockOnClose} onScan={mockOnScan} />)

      // Keep account as single, switch address to range
      const addressTabs = screen.getByTestId('address-tabs')
      const addressRangeTab = within(addressTabs).getByTestId('address-range-tab')
      fireEvent.click(addressRangeTab)

      await waitFor(() => {
        const accountInput = screen.getByLabelText('Account Index') as HTMLInputElement
        fireEvent.change(accountInput, { target: { value: '3' } })

        const startInputs = screen.getAllByLabelText('Start Index')
        const endInputs = screen.getAllByLabelText('End Index')
        // Set address range (since account is single, address inputs will be the only ones)
        const addressStartInput = startInputs[0] // Only address range inputs exist
        const addressEndInput = endInputs[0]
        fireEvent.change(addressStartInput, { target: { value: '0' } })
        fireEvent.change(addressEndInput, { target: { value: '5' } })

        const scanButton = screen.getByText('Start Deep Scan')
        fireEvent.click(scanButton)

        expect(mockOnScan).toHaveBeenCalledWith({
          accountType: ScanTypeEnum.SINGLE,
          addressType: ScanTypeEnum.RANGE,
          accountIndex: 3,
          addressStartIndex: 0,
          addressEndIndex: 5,
          selectedChain: 'all',
        })
      })
    })
  })

  describe('UI Interactions', () => {
    it('should close modal when cancel is clicked', () => {
      render(<DeepScanModal isOpen={true} onClose={mockOnClose} onScan={mockOnScan} />)

      const cancelButton = screen.getByText('Cancel')
      fireEvent.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should show cancel scan button during scanning', () => {
      render(<DeepScanModal isOpen={true} onClose={mockOnClose} onScan={mockOnScan} isScanning={true} />)

      // During scanning, should show "Cancel Scan" button
      const cancelScanButton = screen.getByText('Cancel Scan')
      expect(cancelScanButton).toBeInTheDocument()
      expect(cancelScanButton).not.toBeDisabled()

      // Should not show "Start Deep Scan" button during scanning
      expect(screen.queryByText('Start Deep Scan')).not.toBeInTheDocument()
    })

    it('should disable cancel button when cancelling', () => {
      const mockOnCancel = vi.fn()
      render(
        <DeepScanModal
          isOpen={true}
          onClose={mockOnClose}
          onScan={mockOnScan}
          isScanning={true}
          isCancelling={true}
          onCancel={mockOnCancel}
        />
      )

      // When cancelling, button should show "Cancelling..." and be disabled
      const cancellingButton = screen.getByText('Cancelling...')
      expect(cancellingButton).toBeInTheDocument()
      expect(cancellingButton).toBeDisabled()
    })

    it('should show alert for large account ranges', async () => {
      render(<DeepScanModal isOpen={true} onClose={mockOnClose} onScan={mockOnScan} />)

      // Switch to account range
      const accountTabs = screen.getByTestId('account-tabs')
      const accountRangeTab = within(accountTabs).getByTestId('account-range-tab')
      fireEvent.click(accountRangeTab)

      await waitFor(() => {
        const startInputs = screen.getAllByLabelText('Start Index')
        const endInputs = screen.getAllByLabelText('End Index')
        const accountStartInput = startInputs[0] // Account section comes first
        const accountEndInput = endInputs[0]

        // Set large range (more than 50)
        fireEvent.change(accountStartInput, { target: { value: '0' } })
        fireEvent.change(accountEndInput, { target: { value: '60' } })

        const alert = screen.getByTestId('alert')
        expect(alert).toBeInTheDocument()
        expect(screen.getByText(/Large account ranges may take a long time to scan/i)).toBeInTheDocument()
      })
    })
  })
})
