import { render, screen, fireEvent, act } from '@testing-library/react'
import { BN } from '@polkadot/util'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Address } from '@/state/types/ledger'
import type { AppId, Token } from '@/config/apps'

import WithdrawDialog from '../withdraw-dialog'

// Mock external dependencies
vi.mock('@/components/ExplorerLink', () => ({
  ExplorerLink: vi.fn(({ value, appId, explorerLinkType, size }) => (
    <div
      data-testid="explorer-link"
      data-value={value}
      data-app-id={appId}
      data-explorer-type={explorerLinkType}
      data-size={size}
    >
      {value}
    </div>
  )),
}))

vi.mock('@/components/hooks/useTokenLogo', () => ({
  useTokenLogo: vi.fn(() => '<svg>Logo</svg>'),
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
    estimatedFee: new BN('1000000000000'),
    estimatedFeeLoading: false,
  })),
}))

vi.mock('@/components/TokenIcon', () => ({
  default: vi.fn(({ icon, symbol, size }) => (
    <div data-testid="token-icon" data-icon={icon} data-symbol={symbol} data-size={size}>
      {symbol}
    </div>
  )),
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: vi.fn(({ children, open, onOpenChange }) =>
    open ? (
      <div data-testid="dialog" onBlur={() => onOpenChange?.(false)}>
        {children}
      </div>
    ) : null
  ),
  DialogContent: vi.fn(({ children }) => (
    <div data-testid="dialog-content">{children}</div>
  )),
  DialogHeader: vi.fn(({ children }) => <div data-testid="dialog-header">{children}</div>),
  DialogTitle: vi.fn(({ children }) => <h2 data-testid="dialog-title">{children}</h2>),
  DialogDescription: vi.fn(({ children }) => (
    <div data-testid="dialog-description">{children}</div>
  )),
  DialogBody: vi.fn(({ children }) => <div data-testid="dialog-body">{children}</div>),
  DialogFooter: vi.fn(({ children }) => <div data-testid="dialog-footer">{children}</div>),
}))

vi.mock('@/config/apps', () => ({
  getChainName: vi.fn((appId: AppId) => `Chain ${appId}`),
}))

vi.mock('@/config/explorers', () => ({
  ExplorerItemType: {
    Address: 'address',
    Transaction: 'transaction',
    Block: 'block',
  },
}))

vi.mock('@/lib/utils/format', () => ({
  formatBalance: vi.fn((balance, token) => 
    balance ? `${balance.toString()} ${token.symbol}` : `0 ${token.symbol}`
  ),
}))

vi.mock('@/state/ledger', () => ({
  ledgerState$: {
    withdrawBalance: vi.fn(),
    synchronizeAccount: vi.fn(),
    getWithdrawFee: vi.fn(),
  },
}))

vi.mock('../common-dialog-fields', () => ({
  DialogField: vi.fn(({ children }) => <div data-testid="dialog-field">{children}</div>),
  DialogLabel: vi.fn(({ children }) => (
    <label data-testid="dialog-label">{children}</label>
  )),
  DialogEstimatedFeeContent: vi.fn(({ token, estimatedFee, loading }) => (
    <div data-testid="dialog-estimated-fee-content">
      {loading ? 'Loading...' : `${estimatedFee?.toString()} ${token.symbol}`}
    </div>
  )),
}))

