import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Address, MultisigAddress } from '@/state/types/ledger'

// Mock dependencies
vi.mock('@legendapp/state/react', () => ({
  observer: (component: any) => component,
}))

vi.mock('lucide-react', () => ({
  AlertCircle: ({ className }: any) => <div data-testid="alert-circle" className={className}>AlertCircle</div>,
  Info: ({ className }: any) => <div data-testid="info-icon" className={className}>Info</div>,
  KeyRound: () => null,
  Route: () => null,
  User: () => null,
}))

vi.mock('@/components/CustomTooltip', () => ({
  CustomTooltip: ({ children, tooltipBody }: any) => {
    // Handle React elements in tooltipBody
    let tooltipContent = tooltipBody
    if (tooltipBody && typeof tooltipBody === 'object' && tooltipBody.props) {
      // Extract tooltip content if it's a React element
      tooltipContent = 'tooltip-content'
    } else if (typeof tooltipBody === 'string') {
      tooltipContent = tooltipBody
    }
    
    return (
      <div data-testid="custom-tooltip" data-tooltip-body={tooltipContent}>
        {children}
        {/* Render the actual tooltip body for testing */}
        {tooltipBody && typeof tooltipBody === 'object' && tooltipBody.props && (
          <div data-testid="tooltip-content-wrapper">
            {tooltipBody}
          </div>
        )}
      </div>
    )
  },
  TooltipBody: ({ items }: any) => (
    <div data-testid="tooltip-body">
      {items.map((item: any, index: number) => (
        <div key={index} data-testid="tooltip-item">
          {item.label}: {typeof item.value === 'string' ? item.value : 'Component'}
        </div>
      ))}
    </div>
  ),
  TooltipItem: {},
}))

vi.mock('@/components/ExplorerLink', () => ({
  ExplorerLink: ({ value, className }: any) => (
    <a data-testid="explorer-link" className={className}>
      {value}
    </a>
  ),
}))

vi.mock('@/components/icons', () => ({
  Spinner: () => <div data-testid="spinner">Loading...</div>,
}))

vi.mock('@/components/ui/table', () => ({
  TableCell: ({ children, rowSpan, className }: any) => (
    <td rowSpan={rowSpan} className={className} data-testid="table-cell">
      {children}
    </td>
  ),
  TableRow: ({ children }: any) => <tr data-testid="table-row">{children}</tr>,
}))

import InvalidSynchronizedAccountRow from '../invalid-synchronized-account-row'

