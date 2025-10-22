import type { BN } from '@polkadot/util'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TEST_ADDRESSES } from '@/tests/fixtures/addresses'
import { TEST_AMOUNTS } from '@/tests/fixtures/balances'

// Mock all external dependencies
vi.mock('@legendapp/state/react', () => ({
  observer: (component: any) => component,
}))

vi.mock('lucide-react', () => ({
  AlertCircle: () => null,
  AlertTriangle: () => null,
  Banknote: () => null,
  BanknoteArrowDown: () => null,
  Check: () => null,
  CheckCircle: () => null,
  Clock: () => null,
  Group: () => null,
  Hash: () => null,
  Info: () => null,
  KeyRound: () => null,
  LockOpen: () => null,
  Route: () => null,
  Send: () => null,
  Shield: () => null,
  Trash2: () => null,
  User: () => null,
  UserCog: () => null,
  Users: () => null,
  Vote: () => null,
  X: () => null,
}))

vi.mock('@/components/CustomTooltip', () => ({
  CustomTooltip: ({ children }: any) => children,
  TooltipBody: () => null,
}))

vi.mock('@/components/ExplorerLink', () => ({
  ExplorerLink: ({ value }: any) => <span>{value}</span>,
}))

vi.mock('@/components/hooks/useMigration', () => ({
  useMigration: () => ({
    toggleAccountSelection: vi.fn(),
  }),
}))

vi.mock('@/components/icons', () => ({
  Spinner: () => <span>Loading...</span>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: any) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange }: any) => (
    <input type="checkbox" checked={checked} onChange={e => onCheckedChange(e.target.checked)} />
  ),
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => <span>Select value</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/components/ui/table', () => ({
  TableCell: ({ children, rowSpan }: any) => <td rowSpan={rowSpan}>{children}</td>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
}))

vi.mock('@/lib/utils', () => ({
  formatBalance: (balance: BN, token: any) => `${balance.toString()} ${token.symbol}`,
  isMultisigAddress: (account: any) => account.isMultisig === true,
  hasBalance: () => true,
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
  PendingActionType: {
    UNSTAKE: 'unstake',
    WITHDRAW: 'withdraw',
    IDENTITY: 'identity',
    MULTISIG_CALL: 'multisig-call',
    MULTISIG_TRANSFER: 'multisig-transfer',
    ACCOUNT_INDEX: 'account-index',
    PROXY: 'proxy',
    GOVERNANCE: 'governance',
  },
  getPendingActions: ({ account, balance, isMultisigAddress }: any) => {
    const actions: any[] = []
    const isNative = balance?.type === 'native'

    // Add unstake action if has staked balance
    if (isNative && balance?.balance?.staking?.total?.gt(TEST_AMOUNTS.ZERO)) {
      actions.push({
        type: 'unstake' as any,
        label: 'Unstake',
        tooltip: 'Unlock your staked assets',
        disabled: balance?.canUnstake !== true,
      })
    }

    // Add withdraw action if has unlocking balance
    if (isNative && balance?.balance?.staking?.unlocking?.some((u: any) => u.canWithdraw)) {
      actions.push({
        type: 'withdraw' as any,
        label: 'Withdraw',
        tooltip: 'Move your unstaked assets to your available balance',
        disabled: false,
      })
    }

    // Add identity action if account has identity
    if (account.registration?.identity) {
      actions.push({
        type: 'identity' as any,
        label: 'Identity',
        tooltip: 'Remove account identity',
        disabled: !account.registration?.canRemove,
      })
    }

    // Add multisig call action if multisig has pending calls
    if (isMultisigAddress && account.pendingMultisigCalls?.length > 0) {
      actions.push({
        type: 'multisig-call' as any,
        label: 'Multisig Call',
        tooltip: 'Approve multisig pending calls',
        disabled: false,
        data: {
          hasRemainingInternalSigners: true,
          hasRemainingSigners: true,
          hasAvailableSigners: true,
        },
      })
    }

    // Add account index action if account has index
    if (account.index?.index) {
      actions.push({
        type: 'account-index' as any,
        label: 'Account Index',
        tooltip: 'Remove account index',
        disabled: false,
      })
    }

    // Add proxy action if account is proxied
    if (account.proxy?.proxies?.length > 0) {
      actions.push({
        type: 'proxy' as any,
        label: 'Proxy',
        tooltip: 'Remove proxy',
        disabled: false,
      })
    }

    return actions
  },
}))

vi.mock('@/lib/utils/balance', () => ({
  canUnstake: (balance: any) => balance?.canUnstake === true,
  hasStakedBalance: (balance: any) => balance?.balance?.staking?.total?.gt(TEST_AMOUNTS.ZERO) === true,
  isNativeBalance: (balance: any) => balance?.type === 'native',
}))

vi.mock('@/lib/utils/ui', () => ({
  getIdentityItems: () => [],
}))

vi.mock('../balance-hover-card', () => ({
  BalanceHoverCard: () => <div>BalanceHoverCard</div>,
  NativeBalanceHoverCard: () => <div>NativeBalanceHoverCard</div>,
}))

vi.mock('../destination-address-select', () => ({
  default: () => <div>DestinationAddressSelect</div>,
}))

// Mock all dialogs
vi.mock('../dialogs/approve-multisig-call-dialog', () => ({ default: () => null }))
vi.mock('../dialogs/remove-account-index-dialog', () => ({ default: () => null }))
vi.mock('../dialogs/remove-identity-dialog', () => ({ default: () => null }))
vi.mock('../dialogs/remove-proxy-dialog', () => ({ default: () => null }))
vi.mock('../dialogs/unstake-dialog', () => ({ default: () => null }))
vi.mock('../dialogs/withdraw-dialog', () => ({ default: () => null }))

