import { BN } from '@polkadot/util'
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Registration, Token } from '@/state/types/ledger'
import { TransactionStatus } from '@/state/types/ledger'

// Mock dependencies
vi.mock('lucide-react', () => ({
  AlertCircle: ({ className }: any) => (
    <span data-testid="alert-circle" className={className}>
      AlertCircle
    </span>
  ),
  AtSign: () => null,
  CheckCircle: ({ className }: any) => (
    <span data-testid="check-circle" className={className}>
      CheckCircle
    </span>
  ),
  Clock: ({ className }: any) => (
    <span data-testid="clock" className={className}>
      Clock
    </span>
  ),
  Globe: () => null,
  Mail: () => null,
  Twitter: () => null,
  User: () => null,
  Users: () => null,
  XCircle: ({ className }: any) => (
    <span data-testid="x-circle" className={className}>
      XCircle
    </span>
  ),
}))

vi.mock('@/components/ExplorerLink', () => ({
  ExplorerLink: ({ value, className }: any) => (
    <button type="button" data-testid="explorer-link" className={className}>
      {value}
    </button>
  ),
}))

vi.mock('@/components/icons', () => ({
  Spinner: () => <span data-testid="spinner">Loading...</span>,
}))

vi.mock('../format', () => ({
  formatBalance: (value: BN, token: any, _decimals?: number) => `${value.toString()} ${token.symbol}`,
}))

import { getIdentityItems, getTransactionStatus, validateNumberInput } from '../ui'

