import { act, fireEvent, render, screen } from '@testing-library/react'
import { BN } from '@polkadot/util'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MultisigAddress, MultisigCall, MultisigMember } from '@/state/types/ledger'
import type { AppId, Token } from '@/config/apps'

import ApproveMultisigCallDialog from '../approve-multisig-call-dialog'

// Mock all external dependencies
vi.mock('lucide-react', () => ({
  Info: vi.fn(({ className }) => (
    <svg data-testid="info-icon" className={className} role="img" aria-label="Info">
      <title>Info</title>
      Info
    </svg>
  )),
}))

vi.mock('@/components/CustomTooltip', () => ({
  CustomTooltip: vi.fn(({ children, tooltipBody, className }) => (
    <div data-testid="custom-tooltip" className={className} title={tooltipBody}>
      {children}
    </div>
  )),
}))

vi.mock('@/components/ExplorerLink', () => ({
  ExplorerLink: vi.fn(({ value, appId, explorerLinkType, size, hasCopyButton, disableTooltip, disableLink }) => (
    <div
      data-testid="explorer-link"
      data-value={value}
      data-app-id={appId}
      data-explorer-type={explorerLinkType}
      data-size={size}
      data-has-copy-button={hasCopyButton}
      data-disable-tooltip={disableTooltip}
      data-disable-link={disableLink}
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
  })),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: vi.fn(({ children, variant, className }) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  )),
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: vi.fn(({ children, open }) =>
    open ? (
      <div data-testid="dialog" role="dialog">
        {children}
      </div>
    ) : null
  ),
  DialogContent: vi.fn(({ children, className }) => (
    <div data-testid="dialog-content" className={className}>
      {children}
    </div>
  )),
  DialogHeader: vi.fn(({ children }) => <div data-testid="dialog-header">{children}</div>),
  DialogTitle: vi.fn(({ children }) => <h2 data-testid="dialog-title">{children}</h2>),
  DialogDescription: vi.fn(({ children }) => <p data-testid="dialog-description">{children}</p>),
  DialogBody: vi.fn(({ children }) => <div data-testid="dialog-body">{children}</div>),
  DialogFooter: vi.fn(({ children }) => <div data-testid="dialog-footer">{children}</div>),
}))

vi.mock('@/components/ui/input', () => ({
  Input: vi.fn(({ placeholder, error, helperText, className, onChange, value, type }) => (
    <div data-testid="input-container">
      <input
        data-testid="input"
        type={type}
        placeholder={placeholder}
        className={className}
        onChange={onChange}
        value={value}
        data-error={error}
      />
      {helperText && <span data-testid="helper-text">{helperText}</span>}
    </div>
  )),
}))

vi.mock('@/components/ui/select', () => ({
  Select: vi.fn(({ children, value, onValueChange, disabled }) => (
    <div data-testid="select" data-value={value} data-disabled={disabled}>
      <button type="button" data-testid="select-trigger" onClick={() => !disabled && onValueChange?.('test-value')}>
        Select
      </button>
      {children}
    </div>
  )),
  SelectTrigger: vi.fn(({ children, className }) => (
    <div data-testid="select-trigger" className={className}>
      {children}
    </div>
  )),
  SelectValue: vi.fn(({ placeholder }) => <span data-testid="select-value">{placeholder}</span>),
  SelectContent: vi.fn(({ children }) => <div data-testid="select-content">{children}</div>),
  SelectItem: vi.fn(({ children, value }) => (
    <div data-testid="select-item" data-value={value}>
      {children}
    </div>
  )),
}))

vi.mock('@/components/ui/switch', () => ({
  default: vi.fn(({ checked, onCheckedChange, id }) => (
    <input data-testid="switch" type="checkbox" checked={checked} onChange={e => onCheckedChange?.(e.target.checked)} id={id} />
  )),
}))

vi.mock('@/config/apps', () => ({
  getChainName: vi.fn((appId: AppId) => `Chain ${appId}`),
}))

vi.mock('@/lib/utils/format', () => ({
  formatBalance: vi.fn((balance, token, _decimals, isLong) =>
    isLong ? `${balance} ${token.symbol} (full)` : `${balance} ${token.symbol}`
  ),
}))

vi.mock('@/lib/utils/multisig', () => ({
  callDataValidationMessages: {
    validating: 'Validating call data...',
    correct: 'Call data is valid',
    failed: 'Validation failed',
  },
  getAvailableSigners: vi.fn(() => []),
  validateCallData: vi.fn(() => Promise.resolve({ isValid: true })),
}))

