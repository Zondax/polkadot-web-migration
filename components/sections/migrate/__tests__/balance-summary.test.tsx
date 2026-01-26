import type { Native } from '@/state/types/ledger'
import { TEST_AMOUNTS } from '@/tests/fixtures/balances'
import { BN } from '@polkadot/util'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies
vi.mock('lucide-react', () => ({
  ArrowRightLeft: vi.fn(({ className }) => (
    <div data-testid="arrow-right-left-icon" className={className}>
      ArrowRightLeft
    </div>
  )),
  BarChart: vi.fn(({ className }) => (
    <div data-testid="bar-chart-icon" className={className}>
      BarChart
    </div>
  )),
  Group: vi.fn(({ className }) => (
    <div data-testid="group-icon" className={className}>
      Group
    </div>
  )),
  Info: vi.fn(({ className }) => (
    <div data-testid="info-icon" className={className}>
      Info
    </div>
  )),
}))

vi.mock('@radix-ui/react-icons', () => ({
  LockClosedIcon: vi.fn(({ className }) => (
    <div data-testid="lock-closed-icon" className={className}>
      LockClosed
    </div>
  )),
}))

vi.mock('@/components/ui/hover-card', () => ({
  HoverCard: vi.fn(({ children }) => <div data-testid="hover-card">{children}</div>),
  HoverCardTrigger: vi.fn(({ children }) => <div data-testid="hover-trigger">{children}</div>),
  HoverCardContent: vi.fn(({ children, className, align }) => (
    <div data-testid="hover-content" className={className} data-align={align}>
      {children}
    </div>
  )),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: vi.fn(({ children, className }) => (
    <div data-testid="badge" className={className}>
      {children}
    </div>
  )),
}))

vi.mock('@/lib/utils', () => ({
  formatBalance: vi.fn((balance, token, decimals) => {
    if (!balance) return '0'
    if (balance.isZero?.()) return '0 DOT'
    return `${balance.toString()} DOT`
  }),
}))

vi.mock('../balance-visualizations', () => ({
  NativeBalanceVisualization: vi.fn(({ types, hidePercentage }) => (
    <div data-testid="native-balance-visualization">
      Native Balance Viz - Types: {types?.join(',') || 'none'}, HidePercentage: {hidePercentage ? 'yes' : 'no'}
    </div>
  )),
}))

import { BalanceSummary } from '../balance-summary'