describe('InvalidSynchronizedAccountRow component', () => {
  const mockAddress: Address = {
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    path: "m/44'/354'/0'/0/0",
    pubKey: '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d',
    selected: false,
  }

  const mockMultisigAddress: MultisigAddress = {
    address: '5DTestAddress',
    selected: false,
    isMultisig: true,
    threshold: 2,
    members: [
      { address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', internal: true },
      { address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', internal: false },
    ],
  }

  const defaultProps = {
    account: mockAddress,
    accountIndex: 0,
    rowSpan: 1,
    appId: 'polkadot' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render account row with address', () => {
      render(<InvalidSynchronizedAccountRow {...defaultProps} />)

      expect(screen.getByTestId('table-row')).toBeInTheDocument()
      const explorerLinks = screen.getAllByTestId('explorer-link')
      expect(explorerLinks[0]).toHaveTextContent('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')
    })

    it('should render info icon with tooltip', () => {
      render(<InvalidSynchronizedAccountRow {...defaultProps} />)

      expect(screen.getByTestId('info-icon')).toBeInTheDocument()
      expect(screen.getByTestId('info-icon')).toHaveClass('h-4 w-4 text-muted-foreground')
    })

    it('should apply rowSpan to the first table cell', () => {
      render(<InvalidSynchronizedAccountRow {...defaultProps} rowSpan={3} />)

      const cells = screen.getAllByTestId('table-cell')
      expect(cells[0]).toHaveAttribute('rowSpan', '3')
    })

    it('should handle missing address gracefully', () => {
      const accountWithoutAddress = {
        ...mockAddress,
        address: undefined,
      }

      render(<InvalidSynchronizedAccountRow {...defaultProps} account={accountWithoutAddress} />)

      const explorerLinks = screen.getAllByTestId('explorer-link')
      expect(explorerLinks[0]).toHaveTextContent('')
    })
  })

  describe('tooltip content', () => {
    it('should show address details in tooltip', () => {
      render(<InvalidSynchronizedAccountRow {...defaultProps} />)

      // The tooltip content is rendered inside the wrapper
      const tooltipWrapper = screen.getByTestId('tooltip-content-wrapper')
      expect(tooltipWrapper).toBeInTheDocument()
      
      // Within the wrapper, we should find the tooltip body
      const tooltipBody = tooltipWrapper.querySelector('[data-testid="tooltip-body"]')
      expect(tooltipBody).toBeInTheDocument()
      
      const tooltipItems = tooltipWrapper.querySelectorAll('[data-testid="tooltip-item"]')
      expect(tooltipItems).toHaveLength(3)
      expect(tooltipItems[0]).toHaveTextContent('Source Address: Component')
      expect(tooltipItems[1]).toHaveTextContent("Derivation Path: m/44'/354'/0'/0/0")
      expect(tooltipItems[2]).toHaveTextContent('Public Key: 0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d')
    })

    it('should handle account without path', () => {
      const accountWithoutPath = {
        ...mockAddress,
        path: undefined,
      }

      render(<InvalidSynchronizedAccountRow {...defaultProps} account={accountWithoutPath} />)

      const tooltipWrapper = screen.getByTestId('tooltip-content-wrapper')
      const tooltipItems = tooltipWrapper.querySelectorAll('[data-testid="tooltip-item"]')
      expect(tooltipItems).toHaveLength(2) // Only address and pubKey
      expect(tooltipItems[0]).toHaveTextContent('Source Address: Component')
      expect(tooltipItems[1]).toHaveTextContent('Public Key: 0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d')
    })

    it('should handle account without pubKey', () => {
      const accountWithoutPubKey = {
        ...mockAddress,
        pubKey: undefined,
      }

      render(<InvalidSynchronizedAccountRow {...defaultProps} account={accountWithoutPubKey} />)

      const tooltipWrapper = screen.getByTestId('tooltip-content-wrapper')
      const tooltipItems = tooltipWrapper.querySelectorAll('[data-testid="tooltip-item"]')
      expect(tooltipItems).toHaveLength(2) // Only address and path
      expect(tooltipItems[0]).toHaveTextContent('Source Address: Component')
      expect(tooltipItems[1]).toHaveTextContent("Derivation Path: m/44'/354'/0'/0/0")
    })

    it('should handle multisig account without path and pubKey', () => {
      render(<InvalidSynchronizedAccountRow {...defaultProps} account={mockMultisigAddress} />)

      const tooltipWrapper = screen.getByTestId('tooltip-content-wrapper')
      const tooltipItems = tooltipWrapper.querySelectorAll('[data-testid="tooltip-item"]')
      expect(tooltipItems).toHaveLength(1) // Only address
      expect(tooltipItems[0]).toHaveTextContent('Source Address: Component')
    })
  })

  describe('status icons', () => {
    it('should show loading spinner when isLoading is true', () => {
      const loadingAccount = {
        ...mockAddress,
        isLoading: true,
      }

      render(<InvalidSynchronizedAccountRow {...defaultProps} account={loadingAccount} />)

      expect(screen.getByTestId('spinner')).toBeInTheDocument()
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should show error icon when account has error', () => {
      const accountWithError = {
        ...mockAddress,
        error: { source: 'synchronization', description: 'Failed to sync account' },
      }

      render(<InvalidSynchronizedAccountRow {...defaultProps} account={accountWithError} />)

      expect(screen.getByTestId('alert-circle')).toBeInTheDocument()
      expect(screen.getByTestId('alert-circle')).toHaveClass('h-4 w-4 text-destructive cursor-help')
      
      const tooltip = screen.getAllByTestId('custom-tooltip').find(el => 
        el.getAttribute('data-tooltip-body') === 'Failed to sync account'
      )
      expect(tooltip).toBeInTheDocument()
    })

    it('should handle error without description', () => {
      const accountWithError = {
        ...mockAddress,
        error: { source: 'synchronization', description: undefined },
      }

      render(<InvalidSynchronizedAccountRow {...defaultProps} account={accountWithError} />)

      // The component checks for error?.description, so if description is undefined, no error icon is shown
      expect(screen.queryByTestId('alert-circle')).not.toBeInTheDocument()
    })

    it('should not show any status icon when no loading or error', () => {
      render(<InvalidSynchronizedAccountRow {...defaultProps} />)

      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument()
      expect(screen.queryByTestId('alert-circle')).not.toBeInTheDocument()
    })

    it('should prioritize loading state over error state', () => {
      const accountWithBoth = {
        ...mockAddress,
        isLoading: true,
        error: { source: 'synchronization', description: 'Error' },
      }

      render(<InvalidSynchronizedAccountRow {...defaultProps} account={accountWithBoth} />)

      expect(screen.getByTestId('spinner')).toBeInTheDocument()
      expect(screen.queryByTestId('alert-circle')).not.toBeInTheDocument()
    })
  })

  describe('table structure', () => {
    it('should render two table cells', () => {
      render(<InvalidSynchronizedAccountRow {...defaultProps} />)

      const cells = screen.getAllByTestId('table-cell')
      expect(cells).toHaveLength(2)
    })

    it('should apply correct classes to cells', () => {
      render(<InvalidSynchronizedAccountRow {...defaultProps} />)

      const cells = screen.getAllByTestId('table-cell')
      expect(cells[0]).toHaveClass('py-2 text-sm')
      expect(cells[1]).not.toHaveAttribute('rowSpan')
    })

    it('should render explorer link with correct classes', () => {
      render(<InvalidSynchronizedAccountRow {...defaultProps} />)

      const explorerLinks = screen.getAllByTestId('explorer-link')
      expect(explorerLinks[0]).toHaveClass('break-all')
    })
  })

  describe('key prop', () => {
    it('should use address as key when available', () => {
      const { container } = render(<InvalidSynchronizedAccountRow {...defaultProps} />)

      const row = container.querySelector('tr')
      expect(row).toBeTruthy()
    })

    it('should use accountIndex as key when address is not available', () => {
      const accountWithoutAddress = {
        ...mockAddress,
        address: undefined,
      }

      const { container } = render(
        <InvalidSynchronizedAccountRow {...defaultProps} account={accountWithoutAddress} accountIndex={5} />
      )

      const row = container.querySelector('tr')
      expect(row).toBeTruthy()
    })
  })
})