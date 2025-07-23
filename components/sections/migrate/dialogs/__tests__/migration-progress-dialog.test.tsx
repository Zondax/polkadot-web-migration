import { BN } from '@polkadot/util'
import { fireEvent, render, screen } from '@testing-library/react'
import { BalanceType } from 'state/types/ledger'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppId } from '@/config/apps'
import { polkadotAppConfig } from '@/config/apps'
import type { MigratingItem } from '@/state/types/ledger'
import { TransactionStatus } from '@/state/types/ledger'
import { TEST_ADDRESSES, TEST_PATHS, TEST_PUBKEYS } from '@/tests/fixtures/addresses'

import { MigrationProgressDialog } from '../migration-progress-dialog'

// Mock observer from legendapp/state
vi.mock('@legendapp/state/react', () => ({
  observer: (component: any) => component,
}))

// Mock dependencies
vi.mock('@/components/ExplorerLink', () => ({
  ExplorerLink: vi.fn(({ value }) => <span>{value}</span>),
}))

vi.mock('@/components/sections/migrate/dialogs/transaction-dialog', () => ({
  TransactionStatusBody: vi.fn(({ status, statusMessage, txHash, blockHash, blockNumber }) => (
    <div>
      <span>{status}</span>
      <span>{statusMessage}</span>
      <span>{txHash}</span>
      <span>{blockHash}</span>
      <span>{blockNumber}</span>
    </div>
  )),
}))

vi.mock('@/components/ui/button', () => ({
  Button: vi.fn(({ children, onClick }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  )),
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: vi.fn(({ children, open, onOpenChange }) =>
    open ? (
      <div role="dialog" onBlur={() => onOpenChange?.(false)}>
        {children}
      </div>
    ) : null
  ),
  DialogContent: vi.fn(({ children }) => <div>{children}</div>),
  DialogHeader: vi.fn(({ children }) => <div>{children}</div>),
  DialogTitle: vi.fn(({ children }) => <h2>{children}</h2>),
  DialogDescription: vi.fn(({ children }) => <div>{children}</div>),
  DialogBody: vi.fn(({ children }) => <div>{children}</div>),
  DialogFooter: vi.fn(({ children }) => <div>{children}</div>),
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
    token: polkadotAppConfig.token,
    account: {
      address: TEST_ADDRESSES.ALICE,
      path: TEST_PATHS.DEFAULT,
      pubKey: TEST_PUBKEYS[TEST_ADDRESSES.ALICE],
      selected: false,
      balances: [
        {
          type: BalanceType.NATIVE,
          balance: {
            total: new BN('1000000000000'),
            transferable: new BN('500000000000'),
            reserved: { total: new BN('200000000000') },
            frozen: new BN('100000000000'),
            free: new BN('500000000000'),
          },
          transaction: {
            destinationAddress: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
            signatoryAddress: '',
          },
        },
      ],
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
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Transaction Approval Needed')).toBeInTheDocument()
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
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  describe('dialog content', () => {
    it('should display account address', () => {
      render(<MigrationProgressDialog {...defaultProps} />)
      expect(screen.getByText(TEST_ADDRESSES.ALICE)).toBeInTheDocument()
    })

    it('should display transaction status information', () => {
      render(<MigrationProgressDialog {...defaultProps} />)
      expect(screen.getByText(TransactionStatus.IN_BLOCK)).toBeInTheDocument()
      expect(screen.getByText('Transaction is in block')).toBeInTheDocument()
      expect(screen.getByText('0x1234567890abcdef')).toBeInTheDocument()
      expect(screen.getByText('0xabcdef1234567890')).toBeInTheDocument()
      expect(screen.getByText('12345')).toBeInTheDocument()
    })

    it('should render dismiss button', () => {
      render(<MigrationProgressDialog {...defaultProps} />)
      const dismissButton = screen.getByRole('button', { name: /dismiss/i })
      expect(dismissButton).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('should call onClose when dismiss button is clicked', () => {
      const mockOnClose = vi.fn()
      render(<MigrationProgressDialog {...defaultProps} onClose={mockOnClose} />)
      const dismissButton = screen.getByRole('button', { name: /dismiss/i })
      fireEvent.click(dismissButton)
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should handle dialog close events', () => {
      const mockOnClose = vi.fn()
      render(<MigrationProgressDialog {...defaultProps} onClose={mockOnClose} />)
      const dialog = screen.getByRole('dialog')
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
        expect(screen.getByText(status)).toBeInTheDocument()
        expect(screen.getByText(message)).toBeInTheDocument()
        rerender(<div />)
      }
    })

    it('should handle transaction without optional fields', () => {
      const migratingItemWithoutTransaction = {
        ...mockMigratingItem,
        transaction: undefined,
      }
      render(<MigrationProgressDialog {...defaultProps} migratingItem={migratingItemWithoutTransaction} />)
      // Should still render dialog and not crash
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should handle partial transaction data', () => {
      const migratingItemWithPartialTransaction = {
        ...mockMigratingItem,
        transaction: {
          status: TransactionStatus.IN_BLOCK,
          statusMessage: 'Processing...',
        },
      }
      render(<MigrationProgressDialog {...defaultProps} migratingItem={migratingItemWithPartialTransaction} />)
      expect(screen.getByText(TransactionStatus.IN_BLOCK)).toBeInTheDocument()
      expect(screen.getByText('Processing...')).toBeInTheDocument()
    })
  })

  describe('observer functionality', () => {
    it('should be wrapped with observer', () => {
      render(<MigrationProgressDialog {...defaultProps} />)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have proper dialog structure', () => {
      render(<MigrationProgressDialog {...defaultProps} />)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Transaction Approval Needed')).toBeInTheDocument()
    })

    it('should have descriptive button text', () => {
      render(<MigrationProgressDialog {...defaultProps} />)
      const button = screen.getByRole('button', { name: /dismiss/i })
      expect(button).toHaveTextContent('Dismiss')
    })
  })
})