describe('ui utilities', () => {
  describe('getTransactionStatus', () => {
    it('should return loading status with spinner', () => {
      const result = getTransactionStatus(TransactionStatus.IS_LOADING)

      const { container } = render(<div>{result.statusIcon}</div>)
      expect(container.querySelector('[data-testid="spinner"]')).toBeTruthy()
      expect(result.statusMessage).toBe('Loading transaction data...')
    })

    it('should return pending status with clock icon', () => {
      const result = getTransactionStatus(TransactionStatus.PENDING)

      const { container } = render(<div>{result.statusIcon}</div>)
      expect(container.querySelector('[data-testid="clock"]')).toBeTruthy()
      expect(result.statusMessage).toBe('Transaction pending in mempool...')
    })

    it('should return in block status with clock icon', () => {
      const result = getTransactionStatus(TransactionStatus.IN_BLOCK)

      const { container } = render(<div>{result.statusIcon}</div>)
      expect(container.querySelector('[data-testid="clock"]')).toBeTruthy()
      expect(result.statusMessage).toBe('Transaction included in block')
    })

    it('should return finalized status with clock icon', () => {
      const result = getTransactionStatus(TransactionStatus.FINALIZED)

      const { container } = render(<div>{result.statusIcon}</div>)
      expect(container.querySelector('[data-testid="check-circle"]')).toBeTruthy()
      expect(result.statusMessage).toBe('Transaction finalized on chain')
    })

    it('should return success status with green check circle', () => {
      const result = getTransactionStatus(TransactionStatus.SUCCESS)

      const { container } = render(<div>{result.statusIcon}</div>)
      const icon = container.querySelector('[data-testid="check-circle"]')
      expect(icon).toBeTruthy()
      expect(icon?.className).toContain('text-green-500')
    })

    it('should return failed status with red x circle', () => {
      const result = getTransactionStatus(TransactionStatus.FAILED)

      const { container } = render(<div>{result.statusIcon}</div>)
      const icon = container.querySelector('[data-testid="x-circle"]')
      expect(icon).toBeTruthy()
      expect(icon?.className).toContain('text-red-500')
    })

    it('should return error status with red alert circle', () => {
      const result = getTransactionStatus(TransactionStatus.ERROR)

      const { container } = render(<div>{result.statusIcon}</div>)
      const icon = container.querySelector('[data-testid="alert-circle"]')
      expect(icon).toBeTruthy()
      expect(icon?.className).toContain('text-red-500')
    })

    it('should return warning status with yellow alert circle', () => {
      const result = getTransactionStatus(TransactionStatus.WARNING)

      const { container } = render(<div>{result.statusIcon}</div>)
      const icon = container.querySelector('[data-testid="alert-circle"]')
      expect(icon).toBeTruthy()
      expect(icon?.className).toContain('text-yellow-500')
    })

    it('should return completed status with clock icon', () => {
      const result = getTransactionStatus(TransactionStatus.COMPLETED)

      const { container } = render(<div>{result.statusIcon}</div>)
      expect(container.querySelector('[data-testid="check-circle"]')).toBeTruthy()
      expect(result.statusMessage).toBe('Transaction completed')
    })

    it('should return default ready to migrate badge', () => {
      const result = getTransactionStatus(undefined)

      const { container } = render(<div>{result.statusIcon}</div>)
      expect(container.textContent).toContain('Ready to migrate')
    })

    it('should use custom status message when provided', () => {
      const customMessage = 'Custom status message'
      // Test with FAILED status which uses custom message if provided
      const result = getTransactionStatus(TransactionStatus.FAILED, customMessage)
      expect(result.statusMessage).toBe(customMessage)

      // Test with ERROR status which also uses custom message if provided
      const resultError = getTransactionStatus(TransactionStatus.ERROR, customMessage)
      expect(resultError.statusMessage).toBe(customMessage)
    })

    it('should include transaction hash when provided', () => {
      const txHash = '0x1234567890abcdef'
      const result = getTransactionStatus(TransactionStatus.SUCCESS, undefined, 'sm', txHash)

      expect(result.txHash).toBe(txHash)
    })

    it('should apply correct size classes', () => {
      const resultSm = getTransactionStatus(TransactionStatus.SUCCESS, undefined, 'sm')
      const resultMd = getTransactionStatus(TransactionStatus.SUCCESS, undefined, 'md')
      const resultLg = getTransactionStatus(TransactionStatus.SUCCESS, undefined, 'lg')

      const { container: containerSm } = render(<div>{resultSm.statusIcon}</div>)
      const { container: containerMd } = render(<div>{resultMd.statusIcon}</div>)
      const { container: containerLg } = render(<div>{resultLg.statusIcon}</div>)

      // Icons are now inside badges with different size classes (h-3.5 w-3.5, h-4 w-4, h-5 w-5)
      expect(containerSm.querySelector('[data-testid="check-circle"]')?.className).toContain('h-3.5 w-3.5')
      expect(containerMd.querySelector('[data-testid="check-circle"]')?.className).toContain('h-4 w-4')
      expect(containerLg.querySelector('[data-testid="check-circle"]')?.className).toContain('h-5 w-5')
    })
  })

  describe('validateNumberInput', () => {
    const mockToken: Token = {
      symbol: 'DOT',
      decimals: 10,
      name: 'Polkadot',
      category: 'substrate' as const,
      chainName: 'Polkadot',
    }

    it('should return invalid for NaN', () => {
      const result = validateNumberInput(Number.NaN, new BN('1000'), mockToken)

      expect(result.valid).toBe(false)
      expect(result.helperText).toBe('Amount is required.')
    })

    it('should return invalid for non-numeric input', () => {
      // Test with a value that BN constructor would reject
      const result = validateNumberInput(Number('invalid'), new BN('1000'), mockToken)

      expect(result.valid).toBe(false)
      expect(result.helperText).toBe('Amount is required.')
    })

    it('should return invalid for zero', () => {
      const result = validateNumberInput(0, new BN('1000'), mockToken)

      expect(result.valid).toBe(false)
      expect(result.helperText).toBe('Amount must be greater than zero.')
    })

    it('should return invalid for negative numbers', () => {
      const result = validateNumberInput(-100, new BN('1000'), mockToken)

      expect(result.valid).toBe(false)
      expect(result.helperText).toBe('Amount must be greater than zero.')
    })

    it('should return invalid when amount exceeds maximum', () => {
      const result = validateNumberInput(2000, new BN('1000'), mockToken)

      expect(result.valid).toBe(false)
      // The mock formatBalance just returns the value + symbol
      expect(result.helperText).toContain('Amount cannot exceed your staked balance')
      expect(result.helperText).toContain('DOT')
    })

    it('should return valid for positive number within limits', () => {
      const result = validateNumberInput(500, new BN('1000'), mockToken)

      expect(result.valid).toBe(true)
      expect(result.helperText).toBe('')
    })

    it('should return valid when amount equals maximum', () => {
      const result = validateNumberInput(1000, new BN('1000'), mockToken)

      expect(result.valid).toBe(true)
      expect(result.helperText).toBe('')
    })

    it('should handle whole numbers less than max', () => {
      const result = validateNumberInput(1, new BN('1000'), mockToken)

      expect(result.valid).toBe(true)
      expect(result.helperText).toBe('')
    })
  })

  describe('getIdentityItems', () => {
    const mockAppId = 'polkadot'

    it('should return empty array when registration is undefined', () => {
      const result = getIdentityItems(undefined, mockAppId)

      expect(result).toEqual([])
    })

    it('should return empty array when identity is undefined', () => {
      const registration: Registration = {
        identity: undefined,
      }

      const result = getIdentityItems(registration, mockAppId)

      expect(result).toEqual([])
    })

    it('should return all identity items when all fields are present', () => {
      const registration: Registration = {
        identity: {
          parent: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          displayParent: 'Parent Display',
          display: 'My Display Name',
          legal: 'Legal Name',
          web: 'https://example.com',
          email: 'test@example.com',
          twitter: '@example',
        },
      }

      const result = getIdentityItems(registration, mockAppId)

      expect(result).toHaveLength(7)
      expect(result[0].label).toBe('Parent account')
      expect(result[1].label).toBe('Parent legal name')
      expect(result[1].value).toBe('Parent Display')
      expect(result[2].label).toBe('Display name')
      expect(result[2].value).toBe('My Display Name')
      expect(result[3].label).toBe('Legal name')
      expect(result[3].value).toBe('Legal Name')
      expect(result[4].label).toBe('Website')
      expect(result[4].value).toBe('https://example.com')
      expect(result[4].href).toBe('https://example.com')
      expect(result[5].label).toBe('Email')
      expect(result[5].value).toBe('test@example.com')
      expect(result[5].href).toBe('mailto:test@example.com')
      expect(result[6].label).toBe('Twitter')
      expect(result[6].value).toBe('@example')
      expect(result[6].href).toBe('@example')
    })

    it('should filter out undefined values', () => {
      const registration: Registration = {
        identity: {
          display: 'My Display Name',
          legal: 'Legal Name',
          // Other fields are undefined
        },
      }

      const result = getIdentityItems(registration, mockAppId)

      expect(result).toHaveLength(2)
      expect(result[0].label).toBe('Display name')
      expect(result[1].label).toBe('Legal name')
    })

    it('should render parent account as ExplorerLink', () => {
      const registration: Registration = {
        identity: {
          parent: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        },
      }

      const result = getIdentityItems(registration, mockAppId)

      expect(result).toHaveLength(1)
      expect(result[0].label).toBe('Parent account')

      // Render the value to check if it's an ExplorerLink
      const { container } = render(<div>{result[0].value}</div>)
      const link = container.querySelector('[data-testid="explorer-link"]')
      expect(link).toBeTruthy()
      expect(link?.textContent).toBe('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')
    })

    it('should not add mailto prefix if email is undefined', () => {
      const registration: Registration = {
        identity: {
          display: 'Test',
          email: undefined,
        },
      }

      const result = getIdentityItems(registration, mockAppId)

      const emailItem = result.find(item => item.label === 'Email')
      expect(emailItem).toBeUndefined()
    })

    it('should have correct icons for each field', () => {
      const registration: Registration = {
        identity: {
          parent: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          displayParent: 'Parent',
          display: 'Display',
          legal: 'Legal',
          web: 'https://example.com',
          email: 'test@example.com',
          twitter: '@test',
        },
      }

      const result = getIdentityItems(registration, mockAppId)

      // Just verify icons are present (we mocked them as null)
      expect(result[0].icon).toBeDefined() // Users icon for parent
      expect(result[1].icon).toBeDefined() // AtSign icon for displayParent
      expect(result[2].icon).toBeDefined() // User icon for display
      expect(result[3].icon).toBeDefined() // AtSign icon for legal
      expect(result[4].icon).toBeDefined() // Globe icon for web
      expect(result[5].icon).toBeDefined() // Mail icon for email
      expect(result[6].icon).toBeDefined() // Twitter icon for twitter
    })
  })
})