import SynchronizedAccountRow from '../synchronized-account-row'

const mockToken = {
  symbol: 'DOT',
  decimals: 10,
  name: 'Polkadot',
  category: 'substrate' as const,
  chainName: 'Polkadot',
}

const mockAccount = {
  address: TEST_ADDRESSES.ALICE,
  path: "m/44'/354'/0'/0/0",
  pubKey: '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d',
  selected: false,
}

const mockNativeBalance = {
  type: 'native',
  balance: {
    total: TEST_AMOUNTS.HUNDRED_DOT.clone(),
    transferable: TEST_AMOUNTS.HUNDRED_DOT.clone().divn(2), // 50 DOT
    reserved: {
      total: TEST_AMOUNTS.HUNDRED_DOT.clone().divn(5), // 20 DOT
    },
    staking: {
      total: TEST_AMOUNTS.HUNDRED_DOT.clone().muln(3).divn(10), // 30 DOT
      active: TEST_AMOUNTS.HUNDRED_DOT.clone().divn(5), // 20 DOT
      unlocking: [
        {
          amount: TEST_AMOUNTS.TEN_DOT.clone(),
          canWithdraw: true,
        },
      ],
    },
  },
  canUnstake: true,
  transaction: {
    destinationAddress: '',
    signatoryAddress: '',
  },
}

describe('SynchronizedAccountRow component', () => {
  const mockUpdateTransaction = vi.fn()
  const defaultProps = {
    account: mockAccount,
    accountIndex: 0,
    balance: mockNativeBalance,
    balanceIndex: 0,
    rowSpan: 1,
    token: mockToken,
    polkadotAddresses: [TEST_ADDRESSES.ADDRESS2],
    updateTransaction: mockUpdateTransaction,
    appId: 'polkadot' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render account row with basic information', () => {
    render(
      <table>
        <tbody>
          <SynchronizedAccountRow {...defaultProps} />
        </tbody>
      </table>
    )

    // Check for account address
    expect(screen.getByText(TEST_ADDRESSES.ALICE)).toBeInTheDocument()

    // Check for balance display
    expect(screen.getByText(`${TEST_AMOUNTS.HUNDRED_DOT.toString()} DOT`)).toBeInTheDocument() // Total
    expect(screen.getByText(`${TEST_AMOUNTS.HUNDRED_DOT.divn(2).toString()} DOT`)).toBeInTheDocument() // Transferable
  })

  it('should render checkbox for account selection', () => {
    render(
      <table>
        <tbody>
          <SynchronizedAccountRow {...defaultProps} />
        </tbody>
      </table>
    )

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).not.toBeChecked()
  })

  it('should show action buttons when balance has staking', () => {
    render(
      <table>
        <tbody>
          <SynchronizedAccountRow {...defaultProps} />
        </tbody>
      </table>
    )

    expect(screen.getByText('Unstake')).toBeInTheDocument()
    expect(screen.getByText('Withdraw')).toBeInTheDocument()
  })

  it('should render destination address select', () => {
    render(
      <table>
        <tbody>
          <SynchronizedAccountRow {...defaultProps} />
        </tbody>
      </table>
    )

    expect(screen.getByText('DestinationAddressSelect')).toBeInTheDocument()
  })

  it('should show ready to migrate when no actions available', () => {
    const balanceWithoutActions = {
      ...mockNativeBalance,
      balance: {
        ...mockNativeBalance.balance,
        staking: undefined,
      },
      canUnstake: false,
    }

    render(
      <table>
        <tbody>
          <SynchronizedAccountRow {...defaultProps} balance={balanceWithoutActions} />
        </tbody>
      </table>
    )

    expect(screen.getByText('Ready to migrate')).toBeInTheDocument()
  })

  it('should render without balance', () => {
    render(
      <table>
        <tbody>
          <SynchronizedAccountRow {...defaultProps} balance={undefined} balanceIndex={undefined} />
        </tbody>
      </table>
    )

    // Should show dashes for missing data
    const cells = screen.getAllByText('-')
    expect(cells.length).toBeGreaterThan(0)
  })

  it('should handle multisig accounts', () => {
    const multisigAccount = {
      ...mockAccount,
      isMultisig: true,
      threshold: 2,
      members: [{ address: TEST_ADDRESSES.ADDRESS3, internal: true }],
      pendingMultisigCalls: [],
    }

    render(
      <table>
        <tbody>
          <SynchronizedAccountRow {...defaultProps} account={multisigAccount} />
        </tbody>
      </table>
    )

    // Should render signatory address select
    expect(screen.getByText(TEST_ADDRESSES.ADDRESS3)).toBeInTheDocument()
  })

  it('should not render multisig with no internal members', () => {
    const multisigAccount = {
      ...mockAccount,
      isMultisig: true,
      members: [{ address: TEST_ADDRESSES.ADDRESS3, internal: false }],
      pendingMultisigCalls: [],
    }

    const { container } = render(<SynchronizedAccountRow {...defaultProps} account={multisigAccount} />)

    expect(container.firstChild).toBeNull()
  })

  it('should show loading state', () => {
    const loadingAccount = {
      ...mockAccount,
      isLoading: true,
    }

    render(
      <table>
        <tbody>
          <SynchronizedAccountRow {...defaultProps} account={loadingAccount} />
        </tbody>
      </table>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})
