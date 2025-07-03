import type { Token } from '@/config/apps'
import { render, screen } from '@testing-library/react'
import type { Collection, Native } from 'state/types/ledger'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BalanceTypeFlag, NativeTokensDetailCard, NftDetailCard } from '../balance-detail-card'

// Mock the useTokenLogo hook
vi.mock('@/components/hooks/useTokenLogo', () => ({
  useTokenLogo: vi.fn(),
}))

// Mock the formatBalance utility
vi.mock('@/lib/utils/format', () => ({
  formatBalance: vi.fn(),
}))

// Mock the TokenIcon component
vi.mock('@/components/TokenIcon', () => ({
  default: vi.fn(({ icon, symbol, size }) => (
    <div data-testid="token-icon" data-icon={icon || ''} data-symbol={symbol} data-size={size}>
      {symbol}
    </div>
  )),
}))

import type { MockedFunction } from 'vitest'
// Import the mocked functions
import { useTokenLogo } from '@/components/hooks/useTokenLogo'
import { formatBalance } from '@/lib/utils/format'

const mockUseTokenLogo = useTokenLogo as MockedFunction<typeof useTokenLogo>
const mockFormatBalance = formatBalance as MockedFunction<typeof formatBalance>

describe('Balance Detail Card Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFormatBalance.mockImplementation((_value, _token, _decimals, full) => {
      return full ? '1000.123456' : '1000.12'
    })
  })

  describe('BalanceTypeFlag component', () => {
    it('should render with default variant', () => {
      render(<BalanceTypeFlag type="NFT" />)

      const badge = screen.getByText('NFT')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('text-[10px]', 'leading-tight', 'uppercase', 'shrink-0')
    })

    it('should render with custom variant', () => {
      render(<BalanceTypeFlag type="UNIQUE" variant="secondary" />)

      const badge = screen.getByText('UNIQUE')
      expect(badge).toBeInTheDocument()
      // Badge variants are applied via CSS classes, not attributes
    })

    it('should render uppercase text', () => {
      render(<BalanceTypeFlag type="nft" />)

      expect(screen.getByText('nft')).toBeInTheDocument()
    })

    it('should handle empty type', () => {
      const { container } = render(<BalanceTypeFlag type="" />)

      const badge = container.querySelector('.text-\\[10px\\]')
      expect(badge).toBeInTheDocument()
      expect(badge?.textContent).toBe('')
    })

    it('should handle special characters in type', () => {
      render(<BalanceTypeFlag type="NFT-SPECIAL" />)

      expect(screen.getByText('NFT-SPECIAL')).toBeInTheDocument()
    })
  })

  describe('NftDetailCard component', () => {
    const mockCollection: Collection = {
      collectionId: '123',
      name: 'Test Collection',
      image: 'https://example.com/image.png',
      mediaUri: 'https://example.com/media.png',
    }

    it('should render NFT collection with image', () => {
      render(<NftDetailCard balance={5} collection={mockCollection} />)

      expect(screen.getByText('Test Collection')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('Collection:')).toBeInTheDocument()
      // Check for the collection ID in the collection section
      const collectionSection = screen.getByText('Collection:').closest('div')
      expect(collectionSection?.textContent).toContain('123')
      expect(screen.getByText('nft')).toBeInTheDocument()

      const image = screen.getByAltText('Test Collection')
      expect(image).toHaveAttribute('src', 'https://example.com/image.png')
      expect(image).toHaveAttribute('loading', 'lazy')
    })

    it('should render UNIQUE balance type', () => {
      render(<NftDetailCard balance={1} collection={mockCollection} isUnique />)

      expect(screen.getByText('unique')).toBeInTheDocument()
      expect(screen.queryByText('nft')).not.toBeInTheDocument()
    })

    it('should render collection without image', () => {
      const collectionNoImage: Collection = {
        collectionId: 456,
        name: 'No Image Collection',
      }

      render(<NftDetailCard balance={3} collection={collectionNoImage} />)

      expect(screen.getByText('No Image Collection')).toBeInTheDocument()
      expect(screen.getByText('nft')).toBeInTheDocument() // Badge text (lowercase)
      expect(screen.getByText('NFT')).toBeInTheDocument() // Placeholder text
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })

    it('should use mediaUri when image is not available', () => {
      const collectionWithMedia: Collection = {
        collectionId: 789,
        name: 'Media Collection',
        mediaUri: 'https://example.com/media.png',
      }

      render(<NftDetailCard balance={2} collection={collectionWithMedia} />)

      const image = screen.getByAltText('Media Collection')
      expect(image).toHaveAttribute('src', 'https://example.com/media.png')
    })

    it('should fallback to collection ID when name is not available', () => {
      const collectionNoName: Collection = {
        collectionId: 999,
      }

      render(<NftDetailCard balance={1} collection={collectionNoName} />)

      expect(screen.getByText('Collection #999')).toBeInTheDocument()
      expect(screen.getByText('Collection:')).toBeInTheDocument()
      // Check for the collection ID in the collection section
      const collectionSection = screen.getByText('Collection:').closest('div')
      expect(collectionSection?.textContent).toContain('999')
    })

    it('should handle large balance numbers', () => {
      render(<NftDetailCard balance={999999} collection={mockCollection} />)

      expect(screen.getByText('999999')).toBeInTheDocument()
    })

    it('should handle zero balance', () => {
      render(<NftDetailCard balance={0} collection={mockCollection} />)

      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('should truncate long collection names', () => {
      const longNameCollection: Collection = {
        collectionId: 123,
        name: 'This is a very very very very very very long collection name that should be truncated',
      }

      render(<NftDetailCard balance={1} collection={longNameCollection} />)

      const nameElement = screen.getByText(longNameCollection.name)
      expect(nameElement).toHaveClass('truncate', 'max-w-[250px]')
    })

    it('should have correct styling classes', () => {
      const { container } = render(<NftDetailCard balance={1} collection={mockCollection} />)

      const card = container.querySelector('.flex.flex-row.items-center.p-3')
      expect(card).toBeInTheDocument()

      const imageContainer = container.querySelector('.h-12.w-12.rounded-full.overflow-hidden')
      expect(imageContainer).toBeInTheDocument()
    })
  })

  describe('NativeTokensDetailCard component', () => {
    const mockToken: Token = {
      symbol: 'DOT',
      decimals: 10,
      logoId: 'polkadot',
    } as Token

    const mockBalance: Native = {
      total: { toString: () => '1000000000000' } as any,
      transferable: { toString: () => '800000000000' } as any,
    } as Native

    it('should render native token details', () => {
      mockUseTokenLogo.mockReturnValue('<svg>icon</svg>')

      render(<NativeTokensDetailCard balance={mockBalance} token={mockToken} />)

      expect(screen.getAllByText('DOT')).toHaveLength(2) // One in icon, one in title
      expect(screen.getByText('NATIVE')).toBeInTheDocument()
      expect(screen.getByText('1000.123456')).toBeInTheDocument()
      expect(screen.getByTestId('token-icon')).toBeInTheDocument()
    })

    it('should use transferable balance for migration', () => {
      mockUseTokenLogo.mockReturnValue('<svg>icon</svg>')

      render(<NativeTokensDetailCard balance={mockBalance} token={mockToken} isMigration />)

      expect(mockFormatBalance).toHaveBeenCalledWith(mockBalance.transferable, mockToken, mockToken.decimals, true)
    })

    it('should use total balance for non-migration', () => {
      mockUseTokenLogo.mockReturnValue('<svg>icon</svg>')

      render(<NativeTokensDetailCard balance={mockBalance} token={mockToken} isMigration={false} />)

      expect(mockFormatBalance).toHaveBeenCalledWith(mockBalance.total, mockToken, mockToken.decimals, true)
    })

    it('should pass correct props to TokenIcon', () => {
      const mockIcon = '<svg>test-icon</svg>'
      mockUseTokenLogo.mockReturnValue(mockIcon)

      render(<NativeTokensDetailCard balance={mockBalance} token={mockToken} />)

      const tokenIcon = screen.getByTestId('token-icon')
      expect(tokenIcon).toHaveAttribute('data-icon', mockIcon)
      expect(tokenIcon).toHaveAttribute('data-symbol', 'DOT')
      expect(tokenIcon).toHaveAttribute('data-size', 'lg')
    })

    it('should handle missing token logo', () => {
      mockUseTokenLogo.mockReturnValue(undefined)

      render(<NativeTokensDetailCard balance={mockBalance} token={mockToken} />)

      const tokenIcon = screen.getByTestId('token-icon')
      expect(tokenIcon).toHaveAttribute('data-icon', '')
    })

    it('should have correct card structure', () => {
      mockUseTokenLogo.mockReturnValue('<svg>icon</svg>')
      const { container } = render(<NativeTokensDetailCard balance={mockBalance} token={mockToken} />)

      const card = container.querySelector('.flex.flex-row.items-center.p-3.gap-3')
      expect(card).toBeInTheDocument()
    })

    it('should display NATIVE badge with correct styling', () => {
      mockUseTokenLogo.mockReturnValue('<svg>icon</svg>')
      render(<NativeTokensDetailCard balance={mockBalance} token={mockToken} />)

      const nativeBadge = screen.getByText('NATIVE')
      expect(nativeBadge).toHaveClass('bg-font-semibold', 'text-white', 'text-[10px]', 'px-2', 'py-0', 'rounded-full')
    })

    it('should format balance as number', () => {
      mockUseTokenLogo.mockReturnValue('<svg>icon</svg>')
      mockFormatBalance.mockReturnValue('1500.789')

      render(<NativeTokensDetailCard balance={mockBalance} token={mockToken} />)

      expect(screen.getByText('1500.789')).toBeInTheDocument()
    })
  })

  describe('Component integration', () => {
    it('should work together in a complex scenario', () => {
      const mockToken: Token = {
        symbol: 'KSM',
        decimals: 12,
        logoId: 'kusama',
      } as Token

      const mockBalance: Native = {
        total: { toString: () => '5000000000000000' } as any,
        transferable: { toString: () => '3000000000000000' } as any,
      } as Native

      const mockCollection: Collection = {
        collectionId: 555,
        name: 'Integration Test NFTs',
        image: 'https://example.com/nft.png',
      }

      mockUseTokenLogo.mockReturnValue('<svg>kusama-icon</svg>')

      const { rerender } = render(
        <div>
          <NativeTokensDetailCard balance={mockBalance} token={mockToken} isMigration />
          <NftDetailCard balance={10} collection={mockCollection} isUnique />
          <BalanceTypeFlag type="TEST" variant="outline" />
        </div>
      )

      expect(screen.getAllByText('KSM')).toHaveLength(2) // One in icon, one in title
      expect(screen.getByText('Integration Test NFTs')).toBeInTheDocument()
      expect(screen.getByText('unique')).toBeInTheDocument()
      expect(screen.getByText('TEST')).toBeInTheDocument()

      // Test rerender with different props
      rerender(
        <div>
          <NativeTokensDetailCard balance={mockBalance} token={mockToken} isMigration={false} />
          <NftDetailCard balance={25} collection={mockCollection} />
          <BalanceTypeFlag type="CHANGED" />
        </div>
      )

      expect(screen.getByText('nft')).toBeInTheDocument()
      expect(screen.getByText('CHANGED')).toBeInTheDocument()
      expect(screen.getByText('25')).toBeInTheDocument()
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle null/undefined values gracefully', () => {
      const emptyCollection = {} as Collection

      render(<NftDetailCard balance={0} collection={emptyCollection} />)

      expect(screen.getByText('Collection #undefined')).toBeInTheDocument()
      expect(screen.getByText('Collection:')).toBeInTheDocument()
    })

    it('should handle very large numbers', () => {
      mockUseTokenLogo.mockReturnValue('<svg>icon</svg>')
      mockFormatBalance.mockReturnValue('999999999999.999999')

      const largeBalance: Native = {
        total: { toString: () => '999999999999999999999999' } as any,
        transferable: { toString: () => '999999999999999999999999' } as any,
      } as Native

      const mockToken: Token = {
        symbol: 'LARGE',
        decimals: 18,
        logoId: 'large',
      } as Token

      render(<NativeTokensDetailCard balance={largeBalance} token={mockToken} />)

      expect(screen.getByText('999999999999.999999')).toBeInTheDocument()
    })

    it('should handle special characters in collection names', () => {
      const specialCollection: Collection = {
        collectionId: 123,
        name: 'Special & Characters <> "quotes" =�',
      }

      render(<NftDetailCard balance={1} collection={specialCollection} />)

      expect(screen.getByText('Special & Characters <> "quotes" =�')).toBeInTheDocument()
    })
  })
})
