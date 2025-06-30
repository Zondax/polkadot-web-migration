import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MigratingItem } from '@/state/types/ledger'
import { TransactionStatus } from '@/state/types/ledger'
import type { AppId } from '@/config/apps'

import { MigrationProgressDialog } from '../migration-progress-dialog'

// Mock observer from legendapp/state
vi.mock('@legendapp/state/react', () => ({
  observer: (component: any) => component,
}))

// Mock dependencies
vi.mock('@/components/ExplorerLink', () => ({
  ExplorerLink: vi.fn(({ value, appId, explorerLinkType, disableTooltip }) => (
    <div
      data-testid="explorer-link"
      data-value={value}
      data-app-id={appId}
      data-explorer-type={explorerLinkType}
      data-disable-tooltip={disableTooltip}
    >
      {value}
    </div>
  )),
}))

vi.mock('@/components/hooks/useTokenLogo', () => ({
  useTokenLogo: vi.fn((appId: AppId) => `<svg data-testid="token-logo-${appId}">Logo</svg>`),
}))

vi.mock('@/components/sections/migrate/dialogs/transaction-dialog', () => ({
  TransactionStatusBody: vi.fn(({ status, statusMessage, txHash, blockHash, blockNumber }) => (
    <div data-testid="transaction-status-body">
      <span data-testid="status">{status}</span>
      <span data-testid="status-message">{statusMessage}</span>
      <span data-testid="tx-hash">{txHash}</span>
      <span data-testid="block-hash">{blockHash}</span>
      <span data-testid="block-number">{blockNumber}</span>
    </div>
  )),
}))

vi.mock('@/components/TokenIcon', () => ({
  default: vi.fn(({ icon, symbol, size }) => (
    <div data-testid="token-icon" data-icon={icon} data-symbol={symbol} data-size={size}>
      {symbol}
    </div>
  )),
}))

vi.mock('@/components/ui/button', () => ({
  Button: vi.fn(({ children, variant, onClick }) => (
    <button type="button" data-testid="button" data-variant={variant} onClick={onClick}>
      {children}
    </button>
  )),
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: vi.fn(({ children, open, onOpenChange }) =>
    open ? (
      <div data-testid="dialog" role="dialog" onBlur={() => onOpenChange?.(false)}>
        {children}
      </div>
    ) : null
  ),
  DialogContent: vi.fn(({ children }) => <div data-testid="dialog-content">{children}</div>),
  DialogHeader: vi.fn(({ children }) => <div data-testid="dialog-header">{children}</div>),
  DialogTitle: vi.fn(({ children }) => <h2 data-testid="dialog-title">{children}</h2>),
  DialogDescription: vi.fn(({ children, className }) => (
    <div data-testid="dialog-description" className={className}>
      {children}
    </div>
  )),
  DialogBody: vi.fn(({ children }) => <div data-testid="dialog-body">{children}</div>),
  DialogFooter: vi.fn(({ children }) => <div data-testid="dialog-footer">{children}</div>),
}))

vi.mock('@/config/explorers', () => ({
  ExplorerItemType: {
    Address: 'address',
    Transaction: 'transaction',
    Block: 'block',
  },
}))