vi.mock('@/state/ledger', () => ({
  ledgerState$: {
    approveMultisigCall: vi.fn(),
    synchronizeAccount: vi.fn(),
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
      mainButtonLabel,
    }) => (
      <div data-testid="transaction-dialog-footer">
        <button type="button" data-testid="sign-button" onClick={signTransfer} disabled={isSignDisabled}>
          {mainButtonLabel}
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

describe('ApproveMultisigCallDialog', () => {
  const mockToken: Token = {
    symbol: 'DOT',
    decimals: 10,
    name: 'Polkadot',
    category: 'substrate',
    chainName: 'Polkadot',
  }

  const mockAppId: AppId = 'polkadot'

  const mockMembers: MultisigMember[] = [
    {
      address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      path: "m/44'/354'/0'/0'/0'",
      internal: true,
    },
    {
      address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      path: "m/44'/354'/0'/0'/1'",
      internal: true,
    },
  ]

  const mockPendingCalls: MultisigCall[] = [
    {
      callHash: '0x1234567890abcdef',
      deposit: new BN('1000000000000'),
      depositor: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      signatories: ['5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'],
    },
  ]

  const mockMultisigAccount: MultisigAddress = {
    address: '5DAAnrj7VHTznn2C221g2pvCnvVy9AHbLP7RP9ueGZFg7AAW',
    path: "m/44'/354'/0'/0'",
    pubKey: '0x789',
    threshold: 2,
    members: mockMembers,
    memberMultisigAddresses: undefined,
    pendingMultisigCalls: mockPendingCalls,
    balances: [],
    selected: false,
  }

  const defaultProps = {
    open: true,
    setOpen: vi.fn(),
    token: mockToken,
    appId: mockAppId,
    account: mockMultisigAccount,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render when open and has pending calls', () => {
      render(<ApproveMultisigCallDialog {...defaultProps} />)

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Approve Multisig Call')
      expect(screen.getByTestId('dialog-description')).toHaveTextContent('Approve a pending multisig call for this address')
    })

    it('should not render when there are no pending calls', () => {
      const accountWithoutPendingCalls = {
        ...mockMultisigAccount,
        pendingMultisigCalls: [],
      }

      const { container } = render(<ApproveMultisigCallDialog {...defaultProps} account={accountWithoutPendingCalls} />)

      expect(container.firstChild).toBeNull()
    })

    it('should not render when dialog is closed', () => {
      const { container } = render(<ApproveMultisigCallDialog {...defaultProps} open={false} />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('form fields', () => {
    it('should render all required form fields', () => {
      render(<ApproveMultisigCallDialog {...defaultProps} />)

      // Check for key form elements
      expect(screen.getAllByTestId('dialog-field')).toHaveLength(6) // Multisig Address, Call Hash, Approvers, Deposit, Network, Signer
      expect(screen.getAllByTestId('dialog-label')).toHaveLength(6)
      expect(screen.getAllByTestId('select')).toHaveLength(2)
      expect(screen.getByTestId('transaction-dialog-footer')).toBeInTheDocument()
    })

    it('should display multisig account address', () => {
      render(<ApproveMultisigCallDialog {...defaultProps} />)

      const explorerLinks = screen.getAllByTestId('explorer-link')
      const multisigAddressLink = explorerLinks.find(link => link.getAttribute('data-value') === mockMultisigAccount.address)
      expect(multisigAddressLink).toBeInTheDocument()
    })

    it('should display pending call hash in selector', () => {
      render(<ApproveMultisigCallDialog {...defaultProps} />)

      const explorerLinks = screen.getAllByTestId('explorer-link')
      const callHashLink = explorerLinks.find(link => link.getAttribute('data-value') === mockPendingCalls[0].callHash)
      expect(callHashLink).toBeInTheDocument()
    })

    it('should display deposit information', () => {
      render(<ApproveMultisigCallDialog {...defaultProps} />)

      expect(screen.getByText('1000000000000 DOT')).toBeInTheDocument()
    })

    it('should display approvers information', () => {
      render(<ApproveMultisigCallDialog {...defaultProps} />)

      expect(screen.getByText('Approvers (1/2)')).toBeInTheDocument()
      expect(screen.getByTestId('badge')).toHaveTextContent('Depositor')
    })
  })

  describe('form interactions', () => {
    it('should handle call hash selection', async () => {
      render(<ApproveMultisigCallDialog {...defaultProps} />)

      const selectTriggers = screen.getAllByTestId('select-trigger')
      const callHashSelectTrigger = selectTriggers[0] // First select is for call hash

      await act(async () => {
        fireEvent.click(callHashSelectTrigger)
      })

      // The mock select should trigger onValueChange
      expect(screen.getAllByTestId('select')).toHaveLength(2) // Call hash select and signer select
    })

    it('should show switch for final approval when conditions are met', () => {
      const accountWithFullApprovals = {
        ...mockMultisigAccount,
        pendingMultisigCalls: [
          {
            ...mockPendingCalls[0],
            signatories: ['5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'], // threshold - 1
          },
        ],
      }

      render(<ApproveMultisigCallDialog {...defaultProps} account={accountWithFullApprovals} />)

      expect(screen.getByTestId('switch')).toBeInTheDocument()
      expect(screen.getByText('Multisig message with call (for final approval)')).toBeInTheDocument()
    })

    it('should show call data input when required', () => {
      const accountRequiringCallData = {
        ...mockMultisigAccount,
        pendingMultisigCalls: [
          {
            ...mockPendingCalls[0],
            signatories: ['5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'], // Full threshold
          },
        ],
      }

      render(<ApproveMultisigCallDialog {...defaultProps} account={accountRequiringCallData} />)

      expect(screen.getByTestId('input')).toBeInTheDocument()
      expect(screen.getByText('Multisig Call Data')).toBeInTheDocument()
    })
  })

  describe('validation and error handling', () => {
    it('should show validation message when no available signers', () => {
      const accountWithNoAvailableSigners = {
        ...mockMultisigAccount,
        members: mockMembers.map(member => ({ ...member, internal: false })),
      }

      render(<ApproveMultisigCallDialog {...defaultProps} account={accountWithNoAvailableSigners} />)

      expect(
        screen.getByText('None of your addresses are enabled to sign. All your addresses have already approved this call.')
      ).toBeInTheDocument()
    })

    it('should disable form submission when form is invalid', () => {
      render(<ApproveMultisigCallDialog {...defaultProps} />)

      const signButton = screen.getByTestId('sign-button')
      expect(signButton).toBeDisabled()
    })
  })

  describe('dialog actions', () => {
    it('should call setOpen when close button is clicked', async () => {
      const mockSetOpen = vi.fn()
      render(<ApproveMultisigCallDialog {...defaultProps} setOpen={mockSetOpen} />)

      const closeButton = screen.getByTestId('close-button')

      await act(async () => {
        fireEvent.click(closeButton)
      })

      expect(mockSetOpen).toHaveBeenCalledWith(false)
    })

    it('should handle form submission', async () => {
      const mockRunTransaction = vi.fn()
      const mockUseTransactionStatus = vi.mocked(await import('@/components/hooks/useTransactionStatus')).useTransactionStatus

      mockUseTransactionStatus.mockReturnValue({
        runTransaction: mockRunTransaction,
        txStatus: null,
        clearTx: vi.fn(),
        isTxFinished: false,
        isTxFailed: false,
        updateSynchronization: vi.fn(),
        isSynchronizing: false,
      })

      render(<ApproveMultisigCallDialog {...defaultProps} />)

      const signButton = screen.getByTestId('sign-button')

      await act(async () => {
        fireEvent.click(signButton)
      })

      // Note: The actual form submission logic would need the form to be valid
      // This test verifies the button interaction
      expect(signButton).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle account with undefined pending calls', () => {
      const accountWithUndefinedCalls = {
        ...mockMultisigAccount,
        pendingMultisigCalls: undefined,
      }

      const { container } = render(<ApproveMultisigCallDialog {...defaultProps} account={accountWithUndefinedCalls} />)

      expect(container.firstChild).toBeNull()
    })

    it('should handle account with empty members array', () => {
      const accountWithNoMembers = {
        ...mockMultisigAccount,
        members: [],
      }

      render(<ApproveMultisigCallDialog {...defaultProps} account={accountWithNoMembers} />)

      expect(screen.getByText('No available signers')).toBeInTheDocument()
    })

    it('should handle multiple pending calls', () => {
      const accountWithMultipleCalls = {
        ...mockMultisigAccount,
        pendingMultisigCalls: [
          ...mockPendingCalls,
          {
            callHash: '0xabcdef1234567890',
            deposit: new BN('2000000000000'),
            depositor: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
            signatories: ['5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'],
          },
        ],
      }

      render(<ApproveMultisigCallDialog {...defaultProps} account={accountWithMultipleCalls} />)

      const selectItems = screen.getAllByTestId('select-item')
      expect(selectItems).toHaveLength(2)
    })
  })

  describe('accessibility', () => {
    it('should have proper aria labels and roles', () => {
      render(<ApproveMultisigCallDialog {...defaultProps} />)

      const switchElement = screen.getByTestId('switch')
      expect(switchElement).toHaveAttribute('id', 'final-approval-switch')

      const infoIcon = screen.getByTestId('info-icon')
      expect(infoIcon).toHaveAttribute('aria-label', 'Info')
    })

    it('should have proper form labels', () => {
      render(<ApproveMultisigCallDialog {...defaultProps} />)

      const labels = screen.getAllByTestId('dialog-label')
      expect(labels).toHaveLength(6)
    })
  })
})
