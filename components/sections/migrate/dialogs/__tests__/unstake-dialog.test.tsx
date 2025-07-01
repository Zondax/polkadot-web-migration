import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { BN } from '@polkadot/util'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Address } from '@/state/types/ledger'
import type { AppId, Token } from '@/config/apps'

// Mock external dependencies - all mocks must be hoisted before imports
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
    getEstimatedFee: vi.fn().mockResolvedValue(new BN('1000000000000')),
    estimatedFee: new BN('1000000000000'),
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

vi.mock('@/components/ui/input', () => ({
  Input: vi.fn(({ type, min, max, value, onChange, placeholder, className, error, helperText }) => (
    <div data-testid="input-container">
      <input
        data-testid="input"
        type={type}
        min={min}
        max={max}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
        data-error={error}
      />
      {helperText && <span data-testid="helper-text">{helperText}</span>}
    </div>
  )),
}))

vi.mock('@/config/explorers', () => ({
  ExplorerItemType: {
    Address: 'address',
    Transaction: 'transaction',
    Block: 'block',
  },
}))

vi.mock('@/lib/utils/format', () => ({
  formatBalance: vi.fn((balance, token) => balance ? `${balance.toString()} ${token.symbol}` : `0 ${token.symbol}`),
  convertToRawUnits: vi.fn((amount, token) => new BN(amount * 10 ** token.decimals)),
}))

vi.mock('@/state/ledger', () => ({
  ledgerState$: {
    unstakeBalance: vi.fn(),
    synchronizeAccount: vi.fn(),
    getUnstakeFee: vi.fn(),
  },
}))

vi.mock('state/types/ledger', () => ({}))

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: vi.fn(() => vi.fn()),
}))

vi.mock('@/lib/utils/balance', () => ({
  cannotCoverFee: vi.fn(() => false),
}))

vi.mock('@/config/errors', () => ({
  errorDetails: {
    insufficient_balance: {
      title: 'Insufficient Balance',
      description: 'Insufficient balance to cover the transaction fee.',
      content: 'Please ensure you have enough funds to cover both the transfer amount and transaction fee.',
    },
  },
}))

// Create a store for form values
let formValues = { unstakeAmount: undefined, estimatedFee: undefined }

vi.mock('react-hook-form', () => ({
  useForm: vi.fn(() => ({
    control: {},
    handleSubmit: vi.fn((fn) => (e) => {
      e?.preventDefault?.()
      return fn(formValues)
    }),
    watch: vi.fn((field) => {
      if (field === 'unstakeAmount') return formValues.unstakeAmount
      if (field === 'estimatedFee') return formValues.estimatedFee
      return undefined
    }),
    formState: { 
      errors: formValues.errors || {},
      isValid: formValues.unstakeAmount && !formValues.errors
    },
    clearErrors: vi.fn(),
    setValue: vi.fn((field, value, options) => {
      formValues[field] = value
      // Simulate validation when shouldValidate is true
      if (options?.shouldValidate && field === 'estimatedFee') {
        formValues.errors = undefined
      }
    }),
    unregister: vi.fn((field) => {
      delete formValues[field]
    }),
    reset: vi.fn(() => {
      formValues = { unstakeAmount: undefined, estimatedFee: undefined }
    }),
  })),
  Controller: vi.fn(({ render, name }) => {
    const field = {
      value: formValues[name],
      onChange: (e) => {
        const value = e?.target?.value
        formValues[name] = value ? Number(value) : undefined
      },
    }
    return render({ field })
  }),
}))

vi.mock('zod', () => ({
  default: {
    object: vi.fn(() => ({
      parse: vi.fn(),
    })),
    number: vi.fn(() => ({
      min: vi.fn(() => ({ refine: vi.fn(() => ({})) })),
    })),
    instanceof: vi.fn(() => ({ refine: vi.fn(() => ({})) })),
  },
}))