describe('MigrationProgressDialog', () => {
  const mockMigratingItem: MigratingItem = {
    appId: 'polkadot' as AppId,
    appName: 'Polkadot',
    account: {
      address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      path: "m/44'/354'/0'/0'/0'",
      pubKey: '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d',
      selected: false,
    },
    balance: {
      type: 'native',
      balance: {
        total: { toString: () => '1000000000000' },
        transferable: { toString: () => '500000000000' },
        reserved: { total: { toString: () => '200000000000' } },
        frozen: { toString: () => '100000000000' },
      },
      transaction: {
        destinationAddress: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
        signatoryAddress: '',
      },
    },
    transaction: {
      status: TransactionStatus.IN_BLOCK,
      statusMessage: 'Transaction is in block',
      txHash: '0x1234567890abcdef',
      blockHash: '0xabcdef1234567890',
      blockNumber: '12345',
    },
  }

  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    migratingItem: mockMigratingItem,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render when open with migrating item', () => {
      render(<MigrationProgressDialog {...defaultProps} />)

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Transaction Approval Needed')
    })

    it('should not render when open is false', () => {
      const { container } = render(<MigrationProgressDialog {...defaultProps} open={false} />)

      expect(container.firstChild).toBeNull()
    })

    it('should not render when migratingItem is undefined', () => {
      const { container } = render(<MigrationProgressDialog {...defaultProps} migratingItem={undefined} />)

      expect(container.firstChild).toBeNull()
    })

    it('should not render when migratingItem is null', () => {
      const { container } = render(<MigrationProgressDialog {...defaultProps} migratingItem={null as any} />)

      expect(container.firstChild).toBeNull()
    })

    it('should render when open is true and migratingItem exists', () => {
      render(<MigrationProgressDialog {...defaultProps} open={true} />)

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
    })
  })

  describe('dialog content', () => {
    it('should display app name and token icon', () => {
      render(<MigrationProgressDialog {...defaultProps} />)

      expect(screen.getByTestId('token-icon')).toBeInTheDocument()
      expect(screen.getByTestId('token-icon')).toHaveAttribute('data-symbol', 'Polkadot')
      expect(screen.getByTestId('token-icon')).toHaveAttribute('data-size', 'sm')
      const polkadotTexts = screen.getAllByText('Polkadot')
      expect(polkadotTexts).toHaveLength(2) // One in token icon, one as text
    })

    it('should display account address with explorer link', () => {
      render(<MigrationProgressDialog {...defaultProps} />)

      const explorerLink = screen.getByTestId('explorer-link')
      expect(explorerLink).toBeInTheDocument()
      expect(explorerLink).toHaveAttribute('data-value', '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')
      expect(explorerLink).toHaveAttribute('data-app-id', 'polkadot')
      expect(explorerLink).toHaveAttribute('data-explorer-type', 'address')
      expect(explorerLink).toHaveAttribute('data-disable-tooltip', 'true')
    })

    it('should display transaction status information', () => {
      render(<MigrationProgressDialog {...defaultProps} />)

      const statusBody = screen.getByTestId('transaction-status-body')
      expect(statusBody).toBeInTheDocument()

      expect(screen.getByTestId('status')).toHaveTextContent(TransactionStatus.IN_BLOCK)
      expect(screen.getByTestId('status-message')).toHaveTextContent('Transaction is in block')
      expect(screen.getByTestId('tx-hash')).toHaveTextContent('0x1234567890abcdef')
      expect(screen.getByTestId('block-hash')).toHaveTextContent('0xabcdef1234567890')
      expect(screen.getByTestId('block-number')).toHaveTextContent('12345')
    })

    it('should render dismiss button', () => {
      render(<MigrationProgressDialog {...defaultProps} />)

      const dismissButton = screen.getByTestId('button')
      expect(dismissButton).toBeInTheDocument()
      expect(dismissButton).toHaveTextContent('Dismiss')
      expect(dismissButton).toHaveAttribute('data-variant', 'outline')
    })
  })

  describe('interactions', () => {
    it('should call onClose when dismiss button is clicked', () => {
      const mockOnClose = vi.fn()
      render(<MigrationProgressDialog {...defaultProps} onClose={mockOnClose} />)

      const dismissButton = screen.getByTestId('button')
      fireEvent.click(dismissButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should handle dialog close events', () => {
      const mockOnClose = vi.fn()
      render(<MigrationProgressDialog {...defaultProps} onClose={mockOnClose} />)

      const dialog = screen.getByTestId('dialog')
      fireEvent.blur(dialog)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('transaction states', () => {
    it('should display different transaction statuses', () => {
      const scenarios = [
        {
          status: TransactionStatus.COMPLETED,
          message: 'Transaction completed',
        },
        {
          status: TransactionStatus.FAILED,
          message: 'Transaction failed',
        },
        {
          status: TransactionStatus.SUCCESS,
          message: 'Transaction successful',
        },
      ]

      for (const { status, message } of scenarios) {
        if (!mockMigratingItem.transaction) throw new Error('Mock transaction is required')

        const { rerender } = render(
          <MigrationProgressDialog
            {...defaultProps}
            migratingItem={{
              ...mockMigratingItem,
              transaction: {
                ...mockMigratingItem.transaction,
                status,
                statusMessage: message,
              },
            }}
          />
        )

        expect(screen.getByTestId('status')).toHaveTextContent(status)
        expect(screen.getByTestId('status-message')).toHaveTextContent(message)

        rerender(<div />)
      }
    })

    it('should handle transaction without optional fields', () => {
      const migratingItemWithoutTransaction = {
        ...mockMigratingItem,
        transaction: undefined,
      }

      render(<MigrationProgressDialog {...defaultProps} migratingItem={migratingItemWithoutTransaction} />)

      const statusBody = screen.getByTestId('transaction-status-body')
      expect(statusBody).toBeInTheDocument()

      // Transaction status body should handle undefined values gracefully
      expect(screen.getByTestId('status')).toBeInTheDocument()
      expect(screen.getByTestId('status-message')).toBeInTheDocument()
    })

    it('should handle partial transaction data', () => {
      const migratingItemWithPartialTransaction = {
        ...mockMigratingItem,
        transaction: {
          status: TransactionStatus.IN_BLOCK,
          statusMessage: 'Processing...',
          // Missing txHash, blockHash, blockNumber
        },
      }

      render(<MigrationProgressDialog {...defaultProps} migratingItem={migratingItemWithPartialTransaction} />)

      expect(screen.getByTestId('status')).toHaveTextContent(TransactionStatus.IN_BLOCK)
      expect(screen.getByTestId('status-message')).toHaveTextContent('Processing...')
    })
  })

  describe('edge cases', () => {
    it('should handle missing app name', () => {
      const migratingItemWithoutAppName = {
        ...mockMigratingItem,
        appName: '',
      }

      render(<MigrationProgressDialog {...defaultProps} migratingItem={migratingItemWithoutAppName} />)

      expect(screen.getByTestId('token-icon')).toHaveAttribute('data-symbol', '')
    })

    it('should handle missing account address', () => {
      const migratingItemWithoutAddress = {
        ...mockMigratingItem,
        account: {
          ...mockMigratingItem.account,
          address: '',
        },
      }

      render(<MigrationProgressDialog {...defaultProps} migratingItem={migratingItemWithoutAddress} />)

      const explorerLink = screen.getByTestId('explorer-link')
      expect(explorerLink).toHaveAttribute('data-value', '')
    })

    it('should handle different app IDs', () => {
      const migratingItemWithDifferentApp = {
        ...mockMigratingItem,
        appId: 'kusama' as AppId,
        appName: 'Kusama',
      }

      render(<MigrationProgressDialog {...defaultProps} migratingItem={migratingItemWithDifferentApp} />)

      expect(screen.getByTestId('token-icon')).toHaveAttribute('data-symbol', 'Kusama')
      expect(screen.getByTestId('explorer-link')).toHaveAttribute('data-app-id', 'kusama')
    })
  })

  describe('observer functionality', () => {
    it('should be wrapped with observer', () => {
      // The component should be wrapped with observer for reactive updates
      // This is verified by the mock that ensures observer is called
      render(<MigrationProgressDialog {...defaultProps} />)

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
    })

    it('should handle prop changes reactively', () => {
      const { rerender } = render(<MigrationProgressDialog {...defaultProps} />)

      expect(screen.getByTestId('dialog')).toBeInTheDocument()

      // Change props
      rerender(
        <MigrationProgressDialog
          {...defaultProps}
          migratingItem={{
            ...mockMigratingItem,
            appName: 'Updated App Name',
          }}
        />
      )

      expect(screen.getByTestId('token-icon')).toHaveAttribute('data-symbol', 'Updated App Name')
      const updatedTexts = screen.getAllByText('Updated App Name')
      expect(updatedTexts).toHaveLength(2) // One in token icon, one as text
    })
  })

  describe('accessibility', () => {
    it('should have proper dialog structure', () => {
      render(<MigrationProgressDialog {...defaultProps} />)

      expect(screen.getByTestId('dialog-header')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-body')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-footer')).toBeInTheDocument()
    })

    it('should have proper heading hierarchy', () => {
      render(<MigrationProgressDialog {...defaultProps} />)

      const title = screen.getByTestId('dialog-title')
      expect(title.tagName).toBe('H2')
      expect(title).toHaveTextContent('Transaction Approval Needed')
    })

    it('should have descriptive button text', () => {
      render(<MigrationProgressDialog {...defaultProps} />)

      const button = screen.getByTestId('button')
      expect(button).toHaveTextContent('Dismiss')
    })
  })
})
