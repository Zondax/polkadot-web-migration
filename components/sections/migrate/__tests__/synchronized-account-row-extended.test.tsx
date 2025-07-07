import type { BN } from '@polkadot/util'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TEST_ADDRESSES } from '@/tests/fixtures/addresses'
import { TEST_AMOUNTS } from '@/tests/fixtures/balances'

// Mock all external dependencies
vi.mock('@legendapp/state/react', () => ({
  observer: (component: any) => component,
}))

vi.mock('lucide-react', () => ({
  AlertCircle: ({ className }: any) => <div data-testid="alert-circle" className={className}>!</div>,
  Banknote: () => <div data-testid="banknote">💰</div>,
  BanknoteArrowDown: () => <div data-testid="banknote-arrow-down">💰⬇</div>,
  Check: () => <div data-testid="check">✓</div>,
  Group: () => <div data-testid="group">👥</div>,
  Hash: () => <div data-testid="hash">#</div>,
  Info: () => <div data-testid="info">ℹ</div>,
  KeyRound: () => <div data-testid="key-round">🔑</div>,
  LockOpen: () => <div data-testid="lock-open">🔓</div>,
  Route: () => <div data-testid="route">🛣</div>,
  Shield: () => <div data-testid="shield">🛡</div>,
  Trash2: () => <div data-testid="trash2">🗑</div>,
  User: () => <div data-testid="user">👤</div>,
  UserCog: ({ className }: any) => <div data-testid="user-cog" className={className}>👤⚙</div>,
  Users: () => <div data-testid="users">👥</div>,
  X: () => <div data-testid="x">✕</div>,
}))

vi.mock('@/components/CustomTooltip', () => ({
  CustomTooltip: ({ children, tooltipBody }: any) => (
    <div data-testid="tooltip" data-tooltip={typeof tooltipBody === 'string' ? tooltipBody : 'complex-tooltip'}>
      {children}
    </div>
  ),
  TooltipBody: ({ items }: any) => (
    <div data-testid="tooltip-body">
      {items?.map((item: any, idx: number) => (
        <div key={idx} data-testid={`tooltip-item-${idx}`}>
          {item.label}: {typeof item.value === 'string' ? item.value : 'component'}
        </div>
      ))}
    </div>
  ),
}))

vi.mock('@/components/ExplorerLink', () => ({
  ExplorerLink: ({ value, hasCopyButton }: any) => (
    <span data-testid="explorer-link" data-copy={hasCopyButton}>
      {value}
    </span>
  ),
}))

vi.mock('@/components/icons', () => ({
  Spinner: () => <span data-testid="spinner">Loading...</span>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size }: any) => (
    <button 
      type="button" 
      onClick={onClick} 
      disabled={disabled}
      data-testid="button"
      data-variant={variant}
      data-size={size}
    >
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange }: any) => (
    <input 
      type="checkbox" 
      checked={checked} 
      onChange={e => onCheckedChange?.(e.target.checked)}
      onClick={e => onCheckedChange?.(!checked)}
      data-testid="checkbox"
    />
  ),
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value} onClick={() => onValueChange?.('test-address')}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: any) => <span data-testid="select-value">{placeholder}</span>,
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-testid="select-item" data-value={value}>
      {children}
    </div>
  ),
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
}))

vi.mock('@/lib/utils/balance', () => ({
  canUnstake: (balance: any) => balance?.canUnstake === true,
  hasStakedBalance: (balance: any) => balance?.balance?.staking?.total?.gt(TEST_AMOUNTS.ZERO) === true,
  isNativeBalance: (balance: any) => balance?.type === 'native',
}))

vi.mock('@/lib/utils/ui', () => ({
  getIdentityItems: (registration: any) => registration?.identity ? [
    { label: 'Display Name', value: registration.identity.display, icon: 'User' }
  ] : [],
}))

vi.mock('../balance-hover-card', () => ({
  BalanceHoverCard: () => <div data-testid="balance-hover-card">BalanceHoverCard</div>,
  NativeBalanceHoverCard: () => <div data-testid="native-balance-hover-card">NativeBalanceHoverCard</div>,
}))

