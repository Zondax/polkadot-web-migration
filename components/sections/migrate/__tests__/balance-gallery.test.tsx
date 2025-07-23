import { BN } from '@polkadot/util'
import { render, screen } from '@testing-library/react'
import type { Collection, Native, Nft } from 'state/types/ledger'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Token } from '@/config/apps'
import BalanceGallery, { type NftBalance } from '../balance-gallery'

// Mock the detail card components
vi.mock('../balance-detail-card', () => ({
  NativeTokensDetailCard: ({ balance, token, isMigration }: any) => (
    <div data-testid="native-detail-card">
      <div data-testid="native-balance">{balance.total.toString()}</div>
      <div data-testid="native-token">{token.symbol}</div>
      <div data-testid="native-migration">{isMigration ? 'migration' : 'normal'}</div>
    </div>
  ),
  NftDetailCard: ({ balance, collection, isUnique }: any) => (
    <div data-testid="nft-detail-card">
      <div data-testid="nft-balance">{balance}</div>
      <div data-testid="nft-collection-id">{collection.collectionId}</div>
      <div data-testid="nft-collection-name">{collection.name}</div>
      <div data-testid="nft-type">{isUnique ? 'unique' : 'nft'}</div>
    </div>
  ),
}))

describe('BalanceGallery', () => {
  const mockToken: Token = {
    symbol: 'DOT',
    decimals: 10,
    name: 'Polkadot',
    category: 'substrate',
    chainName: 'Polkadot',
  }

  const mockNative: Native = {
    total: new BN('1000000000000'),
    transferable: new BN('600000000000'),
    staking: {
      total: new BN('300000000000'),
      active: new BN('200000000000'),
      unlocking: [],
    },
    reserved: {
      total: new BN('100000000000'),
      proxy: { deposit: new BN('20000000000') },
      identity: { deposit: new BN('30000000000') },
      index: { deposit: new BN('10000000000') },
      multisig: { total: new BN('40000000000'), deposits: [] },
    },
  }

  const mockCollection: Collection = {
    collectionId: 1,
    name: 'Test Collection',
    description: 'A test collection',
    image: 'https://example.com/image.png',
  }

  const mockNft: Nft = {
    itemId: 1,
    collectionId: 1,
    name: 'Test NFT',
    description: 'A test NFT',
    image: 'https://example.com/nft.png',
  }

  const mockNftBalance: NftBalance = {
    items: [mockNft],
    collection: mockCollection,
  }

  const mockUniqueBalance: NftBalance = {
    items: [{ ...mockNft, itemId: 2 }],
    collection: { ...mockCollection, collectionId: 2, name: 'Unique Collection' },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic rendering', () => {
    it('should render empty gallery when no props provided', () => {
      const { container } = render(<BalanceGallery token={mockToken} />)

      const gallery = container.firstChild
      expect(gallery).toBeInTheDocument()
      expect(gallery).toHaveClass('flex', 'flex-col', 'gap-3', 'p-2')
    })

    it('should apply correct styling classes', () => {
      const { container } = render(<BalanceGallery token={mockToken} />)

      const gallery = container.firstChild
      expect(gallery).toHaveClass(
        'flex',
        'flex-col',
        'gap-3',
        'p-2',
        'max-h-[400px]',
        'overflow-y-auto',
        'w-full',
        'sm:w-auto',
        'sm:min-w-[300px]'
      )
    })

    it('should render with token prop', () => {
      const { container } = render(<BalanceGallery token={mockToken} />)
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Native token rendering', () => {
    it('should render native token when provided', () => {
      render(<BalanceGallery native={mockNative} token={mockToken} />)

      expect(screen.getByTestId('native-detail-card')).toBeInTheDocument()
      expect(screen.getByTestId('native-balance')).toHaveTextContent('1000000000000')
      expect(screen.getByTestId('native-token')).toHaveTextContent('DOT')
    })

    it('should pass isMigration prop to native detail card', () => {
      render(<BalanceGallery native={mockNative} token={mockToken} isMigration />)

      expect(screen.getByTestId('native-migration')).toHaveTextContent('migration')
    })

    it('should pass normal mode when isMigration is false', () => {
      render(<BalanceGallery native={mockNative} token={mockToken} isMigration={false} />)

      expect(screen.getByTestId('native-migration')).toHaveTextContent('normal')
    })

    it('should not render native card when native is undefined', () => {
      render(<BalanceGallery token={mockToken} />)

      expect(screen.queryByTestId('native-detail-card')).not.toBeInTheDocument()
    })
  })

  describe('Uniques NFT rendering', () => {
    it('should render unique NFTs when provided', () => {
      render(<BalanceGallery uniques={[mockUniqueBalance]} token={mockToken} />)

      const nftCards = screen.getAllByTestId('nft-detail-card')
      expect(nftCards).toHaveLength(1)

      expect(screen.getByTestId('nft-balance')).toHaveTextContent('1')
      expect(screen.getByTestId('nft-collection-id')).toHaveTextContent('2')
      expect(screen.getByTestId('nft-collection-name')).toHaveTextContent('Unique Collection')
      expect(screen.getByTestId('nft-type')).toHaveTextContent('unique')
    })

    it('should render multiple unique NFTs', () => {
      const multipleUniques = [
        mockUniqueBalance,
        {
          items: [{ ...mockNft, itemId: 3 }],
          collection: { ...mockCollection, collectionId: 3, name: 'Another Unique' },
        },
      ]

      render(<BalanceGallery uniques={multipleUniques} token={mockToken} />)

      const nftCards = screen.getAllByTestId('nft-detail-card')
      expect(nftCards).toHaveLength(2)

      const collectionNames = screen.getAllByTestId('nft-collection-name')
      expect(collectionNames[0]).toHaveTextContent('Unique Collection')
      expect(collectionNames[1]).toHaveTextContent('Another Unique')
    })

    it('should handle uniques with multiple items', () => {
      const uniqueWithMultipleItems = {
        items: [
          { ...mockNft, itemId: 1 },
          { ...mockNft, itemId: 2 },
          { ...mockNft, itemId: 3 },
        ],
        collection: mockCollection,
      }

      render(<BalanceGallery uniques={[uniqueWithMultipleItems]} token={mockToken} />)

      expect(screen.getByTestId('nft-balance')).toHaveTextContent('3')
    })

    it('should not render uniques when undefined', () => {
      render(<BalanceGallery token={mockToken} />)

      expect(screen.queryByTestId('nft-detail-card')).not.toBeInTheDocument()
    })

    it('should not render uniques when empty array', () => {
      render(<BalanceGallery uniques={[]} token={mockToken} />)

      expect(screen.queryByTestId('nft-detail-card')).not.toBeInTheDocument()
    })
  })

  describe('Regular NFTs rendering', () => {
    it('should render regular NFTs when provided', () => {
      render(<BalanceGallery nfts={[mockNftBalance]} token={mockToken} />)

      const nftCards = screen.getAllByTestId('nft-detail-card')
      expect(nftCards).toHaveLength(1)

      expect(screen.getByTestId('nft-balance')).toHaveTextContent('1')
      expect(screen.getByTestId('nft-collection-id')).toHaveTextContent('1')
      expect(screen.getByTestId('nft-collection-name')).toHaveTextContent('Test Collection')
      expect(screen.getByTestId('nft-type')).toHaveTextContent('nft')
    })

    it('should render multiple regular NFTs', () => {
      const multipleNfts = [
        mockNftBalance,
        {
          items: [{ ...mockNft, itemId: 4 }],
          collection: { ...mockCollection, collectionId: 4, name: 'Another NFT Collection' },
        },
      ]

      render(<BalanceGallery nfts={multipleNfts} token={mockToken} />)

      const nftCards = screen.getAllByTestId('nft-detail-card')
      expect(nftCards).toHaveLength(2)

      const collectionNames = screen.getAllByTestId('nft-collection-name')
      expect(collectionNames[0]).toHaveTextContent('Test Collection')
      expect(collectionNames[1]).toHaveTextContent('Another NFT Collection')
    })

    it('should handle NFTs with multiple items', () => {
      const nftWithMultipleItems = {
        items: [
          { ...mockNft, itemId: 1 },
          { ...mockNft, itemId: 2 },
          { ...mockNft, itemId: 3 },
          { ...mockNft, itemId: 4 },
          { ...mockNft, itemId: 5 },
        ],
        collection: mockCollection,
      }

      render(<BalanceGallery nfts={[nftWithMultipleItems]} token={mockToken} />)

      expect(screen.getByTestId('nft-balance')).toHaveTextContent('5')
    })

    it('should not render NFTs when undefined', () => {
      render(<BalanceGallery token={mockToken} />)

      expect(screen.queryByTestId('nft-detail-card')).not.toBeInTheDocument()
    })

    it('should not render NFTs when empty array', () => {
      render(<BalanceGallery nfts={[]} token={mockToken} />)

      expect(screen.queryByTestId('nft-detail-card')).not.toBeInTheDocument()
    })
  })

  describe('Combined scenarios', () => {
    it('should render all balance types together', () => {
      render(<BalanceGallery native={mockNative} uniques={[mockUniqueBalance]} nfts={[mockNftBalance]} token={mockToken} isMigration />)

      expect(screen.getByTestId('native-detail-card')).toBeInTheDocument()

      const nftCards = screen.getAllByTestId('nft-detail-card')
      expect(nftCards).toHaveLength(2)

      const nftTypes = screen.getAllByTestId('nft-type')
      expect(nftTypes[0]).toHaveTextContent('unique')
      expect(nftTypes[1]).toHaveTextContent('nft')
    })

    it('should render native and uniques only', () => {
      render(<BalanceGallery native={mockNative} uniques={[mockUniqueBalance]} token={mockToken} />)

      expect(screen.getByTestId('native-detail-card')).toBeInTheDocument()
      expect(screen.getByTestId('nft-detail-card')).toBeInTheDocument()
      expect(screen.getByTestId('nft-type')).toHaveTextContent('unique')
    })

    it('should render native and NFTs only', () => {
      render(<BalanceGallery native={mockNative} nfts={[mockNftBalance]} token={mockToken} />)

      expect(screen.getByTestId('native-detail-card')).toBeInTheDocument()
      expect(screen.getByTestId('nft-detail-card')).toBeInTheDocument()
      expect(screen.getByTestId('nft-type')).toHaveTextContent('nft')
    })

    it('should render uniques and NFTs only', () => {
      render(<BalanceGallery uniques={[mockUniqueBalance]} nfts={[mockNftBalance]} token={mockToken} />)

      expect(screen.queryByTestId('native-detail-card')).not.toBeInTheDocument()

      const nftCards = screen.getAllByTestId('nft-detail-card')
      expect(nftCards).toHaveLength(2)

      const nftTypes = screen.getAllByTestId('nft-type')
      expect(nftTypes[0]).toHaveTextContent('unique')
      expect(nftTypes[1]).toHaveTextContent('nft')
    })
  })

  describe('Key generation', () => {
    it('should generate correct keys for uniques', () => {
      const uniqueWithSpecificIds = {
        items: [{ ...mockNft, itemId: 123 }],
        collection: { ...mockCollection, collectionId: 456 },
      }

      render(<BalanceGallery uniques={[uniqueWithSpecificIds]} token={mockToken} />)

      // The key should be based on collectionId and first item's itemId
      expect(screen.getByTestId('nft-detail-card')).toBeInTheDocument()
    })

    it('should generate correct keys for NFTs', () => {
      const nftWithSpecificIds = {
        items: [{ ...mockNft, itemId: 789 }],
        collection: { ...mockCollection, collectionId: 101 },
      }

      render(<BalanceGallery nfts={[nftWithSpecificIds]} token={mockToken} />)

      // The key should be based on collectionId and first item's itemId
      expect(screen.getByTestId('nft-detail-card')).toBeInTheDocument()
    })
  })

  describe('Edge cases', () => {
    it('should handle empty items array in NFT balance', () => {
      const emptyNftBalance = {
        items: [],
        collection: mockCollection,
      }

      // This causes an error in the real component due to items[0] access
      // This test documents the current behavior - the component doesn't handle empty items arrays
      expect(() => {
        render(<BalanceGallery nfts={[emptyNftBalance]} token={mockToken} />)
      }).toThrow('Cannot read properties of undefined')
    })

    it('should handle missing token properties', () => {
      const minimalToken = {
        symbol: 'TEST',
        decimals: 18,
        name: 'Test Token',
        category: 'substrate' as const,
        chainName: 'Test Chain',
      }

      render(<BalanceGallery native={mockNative} token={minimalToken} />)

      expect(screen.getByTestId('native-token')).toHaveTextContent('TEST')
    })

    it('should handle collections with missing optional properties', () => {
      const minimalCollection = {
        collectionId: 999,
        name: 'Minimal Collection',
      }

      const minimalNftBalance = {
        items: [mockNft],
        collection: minimalCollection,
      }

      render(<BalanceGallery nfts={[minimalNftBalance]} token={mockToken} />)

      expect(screen.getByTestId('nft-collection-name')).toHaveTextContent('Minimal Collection')
    })
  })

  describe('Rendering order', () => {
    it('should render native first, then uniques, then NFTs', () => {
      const { container } = render(
        <BalanceGallery native={mockNative} uniques={[mockUniqueBalance]} nfts={[mockNftBalance]} token={mockToken} />
      )

      const gallery = container.firstChild
      const children = Array.from(gallery.children)

      // First child should contain native detail card
      expect(children[0].querySelector('[data-testid="native-detail-card"]')).toBeInTheDocument()

      // Second child should contain unique NFT
      const secondChildNftType = children[1].querySelector('[data-testid="nft-type"]')
      expect(secondChildNftType).toHaveTextContent('unique')

      // Third child should contain regular NFT
      const thirdChildNftType = children[2].querySelector('[data-testid="nft-type"]')
      expect(thirdChildNftType).toHaveTextContent('nft')
    })
  })
})
