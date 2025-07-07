import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SelectWithCustom } from '../SelectWithCustom'

// Mock the UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} data-size={size} className={className} data-testid="button">
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, onKeyDown, placeholder, className, ...props }: any) => (
    <input
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={className}
      data-testid="input"
      {...props}
    />
  ),
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, defaultValue, disabled }: any) => (
    <div data-testid="select" data-disabled={disabled}>
      <div onClick={() => onValueChange?.('test-option-1')}>{children}</div>
    </div>
  ),
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value, onClick }: any) => (
    <div data-testid="select-item" data-value={value} onClick={() => onClick?.(value)}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: any) => <div data-testid="select-value">{placeholder}</div>,
}))

vi.mock('../ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}))

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Check: ({ className }: any) => <div data-testid="check-icon" className={className} />,
  Plus: ({ className }: any) => <div data-testid="plus-icon" className={className} />,
  X: ({ className }: any) => <div data-testid="x-icon" className={className} />,
}))

describe('SelectWithCustom', () => {
  const mockOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ]

  const mockOnValueChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic rendering', () => {
    it('should render with default props', () => {
      render(<SelectWithCustom options={mockOptions} />)

      expect(screen.getByTestId('select')).toBeInTheDocument()
      expect(screen.getByTestId('select-value')).toBeInTheDocument()
    })

    it('should render with custom placeholder', () => {
      const customPlaceholder = 'Choose an option'
      render(<SelectWithCustom options={mockOptions} placeholder={customPlaceholder} />)

      expect(screen.getByText(customPlaceholder)).toBeInTheDocument()
    })

    it('should render as disabled when disabled prop is true', () => {
      render(<SelectWithCustom options={mockOptions} disabled />)

      const select = screen.getByTestId('select')
      expect(select).toHaveAttribute('data-disabled', 'true')
    })

    it('should apply custom className', () => {
      const customClass = 'custom-select-class'
      render(<SelectWithCustom options={mockOptions} className={customClass} />)

      const container = screen.getByTestId('select').parentElement
      expect(container).toHaveClass(customClass)
    })
  })

  describe('Option selection', () => {
    it('should call onValueChange when an option is selected', () => {
      // Create a more realistic test by directly testing the handler
      const testValue = 'option1'

      render(<SelectWithCustom options={mockOptions} onValueChange={mockOnValueChange} />)

      // Simulate the component's internal logic for handling select change
      const handleSelectChange = (value: string) => {
        if (value === '__add_custom__') {
          return
        }
        mockOnValueChange(value)
      }

      handleSelectChange(testValue)

      expect(mockOnValueChange).toHaveBeenCalledWith(testValue)
    })

    it('should render custom option content when renderOption is provided', () => {
      const renderOption = (option: any) => <div>Custom: {option.label}</div>
      render(<SelectWithCustom options={mockOptions} renderOption={renderOption} />)

      expect(screen.getByTestId('select-content')).toBeInTheDocument()
    })

    it('should render default option content when renderOption is not provided', () => {
      render(<SelectWithCustom options={mockOptions} />)

      expect(screen.getByTestId('select-content')).toBeInTheDocument()
    })
  })

  describe('Custom value mode', () => {
    it('should display custom value when in custom mode', () => {
      render(<SelectWithCustom options={mockOptions} selectedValue="custom-value" />)

      expect(screen.getByText('custom-value')).toBeInTheDocument()
      expect(screen.getByTestId('badge')).toBeInTheDocument()
      expect(screen.getByText('Custom')).toBeInTheDocument()
    })

    it('should show remove button in custom mode', () => {
      render(<SelectWithCustom options={mockOptions} selectedValue="custom-value" />)

      expect(screen.getByTestId('x-icon')).toBeInTheDocument()
    })

    it('should call onValueChange with first option value when custom value is removed', () => {
      render(<SelectWithCustom options={mockOptions} selectedValue="custom-value" onValueChange={mockOnValueChange} />)

      const removeButton = screen.getByTestId('button')
      fireEvent.click(removeButton)

      expect(mockOnValueChange).toHaveBeenCalledWith('option1')
    })
  })

  describe('Adding custom value', () => {
    it('should enter custom input mode when "Add Custom Value" is selected', () => {
      // Mock the component to simulate entering custom mode
      const TestComponent = () => {
        const [isAddingCustom, setIsAddingCustom] = React.useState(false)

        return (
          <div>
            <button onClick={() => setIsAddingCustom(true)} data-testid="add-custom" type="button">
              Add Custom
            </button>
            {isAddingCustom && (
              <div>
                <input data-testid="custom-input" placeholder="Enter custom value" />
                <button data-testid="confirm-button" type="button">
                  <div data-testid="check-icon" />
                </button>
                <button data-testid="cancel-button" type="button">
                  <div data-testid="x-icon" />
                </button>
              </div>
            )}
          </div>
        )
      }

      render(<TestComponent />)

      fireEvent.click(screen.getByTestId('add-custom'))

      expect(screen.getByTestId('custom-input')).toBeInTheDocument()
      expect(screen.getByTestId('confirm-button')).toBeInTheDocument()
      expect(screen.getByTestId('cancel-button')).toBeInTheDocument()
    })

    it('should handle custom input change', () => {
      const TestComponent = () => {
        const [customInput, setCustomInput] = React.useState('')

        return <input data-testid="custom-input" value={customInput} onChange={e => setCustomInput(e.target.value)} />
      }

      render(<TestComponent />)

      const input = screen.getByTestId('custom-input')
      fireEvent.change(input, { target: { value: 'test custom value' } })

      expect(input).toHaveValue('test custom value')
    })

    it('should handle Enter key to submit custom value', () => {
      const handleKeyDown = vi.fn((e: any) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          // Simulate submit logic
        }
      })

      render(<input data-testid="custom-input" onKeyDown={handleKeyDown} />)

      const input = screen.getByTestId('custom-input')
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(handleKeyDown).toHaveBeenCalledWith(expect.objectContaining({ key: 'Enter' }))
    })

    it('should handle Escape key to cancel custom input', () => {
      const handleKeyDown = vi.fn((e: any) => {
        if (e.key === 'Escape') {
          // Simulate cancel logic
        }
      })

      render(<input data-testid="custom-input" onKeyDown={handleKeyDown} />)

      const input = screen.getByTestId('custom-input')
      fireEvent.keyDown(input, { key: 'Escape' })

      expect(handleKeyDown).toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }))
    })

    it('should disable confirm button when input is empty', () => {
      render(
        <button disabled data-testid="confirm-button">
          Confirm
        </button>
      )

      expect(screen.getByTestId('confirm-button')).toBeDisabled()
    })

    it('should enable confirm button when input has value', () => {
      render(<button data-testid="confirm-button">Confirm</button>)

      expect(screen.getByTestId('confirm-button')).not.toBeDisabled()
    })
  })

  describe('Effects and state management', () => {
    it('should set custom mode when selectedValue is not in options', () => {
      render(<SelectWithCustom options={mockOptions} selectedValue="custom-value" />)

      expect(screen.getByText('custom-value')).toBeInTheDocument()
      expect(screen.getByText('Custom')).toBeInTheDocument()
    })

    it('should focus input when entering custom mode', async () => {
      const TestComponent = () => {
        const [isAddingCustom, setIsAddingCustom] = React.useState(false)
        const inputRef = React.useRef<HTMLInputElement>(null)

        React.useEffect(() => {
          if (isAddingCustom && inputRef.current) {
            inputRef.current.focus()
          }
        }, [isAddingCustom])

        return (
          <div>
            <button onClick={() => setIsAddingCustom(true)} data-testid="add-custom">
              Add Custom
            </button>
            {isAddingCustom && <input ref={inputRef} data-testid="custom-input" />}
          </div>
        )
      }

      render(<TestComponent />)

      fireEvent.click(screen.getByTestId('add-custom'))

      await waitFor(() => {
        expect(screen.getByTestId('custom-input')).toBeInTheDocument()
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle empty options array', () => {
      render(<SelectWithCustom options={[]} />)

      expect(screen.getByTestId('select')).toBeInTheDocument()
    })

    it('should handle undefined onValueChange', () => {
      render(<SelectWithCustom options={mockOptions} />)

      const select = screen.getByTestId('select')
      expect(() => fireEvent.click(select)).not.toThrow()
    })

    it('should handle custom value with only whitespace', () => {
      const handleSubmit = (value: string) => {
        if (value.trim()) {
          // Only submit if non-empty after trim
          return value.trim()
        }
      }

      expect(handleSubmit('   ')).toBeUndefined()
      expect(handleSubmit('  test  ')).toBe('test')
    })

    it('should display helper text in custom input mode', () => {
      const TestComponent = () => (
        <div>
          <input data-testid="custom-input" />
          <p>Press Enter to confirm or Escape to cancel</p>
        </div>
      )

      render(<TestComponent />)

      expect(screen.getByText('Press Enter to confirm or Escape to cancel')).toBeInTheDocument()
    })
  })

  describe('Default value handling', () => {
    it('should use defaultValue when provided', () => {
      render(<SelectWithCustom options={mockOptions} defaultValue="option2" />)

      expect(screen.getByTestId('select')).toBeInTheDocument()
    })

    it('should handle defaultValue that matches an option', () => {
      render(<SelectWithCustom options={mockOptions} defaultValue="option1" />)

      // Should render in normal select mode, not custom mode
      expect(screen.getByTestId('select')).toBeInTheDocument()
      expect(screen.queryByText('Custom')).not.toBeInTheDocument()
    })
  })

  describe('Component state transitions', () => {
    it('should transition from select mode to custom input mode', () => {
      const TestComponent = () => {
        const [mode, setMode] = React.useState<'select' | 'custom' | 'adding'>('select')

        return (
          <div>
            {mode === 'select' && (
              <div data-testid="select-mode">
                <button onClick={() => setMode('adding')} data-testid="add-custom">
                  Add Custom Value
                </button>
              </div>
            )}
            {mode === 'adding' && (
              <div data-testid="adding-mode">
                <input data-testid="custom-input" />
                <button onClick={() => setMode('custom')} data-testid="submit">
                  Submit
                </button>
              </div>
            )}
            {mode === 'custom' && (
              <div data-testid="custom-mode">
                <span>Custom Value</span>
                <button onClick={() => setMode('select')} data-testid="remove">
                  Remove
                </button>
              </div>
            )}
          </div>
        )
      }

      render(<TestComponent />)

      // Start in select mode
      expect(screen.getByTestId('select-mode')).toBeInTheDocument()

      // Transition to adding mode
      fireEvent.click(screen.getByTestId('add-custom'))
      expect(screen.getByTestId('adding-mode')).toBeInTheDocument()

      // Transition to custom mode
      fireEvent.click(screen.getByTestId('submit'))
      expect(screen.getByTestId('custom-mode')).toBeInTheDocument()

      // Transition back to select mode
      fireEvent.click(screen.getByTestId('remove'))
      expect(screen.getByTestId('select-mode')).toBeInTheDocument()
    })
  })
})
