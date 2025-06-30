import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppId } from '@/config/apps'
import { TransactionStatus } from '@/state/types/ledger'

import { TransactionDialogFooter, TransactionStatusBody } from '../transaction-dialog'

// Mock external dependencies
vi.mock('@/components/ExplorerLink', () => ({
  ExplorerLink: vi.fn(({ value, appId, explorerLinkType, className, hasCopyButton }) => (
    <div
      data-testid="explorer-link"
      data-value={value}
      data-app-id={appId}
      data-explorer-type={explorerLinkType}
      className={className}
      data-has-copy-button={hasCopyButton}
    >
      {value}
    </div>
  )),
}))

vi.mock('@/components/ui/button', () => ({
  Button: vi.fn(({ children, variant, className, onClick, disabled }) => (
    <button
      data-testid="button"
      data-variant={variant}
      className={className}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )),
}))

vi.mock('@/config/explorers', () => ({
  ExplorerItemType: {
    Transaction: 'transaction',
    BlockHash: 'block',
    BlockNumber: 'block',
  },
}))

vi.mock('@/lib/utils/ui', () => ({
  getTransactionStatus: vi.fn((status, message, size) => ({
    statusIcon: <div data-testid="status-icon" data-status={status} data-size={size}>Icon</div>,
    statusMessage: message || 'Default status message',
  })),
}))

