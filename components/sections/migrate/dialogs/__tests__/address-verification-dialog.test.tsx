import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VerificationStatus } from '@/state/types/ledger'
import { AddressVerificationDialog } from '../address-verification-dialog'

// Mock dependencies
vi.mock('@legendapp/state/react', () => ({
  use$: vi.fn(),
}))

vi.mock('@/state/ui', () => ({
  uiState$: {
    icons: {
      get: vi.fn(() => ({})),
    },
  },
}))

vi.mock('@/components/CustomTooltip', () => ({
  CustomTooltip: vi.fn(({ children, tooltipBody }) => (
    <div data-testid="custom-tooltip" data-tooltip={tooltipBody}>
      {children}
    </div>
  )),
}))

vi.mock('@/components/ExplorerLink', () => ({
  ExplorerLink: vi.fn(({ value, appId, explorerLinkType, disableTooltip }) => (
    <span
      data-testid="explorer-link"
      data-value={value}
      data-app-id={appId}
      data-explorer-type={explorerLinkType}
      data-disable-tooltip={disableTooltip}
    >
      {value}
    </span>
  )),
}))

vi.mock('@/components/hooks/useMigration', () => ({
  useMigration: vi.fn(),
}))

vi.mock('@/config/apps', async importOriginal => {
  const actual = await importOriginal<typeof import('@/config/apps')>()
  return {
    ...actual,
    appsConfigs: new Map([
      ['polkadot', { name: 'Polkadot', chainId: 'polkadot' }],
      ['kusama', { name: 'Kusama', chainId: 'kusama' }],
    ]),
  }
})

vi.mock('@/config/ui', () => ({
  verificationStatusMap: {
    pending: { icon: <span>⏳</span>, tooltip: 'Pending verification' },
    verifying: { icon: <span>🔄</span>, tooltip: 'Verifying...' },
    verified: { icon: <span>✅</span>, tooltip: 'Verified' },
    failed: { icon: <span>❌</span>, tooltip: 'Verification failed' },
  },
}))

vi.mock('@/lib/utils', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/utils')>()
  return {
    ...actual,
    muifyHtml: vi.fn(html => html),
  }
})

vi.mock('@/components/ui/dialog', () => ({
  Dialog: vi.fn(({ children, open }) => (open ? <div data-testid="dialog">{children}</div> : null)),
  DialogContent: vi.fn(({ children }) => <div data-testid="dialog-content">{children}</div>),
  DialogHeader: vi.fn(({ children }) => <div data-testid="dialog-header">{children}</div>),
  DialogTitle: vi.fn(({ children }) => <h2>{children}</h2>),
  DialogDescription: vi.fn(({ children }) => <p>{children}</p>),
  DialogBody: vi.fn(({ children }) => <div data-testid="dialog-body">{children}</div>),
  DialogFooter: vi.fn(({ children }) => <div data-testid="dialog-footer">{children}</div>),
}))

vi.mock('@/components/ui/button', () => ({
  Button: vi.fn(({ children, onClick, disabled, variant, className }) => (
    <button type="button" onClick={onClick} disabled={disabled} data-variant={variant} className={className}>
      {children}
    </button>
  )),
}))

// Import mocked functions
import { use$ } from '@legendapp/state/react'
import type { MockedFunction } from 'vitest'
import { useMigration } from '@/components/hooks/useMigration'

const mockUse$ = use$ as MockedFunction<typeof use$>
const mockUseMigration = useMigration as MockedFunction<typeof useMigration>