vi.mock('../transaction-dialog', () => ({
  TransactionDialogFooter: vi.fn(
    ({
      isTxFinished,
      isTxFailed,
      isSynchronizing,
      clearTx,
      synchronizeAccount,
      closeDialog,
      signTransfer,
      isSignDisabled,
    }) => (
      <div data-testid="transaction-dialog-footer">
        <button
          data-testid="sign-button"
          onClick={signTransfer}
          disabled={isSignDisabled}
        >
          Withdraw
        </button>
        <button data-testid="close-button" onClick={closeDialog}>
          Close
        </button>
        <button data-testid="clear-tx-button" onClick={clearTx}>
          Clear
        </button>
        <button data-testid="sync-button" onClick={synchronizeAccount}>
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

describe('WithdrawDialog', () => {
  const mockToken: Token = {
    symbol: 'DOT',
    decimals: 10,
    name: 'Polkadot',
    category: 'substrate',
    chainName: 'Polkadot',
    logoId: 'polkadot',
  }

  const mockAppId: AppId = 'polkadot'

  const mockAccount: Address = {
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    path: "m/44'/354'/0'/0'/0'",
    pubKey: '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d',
    selected: false,
  }

  const defaultProps = {
    open: true,
    setOpen: vi.fn(),
    token: mockToken,
    account: mockAccount,
    appId: mockAppId,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render when open', () => {
      render(<WithdrawDialog {...defaultProps} />)

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Withdraw your unbonded balance')
      expect(screen.getByTestId('dialog-description')).toHaveTextContent(
        'This process may require a small transaction fee. Please review the details below before proceeding.'
      )
    })

    it('should not render when open is false', () => {
      const { container } = render(
        <WithdrawDialog {...defaultProps} open={false} />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should render dialog structure correctly', () => {
      render(<WithdrawDialog {...defaultProps} />)

      expect(screen.getByTestId('dialog-header')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-body')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-footer')).toBeInTheDocument()
    })
  })

  describe('form content', () => {
    it('should display all required form fields', () => {
      render(<WithdrawDialog {...defaultProps} />)

      expect(screen.getAllByTestId('dialog-field')).toHaveLength(3) // Source, Network, Fee
      expect(screen.getAllByTestId('dialog-label')).toHaveLength(3)
    })

    it('should display source address with explorer link', () => {
      render(<WithdrawDialog {...defaultProps} />)

      const explorerLink = screen.getByTestId('explorer-link')
      expect(explorerLink).toBeInTheDocument()
      expect(explorerLink).toHaveAttribute(
        'data-value',
        '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
      )
      expect(explorerLink).toHaveAttribute('data-app-id', 'polkadot')
      expect(explorerLink).toHaveAttribute('data-explorer-type', 'address')
      expect(explorerLink).toHaveAttribute('data-size', 'xs')
    })

    it('should display network information with token icon', () => {
      render(<WithdrawDialog {...defaultProps} />)

      const tokenIcon = screen.getByTestId('token-icon')
      expect(tokenIcon).toBeInTheDocument()
      expect(tokenIcon).toHaveAttribute('data-symbol', 'DOT')
      expect(tokenIcon).toHaveAttribute('data-size', 'md')
      expect(tokenIcon).toHaveAttribute('data-icon', '<svg>Logo</svg>')

      expect(screen.getByText('Chain polkadot')).toBeInTheDocument()
    })

    it('should display estimated fee', () => {
      render(<WithdrawDialog {...defaultProps} />)

      expect(screen.getByText('Estimated Fee')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-estimated-fee-content')).toBeInTheDocument()
    })
  })

  describe('transaction handling', () => {
    it('should handle withdraw transaction button click', async () => {
      const mockRunTransaction = vi.fn()
      const mockUseTransactionStatus = vi.mocked(
        await import('@/components/hooks/useTransactionStatus')
      ).useTransactionStatus

      mockUseTransactionStatus.mockReturnValue({
        runTransaction: mockRunTransaction,
        txStatus: null,
        clearTx: vi.fn(),
        isTxFinished: false,
        isTxFailed: false,
        updateSynchronization: vi.fn(),
        isSynchronizing: false,
        getEstimatedFee: vi.fn(),
        estimatedFee: new BN('1000000000000'),
        estimatedFeeLoading: false,
      })

      render(<WithdrawDialog {...defaultProps} />)

      const signButton = screen.getByTestId('sign-button')
      
      await act(async () => {
        fireEvent.click(signButton)
      })

      expect(mockRunTransaction).toHaveBeenCalledWith(
        'polkadot',
        '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        "m/44'/354'/0'/0'/0'"
      )
    })

    it('should handle close dialog', async () => {
      const mockSetOpen = vi.fn()
      const mockClearTx = vi.fn()
      const mockUseTransactionStatus = vi.mocked(
        await import('@/components/hooks/useTransactionStatus')
      ).useTransactionStatus

      mockUseTransactionStatus.mockReturnValue({
        runTransaction: vi.fn(),
        txStatus: null,
        clearTx: mockClearTx,
        isTxFinished: false,
        isTxFailed: false,
        updateSynchronization: vi.fn(),
        isSynchronizing: false,
        getEstimatedFee: vi.fn(),
        estimatedFee: new BN('1000000000000'),
        estimatedFeeLoading: false,
      })

      render(<WithdrawDialog {...defaultProps} setOpen={mockSetOpen} />)

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
      const mockUseTransactionStatus = vi.mocked(
        await import('@/components/hooks/useTransactionStatus')
      ).useTransactionStatus

      mockUseTransactionStatus.mockReturnValue({
        runTransaction: vi.fn(),
        txStatus: null,
        clearTx: vi.fn(),
        isTxFinished: false,
        isTxFailed: false,
        updateSynchronization: mockUpdateSynchronization,
        isSynchronizing: false,
        getEstimatedFee: vi.fn(),
        estimatedFee: new BN('1000000000000'),
        estimatedFeeLoading: false,
      })

      render(<WithdrawDialog {...defaultProps} setOpen={mockSetOpen} />)

      const syncButton = screen.getByTestId('sync-button')
      
      await act(async () => {
        fireEvent.click(syncButton)
      })

      expect(mockUpdateSynchronization).toHaveBeenCalled()
      expect(mockSetOpen).toHaveBeenCalledWith(false)
    })

    it('should show transaction status when tx is in progress', async () => {
      const mockUseTransactionStatus = vi.mocked(
        await import('@/components/hooks/useTransactionStatus')
      ).useTransactionStatus

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
        estimatedFee: new BN('1000000000000'),
        estimatedFeeLoading: false,
      })

      render(<WithdrawDialog {...defaultProps} />)

      expect(screen.getByTestId('transaction-status-body')).toBeInTheDocument()
      const statusBody = screen.getByTestId('transaction-status-body')
      expect(statusBody.querySelector('[data-testid="status"]')).toHaveTextContent('pending')
      expect(statusBody.querySelector('[data-testid="message"]')).toHaveTextContent('Transaction pending')
    })

    it('should disable sign button when transaction is in progress', async () => {
      const mockUseTransactionStatus = vi.mocked(
        await import('@/components/hooks/useTransactionStatus')
      ).useTransactionStatus

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
        estimatedFee: new BN('1000000000000'),
        estimatedFeeLoading: false,
      })

      render(<WithdrawDialog {...defaultProps} />)

      const signButton = screen.getByTestId('sign-button')
      expect(signButton).toBeDisabled()
    })
  })

  describe('fee estimation', () => {
    it('should show loading state for estimated fee', async () => {
      const mockUseTransactionStatus = vi.mocked(
        await import('@/components/hooks/useTransactionStatus')
      ).useTransactionStatus

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

      render(<WithdrawDialog {...defaultProps} />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should call getEstimatedFee on mount when dialog is open', async () => {
      const mockGetEstimatedFee = vi.fn()
      const mockUseTransactionStatus = vi.mocked(
        await import('@/components/hooks/useTransactionStatus')
      ).useTransactionStatus

      mockUseTransactionStatus.mockReturnValue({
        runTransaction: vi.fn(),
        txStatus: null,
        clearTx: vi.fn(),
        isTxFinished: false,
        isTxFailed: false,
        updateSynchronization: vi.fn(),
        isSynchronizing: false,
        getEstimatedFee: mockGetEstimatedFee,
        estimatedFee: new BN('1000000000000'),
        estimatedFeeLoading: false,
      })

      render(<WithdrawDialog {...defaultProps} />)

      expect(mockGetEstimatedFee).toHaveBeenCalledWith(
        'polkadot',
        '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
      )
    })

    it('should not call getEstimatedFee when dialog is closed', async () => {
      const mockGetEstimatedFee = vi.fn()
      const mockUseTransactionStatus = vi.mocked(
        await import('@/components/hooks/useTransactionStatus')
      ).useTransactionStatus

      mockUseTransactionStatus.mockReturnValue({
        runTransaction: vi.fn(),
        txStatus: null,
        clearTx: vi.fn(),
        isTxFinished: false,
        isTxFailed: false,
        updateSynchronization: vi.fn(),
        isSynchronizing: false,
        getEstimatedFee: mockGetEstimatedFee,
        estimatedFee: new BN('1000000000000'),
        estimatedFeeLoading: false,
      })

      render(<WithdrawDialog {...defaultProps} open={false} />)

      expect(mockGetEstimatedFee).not.toHaveBeenCalled()
    })

    it('should format estimated fee correctly', async () => {
      const mockFormatBalance = vi.mocked(
        await import('@/lib/utils/format')
      ).formatBalance

      mockFormatBalance.mockReturnValue('1000000000000 DOT')

      render(<WithdrawDialog {...defaultProps} />)

      expect(screen.getByText('1000000000000 DOT')).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle different app IDs and tokens', () => {
      const kusamaProps = {
        ...defaultProps,
        appId: 'kusama' as AppId,
        token: {
          ...mockToken,
          symbol: 'KSM',
          name: 'Kusama',
          logoId: 'kusama',
        },
      }

      render(<WithdrawDialog {...kusamaProps} />)

      const explorerLink = screen.getByTestId('explorer-link')
      expect(explorerLink).toHaveAttribute('data-app-id', 'kusama')

      const tokenIcon = screen.getByTestId('token-icon')
      expect(tokenIcon).toHaveAttribute('data-symbol', 'KSM')

      expect(screen.getByText('Chain kusama')).toBeInTheDocument()
    })

    it('should handle account with different address', () => {
      const accountWithDifferentAddress = {
        ...mockAccount,
        address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
        path: "m/44'/354'/0'/0'/1'",
      }

      render(
        <WithdrawDialog
          {...defaultProps}
          account={accountWithDifferentAddress}
        />
      )

      const explorerLink = screen.getByTestId('explorer-link')
      expect(explorerLink).toHaveAttribute(
        'data-value',
        '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'
      )
    })

    it('should handle transaction states correctly', async () => {
      const mockUseTransactionStatus = vi.mocked(
        await import('@/components/hooks/useTransactionStatus')
      ).useTransactionStatus

      mockUseTransactionStatus.mockReturnValue({
        runTransaction: vi.fn(),
        txStatus: null,
        clearTx: vi.fn(),
        isTxFinished: true,
        isTxFailed: false,
        updateSynchronization: vi.fn(),
        isSynchronizing: false,
        getEstimatedFee: vi.fn(),
        estimatedFee: new BN('1000000000000'),
        estimatedFeeLoading: false,
      })

      render(<WithdrawDialog {...defaultProps} />)

      expect(screen.getByTestId('status')).toHaveTextContent('Finished')
    })

    it('should handle failed transaction state', async () => {
      const mockUseTransactionStatus = vi.mocked(
        await import('@/components/hooks/useTransactionStatus')
      ).useTransactionStatus

      mockUseTransactionStatus.mockReturnValue({
        runTransaction: vi.fn(),
        txStatus: null,
        clearTx: vi.fn(),
        isTxFinished: false,
        isTxFailed: true,
        updateSynchronization: vi.fn(),
        isSynchronizing: false,
        getEstimatedFee: vi.fn(),
        estimatedFee: new BN('1000000000000'),
        estimatedFeeLoading: false,
      })

      render(<WithdrawDialog {...defaultProps} />)

      expect(screen.getByTestId('status')).toHaveTextContent('Failed')
    })

    it('should handle synchronizing state', async () => {
      const mockUseTransactionStatus = vi.mocked(
        await import('@/components/hooks/useTransactionStatus')
      ).useTransactionStatus

      mockUseTransactionStatus.mockReturnValue({
        runTransaction: vi.fn(),
        txStatus: null,
        clearTx: vi.fn(),
        isTxFinished: false,
        isTxFailed: false,
        updateSynchronization: vi.fn(),
        isSynchronizing: true,
        getEstimatedFee: vi.fn(),
        estimatedFee: new BN('1000000000000'),
        estimatedFeeLoading: false,
      })

      render(<WithdrawDialog {...defaultProps} />)

      expect(screen.getByTestId('status')).toHaveTextContent('Synchronizing')
    })

    it('should handle undefined estimated fee', async () => {
      const mockUseTransactionStatus = vi.mocked(
        await import('@/components/hooks/useTransactionStatus')
      ).useTransactionStatus

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
        estimatedFeeLoading: false,
      })

      render(<WithdrawDialog {...defaultProps} />)

      // Should still render the fee content component
      expect(screen.getByTestId('dialog-estimated-fee-content')).toBeInTheDocument()
    })
  })

  describe('dialog behavior', () => {
    it('should handle dialog close events', () => {
      const mockSetOpen = vi.fn()
      render(<WithdrawDialog {...defaultProps} setOpen={mockSetOpen} />)

      const dialog = screen.getByTestId('dialog')
      fireEvent.blur(dialog)

      expect(mockSetOpen).toHaveBeenCalledWith(false)
    })

    it('should render transaction dialog footer with correct props', () => {
      render(<WithdrawDialog {...defaultProps} />)

      expect(screen.getByTestId('transaction-dialog-footer')).toBeInTheDocument()
      expect(screen.getByTestId('sign-button')).toBeInTheDocument()
      expect(screen.getByTestId('close-button')).toBeInTheDocument()
      expect(screen.getByTestId('clear-tx-button')).toBeInTheDocument()
      expect(screen.getByTestId('sync-button')).toBeInTheDocument()
    })

    it('should handle prop changes', () => {
      const { rerender } = render(<WithdrawDialog {...defaultProps} />)

      expect(screen.getByTestId('dialog')).toBeInTheDocument()

      rerender(<WithdrawDialog {...defaultProps} open={false} />)

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have proper dialog structure', () => {
      render(<WithdrawDialog {...defaultProps} />)

      expect(screen.getByTestId('dialog-header')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-body')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-footer')).toBeInTheDocument()
    })

    it('should have proper heading hierarchy', () => {
      render(<WithdrawDialog {...defaultProps} />)

      const title = screen.getByTestId('dialog-title')
      expect(title.tagName).toBe('H2')
      expect(title).toHaveTextContent('Withdraw your unbonded balance')
    })

    it('should have proper form labels', () => {
      render(<WithdrawDialog {...defaultProps} />)

      const labels = screen.getAllByTestId('dialog-label')
      expect(labels).toHaveLength(3)
      expect(labels[0]).toHaveTextContent('Source Address')
      expect(labels[1]).toHaveTextContent('Network')
      expect(labels[2]).toHaveTextContent('Estimated Fee')
    })

    it('should have descriptive button text', () => {
      render(<WithdrawDialog {...defaultProps} />)

      const button = screen.getByTestId('sign-button')
      expect(button).toHaveTextContent('Withdraw')
    })

    it('should have meaningful content description', () => {
      render(<WithdrawDialog {...defaultProps} />)

      const description = screen.getByTestId('dialog-description')
      expect(description).toHaveTextContent(
        'This process may require a small transaction fee. Please review the details below before proceeding.'
      )
    })
  })

  describe('component integration', () => {
    it('should use token logo hook correctly', async () => {
      const mockUseTokenLogo = vi.mocked(
        await import('@/components/hooks/useTokenLogo')
      ).useTokenLogo

      render(<WithdrawDialog {...defaultProps} />)

      expect(mockUseTokenLogo).toHaveBeenCalledWith('polkadot')
    })

    it('should use chain name correctly', async () => {
      const mockGetChainName = vi.mocked(
        await import('@/config/apps')
      ).getChainName

      render(<WithdrawDialog {...defaultProps} />)

      expect(mockGetChainName).toHaveBeenCalledWith('polkadot')
    })

    it('should call ledger state functions correctly', async () => {
      const mockRunTransaction = vi.fn()
      const mockUseTransactionStatus = vi.mocked(
        await import('@/components/hooks/useTransactionStatus')
      ).useTransactionStatus

      mockUseTransactionStatus.mockReturnValue({
        runTransaction: mockRunTransaction,
        txStatus: null,
        clearTx: vi.fn(),
        isTxFinished: false,
        isTxFailed: false,
        updateSynchronization: vi.fn(),
        isSynchronizing: false,
        getEstimatedFee: vi.fn(),
        estimatedFee: new BN('1000000000000'),
        estimatedFeeLoading: false,
      })

      render(<WithdrawDialog {...defaultProps} />)

      // Verify useTransactionStatus was called with correct function signatures
      expect(mockUseTransactionStatus).toHaveBeenCalledWith(
        expect.any(Function), // withdrawTxFn
        expect.any(Function)  // ledgerState$.getWithdrawFee
      )
    })
  })
})