describe('TransactionStatusBody', () => {
  const mockAppId: AppId = 'polkadot'

  const defaultProps = {
    status: TransactionStatus.SUCCESS,
    statusMessage: 'Transaction successful',
    appId: mockAppId,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render when status is provided', () => {
      render(<TransactionStatusBody {...defaultProps} />)

      expect(screen.getByTestId('status-icon')).toBeInTheDocument()
      expect(screen.getByText('Transaction successful')).toBeInTheDocument()
    })

    it('should not render when status is null', () => {
      const { container } = render(
        <TransactionStatusBody {...defaultProps} status={null} />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should not render when status is undefined', () => {
      const { container } = render(
        <TransactionStatusBody {...defaultProps} status={undefined as any} />
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('transaction details', () => {
    it('should render transaction hash when provided', () => {
      render(
        <TransactionStatusBody
          {...defaultProps}
          txHash="0x1234567890abcdef"
        />
      )

      expect(screen.getByText('Transaction Hash')).toBeInTheDocument()
      const explorerLink = screen.getByTestId('explorer-link')
      expect(explorerLink).toHaveAttribute('data-value', '0x1234567890abcdef')
      expect(explorerLink).toHaveAttribute('data-explorer-type', 'transaction')
      expect(explorerLink).toHaveAttribute('data-app-id', 'polkadot')
      expect(explorerLink).toHaveAttribute('data-has-copy-button', 'false')
    })

    it('should render block hash when provided', () => {
      render(
        <TransactionStatusBody
          {...defaultProps}
          blockHash="0xabcdef1234567890"
        />
      )

      expect(screen.getByText('Block Hash')).toBeInTheDocument()
      const explorerLink = screen.getByTestId('explorer-link')
      expect(explorerLink).toHaveAttribute('data-value', '0xabcdef1234567890')
      expect(explorerLink).toHaveAttribute('data-explorer-type', 'block')
    })

    it('should render block number when provided', () => {
      render(
        <TransactionStatusBody
          {...defaultProps}
          blockNumber="12345"
        />
      )

      expect(screen.getByText('Block Number')).toBeInTheDocument()
      const explorerLink = screen.getByTestId('explorer-link')
      expect(explorerLink).toHaveAttribute('data-value', '12345')
      expect(explorerLink).toHaveAttribute('data-explorer-type', 'block')
    })

    it('should render all transaction details when provided', () => {
      render(
        <TransactionStatusBody
          {...defaultProps}
          txHash="0x1234567890abcdef"
          blockHash="0xabcdef1234567890"
          blockNumber="12345"
        />
      )

      expect(screen.getByText('Transaction Hash')).toBeInTheDocument()
      expect(screen.getByText('Block Hash')).toBeInTheDocument()
      expect(screen.getByText('Block Number')).toBeInTheDocument()
      expect(screen.getAllByTestId('explorer-link')).toHaveLength(3)
    })

    it('should not render transaction details when not provided', () => {
      render(<TransactionStatusBody {...defaultProps} />)

      expect(screen.queryByText('Transaction Hash')).not.toBeInTheDocument()
      expect(screen.queryByText('Block Hash')).not.toBeInTheDocument()
      expect(screen.queryByText('Block Number')).not.toBeInTheDocument()
      expect(screen.queryByTestId('explorer-link')).not.toBeInTheDocument()
    })

    it('should render explorer link without appId when appId is not provided', () => {
      render(
        <TransactionStatusBody
          {...defaultProps}
          appId={undefined}
          txHash="0x1234567890abcdef"
        />
      )

      const explorerLink = screen.getByTestId('explorer-link')
      expect(explorerLink).toHaveAttribute('data-value', '0x1234567890abcdef')
      expect(explorerLink).not.toHaveAttribute('data-app-id')
      expect(explorerLink).not.toHaveAttribute('data-explorer-type')
    })
  })

  describe('status handling', () => {
    it('should display loading message for IS_LOADING status', () => {
      render(
        <TransactionStatusBody
          {...defaultProps}
          status={TransactionStatus.IS_LOADING}
        />
      )

      expect(screen.getByText('Please sign the transaction in your Ledger device')).toBeInTheDocument()
    })

    it('should display status message for non-loading statuses', () => {
      render(
        <TransactionStatusBody
          {...defaultProps}
          status={TransactionStatus.SUCCESS}
          statusMessage="Custom success message"
        />
      )

      expect(screen.getByText('Custom success message')).toBeInTheDocument()
      expect(screen.queryByText('Please sign the transaction in your Ledger device')).not.toBeInTheDocument()
    })

    it('should call getTransactionStatus with correct parameters', async () => {
      const mockGetTransactionStatus = vi.mocked(
        await import('@/lib/utils/ui')
      ).getTransactionStatus

      render(
        <TransactionStatusBody
          {...defaultProps}
          status={TransactionStatus.ERROR}
          statusMessage="Transaction failed"
        />
      )

      expect(mockGetTransactionStatus).toHaveBeenCalledWith(
        TransactionStatus.ERROR,
        'Transaction failed',
        'lg'
      )
    })

    it('should handle different transaction statuses', () => {
      const statuses = [
        TransactionStatus.SUCCESS,
        TransactionStatus.ERROR,
        TransactionStatus.IS_LOADING,
        TransactionStatus.CANCELLED,
      ]

      statuses.forEach(status => {
        const { unmount } = render(
          <TransactionStatusBody {...defaultProps} status={status} />
        )

        if (status) {
          expect(screen.getByTestId('status-icon')).toHaveAttribute('data-status', status)
        }
        unmount()
      })
    })
  })

  describe('edge cases', () => {
    it('should handle empty transaction details', () => {
      render(
        <TransactionStatusBody
          {...defaultProps}
          txHash=""
          blockHash=""
          blockNumber=""
        />
      )

      expect(screen.queryByText('Transaction Hash')).not.toBeInTheDocument()
      expect(screen.queryByText('Block Hash')).not.toBeInTheDocument()
      expect(screen.queryByText('Block Number')).not.toBeInTheDocument()
    })

    it('should handle partial transaction details', () => {
      render(
        <TransactionStatusBody
          {...defaultProps}
          txHash="0x1234567890abcdef"
          blockHash=""
          blockNumber="12345"
        />
      )

      expect(screen.getByText('Transaction Hash')).toBeInTheDocument()
      expect(screen.queryByText('Block Hash')).not.toBeInTheDocument()
      expect(screen.getByText('Block Number')).toBeInTheDocument()
      expect(screen.getAllByTestId('explorer-link')).toHaveLength(2)
    })

    it('should handle different app IDs', () => {
      render(
        <TransactionStatusBody
          {...defaultProps}
          appId="kusama"
          txHash="0x1234567890abcdef"
        />
      )

      const explorerLink = screen.getByTestId('explorer-link')
      expect(explorerLink).toHaveAttribute('data-app-id', 'kusama')
    })
  })
})

describe('TransactionDialogFooter', () => {
  const defaultProps = {
    isSignDisabled: false,
    isTxFinished: false,
    isTxFailed: false,
    isSynchronizing: false,
    clearTx: vi.fn(),
    synchronizeAccount: vi.fn(),
    closeDialog: vi.fn(),
    signTransfer: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render default buttons when transaction is not finished', () => {
      render(<TransactionDialogFooter {...defaultProps} />)

      const buttons = screen.getAllByTestId('button')
      expect(buttons).toHaveLength(2)
      expect(buttons[0]).toHaveTextContent('Cancel')
      expect(buttons[1]).toHaveTextContent('Sign Transfer')
    })

    it('should render close button when transaction is finished', () => {
      render(<TransactionDialogFooter {...defaultProps} isTxFinished={true} />)

      const buttons = screen.getAllByTestId('button')
      expect(buttons).toHaveLength(2)
      expect(buttons[0]).toHaveTextContent('Close')
      expect(buttons[1]).toHaveTextContent('Update Synchronization')
    })
  })

  describe('button interactions', () => {
    it('should call closeDialog when cancel button is clicked', () => {
      const mockCloseDialog = vi.fn()
      render(<TransactionDialogFooter {...defaultProps} closeDialog={mockCloseDialog} />)

      const cancelButton = screen.getAllByTestId('button')[0]
      fireEvent.click(cancelButton)

      expect(mockCloseDialog).toHaveBeenCalled()
    })

    it('should call signTransfer when sign button is clicked', () => {
      const mockSignTransfer = vi.fn()
      render(<TransactionDialogFooter {...defaultProps} signTransfer={mockSignTransfer} />)

      const signButton = screen.getAllByTestId('button')[1]
      fireEvent.click(signButton)

      expect(mockSignTransfer).toHaveBeenCalled()
    })

    it('should call synchronizeAccount when update synchronization is clicked', () => {
      const mockSynchronizeAccount = vi.fn()
      render(
        <TransactionDialogFooter
          {...defaultProps}
          isTxFinished={true}
          synchronizeAccount={mockSynchronizeAccount}
        />
      )

      const updateButton = screen.getAllByTestId('button')[1]
      fireEvent.click(updateButton)

      expect(mockSynchronizeAccount).toHaveBeenCalled()
    })

    it('should call clearTx when try again is clicked after failed transaction', () => {
      const mockClearTx = vi.fn()
      render(
        <TransactionDialogFooter
          {...defaultProps}
          isTxFinished={true}
          isTxFailed={true}
          clearTx={mockClearTx}
        />
      )

      const tryAgainButton = screen.getAllByTestId('button')[1]
      fireEvent.click(tryAgainButton)

      expect(mockClearTx).toHaveBeenCalled()
    })
  })

  describe('button states', () => {
    it('should disable sign button when isSignDisabled is true', () => {
      render(<TransactionDialogFooter {...defaultProps} isSignDisabled={true} />)

      const signButton = screen.getAllByTestId('button')[1]
      expect(signButton).toBeDisabled()
    })

    it('should enable sign button when isSignDisabled is false', () => {
      render(<TransactionDialogFooter {...defaultProps} isSignDisabled={false} />)

      const signButton = screen.getAllByTestId('button')[1]
      expect(signButton).not.toBeDisabled()
    })

    it('should disable update synchronization button when isSynchronizing is true', () => {
      render(
        <TransactionDialogFooter
          {...defaultProps}
          isTxFinished={true}
          isSynchronizing={true}
        />
      )

      const updateButton = screen.getAllByTestId('button')[1]
      expect(updateButton).toBeDisabled()
    })

    it('should enable update synchronization button when isSynchronizing is false', () => {
      render(
        <TransactionDialogFooter
          {...defaultProps}
          isTxFinished={true}
          isSynchronizing={false}
        />
      )

      const updateButton = screen.getAllByTestId('button')[1]
      expect(updateButton).not.toBeDisabled()
    })
  })

  describe('button labels', () => {
    it('should use custom main button label when provided', () => {
      render(
        <TransactionDialogFooter
          {...defaultProps}
          mainButtonLabel="Custom Action"
        />
      )

      const signButton = screen.getAllByTestId('button')[1]
      expect(signButton).toHaveTextContent('Custom Action')
    })

    it('should use default main button label when not provided', () => {
      render(<TransactionDialogFooter {...defaultProps} />)

      const signButton = screen.getAllByTestId('button')[1]
      expect(signButton).toHaveTextContent('Sign Transfer')
    })

    it('should show "Try again" when transaction failed', () => {
      render(
        <TransactionDialogFooter
          {...defaultProps}
          isTxFinished={true}
          isTxFailed={true}
        />
      )

      const actionButton = screen.getAllByTestId('button')[1]
      expect(actionButton).toHaveTextContent('Try again')
    })

    it('should show "Update Synchronization" when transaction succeeded', () => {
      render(
        <TransactionDialogFooter
          {...defaultProps}
          isTxFinished={true}
          isTxFailed={false}
        />
      )

      const actionButton = screen.getAllByTestId('button')[1]
      expect(actionButton).toHaveTextContent('Update Synchronization')
    })

    it('should show "Synchronizing..." when synchronizing', () => {
      render(
        <TransactionDialogFooter
          {...defaultProps}
          isTxFinished={true}
          isSynchronizing={true}
        />
      )

      const actionButton = screen.getAllByTestId('button')[1]
      expect(actionButton).toHaveTextContent('Synchronizing...')
    })

    it('should show "Cancel" when transaction is not finished', () => {
      render(<TransactionDialogFooter {...defaultProps} isTxFinished={false} />)

      const cancelButton = screen.getAllByTestId('button')[0]
      expect(cancelButton).toHaveTextContent('Cancel')
    })

    it('should show "Close" when transaction is finished', () => {
      render(<TransactionDialogFooter {...defaultProps} isTxFinished={true} />)

      const closeButton = screen.getAllByTestId('button')[0]
      expect(closeButton).toHaveTextContent('Close')
    })
  })

  describe('button styling', () => {
    it('should apply correct variant to cancel/close button', () => {
      render(<TransactionDialogFooter {...defaultProps} />)

      const cancelButton = screen.getAllByTestId('button')[0]
      expect(cancelButton).toHaveAttribute('data-variant', 'outline')
    })

    it('should apply correct className to action buttons', () => {
      render(<TransactionDialogFooter {...defaultProps} />)

      const signButton = screen.getAllByTestId('button')[1]
      expect(signButton).toHaveClass('bg-[#7916F3] hover:bg-[#6B46C1] text-white')
    })

    it('should apply correct className to finished transaction buttons', () => {
      render(<TransactionDialogFooter {...defaultProps} isTxFinished={true} />)

      const actionButton = screen.getAllByTestId('button')[1]
      expect(actionButton).toHaveClass('bg-[#7916F3] hover:bg-[#6B46C1] text-white')
    })
  })

  describe('edge cases', () => {
    it('should handle all combinations of transaction states', () => {
      const combinations = [
        { isTxFinished: false, isTxFailed: false, isSynchronizing: false },
        { isTxFinished: true, isTxFailed: false, isSynchronizing: false },
        { isTxFinished: true, isTxFailed: true, isSynchronizing: false },
        { isTxFinished: true, isTxFailed: false, isSynchronizing: true },
        { isTxFinished: true, isTxFailed: true, isSynchronizing: true },
      ]

      combinations.forEach(({ isTxFinished, isTxFailed, isSynchronizing }) => {
        const { unmount } = render(
          <TransactionDialogFooter
            {...defaultProps}
            isTxFinished={isTxFinished}
            isTxFailed={isTxFailed}
            isSynchronizing={isSynchronizing}
          />
        )

        const buttons = screen.getAllByTestId('button')
        expect(buttons).toHaveLength(2)
        unmount()
      })
    })

    it('should handle function props being undefined gracefully', () => {
      const propsWithUndefined = {
        ...defaultProps,
        clearTx: undefined as any,
        synchronizeAccount: undefined as any,
        closeDialog: undefined as any,
        signTransfer: undefined as any,
      }

      expect(() => {
        render(<TransactionDialogFooter {...propsWithUndefined} />)
      }).not.toThrow()
    })
  })

  describe('accessibility', () => {
    it('should have proper button structure', () => {
      render(<TransactionDialogFooter {...defaultProps} />)

      const buttons = screen.getAllByTestId('button')
      buttons.forEach(button => {
        expect(button.tagName).toBe('BUTTON')
      })
    })

    it('should have descriptive button text', () => {
      render(<TransactionDialogFooter {...defaultProps} />)

      const buttons = screen.getAllByTestId('button')
      expect(buttons[0]).toHaveTextContent('Cancel')
      expect(buttons[1]).toHaveTextContent('Sign Transfer')
    })

    it('should properly disable buttons when appropriate', () => {
      render(
        <TransactionDialogFooter
          {...defaultProps}
          isSignDisabled={true}
          isTxFinished={true}
          isSynchronizing={true}
        />
      )

      const buttons = screen.getAllByTestId('button')
      expect(buttons[0]).not.toBeDisabled() // Close button is never disabled
      expect(buttons[1]).toBeDisabled() // Action button is disabled when synchronizing
    })
  })
})