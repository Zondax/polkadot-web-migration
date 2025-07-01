import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { AddressBalance } from 'state/types/ledger'
import { BalanceType } from 'state/types/ledger'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ExplorerItemType } from '@/config/explorers'
import DestinationAddressSelect from '../destination-address-select'

// Mock the dependencies
vi.mock('@legendapp/state/react', () => ({
  observer: vi.fn((component: any) => component),
}))

vi.mock('@/components/ExplorerLink', () => ({
  ExplorerLink: vi.fn(({ value, disableTooltip, hasCopyButton }) => (
    <span data-testid="explorer-link" data-value={value} data-disable-tooltip={disableTooltip} data-has-copy={hasCopyButton}>
      {value}
    </span>
  )),
}))

vi.mock('@/components/SelectWithCustom', () => ({
  SelectWithCustom: vi.fn(
    ({ options, _placeholder, _customPlaceholder, onValueChange, _renderOption, selectedValue, defaultValue, disabled }) => {
      const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onValueChange(e.target.value)
      }

      return (
        <div data-testid="select-with-custom">
          <select
            data-testid="select"
            onChange={handleChange}
            value={selectedValue || defaultValue || ''}
            disabled={disabled}
            placeholder={_placeholder}
            data-custom-placeholder={_customPlaceholder}
          >
            <option value="">Select...</option>
            {options.map((option: any, _index: number) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )
    }
  ),
}))

vi.mock('@/lib/utils', () => ({
  hasBalance: vi.fn(),
}))

import { observer } from '@legendapp/state/react'
import type { MockedFunction } from 'vitest'
import { ExplorerLink } from '@/components/ExplorerLink'
import { SelectWithCustom } from '@/components/SelectWithCustom'
// Import mocked functions
import { hasBalance } from '@/lib/utils'

const mockHasBalance = hasBalance as MockedFunction<typeof hasBalance>
const mockSelectWithCustom = SelectWithCustom as MockedFunction<typeof SelectWithCustom>
const mockExplorerLink = ExplorerLink as MockedFunction<typeof ExplorerLink>
const mockObserver = observer as MockedFunction<typeof observer>

describe('DestinationAddressSelect component', () => {
  const mockOnDestinationChange = vi.fn()

  const mockBalance: AddressBalance = {
    type: BalanceType.NATIVE,
    id: 'native',
    transaction: {
      destinationAddress: '1234567890abcdef',
    },
  } as AddressBalance

  const mockPolkadotAddresses = ['1234567890abcdef', '234567890abcdef1', '34567890abcdef12']

  beforeEach(() => {
    vi.clearAllMocks()
    mockHasBalance.mockReturnValue(true)
  })

  describe('basic rendering', () => {
    it('should render with all props', () => {
      render(
        <DestinationAddressSelect
          appId="polkadot"
          balance={mockBalance}
          index={0}
          polkadotAddresses={mockPolkadotAddresses}
          onDestinationChange={mockOnDestinationChange}
        />
      )

      expect(screen.getByTestId('select-with-custom')).toBeInTheDocument()
      expect(screen.getByTestId('select')).toBeInTheDocument()
    })

    it('should render with pre-selected destination address', () => {
      render(
        <DestinationAddressSelect
          appId="polkadot"
          balance={mockBalance}
          index={0}
          polkadotAddresses={mockPolkadotAddresses}
          onDestinationChange={mockOnDestinationChange}
        />
      )

      const select = screen.getByTestId('select') as HTMLSelectElement
      expect(select.value).toBe('1234567890abcdef')
    })

    it('should render without pre-selected address and use first address as default', () => {
      const balanceNoTransaction: AddressBalance = {
        ...mockBalance,
        transaction: undefined,
      }

      render(
        <DestinationAddressSelect
          appId="polkadot"
          balance={balanceNoTransaction}
          index={0}
          polkadotAddresses={mockPolkadotAddresses}
          onDestinationChange={mockOnDestinationChange}
        />
      )

      const select = screen.getByTestId('select') as HTMLSelectElement
      expect(select.value).toBe('1234567890abcdef')
    })

    it('should render disabled when no balance', () => {
      mockHasBalance.mockReturnValue(false)

      render(
        <DestinationAddressSelect
          appId="polkadot"
          balance={mockBalance}
          index={0}
          polkadotAddresses={mockPolkadotAddresses}
          onDestinationChange={mockOnDestinationChange}
        />
      )

      const select = screen.getByTestId('select') as HTMLSelectElement
      expect(select.disabled).toBe(true)
    })

    it('should render disabled when no polkadot addresses', () => {
      render(
        <DestinationAddressSelect
          appId="polkadot"
          balance={mockBalance}
          index={0}
          polkadotAddresses={[]}
          onDestinationChange={mockOnDestinationChange}
        />
      )

      const select = screen.getByTestId('select') as HTMLSelectElement
      expect(select.disabled).toBe(true)
    })

    it('should render disabled when polkadot addresses is undefined', () => {
      render(
        <DestinationAddressSelect
          appId="polkadot"
          balance={mockBalance}
          index={0}
          polkadotAddresses={undefined}
          onDestinationChange={mockOnDestinationChange}
        />
      )

      const select = screen.getByTestId('select') as HTMLSelectElement
      expect(select.disabled).toBe(true)
    })
  })

  describe('selection functionality', () => {
    it('should call onDestinationChange when selection changes', () => {
      render(
        <DestinationAddressSelect
          appId="polkadot"
          balance={mockBalance}
          index={2}
          polkadotAddresses={mockPolkadotAddresses}
          onDestinationChange={mockOnDestinationChange}
        />
      )

      const select = screen.getByTestId('select') as HTMLSelectElement
      fireEvent.change(select, { target: { value: '234567890abcdef1' } })

      expect(mockOnDestinationChange).toHaveBeenCalledWith('234567890abcdef1', 2)
    })

    it('should update local state when balance changes', async () => {
      const { rerender } = render(
        <DestinationAddressSelect
          appId="polkadot"
          balance={mockBalance}
          index={0}
          polkadotAddresses={mockPolkadotAddresses}
          onDestinationChange={mockOnDestinationChange}
        />
      )

      const select = screen.getByTestId('select') as HTMLSelectElement
      expect(select.value).toBe('1234567890abcdef')

      const updatedBalance: AddressBalance = {
        ...mockBalance,
        transaction: {
          destinationAddress: '234567890abcdef1',
        },
      }

      rerender(
        <DestinationAddressSelect
          appId="polkadot"
          balance={updatedBalance}
          index={0}
          polkadotAddresses={mockPolkadotAddresses}
          onDestinationChange={mockOnDestinationChange}
        />
      )

      await waitFor(() => {
        expect(select.value).toBe('234567890abcdef1')
      })
    })
  })

  describe('option rendering', () => {
    it('should render options with correct format', () => {
      render(
        <DestinationAddressSelect
          appId="polkadot"
          balance={mockBalance}
          index={0}
          polkadotAddresses={mockPolkadotAddresses}
          onDestinationChange={mockOnDestinationChange}
        />
      )

      expect(mockSelectWithCustom).toHaveBeenCalledWith(
        expect.objectContaining({
          options: [
            { value: '1234567890abcdef', label: '1234567890abcdef' },
            { value: '234567890abcdef1', label: '234567890abcdef1' },
            { value: '34567890abcdef12', label: '34567890abcdef12' },
          ],
          placeholder: 'Select a Polkadot address...',
          customPlaceholder: 'Enter custom Polkadot address',
          selectedValue: '1234567890abcdef',
          defaultValue: '1234567890abcdef',
          disabled: false,
        }),
        undefined
      )
    })

    it('should pass renderOption function', () => {
      render(
        <DestinationAddressSelect
          appId="kusama"
          balance={mockBalance}
          index={0}
          polkadotAddresses={mockPolkadotAddresses}
          onDestinationChange={mockOnDestinationChange}
        />
      )

      const renderOption = mockSelectWithCustom.mock.calls[0][0].renderOption
      expect(typeof renderOption).toBe('function')

      // Test the renderOption function
      const optionElement = renderOption({ value: 'test-address', label: 'test-address' }, 2)

      const { container } = render(optionElement)
      expect(container.textContent).toContain('Polkadot 3:')
      expect(screen.getByTestId('explorer-link')).toHaveAttribute('data-value', 'test-address')
    })
  })

  describe('edge cases', () => {
    it('should handle empty options gracefully', () => {
      render(
        <DestinationAddressSelect
          appId="polkadot"
          balance={mockBalance}
          index={0}
          polkadotAddresses={undefined}
          onDestinationChange={mockOnDestinationChange}
        />
      )

      expect(mockSelectWithCustom).toHaveBeenCalledWith(
        expect.objectContaining({
          options: [],
        }),
        undefined
      )
    })

    it('should handle balance without transaction', () => {
      const balanceNoTx: AddressBalance = {
        type: BalanceType.NATIVE,
        id: 'native',
      } as AddressBalance

      render(
        <DestinationAddressSelect
          appId="polkadot"
          balance={balanceNoTx}
          index={0}
          polkadotAddresses={mockPolkadotAddresses}
          onDestinationChange={mockOnDestinationChange}
        />
      )

      const select = screen.getByTestId('select') as HTMLSelectElement
      expect(select.value).toBe('1234567890abcdef') // Should use first address as default
    })

    it('should handle very long addresses', () => {
      const longAddresses = ['a'.repeat(100), 'b'.repeat(100)]

      render(
        <DestinationAddressSelect
          appId="polkadot"
          balance={mockBalance}
          index={0}
          polkadotAddresses={longAddresses}
          onDestinationChange={mockOnDestinationChange}
        />
      )

      expect(mockSelectWithCustom).toHaveBeenCalledWith(
        expect.objectContaining({
          options: [
            { value: 'a'.repeat(100), label: 'a'.repeat(100) },
            { value: 'b'.repeat(100), label: 'b'.repeat(100) },
          ],
        }),
        undefined
      )
    })

    it('should handle rapid prop changes', async () => {
      const { rerender } = render(
        <DestinationAddressSelect
          appId="polkadot"
          balance={mockBalance}
          index={0}
          polkadotAddresses={mockPolkadotAddresses}
          onDestinationChange={mockOnDestinationChange}
        />
      )

      // Rapid rerenders with different balances
      for (let i = 0; i < 5; i++) {
        const newBalance: AddressBalance = {
          ...mockBalance,
          transaction: {
            destinationAddress: mockPolkadotAddresses[i % 3],
          },
        }

        rerender(
          <DestinationAddressSelect
            appId="polkadot"
            balance={newBalance}
            index={i}
            polkadotAddresses={mockPolkadotAddresses}
            onDestinationChange={mockOnDestinationChange}
          />
        )
      }

      await waitFor(() => {
        const select = screen.getByTestId('select') as HTMLSelectElement
        expect(select.value).toBe(mockPolkadotAddresses[1])
      })
    })
  })

  describe('disabled state logic', () => {
    it('should be disabled when hasBalance returns false', () => {
      mockHasBalance.mockReturnValue(false)

      render(
        <DestinationAddressSelect
          appId="polkadot"
          balance={mockBalance}
          index={0}
          polkadotAddresses={mockPolkadotAddresses}
          onDestinationChange={mockOnDestinationChange}
        />
      )

      expect(mockHasBalance).toHaveBeenCalledWith([mockBalance])
      expect(screen.getByTestId('select')).toBeDisabled()
    })

    it('should be disabled when no polkadot addresses available', () => {
      render(
        <DestinationAddressSelect
          appId="polkadot"
          balance={mockBalance}
          index={0}
          polkadotAddresses={[]}
          onDestinationChange={mockOnDestinationChange}
        />
      )

      expect(screen.getByTestId('select')).toBeDisabled()
    })

    it('should be enabled when has balance and addresses', () => {
      mockHasBalance.mockReturnValue(true)

      render(
        <DestinationAddressSelect
          appId="polkadot"
          balance={mockBalance}
          index={0}
          polkadotAddresses={mockPolkadotAddresses}
          onDestinationChange={mockOnDestinationChange}
        />
      )

      expect(screen.getByTestId('select')).not.toBeDisabled()
    })
  })

  describe('integration with ExplorerLink', () => {
    it('should pass correct props to ExplorerLink in renderOption', () => {
      render(
        <DestinationAddressSelect
          appId="kusama"
          balance={mockBalance}
          index={0}
          polkadotAddresses={mockPolkadotAddresses}
          onDestinationChange={mockOnDestinationChange}
        />
      )

      const renderOption = mockSelectWithCustom.mock.calls[0][0].renderOption
      const optionElement = renderOption({ value: 'test-address-123', label: 'test-address-123' }, 5)

      render(optionElement)

      expect(mockExplorerLink).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'test-address-123',
          appId: 'kusama',
          explorerLinkType: ExplorerItemType.Address,
          disableTooltip: true,
          hasCopyButton: false,
        }),
        undefined
      )
    })
  })

  describe('observer functionality', () => {
    it.skip('should be wrapped with observer', () => {
      // TODO: review expectations - observer wrapping happens at module level
      // The observer should be called when the component is imported
      render(
        <DestinationAddressSelect
          appId="polkadot"
          balance={mockBalance}
          index={0}
          polkadotAddresses={mockPolkadotAddresses}
          onDestinationChange={mockOnDestinationChange}
        />
      )

      // Observer should have been called at least once during module import
      expect(mockObserver).toHaveBeenCalled()
    })
  })
})
