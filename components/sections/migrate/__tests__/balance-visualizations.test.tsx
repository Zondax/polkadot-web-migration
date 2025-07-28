import type { BN } from '@polkadot/util'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Native } from '@/state/types/ledger'
import { TEST_AMOUNTS } from '@/tests/fixtures/balances'

// Mock dependencies
vi.mock('@/components/ExplorerLink', () => ({
  ExplorerLink: ({ value, disableLink, disableTooltip, truncate, size }: any) => (
    <div
      data-testid="explorer-link"
      data-value={value}
      data-disable-link={disableLink}
      data-disable-tooltip={disableTooltip}
      data-truncate={truncate}
      data-size={size}
    >
      {value}
    </div>
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <div data-testid="badge" data-variant={variant} className={className}>
      {children}
    </div>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
}))

vi.mock('@/lib/utils', () => ({
  formatBalance: (value: BN, token: any, _decimals?: number, showSymbol?: boolean) => {
    if (!value) return '0'
    const amount = value.toString()
    const symbol = showSymbol && token?.symbol ? ` ${token.symbol}` : ''
    return `${amount}${symbol}`
  },
}))

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  ArrowRightLeftIcon: ({ className }: any) => <div data-testid="arrow-right-left-icon" className={className} />,
  BarChartIcon: ({ className }: any) => <div data-testid="bar-chart-icon" className={className} />,
  Check: ({ className }: any) => <div data-testid="check-icon" className={className} />,
  ClockIcon: ({ className }: any) => <div data-testid="clock-icon" className={className} />,
  Group: ({ className }: any) => <div data-testid="group-icon" className={className} />,
  Hash: ({ className }: any) => <div data-testid="hash-icon" className={className} />,
  LockOpenIcon: ({ className }: any) => <div data-testid="lock-open-icon" className={className} />,
  User: ({ className }: any) => <div data-testid="user-icon" className={className} />,
  UserCog: ({ className }: any) => <div data-testid="user-cog-icon" className={className} />,
}))

// Mock Radix UI icons
vi.mock('@radix-ui/react-icons', () => ({
  LockClosedIcon: ({ className }: any) => <div data-testid="lock-closed-icon" className={className} />,
}))

import { BalanceType, NativeBalanceVisualization } from '../balance-visualizations'

