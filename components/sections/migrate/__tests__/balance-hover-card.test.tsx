import { BN } from '@polkadot/util'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BalanceHoverCard, NativeBalanceHoverCard } from '../balance-hover-card'
import { BalanceType } from '../balance-visualizations'

// Mock dependencies
vi.mock('lucide-react', () => ({
  Info: vi.fn(({ className }) => (
    <div data-testid="info-icon" className={className}>
      Info
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

vi.mock('@/lib/utils', () => ({
  formatBalance: vi.fn((balance, token) => {
    if (balance.isZero()) return '0 DOT'
    return `${balance.toString()} ${token.symbol}`
  }),
}))

vi.mock('../balance-gallery', () => ({
  default: vi.fn(({ nfts, uniques, native }) => {
    // Count total NFT items across all collections
    const nftCount = nfts?.reduce((sum, nftBalance) => sum + (nftBalance.items?.length || 0), 0) || 0
    const uniqueCount = uniques?.reduce((sum, uniqueBalance) => sum + (uniqueBalance.items?.length || 0), 0) || 0
    return (
      <div data-testid="balance-gallery">
        Balance Gallery - Native: {native ? 'yes' : 'no'}, NFTs: {nftCount}, Uniques: {uniqueCount}
      </div>
    )
  }),
}))

vi.mock('../nft-circles', () => ({
  default: vi.fn(({ collections }) => <div data-testid="nft-circles">NFT Circles - Collections: {collections.length}</div>),
}))

vi.mock('../balance-visualizations', () => ({
  BalanceType: {
    Staking: 'staking',
    Reserved: 'reserved',
    Transferable: 'transferable',
  },
  NativeBalanceVisualization: vi.fn(({ types, hidePercentage }) => (
    <div data-testid="native-balance-visualization">
      Native Balance Viz - Type: {types.join(',')}, HidePercentage: {hidePercentage ? 'yes' : 'no'}
    </div>
  )),
}))

const mockToken = {
  symbol: 'DOT',
  decimals: 10,
  name: 'Polkadot',
  category: 'substrate' as const,
  chainName: 'Polkadot',
}

const mockNativeBalance = {
  total: new BN('1000000000000'),
  transferable: new BN('500000000000'),
  reserved: {
    total: new BN('200000000000'),
    identity: new BN('100000000000'),
    governance: new BN('100000000000'),
  },
  staking: {
    total: new BN('300000000000'),
    active: new BN('200000000000'),
    unlocking: [
      {
        amount: new BN('100000000000'),
        remainingEras: 5,
      },
    ],
  },
}

const mockNfts = [
  {
    collectionId: '1',
    collection: {
      id: '1',
      name: 'Test Collection',
      metadata: { name: 'Test Collection' },
    },
    itemId: '1',
    metadata: { name: 'NFT 1' },
  },
  {
    collectionId: '1',
    collection: {
      id: '1',
      name: 'Test Collection',
      metadata: { name: 'Test Collection' },
    },
    itemId: '2',
    metadata: { name: 'NFT 2' },
  },
]

const mockUniques = [
  {
    collectionId: '2',
    collection: {
      id: '2',
      name: 'Unique Collection',
      metadata: { name: 'Unique Collection' },
    },
    itemId: '1',
    metadata: { name: 'Unique 1' },
  },
]

describe('BalanceHoverCard component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render native balance only', () => {
      const balances = [
        {
          type: 'native',
          balance: mockNativeBalance,
        },
      ]

      render(<BalanceHoverCard balances={balances} token={mockToken} />)

      expect(screen.getByText('1000000000000 DOT')).toBeInTheDocument()
      expect(screen.queryByTestId('nft-circles')).not.toBeInTheDocument()
      expect(screen.queryByTestId('info-icon')).not.toBeInTheDocument()
    })

    it('should render transferable balance when isMigration is true', () => {
      const balances = [
        {
          type: 'native',
          balance: mockNativeBalance,
        },
      ]

      render(<BalanceHoverCard balances={balances} token={mockToken} isMigration={true} />)

      expect(screen.getByText('500000000000 DOT')).toBeInTheDocument()
    })

    it('should render NFT circles when NFTs are present', () => {
      const balances = [
        {
          type: 'native',
          balance: mockNativeBalance,
        },
        {
          type: 'nft',
          balance: mockNfts,
        },
      ]

      render(<BalanceHoverCard balances={balances} token={mockToken} />)

      expect(screen.getByTestId('nft-circles')).toBeInTheDocument()
      expect(screen.getByTestId('info-icon')).toBeInTheDocument()
    })

    it('should render NFT circles for uniques', () => {
      const balances = [
        {
          type: 'unique',
          balance: mockUniques,
        },
      ]

      render(<BalanceHoverCard balances={balances} token={mockToken} />)

      expect(screen.getByTestId('nft-circles')).toBeInTheDocument()
      expect(screen.getByText('NFT Circles - Collections: 1')).toBeInTheDocument()
    })

    it('should render both NFTs and uniques', () => {
      const balances = [
        {
          type: 'nft',
          balance: mockNfts,
        },
        {
          type: 'unique',
          balance: mockUniques,
        },
      ]

      render(<BalanceHoverCard balances={balances} token={mockToken} />)

      const nftCircles = screen.getByTestId('nft-circles')
      expect(nftCircles).toBeInTheDocument()
      // 2 NFTs from same collection + 1 unique = 2 unique collections
      expect(nftCircles).toHaveTextContent('NFT Circles - Collections: 2')
    })
  })

  describe('hover interactions', () => {
    it('should show balance gallery on hover', async () => {
      const balances = [
        {
          type: 'native',
          balance: mockNativeBalance,
        },
      ]

      render(<BalanceHoverCard balances={balances} token={mockToken} />)

      const trigger = screen.getByTestId('hover-trigger')
      fireEvent.mouseEnter(trigger)

      await waitFor(() => {
        expect(screen.getByTestId('balance-gallery')).toBeInTheDocument()
      })
    })

    it('should pass correct props to balance gallery', async () => {
      const balances = [
        {
          type: 'native',
          balance: mockNativeBalance,
        },
        {
          type: 'nft',
          balance: mockNfts,
        },
        {
          type: 'unique',
          balance: mockUniques,
        },
      ]

      render(<BalanceHoverCard balances={balances} token={mockToken} isMigration={true} />)

      const gallery = screen.getByTestId('balance-gallery')
      expect(gallery).toHaveTextContent('Native: yes')
      // Check for NFTs: 2 (total items) since we have 2 NFT items in the collection
      expect(gallery).toHaveTextContent('NFTs: 2')
      expect(gallery).toHaveTextContent('Uniques: 1')
    })
  })

  describe('collections handling', () => {
    it('should handle collections map properly', () => {
      const balances = [
        {
          type: 'nft',
          balance: mockNfts,
        },
      ]

      const collections = {
        nfts: new Map([['1', { id: '1', name: 'Test Collection' }]]),
        uniques: new Map(),
      }

      render(<BalanceHoverCard balances={balances} collections={collections} token={mockToken} />)

      expect(screen.getByTestId('nft-circles')).toBeInTheDocument()
    })

    it('should handle empty collections', () => {
      const balances = [
        {
          type: 'nft',
          balance: mockNfts,
        },
      ]

      render(<BalanceHoverCard balances={balances} token={mockToken} />)

      expect(screen.getByTestId('nft-circles')).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle empty balances array', () => {
      render(<BalanceHoverCard balances={[]} token={mockToken} />)

      expect(screen.queryByText(/DOT/)).not.toBeInTheDocument()
      expect(screen.queryByTestId('nft-circles')).not.toBeInTheDocument()
    })

    it('should handle null native balance', () => {
      const balances = [
        {
          type: 'native',
          balance: null,
        },
      ]

      render(<BalanceHoverCard balances={balances as any} token={mockToken} />)

      expect(screen.queryByText(/DOT/)).not.toBeInTheDocument()
    })

    it('should handle zero balance', () => {
      const balances = [
        {
          type: 'native',
          balance: {
            ...mockNativeBalance,
            total: new BN(0),
            transferable: new BN(0),
          },
        },
      ]

      render(<BalanceHoverCard balances={balances} token={mockToken} />)

      expect(screen.getByText('0 DOT')).toBeInTheDocument()
    })
  })
})

describe('NativeBalanceHoverCard component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render staking balance', () => {
      render(<NativeBalanceHoverCard balance={mockNativeBalance} token={mockToken} type={BalanceType.Staking} />)

      expect(screen.getByText('300000000000 DOT')).toBeInTheDocument()
      expect(screen.getByTestId('info-icon')).toBeInTheDocument()
    })

    it('should render reserved balance', () => {
      render(<NativeBalanceHoverCard balance={mockNativeBalance} token={mockToken} type={BalanceType.Reserved} />)

      expect(screen.getByText('200000000000 DOT')).toBeInTheDocument()
      expect(screen.getByTestId('info-icon')).toBeInTheDocument()
    })

    it('should render transferable balance', () => {
      render(<NativeBalanceHoverCard balance={mockNativeBalance} token={mockToken} type={BalanceType.Transferable} />)

      expect(screen.getByText('500000000000 DOT')).toBeInTheDocument()
      expect(screen.getByTestId('info-icon')).toBeInTheDocument()
    })

    it('should not render info icon for zero balance', () => {
      const zeroBalance = {
        ...mockNativeBalance,
        staking: {
          total: new BN(0),
          active: new BN(0),
          unlocking: [],
        },
      }

      render(<NativeBalanceHoverCard balance={zeroBalance} token={mockToken} type={BalanceType.Staking} />)

      expect(screen.getByText('0 DOT')).toBeInTheDocument()
      expect(screen.queryByTestId('info-icon')).not.toBeInTheDocument()
    })
  })

  describe('hover interactions', () => {
    it('should show visualization on hover for non-zero balance', async () => {
      render(<NativeBalanceHoverCard balance={mockNativeBalance} token={mockToken} type={BalanceType.Staking} />)

      const trigger = screen.getByTestId('hover-trigger')
      fireEvent.mouseEnter(trigger)

      await waitFor(() => {
        expect(screen.getByTestId('native-balance-visualization')).toBeInTheDocument()
      })

      const viz = screen.getByTestId('native-balance-visualization')
      expect(viz).toHaveTextContent('Type: staking')
      expect(viz).toHaveTextContent('HidePercentage: yes')
    })

    it('should not show hover content for zero balance', () => {
      const zeroBalance = {
        ...mockNativeBalance,
        staking: {
          total: new BN(0),
          active: new BN(0),
          unlocking: [],
        },
      }

      render(<NativeBalanceHoverCard balance={zeroBalance} token={mockToken} type={BalanceType.Staking} />)

      expect(screen.queryByTestId('hover-content')).not.toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle undefined balance', () => {
      render(<NativeBalanceHoverCard balance={undefined} token={mockToken} type={BalanceType.Staking} />)

      expect(screen.queryByText(/DOT/)).not.toBeInTheDocument()
    })

    it('should handle balance without staking data', () => {
      const balanceWithoutStaking = {
        ...mockNativeBalance,
        staking: undefined,
      }

      render(<NativeBalanceHoverCard balance={balanceWithoutStaking} token={mockToken} type={BalanceType.Staking} />)

      expect(screen.queryByText(/DOT/)).not.toBeInTheDocument()
    })

    it('should handle balance without reserved data', () => {
      const balanceWithoutReserved = {
        ...mockNativeBalance,
        reserved: undefined,
      }

      render(<NativeBalanceHoverCard balance={balanceWithoutReserved} token={mockToken} type={BalanceType.Reserved} />)

      expect(screen.queryByText(/DOT/)).not.toBeInTheDocument()
    })
  })

  describe('hover card alignment', () => {
    it('should set proper alignment for hover content', () => {
      render(<NativeBalanceHoverCard balance={mockNativeBalance} token={mockToken} type={BalanceType.Staking} />)

      const hoverContent = screen.getByTestId('hover-content')
      expect(hoverContent).toHaveAttribute('data-align', 'end')
      expect(hoverContent).toHaveClass('w-[calc(100vw-32px)]', 'sm:w-auto', 'max-w-full')
    })
  })
})
