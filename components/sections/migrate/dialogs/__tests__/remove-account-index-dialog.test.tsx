import { render, screen, fireEvent, act } from '@testing-library/react'
import { BN } from '@polkadot/util'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Address } from '@/state/types/ledger'
import type { AppId, Token } from '@/config/apps'
import { TEST_ADDRESSES, TEST_PATHS, TEST_PUBKEYS } from '@/tests/fixtures/addresses'
import { TEST_AMOUNTS } from '@/tests/fixtures/balances'

import RemoveAccountIndexDialog from '../remove-account-index-dialog'

// Import mocked hooks
import { useTransactionStatus } from '@/components/hooks/useTransactionStatus'

// Mock external dependencies
vi.mock('@/components/ExplorerLink', () => ({
  ExplorerLink: vi.fn(({ value, appId, explorerLinkType }) => (
    <div data-testid="explorer-link" data-value={value} data-app-id={appId} data-explorer-type={explorerLinkType}>
      {value}
    </div>
  )),
}))

vi.mock('@/components/hooks/useTransactionStatus', () => ({
  useTransactionStatus: vi.fn(() => ({
    runTransaction: vi.fn(),
    txStatus: null,
    clearTx: vi.fn(),
    isTxFinished: false,
    isTxFailed: false,
    updateSynchronization: vi.fn(),
    isSynchronizing: false,
    getEstimatedFee: vi.fn(),
    estimatedFee: TEST_AMOUNTS.HUNDRED_DOT,
    estimatedFeeLoading: false,
  })),
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
  DialogDescription: vi.fn(({ children }) => <div data-testid="dialog-description">{children}</div>),
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

vi.mock('@/lib/utils/format', () => ({
  formatBalance: vi.fn((balance, token) => `${balance.toString()} ${token.symbol}`),
}))

vi.mock('@/state/ledger', () => ({
  ledgerState$: {
    removeAccountIndex: vi.fn(),
    synchronizeAccount: vi.fn(),
    getRemoveAccountIndexFee: vi.fn(),
  },
}))

vi.mock('../common-dialog-fields', () => ({
  DialogField: vi.fn(({ children }) => <div data-testid="dialog-field">{children}</div>),
  DialogLabel: vi.fn(({ children }) => <div data-testid="dialog-label">{children}</div>),
  DialogNetworkContent: vi.fn(({ token, appId }) => (
    <div data-testid="dialog-network-content" data-token={token.symbol} data-app-id={appId}>
      Network Content
    </div>
  )),
  DialogEstimatedFeeContent: vi.fn(({ token, estimatedFee, loading }) => (
    <div data-testid="dialog-estimated-fee-content">{loading ? 'Loading...' : `${estimatedFee?.toString()} ${token.symbol}`}</div>
  )),
  DialogError: vi.fn(({ error }) => (error ? <div data-testid="dialog-error">{error}</div> : null)),
}))

vi.mock('../transaction-dialog', () => ({
  TransactionDialogFooter: vi.fn(
    ({ isTxFinished, isTxFailed, isSynchronizing, clearTx, synchronizeAccount, closeDialog, signTransfer, isSignDisabled }) => (
      <div data-testid="transaction-dialog-footer">
        <button type="button" data-testid="sign-button" onClick={signTransfer} disabled={isSignDisabled}>
          Remove Index
        </button>
        <button type="button" data-testid="close-button" onClick={closeDialog}>
          Close
        </button>
        <button type="button" data-testid="clear-tx-button" onClick={clearTx}>
          Clear
        </button>
        <button type="button" data-testid="sync-button" onClick={synchronizeAccount}>
          Sync
        </button>
        <span data-testid="status">
          {isTxFinished && 'Finished'}
          {isTxFailed && 'Failed'}
          {isSynchronizing && 'Synchronizing'}
        </span>
      </div>
    )
  ),
  TransactionStatusBody: vi.fn(({ status, message }) => (
    <div data-testid="transaction-status-body">
      <span data-testid="status">{status}</span>
      <span data-testid="message">{message}</span>
    </div>
  )),
}))

describe('RemoveAccountIndexDialog', () => {
  const mockToken: Token = {
    symbol: 'DOT',
    decimals: 10,
    name: 'Polkadot',
    category: 'substrate',
    chainName: 'Polkadot',
  }

  const mockAppId: AppId = 'polkadot'

  const mockAccount: Address = {
    address: TEST_ADDRESSES.ALICE,
    path: TEST_PATHS.DEFAULT,
    pubKey: TEST_PUBKEYS[TEST_ADDRESSES.ALICE],
    selected: false,
    index: {
      index: '42',
      deposit: new BN('100000000000'),
    },
  }

  const defaultProps = {
    open: true,
    setOpen: vi.fn(),
    account: mockAccount,
    appId: mockAppId,
    token: mockToken,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render when open and account has index', () => {
      render(<RemoveAccountIndexDialog {...defaultProps} />)

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Remove Account Index')
      expect(screen.getByTestId('dialog-description')).toHaveTextContent('This will remove the account index 42 from your account')
    })

    it('should not render when open is false', () => {
      const { container } = render(<RemoveAccountIndexDialog {...defaultProps} open={false} />)

      expect(container.firstChild).toBeNull()
    })

    it('should not render when account has no index', () => {
      const accountWithoutIndex = {
        ...mockAccount,
        index: undefined,
      }

      const { container } = render(<RemoveAccountIndexDialog {...defaultProps} account={accountWithoutIndex} />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('form content', () => {
    it('should display all required form fields', () => {
      render(<RemoveAccountIndexDialog {...defaultProps} />)

      expect(screen.getAllByTestId('dialog-field')).toHaveLength(5) // Source, Network, Index, Deposit, Fee
      expect(screen.getAllByTestId('dialog-label')).toHaveLength(5)
    })

    it('should display source address with explorer link', () => {
      render(<RemoveAccountIndexDialog {...defaultProps} />)

      const explorerLink = screen.getByTestId('explorer-link')
      expect(explorerLink).toBeInTheDocument()
      expect(explorerLink).toHaveAttribute('data-value', TEST_ADDRESSES.ALICE)
      expect(explorerLink).toHaveAttribute('data-app-id', 'polkadot')
      expect(explorerLink).toHaveAttribute('data-explorer-type', 'address')
    })

    it('should display network information', () => {
      render(<RemoveAccountIndexDialog {...defaultProps} />)

      const networkContent = screen.getByTestId('dialog-network-content')
      expect(networkContent).toBeInTheDocument()
      expect(networkContent).toHaveAttribute('data-token', 'DOT')
      expect(networkContent).toHaveAttribute('data-app-id', 'polkadot')
    })

    it('should display account index to remove', () => {
      render(<RemoveAccountIndexDialog {...defaultProps} />)

      expect(screen.getByText('Account Index to Remove')).toBeInTheDocument()
      const indexElements = screen.getAllByText('42')
      expect(indexElements).toHaveLength(2) // One in description, one in form field
      expect(indexElements[1]).toHaveClass('text-sm') // The form field element
    })

    it('should display deposit information when available', () => {
      render(<RemoveAccountIndexDialog {...defaultProps} />)

      expect(screen.getByText('Deposit to be returned')).toBeInTheDocument()
      expect(screen.getByText('100000000000 DOT')).toBeInTheDocument()
    })

    it('should not display deposit when not available', () => {
      const accountWithoutDeposit = {
        ...mockAccount,
        index: {
          index: '42',
          deposit: undefined,
        },
      }

      render(<RemoveAccountIndexDialog {...defaultProps} account={accountWithoutDeposit} />)

      expect(screen.queryByText('Deposit to be returned')).not.toBeInTheDocument()
    })

    it('should display estimated fee', () => {
      render(<RemoveAccountIndexDialog {...defaultProps} />)

      expect(screen.getByText('Estimated Fee')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-estimated-fee-content')).toBeInTheDocument()
    })
  })

  describe('transaction handling', () => {
    it('should handle sign transaction button click', async () => {
      const mockRunTransaction = vi.fn()
      const mockUseTransactionStatus = vi.mocked(useTransactionStatus)

      mockUseTransactionStatus.mockReturnValue({
        runTransaction: mockRunTransaction,
        txStatus: null,
        clearTx: vi.fn(),
        isTxFinished: false,
        isTxFailed: false,
        updateSynchronization: vi.fn(),
        isSynchronizing: false,
        getEstimatedFee: vi.fn(),
        estimatedFee: TEST_AMOUNTS.HUNDRED_DOT,
        estimatedFeeLoading: false,
      })

      render(<RemoveAccountIndexDialog {...defaultProps} />)

      const signButton = screen.getByTestId('sign-button')

      await act(async () => {
        fireEvent.click(signButton)
      })

      expect(mockRunTransaction).toHaveBeenCalledWith('polkadot', TEST_ADDRESSES.ALICE, "m/44'/354'/0'/0'/0'", '42')
    })

    it('should handle close dialog', async () => {
      const mockSetOpen = vi.fn()
      const mockClearTx = vi.fn()
      const mockUseTransactionStatus = vi.mocked(useTransactionStatus)

      mockUseTransactionStatus.mockReturnValue({
        runTransaction: vi.fn(),
        txStatus: null,
        clearTx: mockClearTx,
        isTxFinished: false,
        isTxFailed: false,
        updateSynchronization: vi.fn(),
        isSynchronizing: false,
        getEstimatedFee: vi.fn(),
        estimatedFee: TEST_AMOUNTS.HUNDRED_DOT,
        estimatedFeeLoading: false,
      })

      render(<RemoveAccountIndexDialog {...defaultProps} setOpen={mockSetOpen} />)

      const closeButton = screen.getByTestId('close-button')

      await act(async () => {
        fireEvent.click(closeButton)
      })

      expect(mockClearTx).toHaveBeenCalled()
      expect(mockSetOpen).toHaveBeenCalledWith(false)
    })

    it('should handle synchronize account', async () => {
      const mockSetOpen = vi.fn()
      const mockUpdateSynchronization = vi.fn()
      const mockUseTransactionStatus = vi.mocked(useTransactionStatus)

      mockUseTransactionStatus.mockReturnValue({
        runTransaction: vi.fn(),
        txStatus: null,
        clearTx: vi.fn(),
        isTxFinished: false,
        isTxFailed: false,
        updateSynchronization: mockUpdateSynchronization,
        isSynchronizing: false,
        getEstimatedFee: vi.fn(),
        estimatedFee: TEST_AMOUNTS.HUNDRED_DOT,
        estimatedFeeLoading: false,
      })

      render(<RemoveAccountIndexDialog {...defaultProps} setOpen={mockSetOpen} />)

      const syncButton = screen.getByTestId('sync-button')

      await act(async () => {
        fireEvent.click(syncButton)
      })

      expect(mockUpdateSynchronization).toHaveBeenCalled()
      expect(mockSetOpen).toHaveBeenCalledWith(false)
    })

    it('should show transaction status when tx is in progress', async () => {
      const mockUseTransactionStatus = vi.mocked(useTransactionStatus)

      mockUseTransactionStatus.mockReturnValue({
        runTransaction: vi.fn(),
        txStatus: {
          status: 'pending',
          message: 'Transaction pending',
        },
        clearTx: vi.fn(),
        isTxFinished: false,
        isTxFailed: false,
        updateSynchronization: vi.fn(),
        isSynchronizing: false,
        getEstimatedFee: vi.fn(),
        estimatedFee: TEST_AMOUNTS.HUNDRED_DOT,
        estimatedFeeLoading: false,
      })

      render(<RemoveAccountIndexDialog {...defaultProps} />)

      expect(screen.getByTestId('transaction-status-body')).toBeInTheDocument()
      const statusBody = screen.getByTestId('transaction-status-body')
      expect(statusBody.querySelector('[data-testid="status"]')).toHaveTextContent('pending')
      expect(statusBody.querySelector('[data-testid="message"]')).toHaveTextContent('Transaction pending')
    })

    it('should disable sign button when transaction is in progress', async () => {
      const mockUseTransactionStatus = vi.mocked(useTransactionStatus)

      mockUseTransactionStatus.mockReturnValue({
        runTransaction: vi.fn(),
        txStatus: {
          status: 'pending',
          message: 'Transaction pending',
        },
        clearTx: vi.fn(),
        isTxFinished: false,
        isTxFailed: false,
        updateSynchronization: vi.fn(),
        isSynchronizing: false,
        getEstimatedFee: vi.fn(),
        estimatedFee: TEST_AMOUNTS.HUNDRED_DOT,
        estimatedFeeLoading: false,
      })

      render(<RemoveAccountIndexDialog {...defaultProps} />)

      const signButton = screen.getByTestId('sign-button')
      expect(signButton).toBeDisabled()
    })
  })

  describe('fee estimation', () => {
    it('should show loading state for estimated fee', async () => {
      const mockUseTransactionStatus = vi.mocked(useTransactionStatus)

      mockUseTransactionStatus.mockReturnValue({
        runTransaction: vi.fn(),
        txStatus: null,
        clearTx: vi.fn(),
        isTxFinished: false,
        isTxFailed: false,
        updateSynchronization: vi.fn(),
        isSynchronizing: false,
        getEstimatedFee: vi.fn(),
        estimatedFee: undefined,
        estimatedFeeLoading: true,
      })

      render(<RemoveAccountIndexDialog {...defaultProps} />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should call getEstimatedFee on mount when dialog is open', async () => {
      const mockGetEstimatedFee = vi.fn()
      const mockUseTransactionStatus = vi.mocked(useTransactionStatus)

      mockUseTransactionStatus.mockReturnValue({
        runTransaction: vi.fn(),
        txStatus: null,
        clearTx: vi.fn(),
        isTxFinished: false,
        isTxFailed: false,
        updateSynchronization: vi.fn(),
        isSynchronizing: false,
        getEstimatedFee: mockGetEstimatedFee,
        estimatedFee: TEST_AMOUNTS.HUNDRED_DOT,
        estimatedFeeLoading: false,
      })

      render(<RemoveAccountIndexDialog {...defaultProps} />)

      expect(mockGetEstimatedFee).toHaveBeenCalledWith('polkadot', TEST_ADDRESSES.ALICE, '42')
    })
  })

  describe('edge cases', () => {
    it('should handle different index values', () => {
      const accountWithDifferentIndex = {
        ...mockAccount,
        index: {
          index: '999',
          deposit: new BN('200000000000'),
        },
      }

      render(<RemoveAccountIndexDialog {...defaultProps} account={accountWithDifferentIndex} />)

      const indexElements = screen.getAllByText('999')
      expect(indexElements).toHaveLength(2) // One in description, one in form field
      expect(indexElements[1]).toHaveClass('text-sm') // The form field element
      expect(screen.getByText('200000000000 DOT')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-description')).toHaveTextContent('This will remove the account index 999 from your account')
    })

    it('should handle different app IDs and tokens', () => {
      const kusamaProps = {
        ...defaultProps,
        appId: 'kusama' as AppId,
        token: {
          ...mockToken,
          symbol: 'KSM',
          name: 'Kusama',
        },
      }

      render(<RemoveAccountIndexDialog {...kusamaProps} />)

      const explorerLink = screen.getByTestId('explorer-link')
      expect(explorerLink).toHaveAttribute('data-app-id', 'kusama')

      const networkContent = screen.getByTestId('dialog-network-content')
      expect(networkContent).toHaveAttribute('data-token', 'KSM')
      expect(networkContent).toHaveAttribute('data-app-id', 'kusama')
    })

    it('should handle missing deposit gracefully', () => {
      const accountWithNullDeposit = {
        ...mockAccount,
        index: {
          index: '42',
          deposit: undefined,
        },
      }

      render(<RemoveAccountIndexDialog {...defaultProps} account={accountWithNullDeposit} />)

      expect(screen.queryByText('Deposit to be returned')).not.toBeInTheDocument()
    })
  })

  describe('dialog behavior', () => {
    it('should handle dialog close events', () => {
      const mockSetOpen = vi.fn()
      render(<RemoveAccountIndexDialog {...defaultProps} setOpen={mockSetOpen} />)

      const dialog = screen.getByTestId('dialog')
      fireEvent.blur(dialog)

      expect(mockSetOpen).toHaveBeenCalledWith(false)
    })

    it('should render transaction dialog footer with correct props', () => {
      render(<RemoveAccountIndexDialog {...defaultProps} />)

      expect(screen.getByTestId('transaction-dialog-footer')).toBeInTheDocument()
      expect(screen.getByTestId('sign-button')).toBeInTheDocument()
      expect(screen.getByTestId('close-button')).toBeInTheDocument()
      expect(screen.getByTestId('clear-tx-button')).toBeInTheDocument()
      expect(screen.getByTestId('sync-button')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have proper dialog structure', () => {
      render(<RemoveAccountIndexDialog {...defaultProps} />)

      expect(screen.getByTestId('dialog-header')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-body')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-footer')).toBeInTheDocument()
    })

    it('should have proper heading hierarchy', () => {
      render(<RemoveAccountIndexDialog {...defaultProps} />)

      const title = screen.getByTestId('dialog-title')
      expect(title.tagName).toBe('H2')
      expect(title).toHaveTextContent('Remove Account Index')
    })

    it('should have proper form labels', () => {
      render(<RemoveAccountIndexDialog {...defaultProps} />)

      const labels = screen.getAllByTestId('dialog-label')
      expect(labels).toHaveLength(5)
      expect(labels[0]).toHaveTextContent('Source Address')
      expect(labels[1]).toHaveTextContent('Network')
      expect(labels[2]).toHaveTextContent('Account Index to Remove')
      expect(labels[3]).toHaveTextContent('Deposit to be returned')
      expect(labels[4]).toHaveTextContent('Estimated Fee')
    })
  })
})
