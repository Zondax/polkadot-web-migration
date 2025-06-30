import { render, screen, fireEvent, act } from '@testing-library/react'
import { BN } from '@polkadot/util'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Address } from '@/state/types/ledger'
import type { AppId, Token } from '@/config/apps'

import RemoveProxyDialog from '../remove-proxy-dialog'

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
    removeProxies: vi.fn(),
    synchronizeAccount: vi.fn(),
    getRemoveProxiesFee: vi.fn(),
  },
}))

vi.mock('../common-dialog-fields', () => ({
  DialogField: vi.fn(({ children }) => <div data-testid="dialog-field">{children}</div>),
  DialogLabel: vi.fn(({ children }) => (
    <label data-testid="dialog-label">{children}</label>
  )),
  DialogNetworkContent: vi.fn(({ token, appId }) => (
    <div data-testid="dialog-network-content" data-token={token.symbol} data-app-id={appId}>
      Network Content
    </div>
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
          Remove Proxies
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

describe('RemoveProxyDialog', () => {
  const mockToken: Token = {
    symbol: 'DOT',
    decimals: 10,
    name: 'Polkadot',
    category: 'substrate',
    chainName: 'Polkadot',
  }

  const mockAppId: AppId = 'polkadot'

  const mockAccount: Address = {
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    path: "m/44'/354'/0'/0'/0'",
    pubKey: '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d',
    selected: false,
    proxy: {
      deposit: new BN('100000000000'),
      proxies: [
        {
          address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
          proxyType: 'Any',
          delay: 0,
        },
        {
          address: '5DAAnrj7VHTznn2C221g2pvCnvVy9AHbLP7RP9ueGZFg7AAW',
          proxyType: 'Staking',
          delay: 10,
        },
      ],
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
      render(<RemoveProxyDialog {...defaultProps} />)

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Remove Proxies')
      const descriptions = screen.getAllByTestId('dialog-description')
      expect(descriptions).toHaveLength(2) // One outer and one nested empty description
      expect(descriptions[0]).toHaveTextContent(
        'This process may require a small transaction fee. Please review the details below before proceeding.'
      )
      expect(descriptions[0]).toHaveTextContent(
        'The deposit will be automatically returned when the proxies are removed.'
      )
    })

    it('should not render when open is false', () => {
      const { container } = render(
        <RemoveProxyDialog {...defaultProps} open={false} />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should render dialog structure correctly', () => {
      render(<RemoveProxyDialog {...defaultProps} />)

      expect(screen.getByTestId('dialog-header')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-body')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-footer')).toBeInTheDocument()
    })
  })

  describe('form content', () => {
    it('should display all required form fields when proxy has deposit', () => {
      render(<RemoveProxyDialog {...defaultProps} />)

      expect(screen.getAllByTestId('dialog-field')).toHaveLength(5) // Source, Proxies, Network, Deposit, Fee
      expect(screen.getAllByTestId('dialog-label')).toHaveLength(5)
    })

    it('should display source address with explorer link', () => {
      render(<RemoveProxyDialog {...defaultProps} />)

      const explorerLinks = screen.getAllByTestId('explorer-link')
      const sourceAddressLink = explorerLinks.find(
        link => link.getAttribute('data-value') === '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
      )
      expect(sourceAddressLink).toBeInTheDocument()
      expect(sourceAddressLink).toHaveAttribute('data-app-id', 'polkadot')
      expect(sourceAddressLink).toHaveAttribute('data-explorer-type', 'address')
      expect(sourceAddressLink).toHaveAttribute('data-size', 'xs')
    })

    it('should display all proxy addresses to be removed', () => {
      render(<RemoveProxyDialog {...defaultProps} />)

      expect(screen.getByText('Proxy Addresses to Be Removed')).toBeInTheDocument()
      
      const explorerLinks = screen.getAllByTestId('explorer-link')
      const proxy1Link = explorerLinks.find(
        link => link.getAttribute('data-value') === '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'
      )
      const proxy2Link = explorerLinks.find(
        link => link.getAttribute('data-value') === '5DAAnrj7VHTznn2C221g2pvCnvVy9AHbLP7RP9ueGZFg7AAW'
      )
      
      expect(proxy1Link).toBeInTheDocument()
      expect(proxy2Link).toBeInTheDocument()
    })

    it('should display network information', () => {
      render(<RemoveProxyDialog {...defaultProps} />)

      const networkContent = screen.getByTestId('dialog-network-content')
      expect(networkContent).toBeInTheDocument()
      expect(networkContent).toHaveAttribute('data-token', 'DOT')
      expect(networkContent).toHaveAttribute('data-app-id', 'polkadot')
    })

    it('should display deposit information when available', () => {
      render(<RemoveProxyDialog {...defaultProps} />)

      expect(screen.getByText('Deposit to Be Returned')).toBeInTheDocument()
      expect(screen.getByText('100000000000 DOT')).toBeInTheDocument()
    })

    it('should not display deposit when proxy is undefined', () => {
      const accountWithoutProxy = {
        ...mockAccount,
        proxy: undefined,
      }

      render(
        <RemoveProxyDialog
          {...defaultProps}
          account={accountWithoutProxy}
        />
      )

      expect(screen.queryByText('Deposit to Be Returned')).not.toBeInTheDocument()
      expect(screen.getAllByTestId('dialog-field')).toHaveLength(4) // Source, Proxies, Network, Fee (Proxies field always rendered even if empty)
    })

    it('should not display deposit when deposit is undefined', () => {
      const accountWithoutDeposit = {
        ...mockAccount,
        proxy: {
          deposit: undefined,
          proxies: [
            {
              address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
              proxyType: 'Any',
              delay: 0,
            },
          ],
        },
      }

      render(
        <RemoveProxyDialog
          {...defaultProps}
          account={accountWithoutDeposit}
        />
      )

      expect(screen.queryByText('Deposit to Be Returned')).not.toBeInTheDocument()
      expect(screen.getAllByTestId('dialog-field')).toHaveLength(4) // Source, Proxies, Network, Fee (no Deposit)
    })

    it('should display estimated fee', () => {
      render(<RemoveProxyDialog {...defaultProps} />)

      expect(screen.getByText('Estimated Fee')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-estimated-fee-content')).toBeInTheDocument()
    })
  })

  describe('transaction handling', () => {
    it('should handle sign transaction button click', async () => {
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

      render(<RemoveProxyDialog {...defaultProps} />)

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

      render(<RemoveProxyDialog {...defaultProps} setOpen={mockSetOpen} />)

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

      render(<RemoveProxyDialog {...defaultProps} setOpen={mockSetOpen} />)

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

      render(<RemoveProxyDialog {...defaultProps} />)

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

      render(<RemoveProxyDialog {...defaultProps} />)

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

      render(<RemoveProxyDialog {...defaultProps} />)

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

      render(<RemoveProxyDialog {...defaultProps} />)

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

      render(<RemoveProxyDialog {...defaultProps} open={false} />)

      expect(mockGetEstimatedFee).not.toHaveBeenCalled()
    })
  })

  describe('proxy handling', () => {
    it('should handle single proxy address', () => {
      const accountWithSingleProxy = {
        ...mockAccount,
        proxy: {
          deposit: new BN('50000000000'),
          proxies: [
            {
              address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
              proxyType: 'Any',
              delay: 0,
            },
          ],
        },
      }

      render(
        <RemoveProxyDialog
          {...defaultProps}
          account={accountWithSingleProxy}
        />
      )

      const explorerLinks = screen.getAllByTestId('explorer-link')
      const proxyLink = explorerLinks.find(
        link => link.getAttribute('data-value') === '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'
      )
      
      expect(proxyLink).toBeInTheDocument()
      expect(screen.getByText('50000000000 DOT')).toBeInTheDocument()
    })

    it('should handle empty proxy array', () => {
      const accountWithEmptyProxies = {
        ...mockAccount,
        proxy: {
          deposit: new BN('0'),
          proxies: [],
        },
      }

      render(
        <RemoveProxyDialog
          {...defaultProps}
          account={accountWithEmptyProxies}
        />
      )

      expect(screen.getByText('Proxy Addresses to Be Removed')).toBeInTheDocument()
      // Should still render the field but with no proxy links
      const explorerLinks = screen.getAllByTestId('explorer-link')
      // Only source address link should be present
      expect(explorerLinks).toHaveLength(1)
      expect(explorerLinks[0]).toHaveAttribute('data-value', mockAccount.address)
    })

    it('should handle different proxy types and delays', () => {
      const accountWithVariedProxies = {
        ...mockAccount,
        proxy: {
          deposit: new BN('200000000000'),
          proxies: [
            {
              address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
              proxyType: 'Governance',
              delay: 100,
            },
            {
              address: '5DAAnrj7VHTznn2C221g2pvCnvVy9AHbLP7RP9ueGZFg7AAW',
              proxyType: 'IdentityJudgement',
              delay: 0,
            },
          ],
        },
      }

      render(
        <RemoveProxyDialog
          {...defaultProps}
          account={accountWithVariedProxies}
        />
      )

      const explorerLinks = screen.getAllByTestId('explorer-link')
      expect(explorerLinks).toHaveLength(3) // Source + 2 proxies
      expect(screen.getByText('200000000000 DOT')).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle different deposit values', () => {
      const accountWithDifferentDeposit = {
        ...mockAccount,
        proxy: {
          deposit: new BN('500000000000'),
          proxies: [
            {
              address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
              proxyType: 'Any',
              delay: 0,
            },
          ],
        },
      }

      render(
        <RemoveProxyDialog
          {...defaultProps}
          account={accountWithDifferentDeposit}
        />
      )

      expect(screen.getByText('500000000000 DOT')).toBeInTheDocument()
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

      render(<RemoveProxyDialog {...kusamaProps} />)

      const explorerLinks = screen.getAllByTestId('explorer-link')
      explorerLinks.forEach(link => {
        expect(link).toHaveAttribute('data-app-id', 'kusama')
      })

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

      render(
        <RemoveProxyDialog
          {...defaultProps}
          account={accountWithDifferentAddress}
        />
      )

      const explorerLinks = screen.getAllByTestId('explorer-link')
      const sourceLink = explorerLinks.find(
        link => link.getAttribute('data-value') === '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'
      )
      expect(sourceLink).toBeInTheDocument()
    })

    it('should handle proxy with null deposit', () => {
      const accountWithNullDeposit = {
        ...mockAccount,
        proxy: {
          deposit: null as any,
          proxies: [
            {
              address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
              proxyType: 'Any',
              delay: 0,
            },
          ],
        },
      }

      render(
        <RemoveProxyDialog
          {...defaultProps}
          account={accountWithNullDeposit}
        />
      )

      // Null is not undefined, so the deposit field will still render
      expect(screen.getByText('Deposit to Be Returned')).toBeInTheDocument()
      expect(screen.getByText('0 DOT')).toBeInTheDocument()
    })
  })

  describe('dialog behavior', () => {
    it('should handle dialog close events', () => {
      const mockSetOpen = vi.fn()
      render(<RemoveProxyDialog {...defaultProps} setOpen={mockSetOpen} />)

      const dialog = screen.getByTestId('dialog')
      fireEvent.blur(dialog)

      expect(mockSetOpen).toHaveBeenCalledWith(false)
    })

    it('should render transaction dialog footer with correct props', () => {
      render(<RemoveProxyDialog {...defaultProps} />)

      expect(screen.getByTestId('transaction-dialog-footer')).toBeInTheDocument()
      expect(screen.getByTestId('sign-button')).toBeInTheDocument()
      expect(screen.getByTestId('close-button')).toBeInTheDocument()
      expect(screen.getByTestId('clear-tx-button')).toBeInTheDocument()
      expect(screen.getByTestId('sync-button')).toBeInTheDocument()
    })

    it('should handle prop changes', () => {
      const { rerender } = render(<RemoveProxyDialog {...defaultProps} />)

      expect(screen.getByTestId('dialog')).toBeInTheDocument()

      rerender(<RemoveProxyDialog {...defaultProps} open={false} />)

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have proper dialog structure', () => {
      render(<RemoveProxyDialog {...defaultProps} />)

      expect(screen.getByTestId('dialog-header')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-body')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-footer')).toBeInTheDocument()
    })

    it('should have proper heading hierarchy', () => {
      render(<RemoveProxyDialog {...defaultProps} />)

      const title = screen.getByTestId('dialog-title')
      expect(title.tagName).toBe('H2')
      expect(title).toHaveTextContent('Remove Proxies')
    })

    it('should have proper form labels', () => {
      render(<RemoveProxyDialog {...defaultProps} />)

      const labels = screen.getAllByTestId('dialog-label')
      expect(labels).toHaveLength(5)
      expect(labels[0]).toHaveTextContent('Source Address')
      expect(labels[1]).toHaveTextContent('Proxy Addresses to Be Removed')
      expect(labels[2]).toHaveTextContent('Network')
      expect(labels[3]).toHaveTextContent('Deposit to Be Returned')
      expect(labels[4]).toHaveTextContent('Estimated Fee')
    })

    it('should have proper form labels when no deposit or proxy', () => {
      const accountWithoutProxy = {
        ...mockAccount,
        proxy: undefined,
      }

      render(
        <RemoveProxyDialog
          {...defaultProps}
          account={accountWithoutProxy}
        />
      )

      const labels = screen.getAllByTestId('dialog-label')
      expect(labels).toHaveLength(4)
      expect(labels[0]).toHaveTextContent('Source Address')
      expect(labels[1]).toHaveTextContent('Proxy Addresses to Be Removed')
      expect(labels[2]).toHaveTextContent('Network')
      expect(labels[3]).toHaveTextContent('Estimated Fee')
    })

    it('should have descriptive button text', () => {
      render(<RemoveProxyDialog {...defaultProps} />)

      const button = screen.getByTestId('sign-button')
      expect(button).toHaveTextContent('Remove Proxies')
    })
  })
})