vi.mock('../destination-address-select', () => ({
  default: ({ onDestinationChange }: any) => (
    <div 
      data-testid="destination-address-select"
      onClick={() => onDestinationChange?.('new-destination')}
    >
      DestinationAddressSelect
    </div>
  ),
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
    transferable: TEST_AMOUNTS.HUNDRED_DOT.clone().divn(2),
    reserved: {
      total: TEST_AMOUNTS.HUNDRED_DOT.clone().divn(5),
    },
    staking: {
      total: TEST_AMOUNTS.HUNDRED_DOT.clone().muln(3).divn(10),
      active: TEST_AMOUNTS.HUNDRED_DOT.clone().divn(5),
      unlocking: [],
    },
  },
  canUnstake: true,
  transaction: {
    destinationAddress: '',
    signatoryAddress: '',
  },
}

describe('SynchronizedAccountRow Extended Tests', () => {
  const mockUpdateTransaction = vi.fn()
  const mockToggleAccountSelection = vi.fn()
  
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
    toggleAccountSelection: mockToggleAccountSelection,
    isSelected: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Proxy functionality', () => {
    it('should render proxy action button and icon when account is proxied', () => {
      const proxiedAccount = {
        ...mockAccount,
        proxy: {
          proxies: [
            { address: TEST_ADDRESSES.ADDRESS2 },
            { address: TEST_ADDRESSES.ADDRESS3 },
          ],
          deposit: TEST_AMOUNTS.TEN_DOT.clone(),
        },
      }

      render(
        <table>
          <tbody>
            <SynchronizedAccountRow {...defaultProps} account={proxiedAccount} />
          </tbody>
        </table>
      )

      // Should show proxy action button
      expect(screen.getByText('Proxy')).toBeInTheDocument()
      
      // Should show proxy icon with correct styling
      const proxyIcon = screen.getByTestId('user-cog')
      expect(proxyIcon).toBeInTheDocument()
      expect(proxyIcon).toHaveClass('text-polkadot-pink')
    })

    it('should render proxy tooltip with correct information', () => {
      const proxiedAccount = {
        ...mockAccount,
        proxy: {
          proxies: [
            { address: TEST_ADDRESSES.ADDRESS2 },
            { address: TEST_ADDRESSES.ADDRESS3 },
          ],
          deposit: TEST_AMOUNTS.TEN_DOT.clone(),
        },
      }

      render(
        <table>
          <tbody>
            <SynchronizedAccountRow {...defaultProps} account={proxiedAccount} />
          </tbody>
        </table>
      )

      // Check that tooltips are rendered (proxy functionality creates complex tooltips)
      const tooltips = screen.getAllByTestId('tooltip')
      expect(tooltips.length).toBeGreaterThan(0)
    })
  })

  describe('Multisig member functionality', () => {
    it('should render multisig member tooltip when account is member of multisig', () => {
      const multisigMemberAccount = {
        ...mockAccount,
        memberMultisigAddresses: [TEST_ADDRESSES.ADDRESS3],
      }

      render(
        <table>
          <tbody>
            <SynchronizedAccountRow {...defaultProps} account={multisigMemberAccount} />
          </tbody>
        </table>
      )

      // Should show group icon
      expect(screen.getByTestId('group')).toBeInTheDocument()

      // Check that tooltips are rendered for multisig functionality
      const tooltips = screen.getAllByTestId('tooltip')
      expect(tooltips.length).toBeGreaterThan(0)
    })

    it('should render multisig address tooltip when account is multisig', () => {
      const multisigAccount = {
        ...mockAccount,
        isMultisig: true,
        threshold: 2,
        members: [
          { address: TEST_ADDRESSES.ADDRESS2, internal: true },
          { address: TEST_ADDRESSES.ADDRESS3, internal: false },
        ],
        pendingMultisigCalls: [],
      }

      render(
        <table>
          <tbody>
            <SynchronizedAccountRow {...defaultProps} account={multisigAccount} />
          </tbody>
        </table>
      )

      // Check that multisig functionality renders tooltips and signatory address
      expect(screen.getByTestId('group')).toBeInTheDocument()
      expect(screen.getAllByTestId('explorer-link')).toHaveLength(2) // Account address + signatory
    })
  })

  describe('Error handling', () => {
    it('should render error icon and tooltip when account has error', () => {
      const accountWithError = {
        ...mockAccount,
        error: {
          description: 'Failed to load account balance',
        },
      }

      render(
        <table>
          <tbody>
            <SynchronizedAccountRow {...defaultProps} account={accountWithError} />
          </tbody>
        </table>
      )

      // Should show error icon
      const errorIcon = screen.getByTestId('alert-circle')
      expect(errorIcon).toBeInTheDocument()
      expect(errorIcon).toHaveClass('text-destructive')

      // Check for error tooltip
      const tooltips = screen.getAllByTestId('tooltip')
      const errorTooltip = tooltips.find(tooltip => {
        const tooltipData = tooltip.getAttribute('data-tooltip')
        return tooltipData && tooltipData.includes('Failed to load account balance')
      })
      
      expect(errorTooltip).toBeInTheDocument()
    })
  })

  describe('Identity functionality', () => {
    it('should render identity icon and tooltip when account has identity', () => {
      const accountWithIdentity = {
        ...mockAccount,
        registration: {
          identity: {
            display: 'Alice Smith',
          },
          canRemove: true,
        },
      }

      render(
        <table>
          <tbody>
            <SynchronizedAccountRow {...defaultProps} account={accountWithIdentity} />
          </tbody>
        </table>
      )

      // Should show identity icon
      expect(screen.getByTestId('user')).toBeInTheDocument()
      
      // Should show identity action button
      expect(screen.getByText('Identity')).toBeInTheDocument()
    })
  })

  describe('Account index functionality', () => {
    it('should render account index action when account has index', () => {
      const accountWithIndex = {
        ...mockAccount,
        index: {
          index: 42,
        },
      }

      render(
        <table>
          <tbody>
            <SynchronizedAccountRow {...defaultProps} account={accountWithIndex} />
          </tbody>
        </table>
      )

      // Should show account index action button
      expect(screen.getByText('Account Index')).toBeInTheDocument()
    })
  })

  describe('Multisig calls functionality', () => {
    it('should render multisig call action when multisig has pending calls', () => {
      const multisigWithCalls = {
        ...mockAccount,
        isMultisig: true,
        members: [{ address: TEST_ADDRESSES.ADDRESS2, internal: true }],
        pendingMultisigCalls: [{ id: 'call1' }, { id: 'call2' }],
      }

      render(
        <table>
          <tbody>
            <SynchronizedAccountRow {...defaultProps} account={multisigWithCalls} />
          </tbody>
        </table>
      )

      // Should show multisig call action button
      expect(screen.getByText('Multisig Call')).toBeInTheDocument()
    })
  })

  describe('Interaction functionality', () => {
    it('should call updateTransaction when destination address changes', () => {
      render(
        <table>
          <tbody>
            <SynchronizedAccountRow {...defaultProps} />
          </tbody>
        </table>
      )

      // Click on destination address select to trigger callback
      const destinationSelect = screen.getByTestId('destination-address-select')
      fireEvent.click(destinationSelect)

      expect(mockUpdateTransaction).toHaveBeenCalledWith(
        { destinationAddress: 'new-destination' },
        'polkadot',
        0,
        0,
        false
      )
    })

    it('should call toggleAccountSelection when checkbox changes', () => {
      render(
        <table>
          <tbody>
            <SynchronizedAccountRow {...defaultProps} />
          </tbody>
        </table>
      )

      // Click checkbox to trigger callback
      const checkbox = screen.getByTestId('checkbox')
      fireEvent.click(checkbox)

      expect(mockToggleAccountSelection).toHaveBeenCalledWith(
        'polkadot',
        TEST_ADDRESSES.ALICE,
        true
      )
    })
  })

  describe('Multiple internal multisig members', () => {
    it('should render select dropdown for multiple internal multisig members', () => {
      const multisigWithMultipleMembers = {
        ...mockAccount,
        isMultisig: true,
        members: [
          { address: TEST_ADDRESSES.ADDRESS2, internal: true },
          { address: TEST_ADDRESSES.ADDRESS3, internal: true },
          { address: TEST_ADDRESSES.BOB, internal: false },
        ],
        pendingMultisigCalls: [],
      }

      render(
        <table>
          <tbody>
            <SynchronizedAccountRow {...defaultProps} account={multisigWithMultipleMembers} />
          </tbody>
        </table>
      )

      // Should show select for multiple internal members
      expect(screen.getByTestId('select')).toBeInTheDocument()
      expect(screen.getByTestId('select-value')).toBeInTheDocument()
    })

    it('should update signatory address when multisig select changes', () => {
      const multisigWithMultipleMembers = {
        ...mockAccount,
        isMultisig: true,
        members: [
          { address: TEST_ADDRESSES.ADDRESS2, internal: true },
          { address: TEST_ADDRESSES.ADDRESS3, internal: true },
        ],
        pendingMultisigCalls: [],
      }

      render(
        <table>
          <tbody>
            <SynchronizedAccountRow {...defaultProps} account={multisigWithMultipleMembers} />
          </tbody>
        </table>
      )

      // Click on select to trigger callback
      const select = screen.getByTestId('select')
      fireEvent.click(select)

      expect(mockUpdateTransaction).toHaveBeenCalledWith(
        { signatoryAddress: 'test-address' },
        'polkadot',
        0,
        0,
        true
      )
    })
  })

  describe('Edge cases', () => {
    it('should handle account with no balance gracefully', () => {
      render(
        <table>
          <tbody>
            <SynchronizedAccountRow 
              {...defaultProps} 
              balance={undefined} 
              balanceIndex={undefined} 
            />
          </tbody>
        </table>
      )

      // Should show dashes for missing data
      const cells = screen.getAllByText('-')
      expect(cells.length).toBeGreaterThan(0)
    })

    it('should handle non-native balance types', () => {
      const nftBalance = {
        type: 'nft',
        balance: {
          total: TEST_AMOUNTS.HUNDRED_DOT.clone(),
        },
        transaction: {
          destinationAddress: '',
          signatoryAddress: '',
        },
      }

      render(
        <table>
          <tbody>
            <SynchronizedAccountRow {...defaultProps} balance={nftBalance} />
          </tbody>
        </table>
      )

      // Should render without crashing for non-native balances
      expect(screen.getByTestId('destination-address-select')).toBeInTheDocument()
    })

    it('should handle single internal multisig member with signatory address', () => {
      const singleMemberMultisig = {
        ...mockAccount,
        isMultisig: true,
        members: [{ address: TEST_ADDRESSES.ADDRESS2, internal: true }],
        pendingMultisigCalls: [],
      }

      const balanceWithSignatory = {
        ...mockNativeBalance,
        transaction: {
          destinationAddress: '',
          signatoryAddress: TEST_ADDRESSES.ADDRESS2,
        },
      }

      render(
        <table>
          <tbody>
            <SynchronizedAccountRow 
              {...defaultProps} 
              account={singleMemberMultisig} 
              balance={balanceWithSignatory}
            />
          </tbody>
        </table>
      )

      // Should render signatory address directly (not as select)
      const explorerLinks = screen.getAllByTestId('explorer-link')
      expect(explorerLinks.some(link => 
        link.textContent === TEST_ADDRESSES.ADDRESS2
      )).toBe(true)
    })

    it('should handle account without proxy when none configured', () => {
      const accountWithoutProxy = {
        ...mockAccount,
        proxy: undefined,
      }

      render(
        <table>
          <tbody>
            <SynchronizedAccountRow {...defaultProps} account={accountWithoutProxy} />
          </tbody>
        </table>
      )

      // Should not show proxy icon
      expect(screen.queryByTestId('user-cog')).not.toBeInTheDocument()
    })
  })
})