describe('BalanceSummary component', () => {
  const mockToken = {
    symbol: 'DOT',
    decimals: 10,
    name: 'Polkadot',
    category: 'substrate' as const,
    chainName: 'Polkadot',
  }

  const createMockBalance = (overrides: Partial<Native> = {}): Native => ({
    total: TEST_AMOUNTS.HUNDRED_DOT.clone(),
    free: TEST_AMOUNTS.HUNDRED_DOT.clone(),
    frozen: TEST_AMOUNTS.ZERO.clone(),
    transferable: TEST_AMOUNTS.HUNDRED_DOT.clone().muln(6).divn(10), // 60 DOT
    staking: {
      total: TEST_AMOUNTS.HUNDRED_DOT.clone().muln(2).divn(10), // 20 DOT
      active: TEST_AMOUNTS.HUNDRED_DOT.clone().divn(10), // 10 DOT
      unlocking: [],
      canUnstake: true,
    },
    reserved: {
      total: TEST_AMOUNTS.TEN_DOT.clone(), // 10 DOT
      proxy: { deposit: TEST_AMOUNTS.ZERO.clone() },
      identity: { deposit: TEST_AMOUNTS.ZERO.clone() },
      index: { deposit: TEST_AMOUNTS.ZERO.clone() },
      multisig: { total: TEST_AMOUNTS.ZERO.clone(), deposits: [] },
    },
    convictionVoting: {
      totalLocked: TEST_AMOUNTS.TEN_DOT.clone(), // 10 DOT governance locked
      votes: [],
      delegations: [],
      unlockableAmount: TEST_AMOUNTS.ZERO.clone(),
      classLocks: [],
    },
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render dash when balance is undefined', () => {
      render(<BalanceSummary balance={undefined} token={mockToken} appId="polkadot" />)

      expect(screen.getByText('-')).toBeInTheDocument()
      expect(screen.queryByTestId('hover-card')).not.toBeInTheDocument()
    })

    it('should render total balance', () => {
      const balance = createMockBalance()
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      expect(screen.getByText('1000000000000 DOT')).toBeInTheDocument()
    })

    it('should render hover card wrapper', () => {
      const balance = createMockBalance()
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      expect(screen.getByTestId('hover-card')).toBeInTheDocument()
      expect(screen.getByTestId('hover-trigger')).toBeInTheDocument()
    })

    it('should render info icon when balance has details', () => {
      const balance = createMockBalance()
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      expect(screen.getByTestId('info-icon')).toBeInTheDocument()
    })
  })

  describe('balance badges', () => {
    it('should render transferable badge when transferable > 0', () => {
      const balance = createMockBalance()
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      const badges = screen.getAllByTestId('badge')
      expect(badges.length).toBeGreaterThan(0)
      expect(screen.getByText('Transferable:')).toBeInTheDocument()
    })

    it('should render staking badge when staking > 0', () => {
      const balance = createMockBalance()
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      expect(screen.getByText('Staking:')).toBeInTheDocument()
    })

    it('should render reserved badge when reserved > 0', () => {
      const balance = createMockBalance()
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      expect(screen.getByText('Reserved:')).toBeInTheDocument()
    })

    it('should render governance badge when governance locked > 0', () => {
      const balance = createMockBalance()
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      expect(screen.getByText('Governance:')).toBeInTheDocument()
    })

    it('should render correct number of badges based on non-zero balances', () => {
      const balance = createMockBalance()
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      const badges = screen.getAllByTestId('badge')
      // Transferable, Staking, Reserved, Governance = 4 badges
      expect(badges).toHaveLength(4)
    })
  })

  describe('balance filtering', () => {
    it('should not render transferable badge when transferable is 0', () => {
      const balance = createMockBalance({
        transferable: TEST_AMOUNTS.ZERO.clone(),
      })
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      expect(screen.queryByText('Transferable:')).not.toBeInTheDocument()
    })

    it('should not render staking badge when staking is 0', () => {
      const balance = createMockBalance({
        staking: {
          total: TEST_AMOUNTS.ZERO.clone(),
          active: TEST_AMOUNTS.ZERO.clone(),
          unlocking: [],
          canUnstake: false,
        },
      })
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      expect(screen.queryByText('Staking:')).not.toBeInTheDocument()
    })

    it('should not render reserved badge when reserved is 0', () => {
      const balance = createMockBalance({
        reserved: {
          total: TEST_AMOUNTS.ZERO.clone(),
          proxy: { deposit: TEST_AMOUNTS.ZERO.clone() },
          identity: { deposit: TEST_AMOUNTS.ZERO.clone() },
          index: { deposit: TEST_AMOUNTS.ZERO.clone() },
          multisig: { total: TEST_AMOUNTS.ZERO.clone(), deposits: [] },
        },
      })
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      expect(screen.queryByText('Reserved:')).not.toBeInTheDocument()
    })

    it('should not render governance badge when governance is 0', () => {
      const balance = createMockBalance({
        convictionVoting: {
          totalLocked: TEST_AMOUNTS.ZERO.clone(),
          votes: [],
          delegations: [],
          unlockableAmount: TEST_AMOUNTS.ZERO.clone(),
          classLocks: [],
        },
      })
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      expect(screen.queryByText('Governance:')).not.toBeInTheDocument()
    })

    it('should not render any badges when all balances are 0', () => {
      const balance = createMockBalance({
        transferable: TEST_AMOUNTS.ZERO.clone(),
        staking: {
          total: TEST_AMOUNTS.ZERO.clone(),
          active: TEST_AMOUNTS.ZERO.clone(),
          unlocking: [],
          canUnstake: false,
        },
        reserved: {
          total: TEST_AMOUNTS.ZERO.clone(),
          proxy: { deposit: TEST_AMOUNTS.ZERO.clone() },
          identity: { deposit: TEST_AMOUNTS.ZERO.clone() },
          index: { deposit: TEST_AMOUNTS.ZERO.clone() },
          multisig: { total: TEST_AMOUNTS.ZERO.clone(), deposits: [] },
        },
        convictionVoting: undefined,
      })
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      expect(screen.queryAllByTestId('badge')).toHaveLength(0)
    })
  })

  describe('hover card details', () => {
    it('should show hover content when balance has details', () => {
      const balance = createMockBalance()
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      expect(screen.getByTestId('hover-content')).toBeInTheDocument()
    })

    it('should not show hover content when only transferable balance exists', () => {
      const balance = createMockBalance({
        staking: undefined,
        reserved: {
          total: TEST_AMOUNTS.ZERO.clone(),
          proxy: { deposit: TEST_AMOUNTS.ZERO.clone() },
          identity: { deposit: TEST_AMOUNTS.ZERO.clone() },
          index: { deposit: TEST_AMOUNTS.ZERO.clone() },
          multisig: { total: TEST_AMOUNTS.ZERO.clone(), deposits: [] },
        },
        convictionVoting: undefined,
      })
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      expect(screen.queryByTestId('hover-content')).not.toBeInTheDocument()
    })

    it('should not show info icon when only transferable balance exists', () => {
      const balance = createMockBalance({
        staking: undefined,
        reserved: {
          total: TEST_AMOUNTS.ZERO.clone(),
          proxy: { deposit: TEST_AMOUNTS.ZERO.clone() },
          identity: { deposit: TEST_AMOUNTS.ZERO.clone() },
          index: { deposit: TEST_AMOUNTS.ZERO.clone() },
          multisig: { total: TEST_AMOUNTS.ZERO.clone(), deposits: [] },
        },
        convictionVoting: undefined,
      })
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      expect(screen.queryByTestId('info-icon')).not.toBeInTheDocument()
    })

    it('should render NativeBalanceVisualization in hover content', () => {
      const balance = createMockBalance()
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      expect(screen.getByTestId('native-balance-visualization')).toBeInTheDocument()
    })

    it('should pass hidePercentage to NativeBalanceVisualization', () => {
      const balance = createMockBalance()
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      const viz = screen.getByTestId('native-balance-visualization')
      expect(viz).toHaveTextContent('HidePercentage: yes')
    })

    it('should pass correct types to NativeBalanceVisualization based on non-zero balances', () => {
      const balance = createMockBalance()
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      const viz = screen.getByTestId('native-balance-visualization')
      expect(viz).toHaveTextContent('transferable')
      expect(viz).toHaveTextContent('staking')
      expect(viz).toHaveTextContent('reserved')
      expect(viz).toHaveTextContent('governance')
    })

    it('should only pass non-zero balance types to NativeBalanceVisualization', () => {
      const balance = createMockBalance({
        staking: {
          total: TEST_AMOUNTS.ZERO.clone(),
          active: TEST_AMOUNTS.ZERO.clone(),
          unlocking: [],
          canUnstake: false,
        },
        convictionVoting: undefined,
      })
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      const viz = screen.getByTestId('native-balance-visualization')
      expect(viz).toHaveTextContent('transferable')
      expect(viz).toHaveTextContent('reserved')
      expect(viz).not.toHaveTextContent('staking')
      expect(viz).not.toHaveTextContent('governance')
    })
  })

  describe('edge cases', () => {
    it('should handle missing staking data gracefully', () => {
      const balance = createMockBalance({
        staking: undefined,
      })
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      expect(screen.queryByText('Staking:')).not.toBeInTheDocument()
      expect(screen.getByText('1000000000000 DOT')).toBeInTheDocument()
    })

    it('should handle missing convictionVoting data gracefully', () => {
      const balance = createMockBalance({
        convictionVoting: undefined,
      })
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      expect(screen.queryByText('Governance:')).not.toBeInTheDocument()
      expect(screen.getByText('1000000000000 DOT')).toBeInTheDocument()
    })

    it('should handle zero total balance', () => {
      const balance = createMockBalance({
        total: TEST_AMOUNTS.ZERO.clone(),
        transferable: TEST_AMOUNTS.ZERO.clone(),
        staking: undefined,
        reserved: {
          total: TEST_AMOUNTS.ZERO.clone(),
          proxy: { deposit: TEST_AMOUNTS.ZERO.clone() },
          identity: { deposit: TEST_AMOUNTS.ZERO.clone() },
          index: { deposit: TEST_AMOUNTS.ZERO.clone() },
          multisig: { total: TEST_AMOUNTS.ZERO.clone(), deposits: [] },
        },
        convictionVoting: undefined,
      })
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      expect(screen.getByText('0 DOT')).toBeInTheDocument()
    })

    it('should handle balance with only staking', () => {
      const balance = createMockBalance({
        transferable: TEST_AMOUNTS.ZERO.clone(),
        reserved: {
          total: TEST_AMOUNTS.ZERO.clone(),
          proxy: { deposit: TEST_AMOUNTS.ZERO.clone() },
          identity: { deposit: TEST_AMOUNTS.ZERO.clone() },
          index: { deposit: TEST_AMOUNTS.ZERO.clone() },
          multisig: { total: TEST_AMOUNTS.ZERO.clone(), deposits: [] },
        },
        convictionVoting: undefined,
      })
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      expect(screen.getByText('Staking:')).toBeInTheDocument()
      expect(screen.queryByText('Transferable:')).not.toBeInTheDocument()
      expect(screen.queryByText('Reserved:')).not.toBeInTheDocument()
      expect(screen.queryByText('Governance:')).not.toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('should apply correct styling to total balance', () => {
      const balance = createMockBalance()
      const { container } = render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      const totalBalance = container.querySelector('.font-mono.text-base.font-semibold')
      expect(totalBalance).toBeInTheDocument()
    })

    it('should apply cursor-pointer to the trigger', () => {
      const balance = createMockBalance()
      const { container } = render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      const trigger = container.querySelector('.cursor-pointer')
      expect(trigger).toBeInTheDocument()
    })

    it('should right-align content', () => {
      const balance = createMockBalance()
      const { container } = render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      const justifyEnd = container.querySelector('.justify-end')
      expect(justifyEnd).toBeInTheDocument()
    })

    it('should apply badge color classes', () => {
      const balance = createMockBalance()
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      const badges = screen.getAllByTestId('badge')
      for (const badge of badges) {
        // Each badge should have background and text color classes
        expect(badge.className).toMatch(/bg-/)
        expect(badge.className).toMatch(/text-/)
      }
    })
  })

  describe('icons', () => {
    it('should render transferable icon in badge', () => {
      const balance = createMockBalance()
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      expect(screen.getByTestId('arrow-right-left-icon')).toBeInTheDocument()
    })

    it('should render staking icon in badge', () => {
      const balance = createMockBalance()
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      expect(screen.getByTestId('bar-chart-icon')).toBeInTheDocument()
    })

    it('should render reserved icon in badge', () => {
      const balance = createMockBalance()
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      expect(screen.getByTestId('lock-closed-icon')).toBeInTheDocument()
    })

    it('should render governance icon in badge', () => {
      const balance = createMockBalance()
      render(<BalanceSummary balance={balance} token={mockToken} appId="polkadot" />)

      expect(screen.getByTestId('group-icon')).toBeInTheDocument()
    })
  })
})
