import { BN } from '@polkadot/util'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
// Import mocked hooks
import { useTransactionStatus } from '@/components/hooks/useTransactionStatus'
import type { AppId, Token } from '@/config/apps'
import type { Address } from '@/state/types/ledger'
import { TEST_ADDRESSES, TEST_PATHS, TEST_PUBKEYS } from '@/tests/fixtures/addresses'
import { TEST_AMOUNTS } from '@/tests/fixtures/balances'
import RemoveIdentityDialog from '../remove-identity-dialog'

// Mock external dependencies
vi.mock('@/components/CustomTooltip', () => ({
  CustomTooltip: vi.fn(({ children, tooltipBody }) => (
    <div data-testid="custom-tooltip" title={tooltipBody}>
      {children}
    </div>
  )),
}))

vi.mock('@/components/ExplorerLink', () => ({
  ExplorerLink: vi.fn(({ value, appId, explorerLinkType, size }) => (
    <div data-testid="explorer-link" data-value={value} data-app-id={appId} data-explorer-type={explorerLinkType} data-size={size}>
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
  formatBalance: vi.fn((balance, token, _decimals, isLong) =>
    balance ? (isLong ? `${balance.toString()} ${token.symbol} (full)` : `${balance.toString()} ${token.symbol}`) : `0 ${token.symbol}`
  ),
}))

vi.mock('@/state/ledger', () => ({
  ledgerState$: {
    removeIdentity: vi.fn(),
    synchronizeAccount: vi.fn(),
    getRemoveIdentityFee: vi.fn(),
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
          Remove Identity
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

describe('RemoveIdentityDialog', () => {
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
    registration: {
      deposit: TEST_AMOUNTS.TEN_DOT,
      info: {
        display: 'Test User',
        legal: 'Test Legal',
        web: 'https://test.com',
        riot: '@test:matrix.org',
        email: 'test@example.com',
        pgpFingerprint: '0x1234567890abcdef',
        image: 'https://test.com/image.png',
        twitter: '@test',
      },
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
    it('should render when open', () => {
      render(<RemoveIdentityDialog {...defaultProps} />)

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Remove your identity')
      expect(screen.getByTestId('dialog-description')).toHaveTextContent(
        'This process may require a small transaction fee. Please review the details below before proceeding.'
      )
    })

    it('should not render when open is false', () => {
      const { container } = render(<RemoveIdentityDialog {...defaultProps} open={false} />)

      expect(container.firstChild).toBeNull()
    })

    it('should render dialog structure correctly', () => {
      render(<RemoveIdentityDialog {...defaultProps} />)

      expect(screen.getByTestId('dialog-header')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-body')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-footer')).toBeInTheDocument()
    })
  })

  describe('form content', () => {
    it('should display all required form fields when registration has deposit', () => {
      render(<RemoveIdentityDialog {...defaultProps} />)

      expect(screen.getAllByTestId('dialog-field')).toHaveLength(4) // Source, Network, Deposit, Fee
      expect(screen.getAllByTestId('dialog-label')).toHaveLength(4)
    })

    it('should display source address with explorer link', () => {
      render(<RemoveIdentityDialog {...defaultProps} />)

      const explorerLink = screen.getByTestId('explorer-link')
      expect(explorerLink).toBeInTheDocument()
      expect(explorerLink).toHaveAttribute('data-value', TEST_ADDRESSES.ALICE)
      expect(explorerLink).toHaveAttribute('data-app-id', 'polkadot')
      expect(explorerLink).toHaveAttribute('data-explorer-type', 'address')
      expect(explorerLink).toHaveAttribute('data-size', 'xs')
    })

    it('should display network information', () => {
      render(<RemoveIdentityDialog {...defaultProps} />)

      const networkContent = screen.getByTestId('dialog-network-content')
      expect(networkContent).toBeInTheDocument()
      expect(networkContent).toHaveAttribute('data-token', 'DOT')
      expect(networkContent).toHaveAttribute('data-app-id', 'polkadot')
    })

    it('should display deposit information when available', () => {
      render(<RemoveIdentityDialog {...defaultProps} />)

      expect(screen.getByText('Deposit to Be Returned')).toBeInTheDocument()
      expect(screen.getByText('100000000000 DOT')).toBeInTheDocument()
      expect(screen.getByTestId('custom-tooltip')).toBeInTheDocument()
      expect(screen.getByTestId('custom-tooltip')).toHaveAttribute('title', '100000000000 DOT (full)')
    })

    it('should not display deposit when registration is undefined', () => {
      const accountWithoutRegistration = {
        ...mockAccount,
        registration: undefined,
      }

      render(<RemoveIdentityDialog {...defaultProps} account={accountWithoutRegistration} />)

      expect(screen.queryByText('Deposit to Be Returned')).not.toBeInTheDocument()
      expect(screen.getAllByTestId('dialog-field')).toHaveLength(3) // Source, Network, Fee only
    })

    it('should not display deposit when deposit is undefined', () => {
      const accountWithoutDeposit = {
        ...mockAccount,
        registration: {
          deposit: undefined,
          info: {
            display: 'Test User',
            legal: 'Test Legal',
            web: 'https://test.com',
            riot: '@test:matrix.org',
            email: 'test@example.com',
            pgpFingerprint: '0x1234567890abcdef',
            image: 'https://test.com/image.png',
            twitter: '@test',
          },
        },
      }

      render(<RemoveIdentityDialog {...defaultProps} account={accountWithoutDeposit} />)

      expect(screen.queryByText('Deposit to Be Returned')).not.toBeInTheDocument()
      expect(screen.getAllByTestId('dialog-field')).toHaveLength(3) // Source, Network, Fee only
    })

    it('should display estimated fee', () => {
      render(<RemoveIdentityDialog {...defaultProps} />)

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

      render(<RemoveIdentityDialog {...defaultProps} />)

      const signButton = screen.getByTestId('sign-button')

      await act(async () => {
        fireEvent.click(signButton)
      })

      expect(mockRunTransaction).toHaveBeenCalledWith('polkadot', TEST_ADDRESSES.ALICE, TEST_PATHS.DEFAULT)
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

      render(<RemoveIdentityDialog {...defaultProps} setOpen={mockSetOpen} />)

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

      render(<RemoveIdentityDialog {...defaultProps} setOpen={mockSetOpen} />)

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

      render(<RemoveIdentityDialog {...defaultProps} />)

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

      render(<RemoveIdentityDialog {...defaultProps} />)

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

      render(<RemoveIdentityDialog {...defaultProps} />)

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

      render(<RemoveIdentityDialog {...defaultProps} />)

      expect(mockGetEstimatedFee).toHaveBeenCalledWith('polkadot', TEST_ADDRESSES.ALICE)
    })

    it('should not call getEstimatedFee when dialog is closed', async () => {
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

      render(<RemoveIdentityDialog {...defaultProps} open={false} />)

      expect(mockGetEstimatedFee).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle different deposit values', () => {
      const accountWithDifferentDeposit = {
        ...mockAccount,
        registration: {
          deposit: new BN('500000000000'),
          info: {
            display: 'Different User',
            legal: 'Different Legal',
            web: 'https://different.com',
            riot: '@different:matrix.org',
            email: 'different@example.com',
            pgpFingerprint: '0xabcdef1234567890',
            image: 'https://different.com/image.png',
            twitter: '@different',
          },
        },
      }

      render(<RemoveIdentityDialog {...defaultProps} account={accountWithDifferentDeposit} />)

      expect(screen.getByText('500000000000 DOT')).toBeInTheDocument()
      expect(screen.getByTestId('custom-tooltip')).toHaveAttribute('title', '500000000000 DOT (full)')
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

      render(<RemoveIdentityDialog {...kusamaProps} />)

      const explorerLink = screen.getByTestId('explorer-link')
      expect(explorerLink).toHaveAttribute('data-app-id', 'kusama')

      const networkContent = screen.getByTestId('dialog-network-content')
      expect(networkContent).toHaveAttribute('data-token', 'KSM')
      expect(networkContent).toHaveAttribute('data-app-id', 'kusama')
    })

    it('should handle account with different address', () => {
      const accountWithDifferentAddress = {
        ...mockAccount,
        address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
        path: "m/44'/354'/0'/0'/1'",
      }

      render(<RemoveIdentityDialog {...defaultProps} account={accountWithDifferentAddress} />)

      const explorerLink = screen.getByTestId('explorer-link')
      expect(explorerLink).toHaveAttribute('data-value', '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty')
    })

    it('should handle registration with null deposit', () => {
      const accountWithNullDeposit = {
        ...mockAccount,
        registration: {
          deposit: null as any,
          info: {
            display: 'Test User',
            legal: 'Test Legal',
            web: 'https://test.com',
            riot: '@test:matrix.org',
            email: 'test@example.com',
            pgpFingerprint: '0x1234567890abcdef',
            image: 'https://test.com/image.png',
            twitter: '@test',
          },
        },
      }

      render(<RemoveIdentityDialog {...defaultProps} account={accountWithNullDeposit} />)

      // Null is not undefined, so the deposit field will still render
      expect(screen.getByText('Deposit to Be Returned')).toBeInTheDocument()
      expect(screen.getByText('0 DOT')).toBeInTheDocument()
    })
  })

  describe('dialog behavior', () => {
    it('should handle dialog close events', () => {
      const mockSetOpen = vi.fn()
      render(<RemoveIdentityDialog {...defaultProps} setOpen={mockSetOpen} />)

      const dialog = screen.getByTestId('dialog')
      fireEvent.blur(dialog)

      expect(mockSetOpen).toHaveBeenCalledWith(false)
    })

    it('should render transaction dialog footer with correct props', () => {
      render(<RemoveIdentityDialog {...defaultProps} />)

      expect(screen.getByTestId('transaction-dialog-footer')).toBeInTheDocument()
      expect(screen.getByTestId('sign-button')).toBeInTheDocument()
      expect(screen.getByTestId('close-button')).toBeInTheDocument()
      expect(screen.getByTestId('clear-tx-button')).toBeInTheDocument()
      expect(screen.getByTestId('sync-button')).toBeInTheDocument()
    })

    it('should handle prop changes', () => {
      const { rerender } = render(<RemoveIdentityDialog {...defaultProps} />)

      expect(screen.getByTestId('dialog')).toBeInTheDocument()

      rerender(<RemoveIdentityDialog {...defaultProps} open={false} />)

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have proper dialog structure', () => {
      render(<RemoveIdentityDialog {...defaultProps} />)

      expect(screen.getByTestId('dialog-header')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-body')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-footer')).toBeInTheDocument()
    })

    it('should have proper heading hierarchy', () => {
      render(<RemoveIdentityDialog {...defaultProps} />)

      const title = screen.getByTestId('dialog-title')
      expect(title.tagName).toBe('H2')
      expect(title).toHaveTextContent('Remove your identity')
    })

    it('should have proper form labels', () => {
      render(<RemoveIdentityDialog {...defaultProps} />)

      const labels = screen.getAllByTestId('dialog-label')
      expect(labels).toHaveLength(4)
      expect(labels[0]).toHaveTextContent('Source Address')
      expect(labels[1]).toHaveTextContent('Network')
      expect(labels[2]).toHaveTextContent('Deposit to Be Returned')
      expect(labels[3]).toHaveTextContent('Estimated Fee')
    })

    it('should have proper form labels when no deposit', () => {
      const accountWithoutRegistration = {
        ...mockAccount,
        registration: undefined,
      }

      render(<RemoveIdentityDialog {...defaultProps} account={accountWithoutRegistration} />)

      const labels = screen.getAllByTestId('dialog-label')
      expect(labels).toHaveLength(3)
      expect(labels[0]).toHaveTextContent('Source Address')
      expect(labels[1]).toHaveTextContent('Network')
      expect(labels[2]).toHaveTextContent('Estimated Fee')
    })

    it('should have proper tooltip content', () => {
      render(<RemoveIdentityDialog {...defaultProps} />)

      const tooltip = screen.getByTestId('custom-tooltip')
      expect(tooltip).toHaveAttribute('title', '100000000000 DOT (full)')
    })
  })
})