describe('NativeBalanceVisualization component', () => {
  const mockToken = {
    symbol: 'DOT',
    decimals: 10,
    name: 'Polkadot',
    category: 'substrate' as const,
    chainName: 'Polkadot',
  }

  const createMockNative = (overrides: Partial<Native> = {}): Native => ({
    total: TEST_AMOUNTS.HUNDRED_DOT.clone(),
    transferable: TEST_AMOUNTS.HUNDRED_DOT.clone().muln(6).divn(10), // 60 DOT
    staking: {
      total: TEST_AMOUNTS.HUNDRED_DOT.clone().muln(3).divn(10), // 30 DOT
      active: TEST_AMOUNTS.HUNDRED_DOT.clone().muln(2).divn(10), // 20 DOT
      unlocking: [
        {
          era: 1000,
          value: TEST_AMOUNTS.HUNDRED_DOT.clone().divn(20), // 5 DOT
          canWithdraw: true,
          timeRemaining: 'Ready',
        },
        {
          era: 1001,
          value: TEST_AMOUNTS.HUNDRED_DOT.clone().divn(20), // 5 DOT
          canWithdraw: false,
          timeRemaining: '2 days',
        },
      ],
    },
    reserved: {
      total: TEST_AMOUNTS.TEN_DOT.clone(),
      proxy: {
        deposit: TEST_AMOUNTS.TEN_DOT.clone().divn(5), // 2 DOT
      },
      identity: {
        deposit: TEST_AMOUNTS.TEN_DOT.clone().muln(3).divn(10), // 3 DOT
      },
      index: {
        deposit: TEST_AMOUNTS.ONE_DOT.clone(),
      },
      multisig: {
        total: TEST_AMOUNTS.TEN_DOT.clone().muln(4).divn(10), // 4 DOT
        deposits: [
          {
            callHash: '0x1234567890abcdef',
            deposit: TEST_AMOUNTS.TEN_DOT.clone().muln(4).divn(10), // 4 DOT
          },
        ],
      },
    },
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render all three balance types by default', () => {
      const mockData = createMockNative()
      render(<NativeBalanceVisualization data={mockData} token={mockToken} appId="polkadot" />)

      expect(screen.getByText('Transferable')).toBeInTheDocument()
      expect(screen.getByText('Staked')).toBeInTheDocument()
      expect(screen.getByText('Reserved')).toBeInTheDocument()
    })

    it('should render with grid layout', () => {
      const mockData = createMockNative()
      const { container } = render(<NativeBalanceVisualization data={mockData} token={mockToken} appId="polkadot" />)

      const gridContainer = container.querySelector('.grid.grid-cols-1')
      expect(gridContainer).toBeInTheDocument()
      expect(gridContainer).toHaveClass('sm:grid-cols-4')
    })

    it('should render correct number of balance cards', () => {
      const mockData = createMockNative()
      render(<NativeBalanceVisualization data={mockData} token={mockToken} appId="polkadot" />)

      const cards = screen.getAllByTestId('card')
      expect(cards).toHaveLength(4)
    })
  })

  describe('balance type filtering', () => {
    it('should render only transferable when types filter is applied', () => {
      const mockData = createMockNative()
      render(<NativeBalanceVisualization data={mockData} token={mockToken} appId="polkadot" types={[BalanceType.Transferable]} />)

      expect(screen.getByText('Transferable')).toBeInTheDocument()
      expect(screen.queryByText('Staked')).not.toBeInTheDocument()
      expect(screen.queryByText('Reserved')).not.toBeInTheDocument()

      const cards = screen.getAllByTestId('card')
      expect(cards).toHaveLength(1)
    })

    it('should render only staking and reserved when filtered', () => {
      const mockData = createMockNative()
      render(
        <NativeBalanceVisualization
          data={mockData}
          token={mockToken}
          appId="polkadot"
          types={[BalanceType.Staking, BalanceType.Reserved]}
        />
      )

      expect(screen.queryByText('Transferable')).not.toBeInTheDocument()
      expect(screen.getByText('Staked')).toBeInTheDocument()
      expect(screen.getByText('Reserved')).toBeInTheDocument()

      const cards = screen.getAllByTestId('card')
      expect(cards).toHaveLength(2)
    })

    it('should adjust grid columns based on filtered types', () => {
      const mockData = createMockNative()
      const { container } = render(
        <NativeBalanceVisualization
          data={mockData}
          token={mockToken}
          appId="polkadot"
          types={[BalanceType.Transferable, BalanceType.Staking]}
        />
      )

      const gridContainer = container.querySelector('.grid.grid-cols-1')
      expect(gridContainer).toHaveClass('sm:grid-cols-2')
    })
  })

  describe('transferable balance card', () => {
    it('should render transferable card with correct icon and styling', () => {
      const mockData = createMockNative()
      render(<NativeBalanceVisualization data={mockData} token={mockToken} appId="polkadot" />)

      expect(screen.getByTestId('arrow-right-left-icon')).toBeInTheDocument()
      expect(screen.getByText('Transferable')).toBeInTheDocument()
      expect(screen.getByText('600000000000 DOT')).toBeInTheDocument()
    })

    it('should display correct percentage for transferable', () => {
      const mockData = createMockNative()
      render(<NativeBalanceVisualization data={mockData} token={mockToken} appId="polkadot" />)

      const badges = screen.getAllByTestId('badge')
      expect(badges).toHaveLength(4)
      // Check that badges contain percentage values
      const badgeTexts = badges.map(badge => badge.textContent)
      expect(badgeTexts.some(text => text?.includes('%'))).toBe(true)
    })
  })

  describe('staking balance card', () => {
    it('should render staking card with correct icon and amount', () => {
      const mockData = createMockNative()
      render(<NativeBalanceVisualization data={mockData} token={mockToken} appId="polkadot" />)

      const barChartIcons = screen.getAllByTestId('bar-chart-icon')
      expect(barChartIcons.length).toBeGreaterThan(0)
      expect(screen.getByText('Staked')).toBeInTheDocument()
      expect(screen.getByText('300000000000 DOT')).toBeInTheDocument()
    })

    it('should render staking details when staking data exists', () => {
      const mockData = createMockNative()
      render(<NativeBalanceVisualization data={mockData} token={mockToken} appId="polkadot" />)

      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getAllByText('200000000000 DOT')).toHaveLength(1)
      expect(screen.getByText('Unlocking')).toBeInTheDocument()
      expect(screen.getAllByText('100000000000 DOT')).toHaveLength(2) // One for reserved, one for unlocking
    })

    it('should render ready to withdraw section', () => {
      const mockData = createMockNative()
      render(<NativeBalanceVisualization data={mockData} token={mockToken} appId="polkadot" />)

      expect(screen.getByText('Ready to withdraw')).toBeInTheDocument()
      expect(screen.getByTestId('check-icon')).toBeInTheDocument()
      expect(screen.getAllByText('50000000000 DOT')).toHaveLength(2) // Two unlocking amounts of the same value
    })

    it('should render time remaining for unlocking funds', () => {
      const mockData = createMockNative()
      render(<NativeBalanceVisualization data={mockData} token={mockToken} appId="polkadot" />)

      expect(screen.getByText('2 days')).toBeInTheDocument()
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument()
    })

    it('should handle zero staking balance', () => {
      const mockData = createMockNative({
        staking: {
          total: TEST_AMOUNTS.ZERO,
          active: TEST_AMOUNTS.ZERO,
          unlocking: [],
          canUnstake: false,
        },
      })
      render(<NativeBalanceVisualization data={mockData} token={mockToken} appId="polkadot" />)

      const zeroBalances = screen.getAllByText('0 DOT')
      expect(zeroBalances.length).toBeGreaterThan(0)
    })

    it('should handle missing staking data', () => {
      const mockData = createMockNative({
        staking: undefined,
      })
      render(<NativeBalanceVisualization data={mockData} token={mockToken} appId="polkadot" />)

      expect(screen.getByText('Staked')).toBeInTheDocument()
      expect(screen.queryByText('Active')).not.toBeInTheDocument()
    })
  })

  describe('reserved balance card', () => {
    it('should render reserved card with correct icon and amount', () => {
      const mockData = createMockNative()
      render(<NativeBalanceVisualization data={mockData} token={mockToken} appId="polkadot" />)

      const lockIcons = screen.getAllByTestId('lock-closed-icon')
      expect(lockIcons.length).toBeGreaterThan(0)
      expect(screen.getByText('Reserved')).toBeInTheDocument()
      expect(screen.getAllByText('100000000000 DOT')).toHaveLength(2) // Reserved total and unlocking
    })

    it('should render proxy deposit details', () => {
      const mockData = createMockNative()
      render(<NativeBalanceVisualization data={mockData} token={mockToken} appId="polkadot" />)

      expect(screen.getByText('Proxy Deposit')).toBeInTheDocument()
      expect(screen.getByTestId('user-cog-icon')).toBeInTheDocument()
      expect(screen.getByText('20000000000 DOT')).toBeInTheDocument()
    })

    it('should render identity deposit details', () => {
      const mockData = createMockNative()
      render(<NativeBalanceVisualization data={mockData} token={mockToken} appId="polkadot" />)

      expect(screen.getByText('Identity Deposit')).toBeInTheDocument()
      expect(screen.getByTestId('user-icon')).toBeInTheDocument()
      expect(screen.getByText('30000000000 DOT')).toBeInTheDocument()
    })

    it('should render index deposit details', () => {
      const mockData = createMockNative()
      render(<NativeBalanceVisualization data={mockData} token={mockToken} appId="polkadot" />)

      expect(screen.getByText('Account Index Deposit')).toBeInTheDocument()
      expect(screen.getByTestId('hash-icon')).toBeInTheDocument()
      expect(screen.getByText('10000000000 DOT')).toBeInTheDocument()
    })

    it('should render multisig deposit details', () => {
      const mockData = createMockNative()
      render(<NativeBalanceVisualization data={mockData} token={mockToken} appId="polkadot" />)

      expect(screen.getByText('Multisig Deposit')).toBeInTheDocument()
      expect(screen.getByText('Call Hash:')).toBeInTheDocument()
      expect(screen.getAllByTestId('group-icon')[0]).toBeInTheDocument()

      const explorerLink = screen.getByTestId('explorer-link')
      expect(explorerLink).toHaveAttribute('data-value', '0x1234567890abcdef')
      expect(explorerLink).toHaveAttribute('data-disable-link', 'true')
      expect(explorerLink).toHaveAttribute('data-disable-tooltip', 'true')
      expect(explorerLink).toHaveAttribute('data-truncate', 'true')
      expect(explorerLink).toHaveAttribute('data-size', 'xs')
    })

    it('should handle zero reserved deposits', () => {
      const mockData = createMockNative({
        reserved: {
          total: TEST_AMOUNTS.ZERO,
          proxy: { deposit: TEST_AMOUNTS.ZERO },
          identity: { deposit: TEST_AMOUNTS.ZERO },
          index: { deposit: TEST_AMOUNTS.ZERO },
          multisig: { total: TEST_AMOUNTS.ZERO, deposits: [] },
        },
      })
      render(<NativeBalanceVisualization data={mockData} token={mockToken} appId="polkadot" />)

      expect(screen.queryByText('Proxy Deposit')).not.toBeInTheDocument()
      expect(screen.queryByText('Identity Deposit')).not.toBeInTheDocument()
      expect(screen.queryByText('Account Index Deposit')).not.toBeInTheDocument()
      expect(screen.queryByText('Multisig Deposit')).not.toBeInTheDocument()
    })
  })

  describe('percentage display', () => {
    it('should show percentages by default', () => {
      const mockData = createMockNative()
      render(<NativeBalanceVisualization data={mockData} token={mockToken} appId="polkadot" />)

      const badges = screen.getAllByTestId('badge')
      expect(badges).toHaveLength(4)
      // Check that all badges contain percentage symbols
      for (const badge of badges) {
        expect(badge.textContent).toMatch(/%/)
      }
    })

    it('should hide percentages when hidePercentage is true', () => {
      const mockData = createMockNative()
      render(<NativeBalanceVisualization data={mockData} token={mockToken} appId="polkadot" hidePercentage />)

      const badges = screen.queryAllByTestId('badge')
      expect(badges).toHaveLength(0)
    })
  })

  describe('edge cases', () => {
    it('should handle zero total balance', () => {
      // Fixed: Now handles division by zero in percentage calculation
      const mockData = createMockNative({
        total: TEST_AMOUNTS.ZERO,
        transferable: TEST_AMOUNTS.ZERO,
        staking: { total: TEST_AMOUNTS.ZERO, active: TEST_AMOUNTS.ZERO, unlocking: [], canUnstake: false },
        reserved: {
          total: TEST_AMOUNTS.ZERO,
          proxy: { deposit: TEST_AMOUNTS.ZERO },
          identity: { deposit: TEST_AMOUNTS.ZERO },
          index: { deposit: TEST_AMOUNTS.ZERO },
          multisig: { total: TEST_AMOUNTS.ZERO, deposits: [] },
        },
      })
      render(<NativeBalanceVisualization data={mockData} token={mockToken} appId="polkadot" />)

      const zeroBalanceTexts = screen.getAllByText('0 DOT')
      expect(zeroBalanceTexts.length).toBeGreaterThanOrEqual(3)
    })

    it('should handle missing total balance', () => {
      // Fixed: Now handles division by zero in percentage calculation
      const mockData = createMockNative({
        total: undefined as any,
      })
      render(<NativeBalanceVisualization data={mockData} token={mockToken} appId="polkadot" />)

      // Should not crash and handle gracefully
      expect(screen.getByText('Transferable')).toBeInTheDocument()
      expect(screen.getByText('Staked')).toBeInTheDocument()
      expect(screen.getByText('Reserved')).toBeInTheDocument()
    })

    it('should handle multiple multisig deposits', () => {
      const mockData = createMockNative({
        reserved: {
          total: TEST_AMOUNTS.TEN_DOT.clone().muln(8).divn(10), // 8 DOT
          proxy: { deposit: TEST_AMOUNTS.ZERO.clone() },
          identity: { deposit: TEST_AMOUNTS.ZERO.clone() },
          index: { deposit: TEST_AMOUNTS.ZERO.clone() },
          multisig: {
            total: TEST_AMOUNTS.TEN_DOT.clone().muln(8).divn(10), // 8 DOT
            deposits: [
              { callHash: '0x1111111111111111', deposit: TEST_AMOUNTS.TEN_DOT.clone().muln(4).divn(10) }, // 4 DOT
              { callHash: '0x2222222222222222', deposit: TEST_AMOUNTS.TEN_DOT.clone().muln(4).divn(10) }, // 4 DOT
            ],
          },
        },
      })
      render(<NativeBalanceVisualization data={mockData} token={mockToken} appId="polkadot" />)

      const explorerLinks = screen.getAllByTestId('explorer-link')
      expect(explorerLinks).toHaveLength(2)
      expect(explorerLinks[0]).toHaveAttribute('data-value', '0x1111111111111111')
      expect(explorerLinks[1]).toHaveAttribute('data-value', '0x2222222222222222')
    })

    it('should handle no unlocking funds', () => {
      const mockData = createMockNative({
        staking: {
          total: TEST_AMOUNTS.HUNDRED_DOT.clone().divn(5), // 20 DOT
          active: TEST_AMOUNTS.HUNDRED_DOT.clone().divn(5), // 20 DOT
          unlocking: [],
          canUnstake: false,
        },
      })
      render(<NativeBalanceVisualization data={mockData} token={mockToken} appId="polkadot" />)

      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.queryByText('Unlocking')).not.toBeInTheDocument()
      expect(screen.queryByText('Ready to withdraw')).not.toBeInTheDocument()
    })
  })

  describe('styling and layout', () => {
    it('should apply correct card styling classes', () => {
      const mockData = createMockNative()
      render(<NativeBalanceVisualization data={mockData} token={mockToken} appId="polkadot" />)

      const cards = screen.getAllByTestId('card')
      for (const card of cards) {
        expect(card).toHaveClass('w-full', 'min-w-[150px]', 'p-4')
        expect(card.className).toMatch(/bg-linear-to-br/)
        expect(card.className).toMatch(/border/)
        expect(card.className).toMatch(/transition-all/)
        expect(card.className).toMatch(/hover:shadow-md/)
      }
    })

    it('should apply correct color schemes for each balance type', () => {
      const mockData = createMockNative()
      render(<NativeBalanceVisualization data={mockData} token={mockToken} appId="polkadot" />)

      const cards = screen.getAllByTestId('card')

      // Check that different gradient classes are applied
      const gradientClasses = cards.map(card => card.className)
      expect(gradientClasses.some(cls => cls.includes('polkadot-green'))).toBe(true)
      expect(gradientClasses.some(cls => cls.includes('polkadot-cyan'))).toBe(true)
      expect(gradientClasses.some(cls => cls.includes('polkadot-lime'))).toBe(true)
    })

    it('should apply proper grid column classes for different counts', () => {
      const mockData = createMockNative()

      // Test single column
      const { container: container1 } = render(
        <NativeBalanceVisualization data={mockData} token={mockToken} appId="polkadot" types={[BalanceType.Transferable]} />
      )
      expect(container1.querySelector('.sm\\:grid-cols-1')).toBeInTheDocument()

      // Test two columns
      const { container: container2 } = render(
        <NativeBalanceVisualization
          data={mockData}
          token={mockToken}
          appId="polkadot"
          types={[BalanceType.Transferable, BalanceType.Staking]}
        />
      )
      expect(container2.querySelector('.sm\\:grid-cols-2')).toBeInTheDocument()

      // Test four columns (all balance types)
      const { container: container4 } = render(<NativeBalanceVisualization data={mockData} token={mockToken} appId="polkadot" />)
      expect(container4.querySelector('.sm\\:grid-cols-4')).toBeInTheDocument()
    })
  })
})
