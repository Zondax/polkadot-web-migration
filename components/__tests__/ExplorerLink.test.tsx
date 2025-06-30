import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ExplorerItemType } from '@/config/explorers'
import { ExplorerLink } from '../ExplorerLink'

// Mock the utility functions
vi.mock('@/lib/utils/explorers', () => ({
  getTransactionExplorerUrl: vi.fn(),
  getAddressExplorerUrl: vi.fn(),
  getBlockExplorerUrl: vi.fn(),
}))

vi.mock('@/lib/utils', () => ({
  cn: vi.fn((...args) => args.filter(Boolean).join(' ')),
  truncateMiddleOfString: vi.fn(),
}))

vi.mock('config/config', () => ({
  truncateMaxCharacters: 20,
}))

// Mock the CopyButton component
vi.mock('../CopyButton', () => ({
  CopyButton: vi.fn(({ value, size }) => (
    <button type="button" data-testid="copy-button" data-value={value} data-size={size}>
      Copy
    </button>
  )),
}))

// Mock the CustomTooltip component
vi.mock('@/components/CustomTooltip', () => ({
  CustomTooltip: vi.fn(({ children, tooltipBody }) => (
    <div data-testid="tooltip" data-tooltip={tooltipBody}>
      {children}
    </div>
  )),
}))

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: vi.fn(({ children, href, ...props }) => (
    <a href={href} {...props} data-testid="explorer-link">
      {children}
    </a>
  )),
}))

import type { MockedFunction } from 'vitest'
import { truncateMiddleOfString } from '@/lib/utils'
// Import the mocked functions
import { getAddressExplorerUrl, getBlockExplorerUrl, getTransactionExplorerUrl } from '@/lib/utils/explorers'

const mockGetTransactionExplorerUrl = getTransactionExplorerUrl as MockedFunction<typeof getTransactionExplorerUrl>
const mockGetAddressExplorerUrl = getAddressExplorerUrl as MockedFunction<typeof getAddressExplorerUrl>
const mockGetBlockExplorerUrl = getBlockExplorerUrl as MockedFunction<typeof getBlockExplorerUrl>
const mockTruncateMiddleOfString = truncateMiddleOfString as MockedFunction<typeof truncateMiddleOfString>