vi.mock('../common-dialog-fields', () => ({
  DialogField: vi.fn(({ children }) => <div data-testid="dialog-field">{children}</div>),
  DialogLabel: vi.fn(({ children, className }) => (
    <div data-testid="dialog-label" className={className}>
      {children}
    </div>
  )),
  DialogNetworkContent: vi.fn(({ token, appId }) => (
    <div data-testid="dialog-network-content" data-token={token.symbol} data-app-id={appId}>
      Network Content
    </div>
  )),
  DialogEstimatedFeeContent: vi.fn(({ token, estimatedFee, loading }) => (
    <div data-testid="dialog-estimated-fee-content">{loading ? 'Loading...' : `${estimatedFee?.toString()} ${token.symbol}`}</div>
  )),
  DialogError: vi.fn(({ error }) => error ? <div data-testid="dialog-error">{error}</div> : null),
}))

vi.mock('../transaction-dialog', () => ({
  TransactionDialogFooter: vi.fn(
    ({ isTxFinished, isTxFailed, isSynchronizing, clearTx, synchronizeAccount, closeDialog, signTransfer, isSignDisabled }) => (
      <div data-testid="transaction-dialog-footer">
        <button type="button" data-testid="sign-button" onClick={signTransfer} disabled={isSignDisabled}>
          Unstake
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

// Import the component after all mocks are defined
import UnstakeDialog from '../unstake-dialog'
import { useTransactionStatus } from '@/components/hooks/useTransactionStatus'
import { formatBalance, convertToRawUnits } from '@/lib/utils/format'

describe('UnstakeDialog', () => {
  // Get mocked functions
  const mockUseTransactionStatus = vi.mocked(useTransactionStatus)
  const mockFormatBalance = vi.mocked(formatBalance)
  const mockConvertToRawUnits = vi.mocked(convertToRawUnits)

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
  }

  const mockMaxUnstake = new BN('5000000000000')
  const mockTransferableBalance = new BN('10000000000000')

  const defaultProps = {
    open: true,
    setOpen: vi.fn(),
    maxUnstake: mockMaxUnstake,
    transferableBalance: mockTransferableBalance,
    token: mockToken,
    account: mockAccount,
    appId: mockAppId,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset form values
    formValues = { unstakeAmount: undefined, estimatedFee: undefined }
  })

  describe('basic rendering', () => {
    it('should render when open', () => {
      render(<UnstakeDialog {...defaultProps} />)

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Unstake your balance')

      const descriptions = screen.getAllByTestId('dialog-description')
      expect(descriptions).toHaveLength(2)
      expect(descriptions[0]).toHaveTextContent(
        'Unstake tokens from your balance to make them available for use. Enter the amount you wish to unstake below.'
      )
      expect(descriptions[1]).toHaveTextContent(
        'After unbonding, your tokens enter a withdrawal period. Once this period ends, you can withdraw your unbonded balance to your account.'
      )
    })

    it('should not render when open is false', () => {
      const { container } = render(<UnstakeDialog {...defaultProps} open={false} />)

      expect(container.firstChild).toBeNull()
    })

    it('should render dialog structure correctly', () => {
      render(<UnstakeDialog {...defaultProps} />)

      expect(screen.getByTestId('dialog-header')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-body')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-footer')).toBeInTheDocument()
    })
  })

  describe('form content', () => {
    it('should display required form fields initially', () => {
      render(<UnstakeDialog {...defaultProps} />)

      expect(screen.getAllByTestId('dialog-field')).toHaveLength(3) // Source, Network, Amount (no fee initially)
      expect(screen.getAllByTestId('dialog-label')).toHaveLength(3)
    })

    it('should display source address with explorer link', () => {
      render(<UnstakeDialog {...defaultProps} />)

      const explorerLink = screen.getByTestId('explorer-link')
      expect(explorerLink).toBeInTheDocument()
      expect(explorerLink).toHaveAttribute('data-value', '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')
      expect(explorerLink).toHaveAttribute('data-app-id', 'polkadot')
      expect(explorerLink).toHaveAttribute('data-explorer-type', 'address')
      expect(explorerLink).toHaveAttribute('data-size', 'xs')
    })

    it('should display network information', () => {
      render(<UnstakeDialog {...defaultProps} />)

      const networkContent = screen.getByTestId('dialog-network-content')
      expect(networkContent).toBeInTheDocument()
      expect(networkContent).toHaveAttribute('data-token', 'DOT')
      expect(networkContent).toHaveAttribute('data-app-id', 'polkadot')
    })

    it('should display amount input with max balance', () => {
      render(<UnstakeDialog {...defaultProps} />)

      expect(screen.getByText('Amount to Unstake')).toBeInTheDocument()
      expect(screen.getByText('Available Balance: 5000000000000 DOT')).toBeInTheDocument()

      const input = screen.getByTestId('input')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'number')
      expect(input).toHaveAttribute('min', '0')
      expect(input).toHaveAttribute('max', mockMaxUnstake.toNumber().toString())
      expect(input).toHaveAttribute('placeholder', 'Amount')
    })

    it.todo('should show estimated fee field when valid amount is entered', async () => {
      // Mock getEstimatedFee to also set the form value
      const mockGetEstimatedFee = vi.fn().mockImplementation(async () => {
        const fee = new BN('1000000000000')
        formValues.estimatedFee = fee
        return fee
      })
      
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

      render(<UnstakeDialog {...defaultProps} />)

      const input = screen.getByTestId('input')

      await act(async () => {
        fireEvent.change(input, { target: { value: '100' } })
      })

      // Wait for fee estimation to complete
      await waitFor(() => {
        expect(mockGetEstimatedFee).toHaveBeenCalled()
      })

      // Should now show fee field
      await waitFor(() => {
        expect(screen.getAllByTestId('dialog-field')).toHaveLength(4) // Source, Network, Amount, Fee
      })

      expect(screen.getByText('Estimated Fee')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-estimated-fee-content')).toBeInTheDocument()
    })

    it('should not show estimated fee field when no amount is entered', () => {
      render(<UnstakeDialog {...defaultProps} />)

      expect(screen.queryByText('Estimated Fee')).not.toBeInTheDocument()
      expect(screen.getAllByTestId('dialog-field')).toHaveLength(3)
    })
  })

  describe('form validation', () => {
    it.todo('should validate amount input and show helper text', async () => {
      render(<UnstakeDialog {...defaultProps} />)

      const input = screen.getByTestId('input')

      // Enter amount that exceeds maximum (in token units, not raw)
      // maxUnstake is 5000000000000 raw units = 500 token units (with 10 decimals)
      await act(async () => {
        fireEvent.change(input, { target: { value: '600' } })
      })

      await waitFor(() => {
        expect(screen.getByTestId('helper-text')).toHaveTextContent('Amount exceeds maximum unstakable balance')
      })

      expect(input).toHaveAttribute('data-error', 'true')
    })

    it('should disable sign button when amount is invalid', async () => {
      render(<UnstakeDialog {...defaultProps} />)

      const input = screen.getByTestId('input')

      await act(async () => {
        fireEvent.change(input, { target: { value: '0' } })
      })

      await waitFor(() => {
        const signButton = screen.getByTestId('sign-button')
        expect(signButton).toBeDisabled()
      })
    })

    it.todo('should enable sign button when amount is valid', async () => {
      render(<UnstakeDialog {...defaultProps} />)

      const input = screen.getByTestId('input')

      await act(async () => {
        fireEvent.change(input, { target: { value: '100' } })
      })

      await waitFor(() => {
        const signButton = screen.getByTestId('sign-button')
        expect(signButton).not.toBeDisabled()
      })
    })

    it('should hide estimated fee when there are validation errors', async () => {
      render(<UnstakeDialog {...defaultProps} />)

      const input = screen.getByTestId('input')

      await act(async () => {
        fireEvent.change(input, { target: { value: '10000' } }) // Exceeds max
      })

      await waitFor(() => {
        expect(screen.queryByText('Estimated Fee')).not.toBeInTheDocument()
        expect(screen.getAllByTestId('dialog-field')).toHaveLength(3) // No fee field when error
      })
    })
  })

  describe('transaction handling', () => {
    it.todo('should handle unstake transaction button click', async () => {
      const mockRunTransaction = vi.fn()

      mockConvertToRawUnits.mockReturnValue(new BN('1000000000000'))
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

      render(<UnstakeDialog {...defaultProps} />)

      const input = screen.getByTestId('input')

      await act(async () => {
        fireEvent.change(input, { target: { value: '100' } })
      })

      const signButton = screen.getByTestId('sign-button')

      await act(async () => {
        fireEvent.click(signButton)
      })

      expect(mockRunTransaction).toHaveBeenCalledWith(
        'polkadot',
        '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        "m/44'/354'/0'/0'/0'",
        expect.any(BN)
      )
    })

    it('should not submit transaction when no amount is entered', async () => {
      const mockRunTransaction = vi.fn()

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

      render(<UnstakeDialog {...defaultProps} />)

      const signButton = screen.getByTestId('sign-button')

      await act(async () => {
        fireEvent.click(signButton)
      })

      expect(mockRunTransaction).not.toHaveBeenCalled()
    })

    it('should handle close dialog', async () => {
      const mockSetOpen = vi.fn()
      const mockClearTx = vi.fn()

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

      render(<UnstakeDialog {...defaultProps} setOpen={mockSetOpen} />)

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

      render(<UnstakeDialog {...defaultProps} setOpen={mockSetOpen} />)

      const syncButton = screen.getByTestId('sync-button')

      await act(async () => {
        fireEvent.click(syncButton)
      })

      expect(mockUpdateSynchronization).toHaveBeenCalled()
      expect(mockSetOpen).toHaveBeenCalledWith(false)
    })

    it('should show transaction status when tx is in progress', async () => {
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

      render(<UnstakeDialog {...defaultProps} />)

      expect(screen.getByTestId('transaction-status-body')).toBeInTheDocument()
      const statusBody = screen.getByTestId('transaction-status-body')
      expect(statusBody.querySelector('[data-testid="status"]')).toHaveTextContent('pending')
      expect(statusBody.querySelector('[data-testid="message"]')).toHaveTextContent('Transaction pending')
    })

    it('should disable sign button when transaction is in progress', async () => {
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

      render(<UnstakeDialog {...defaultProps} />)

      const signButton = screen.getByTestId('sign-button')
      expect(signButton).toBeDisabled()
    })
  })

  describe('fee estimation', () => {
    it.todo('should show loading state for estimated fee', async () => {
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

      render(<UnstakeDialog {...defaultProps} />)

      const input = screen.getByTestId('input')

      await act(async () => {
        fireEvent.change(input, { target: { value: '100' } })
      })

      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument()
      })
    })

    it.todo('should call getEstimatedFee when amount changes', async () => {
      const mockGetEstimatedFee = vi.fn().mockResolvedValue(new BN('1000000000000'))

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

      render(<UnstakeDialog {...defaultProps} />)

      const input = screen.getByTestId('input')

      await act(async () => {
        fireEvent.change(input, { target: { value: '100' } })
      })

      // Wait for the effect to run
      await waitFor(() => {
        expect(mockGetEstimatedFee).toHaveBeenCalledWith('polkadot', '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', expect.any(Number))
      })
    })

    it('should not call getEstimatedFee when dialog is closed', async () => {
      const mockGetEstimatedFee = vi.fn()

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

      render(<UnstakeDialog {...defaultProps} open={false} />)

      expect(mockGetEstimatedFee).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle different max unstake amounts', () => {
      const differentMaxUnstake = new BN('10000000000000')

      render(<UnstakeDialog {...defaultProps} maxUnstake={differentMaxUnstake} />)

      expect(screen.getByText('Available Balance: 10000000000000 DOT')).toBeInTheDocument()

      const input = screen.getByTestId('input')
      expect(input).toHaveAttribute('max', differentMaxUnstake.toNumber().toString())
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

      render(<UnstakeDialog {...kusamaProps} />)

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

      render(<UnstakeDialog {...defaultProps} account={accountWithDifferentAddress} />)

      const explorerLink = screen.getByTestId('explorer-link')
      expect(explorerLink).toHaveAttribute('data-value', '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty')
    })

    it.todo('should reset form state when dialog closes', async () => {
      const mockSetOpen = vi.fn()

      render(<UnstakeDialog {...defaultProps} setOpen={mockSetOpen} />)

      const input = screen.getByTestId('input')

      // Enter some value
      await act(async () => {
        fireEvent.change(input, { target: { value: '100' } })
      })

      // Wait for the form value to update
      await waitFor(() => {
        expect(formValues.unstakeAmount).toBe(100)
      })

      // Close dialog
      const closeButton = screen.getByTestId('close-button')

      await act(async () => {
        fireEvent.click(closeButton)
      })

      expect(mockSetOpen).toHaveBeenCalledWith(false)
      // Check that form was reset
      expect(formValues.unstakeAmount).toBe(undefined)
    })
  })

  describe('dialog behavior', () => {
    it('should handle dialog close events', () => {
      const mockSetOpen = vi.fn()
      render(<UnstakeDialog {...defaultProps} setOpen={mockSetOpen} />)

      const dialog = screen.getByTestId('dialog')
      fireEvent.blur(dialog)

      expect(mockSetOpen).toHaveBeenCalledWith(false)
    })

    it('should render transaction dialog footer with correct props', () => {
      render(<UnstakeDialog {...defaultProps} />)

      expect(screen.getByTestId('transaction-dialog-footer')).toBeInTheDocument()
      expect(screen.getByTestId('sign-button')).toBeInTheDocument()
      expect(screen.getByTestId('close-button')).toBeInTheDocument()
      expect(screen.getByTestId('clear-tx-button')).toBeInTheDocument()
      expect(screen.getByTestId('sync-button')).toBeInTheDocument()
    })

    it('should handle prop changes', () => {
      const { rerender } = render(<UnstakeDialog {...defaultProps} />)

      expect(screen.getByTestId('dialog')).toBeInTheDocument()

      rerender(<UnstakeDialog {...defaultProps} open={false} />)

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have proper dialog structure', () => {
      render(<UnstakeDialog {...defaultProps} />)

      expect(screen.getByTestId('dialog-header')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-body')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-footer')).toBeInTheDocument()
    })

    it('should have proper heading hierarchy', () => {
      render(<UnstakeDialog {...defaultProps} />)

      const title = screen.getByTestId('dialog-title')
      expect(title.tagName).toBe('H2')
      expect(title).toHaveTextContent('Unstake your balance')
    })

    it('should have proper form labels', () => {
      render(<UnstakeDialog {...defaultProps} />)

      const labels = screen.getAllByTestId('dialog-label')
      expect(labels).toHaveLength(3)
      expect(labels[0]).toHaveTextContent('Source Address')
      expect(labels[1]).toHaveTextContent('Network')
      expect(labels[2]).toHaveTextContent('Amount to Unstake')
    })

    it('should have descriptive button text', () => {
      render(<UnstakeDialog {...defaultProps} />)

      const button = screen.getByTestId('sign-button')
      expect(button).toHaveTextContent('Unstake')
    })

    it('should have proper input attributes', () => {
      render(<UnstakeDialog {...defaultProps} />)

      const input = screen.getByTestId('input')
      expect(input).toHaveAttribute('type', 'number')
      expect(input).toHaveAttribute('placeholder', 'Amount')
      expect(input).toHaveAttribute('min', '0')
    })
  })
})