describe('AddressVerificationDialog component', () => {
  const mockOnClose = vi.fn()
  const mockVerifyDestinationAddresses = vi.fn()
  const mockVerifyFailedAddresses = vi.fn()

  const defaultMigrationData = {
    destinationAddressesByApp: {
      polkadot: [
        { address: '1234567890abcdef', status: 'pending' as VerificationStatus },
        { address: '234567890abcdef1', status: 'verified' as VerificationStatus },
      ],
      kusama: [{ address: '34567890abcdef12', status: 'failed' as VerificationStatus }],
    },
    verifyDestinationAddresses: mockVerifyDestinationAddresses,
    verifyFailedAddresses: mockVerifyFailedAddresses,
    isVerifying: false,
    allVerified: false,
    anyFailed: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockUse$.mockReturnValue({
      polkadot: '<svg>Polkadot Icon</svg>',
      kusama: '<svg>Kusama Icon</svg>',
    })
    mockUseMigration.mockReturnValue(defaultMigrationData)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('basic rendering', () => {
    it('should render dialog when open', () => {
      render(<AddressVerificationDialog open={true} onClose={mockOnClose} />)

      expect(screen.getByText('Verify Destination Addresses')).toBeInTheDocument()
      expect(
        screen.getByText('Please verify all destination addresses. You will need to confirm each address on your Ledger device.')
      ).toBeInTheDocument()
      expect(screen.getByText('Destination Addresses')).toBeInTheDocument()
    })

    it('should not render dialog when closed', () => {
      render(<AddressVerificationDialog open={false} onClose={mockOnClose} />)

      expect(screen.queryByText('Verify Destination Addresses')).not.toBeInTheDocument()
    })

    it('should render all addresses grouped by app', () => {
      render(<AddressVerificationDialog open={true} onClose={mockOnClose} />)

      // Check app names
      expect(screen.getByText('Polkadot')).toBeInTheDocument()
      expect(screen.getByText('Kusama')).toBeInTheDocument()

      // Check addresses
      expect(screen.getByText('1234567890abcdef')).toBeInTheDocument()
      expect(screen.getByText('234567890abcdef1')).toBeInTheDocument()
      expect(screen.getByText('34567890abcdef12')).toBeInTheDocument()
    })

    it('should render status icons for each address', () => {
      render(<AddressVerificationDialog open={true} onClose={mockOnClose} />)

      // Check status icons
      expect(screen.getByText('⏳')).toBeInTheDocument() // pending
      expect(screen.getByText('✅')).toBeInTheDocument() // verified
      expect(screen.getByText('❌')).toBeInTheDocument() // failed
    })

    it('should render app icons when available', () => {
      render(<AddressVerificationDialog open={true} onClose={mockOnClose} />)

      // Icons are rendered as HTML text, not as actual text content
      expect(screen.getByText('<svg>Polkadot Icon</svg>')).toBeInTheDocument()
      expect(screen.getByText('<svg>Kusama Icon</svg>')).toBeInTheDocument()
    })

    it('should handle missing app config gracefully', () => {
      mockUseMigration.mockReturnValue({
        ...defaultMigrationData,
        destinationAddressesByApp: {
          unknown: [{ address: 'unknown-address', status: 'pending' as VerificationStatus }],
        },
      })

      render(<AddressVerificationDialog open={true} onClose={mockOnClose} />)

      expect(screen.getByText('unknown')).toBeInTheDocument()
    })
  })

  describe('button states and actions', () => {
    it('should show "Verify Addresses" button by default', () => {
      render(<AddressVerificationDialog open={true} onClose={mockOnClose} />)

      const verifyButton = screen.getByRole('button', { name: 'Verify Addresses' })
      expect(verifyButton).toBeInTheDocument()
      expect(verifyButton).not.toBeDisabled()
    })

    it('should show "Retry Failed" button when there are failed addresses', () => {
      mockUseMigration.mockReturnValue({
        ...defaultMigrationData,
        anyFailed: true,
      })

      render(<AddressVerificationDialog open={true} onClose={mockOnClose} />)

      const retryButton = screen.getByRole('button', { name: 'Retry Failed' })
      expect(retryButton).toBeInTheDocument()
      expect(retryButton).not.toBeDisabled()
    })

    it('should show "Verifying..." and disable button when verifying', () => {
      mockUseMigration.mockReturnValue({
        ...defaultMigrationData,
        isVerifying: true,
      })

      render(<AddressVerificationDialog open={true} onClose={mockOnClose} />)

      const verifyingButton = screen.getByRole('button', { name: 'Verifying...' })
      expect(verifyingButton).toBeInTheDocument()
      expect(verifyingButton).toBeDisabled()
    })

    it('should show "All Verified" and disable button when all verified', () => {
      mockUseMigration.mockReturnValue({
        ...defaultMigrationData,
        allVerified: true,
      })

      render(<AddressVerificationDialog open={true} onClose={mockOnClose} />)

      const verifiedButton = screen.getByRole('button', { name: 'All Verified' })
      expect(verifiedButton).toBeInTheDocument()
      expect(verifiedButton).toBeDisabled()
    })

    it('should call verifyDestinationAddresses when clicking verify button', () => {
      render(<AddressVerificationDialog open={true} onClose={mockOnClose} />)

      const verifyButton = screen.getByRole('button', { name: 'Verify Addresses' })
      fireEvent.click(verifyButton)

      expect(mockVerifyDestinationAddresses).toHaveBeenCalledTimes(1)
      expect(mockVerifyFailedAddresses).not.toHaveBeenCalled()
    })

    it('should call verifyFailedAddresses when clicking retry button', () => {
      mockUseMigration.mockReturnValue({
        ...defaultMigrationData,
        anyFailed: true,
      })

      render(<AddressVerificationDialog open={true} onClose={mockOnClose} />)

      const retryButton = screen.getByRole('button', { name: 'Retry Failed' })
      fireEvent.click(retryButton)

      expect(mockVerifyFailedAddresses).toHaveBeenCalledTimes(1)
      expect(mockVerifyDestinationAddresses).not.toHaveBeenCalled()
    })

    it('should call onClose when clicking cancel button', () => {
      render(<AddressVerificationDialog open={true} onClose={mockOnClose} />)

      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      fireEvent.click(cancelButton)

      // The onClose callback is called
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('auto close behavior', () => {
    it('should auto close after 1 second when all verified', async () => {
      const { rerender } = render(<AddressVerificationDialog open={true} onClose={mockOnClose} />)

      // Update to all verified state
      mockUseMigration.mockReturnValue({
        ...defaultMigrationData,
        allVerified: true,
        isVerifying: false,
      })

      rerender(<AddressVerificationDialog open={true} onClose={mockOnClose} />)

      // Should not close immediately
      expect(mockOnClose).not.toHaveBeenCalled()

      // Fast forward time
      await act(async () => {
        vi.advanceTimersByTime(1000)
      })

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should not auto close if still verifying', () => {
      const { rerender } = render(<AddressVerificationDialog open={true} onClose={mockOnClose} />)

      // Update to all verified but still verifying
      mockUseMigration.mockReturnValue({
        ...defaultMigrationData,
        allVerified: true,
        isVerifying: true,
      })

      rerender(<AddressVerificationDialog open={true} onClose={mockOnClose} />)

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(mockOnClose).not.toHaveBeenCalled()
    })

    it('should clear timeout when unmounting', () => {
      const { unmount } = render(<AddressVerificationDialog open={true} onClose={mockOnClose} />)

      // Update to all verified state
      mockUseMigration.mockReturnValue({
        ...defaultMigrationData,
        allVerified: true,
        isVerifying: false,
      })

      unmount()

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      // onClose should not be called after unmount
      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('scrollable content', () => {
    it('should have scrollable container for addresses', () => {
      // Create many addresses to test scrolling
      const manyAddresses = {
        polkadot: Array.from({ length: 10 }, (_, i) => ({
          address: `polkadot-address-${i}`,
          status: 'pending' as VerificationStatus,
        })),
      }

      mockUseMigration.mockReturnValue({
        ...defaultMigrationData,
        destinationAddressesByApp: manyAddresses,
      })

      render(<AddressVerificationDialog open={true} onClose={mockOnClose} />)

      const scrollableContainer = screen.getByRole('list')
      expect(scrollableContainer).toHaveClass('max-h-[250px]', 'overflow-auto')
    })
  })

  describe('explorer link integration', () => {
    it('should render explorer links with correct props', () => {
      render(<AddressVerificationDialog open={true} onClose={mockOnClose} />)

      const explorerLinks = screen.getAllByTestId('explorer-link')
      expect(explorerLinks).toHaveLength(3)

      // Check first address
      expect(explorerLinks[0]).toHaveAttribute('data-value', '1234567890abcdef')
      expect(explorerLinks[0]).toHaveAttribute('data-app-id', 'polkadot')
      expect(explorerLinks[0]).toHaveAttribute('data-explorer-type', 'address')
      expect(explorerLinks[0]).toHaveAttribute('data-disable-tooltip', 'true')
    })
  })

  describe('empty states', () => {
    it('should handle empty destination addresses', () => {
      mockUseMigration.mockReturnValue({
        ...defaultMigrationData,
        destinationAddressesByApp: {},
      })

      render(<AddressVerificationDialog open={true} onClose={mockOnClose} />)

      const list = screen.getByRole('list')
      expect(list).toBeEmptyDOMElement()
    })

    it('should handle empty addresses array for an app', () => {
      mockUseMigration.mockReturnValue({
        ...defaultMigrationData,
        destinationAddressesByApp: {
          polkadot: [],
        },
      })

      render(<AddressVerificationDialog open={true} onClose={mockOnClose} />)

      expect(screen.getByText('Polkadot')).toBeInTheDocument()
      // Should not have any explorer links
      expect(screen.queryByTestId('explorer-link')).not.toBeInTheDocument()
    })
  })

  describe('status icon tooltips', () => {
    it('should render tooltips for status icons', () => {
      render(<AddressVerificationDialog open={true} onClose={mockOnClose} />)

      const tooltips = screen.getAllByTestId('custom-tooltip')

      // Should have 3 tooltips (one for each address status)
      expect(tooltips).toHaveLength(3)

      // Check tooltip content
      expect(tooltips[0]).toHaveAttribute('data-tooltip', 'Pending verification')
      expect(tooltips[1]).toHaveAttribute('data-tooltip', 'Verified')
      expect(tooltips[2]).toHaveAttribute('data-tooltip', 'Verification failed')
    })
  })

  describe('edge cases', () => {
    it('should handle undefined verification status', () => {
      mockUseMigration.mockReturnValue({
        ...defaultMigrationData,
        destinationAddressesByApp: {
          polkadot: [{ address: 'test-address', status: 'unknown' as any }],
        },
      })

      render(<AddressVerificationDialog open={true} onClose={mockOnClose} />)

      // Should render the address but no icon
      expect(screen.getByText('test-address')).toBeInTheDocument()
    })

    it('should handle missing icons gracefully', () => {
      mockUse$.mockReturnValue({})

      render(<AddressVerificationDialog open={true} onClose={mockOnClose} />)

      // Should still render app names
      expect(screen.getByText('Polkadot')).toBeInTheDocument()
      expect(screen.getByText('Kusama')).toBeInTheDocument()
    })
  })
})