describe('ExplorerLink component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTruncateMiddleOfString.mockImplementation((str: string, maxChars: number) => {
      if (str.length <= maxChars) return str
      return `${str.slice(0, 6)}...${str.slice(-6)}`
    })
  })

  describe('basic rendering', () => {
    it('should render null when no value provided', () => {
      const { container } = render(<ExplorerLink value="" />)
      expect(container.firstChild).toBeNull()
    })

    it('should render with basic props', () => {
      render(<ExplorerLink value="test-value" />)

      expect(screen.getByText('test-value')).toBeInTheDocument()
      expect(screen.getByTestId('copy-button')).toBeInTheDocument()
      expect(screen.getByTestId('tooltip')).toBeInTheDocument()
    })

    it('should render without truncation when truncate is false', () => {
      render(<ExplorerLink value="test-value-long" truncate={false} />)

      expect(screen.getByText('test-value-long')).toBeInTheDocument()
      expect(mockTruncateMiddleOfString).not.toHaveBeenCalled()
    })

    it('should render custom children instead of value', () => {
      render(
        <ExplorerLink value="test-value">
          <span>Custom Content</span>
        </ExplorerLink>
      )

      expect(screen.getByText('Custom Content')).toBeInTheDocument()
      expect(screen.queryByText('test-value')).not.toBeInTheDocument()
    })
  })

  describe('tooltip functionality', () => {
    it('should render with tooltip by default', () => {
      render(<ExplorerLink value="test-value" />)

      const tooltip = screen.getByTestId('tooltip')
      expect(tooltip).toBeInTheDocument()
      expect(tooltip).toHaveAttribute('data-tooltip', 'test-value')
    })

    it('should render with custom tooltip body', () => {
      render(<ExplorerLink value="test-value" tooltipBody="Custom tooltip" />)

      const tooltip = screen.getByTestId('tooltip')
      expect(tooltip).toHaveAttribute('data-tooltip', 'Custom tooltip')
    })

    it('should not render tooltip when disabled', () => {
      render(<ExplorerLink value="test-value" disableTooltip />)

      expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument()
      expect(screen.getByText('test-value')).toBeInTheDocument()
    })
  })

  describe('copy button functionality', () => {
    it('should render copy button by default', () => {
      render(<ExplorerLink value="test-value" />)

      const copyButton = screen.getByTestId('copy-button')
      expect(copyButton).toBeInTheDocument()
      expect(copyButton).toHaveAttribute('data-value', 'test-value')
      expect(copyButton).toHaveAttribute('data-size', 'sm')
    })

    it('should not render copy button when disabled', () => {
      render(<ExplorerLink value="test-value" hasCopyButton={false} />)

      expect(screen.queryByTestId('copy-button')).not.toBeInTheDocument()
    })

    it('should render copy button with custom size', () => {
      render(<ExplorerLink value="test-value" size="lg" />)

      const copyButton = screen.getByTestId('copy-button')
      expect(copyButton).toHaveAttribute('data-size', 'lg')
    })
  })

  describe('explorer link generation', () => {
    it('should generate transaction explorer link', () => {
      mockGetTransactionExplorerUrl.mockReturnValue('https://explorer.com/tx/hash')

      render(<ExplorerLink value="transaction-hash" appId="polkadot" explorerLinkType={ExplorerItemType.Transaction} />)

      expect(mockGetTransactionExplorerUrl).toHaveBeenCalledWith('polkadot', 'transaction-hash')
      expect(screen.getByTestId('explorer-link')).toHaveAttribute('href', 'https://explorer.com/tx/hash')
    })

    it('should generate address explorer link', () => {
      mockGetAddressExplorerUrl.mockReturnValue('https://explorer.com/address/addr')

      render(<ExplorerLink value="address-value" appId="kusama" explorerLinkType={ExplorerItemType.Address} />)

      expect(mockGetAddressExplorerUrl).toHaveBeenCalledWith('kusama', 'address-value')
      expect(screen.getByTestId('explorer-link')).toHaveAttribute('href', 'https://explorer.com/address/addr')
    })

    it('should generate block explorer link for BlockHash', () => {
      mockGetBlockExplorerUrl.mockReturnValue('https://explorer.com/block/hash')

      render(<ExplorerLink value="block-hash" appId="polkadot" explorerLinkType={ExplorerItemType.BlockHash} />)

      expect(mockGetBlockExplorerUrl).toHaveBeenCalledWith('polkadot', 'block-hash')
      expect(screen.getByTestId('explorer-link')).toHaveAttribute('href', 'https://explorer.com/block/hash')
    })

    it('should generate block explorer link for BlockNumber', () => {
      mockGetBlockExplorerUrl.mockReturnValue('https://explorer.com/block/123')

      render(<ExplorerLink value="123" appId="polkadot" explorerLinkType={ExplorerItemType.BlockNumber} />)

      expect(mockGetBlockExplorerUrl).toHaveBeenCalledWith('polkadot', '123')
      expect(screen.getByTestId('explorer-link')).toHaveAttribute('href', 'https://explorer.com/block/123')
    })

    it('should render as span when no explorer URL is generated', () => {
      render(<ExplorerLink value="test-value" />)

      expect(screen.queryByTestId('explorer-link')).not.toBeInTheDocument()
      expect(screen.getByText('test-value')).toBeInTheDocument()
    })

    it('should render as span when link is disabled', () => {
      mockGetTransactionExplorerUrl.mockReturnValue('https://explorer.com/tx/hash')

      render(<ExplorerLink value="transaction-hash" appId="polkadot" explorerLinkType={ExplorerItemType.Transaction} disableLink />)

      expect(mockGetTransactionExplorerUrl).not.toHaveBeenCalled()
      expect(screen.queryByTestId('explorer-link')).not.toBeInTheDocument()
      expect(screen.getByText('transaction-hash')).toBeInTheDocument()
    })
  })

  describe('link attributes', () => {
    it('should have correct link attributes', () => {
      mockGetTransactionExplorerUrl.mockReturnValue('https://explorer.com/tx/hash')

      render(<ExplorerLink value="transaction-hash" appId="polkadot" explorerLinkType={ExplorerItemType.Transaction} />)

      const link = screen.getByTestId('explorer-link')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      expect(link).toHaveAttribute('aria-label', 'transaction-hash')
    })

    it('should apply custom className to link', () => {
      mockGetTransactionExplorerUrl.mockReturnValue('https://explorer.com/tx/hash')

      render(
        <ExplorerLink value="transaction-hash" appId="polkadot" explorerLinkType={ExplorerItemType.Transaction} className="custom-class" />
      )

      const link = screen.getByTestId('explorer-link')
      expect(link).toHaveClass('custom-class')
    })

    it('should apply custom className to span when no link', () => {
      render(<ExplorerLink value="test-value" className="custom-class" />)

      const span = screen.getByText('test-value')
      expect(span).toHaveClass('custom-class')
    })
  })

  describe('truncation behavior', () => {
    it('should truncate long values', () => {
      const longValue = 'a'.repeat(50)
      render(<ExplorerLink value={longValue} />)

      expect(mockTruncateMiddleOfString).toHaveBeenCalledWith(longValue, 20)
    })

    it('should not truncate when truncate is false', () => {
      const longValue = 'a'.repeat(50)
      render(<ExplorerLink value={longValue} truncate={false} />)

      expect(mockTruncateMiddleOfString).not.toHaveBeenCalled()
      expect(screen.getByText(longValue)).toBeInTheDocument()
    })

    it('should handle empty strings', () => {
      const { container } = render(<ExplorerLink value="" />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('component structure', () => {
    it('should have correct container structure', () => {
      render(<ExplorerLink value="test-value" />)

      const container = screen.getByTestId('copy-button').closest('div')
      expect(container).toHaveClass('flex', 'items-center', 'gap-2')
    })

    it('should render all components in correct order', () => {
      render(<ExplorerLink value="test-value" />)

      const container = screen.getByTestId('copy-button').closest('div')
      const children = container?.children

      expect(children).toHaveLength(2)
      expect(children?.[0]).toHaveAttribute('data-testid', 'tooltip')
      expect(children?.[1]).toHaveAttribute('data-testid', 'copy-button')
    })
  })

  describe('edge cases', () => {
    it('should handle undefined appId', () => {
      render(<ExplorerLink value="test-value" explorerLinkType={ExplorerItemType.Transaction} />)

      expect(mockGetTransactionExplorerUrl).not.toHaveBeenCalled()
      expect(screen.queryByTestId('explorer-link')).not.toBeInTheDocument()
    })

    it('should handle undefined explorerLinkType', () => {
      render(<ExplorerLink value="test-value" appId="polkadot" />)

      expect(mockGetTransactionExplorerUrl).not.toHaveBeenCalled()
      expect(screen.queryByTestId('explorer-link')).not.toBeInTheDocument()
    })

    it('should handle special characters in value', () => {
      const specialValue = 'test-value-with-special-chars-!@#$%^&*()'
      render(<ExplorerLink value={specialValue} />)

      expect(mockTruncateMiddleOfString).toHaveBeenCalledWith(specialValue, 20)
    })

    it('should handle unicode characters', () => {
      const unicodeValue = '测试-value-🚀'
      render(<ExplorerLink value={unicodeValue} />)

      expect(mockTruncateMiddleOfString).toHaveBeenCalledWith(unicodeValue, 20)
    })

    it('should handle whitespace-only values', () => {
      render(<ExplorerLink value="   " />)

      // Check for the copy button to ensure component rendered
      expect(screen.getByTestId('copy-button')).toBeInTheDocument()
      expect(screen.getByTestId('tooltip')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have proper aria-label on links', () => {
      mockGetTransactionExplorerUrl.mockReturnValue('https://explorer.com/tx/hash')

      render(<ExplorerLink value="transaction-hash" appId="polkadot" explorerLinkType={ExplorerItemType.Transaction} />)

      const link = screen.getByTestId('explorer-link')
      expect(link).toHaveAttribute('aria-label', 'transaction-hash')
    })

    it('should have aria-disabled on disabled spans', () => {
      render(<ExplorerLink value="test-value" disableLink />)

      const span = screen.getByText('test-value')
      expect(span).toHaveAttribute('aria-disabled', 'true')
    })
  })

  describe('performance and memoization', () => {
    it('should memoize explorer URL generation', () => {
      mockGetTransactionExplorerUrl.mockReturnValue('https://explorer.com/tx/hash')

      const { rerender } = render(
        <ExplorerLink value="transaction-hash" appId="polkadot" explorerLinkType={ExplorerItemType.Transaction} />
      )

      // Rerender with same props
      rerender(<ExplorerLink value="transaction-hash" appId="polkadot" explorerLinkType={ExplorerItemType.Transaction} />)

      // Should only call once due to memoization
      expect(mockGetTransactionExplorerUrl).toHaveBeenCalledTimes(1)
    })

    it('should memoize truncation', () => {
      const { rerender } = render(<ExplorerLink value="test-value" />)

      // Rerender with same props
      rerender(<ExplorerLink value="test-value" />)

      // Should only call once due to memoization
      expect(mockTruncateMiddleOfString).toHaveBeenCalledTimes(1)
    })
  })
})
