import { TransactionStatus } from 'state/types/ledger'
import { describe, expect, it, vi } from 'vitest'

import { BN } from '@polkadot/util'
import { getTransactionStatus, validateNumberInput } from '../../utils/ui'
import { mockApp1 } from './__mocks__/mockData'

// Mock lucide-react icons and Spinner
vi.mock('lucide-react', () => ({
  AlertCircle: (props: any) => <div data-testid="alert-circle" {...props} />,
  CheckCircle: (props: any) => <div data-testid="check-circle" {...props} />,
  Clock: (props: any) => <div data-testid="clock" {...props} />,
  XCircle: (props: any) => <div data-testid="x-circle" {...props} />,
}))
vi.mock('@/components/icons', () => ({
  Spinner: () => <div data-testid="spinner" />,
}))

describe('getTransactionStatus', () => {
  it('returns Spinner and message for IS_LOADING', () => {
    const { statusIcon, statusMessage } = getTransactionStatus(TransactionStatus.IS_LOADING)
    expect(statusMessage).toBe('Loading...')
    expect(statusIcon).toMatchSnapshot()
  })
  it('returns Clock and message for PENDING', () => {
    const { statusIcon, statusMessage } = getTransactionStatus(TransactionStatus.PENDING)
    expect(statusMessage).toBe('Transaction pending...')
    expect(statusIcon).toMatchSnapshot()
  })
  it('returns Clock for IN_BLOCK', () => {
    const { statusIcon, statusMessage } = getTransactionStatus(TransactionStatus.IN_BLOCK)
    expect(statusMessage).toBeUndefined()
    expect(statusIcon).toMatchSnapshot()
  })
  it('returns Clock for FINALIZED', () => {
    const { statusIcon, statusMessage } = getTransactionStatus(TransactionStatus.FINALIZED)
    expect(statusMessage).toBeUndefined()
    expect(statusIcon).toMatchSnapshot()
  })
  it('returns CheckCircle for SUCCESS', () => {
    const { statusIcon, statusMessage } = getTransactionStatus(TransactionStatus.SUCCESS)
    expect(statusMessage).toBeUndefined()
    expect(statusIcon).toMatchSnapshot()
  })
  it('returns XCircle for FAILED', () => {
    const { statusIcon, statusMessage } = getTransactionStatus(TransactionStatus.FAILED)
    expect(statusMessage).toBeUndefined()
    expect(statusIcon).toMatchSnapshot()
  })
  it('returns AlertCircle for ERROR', () => {
    const { statusIcon, statusMessage } = getTransactionStatus(TransactionStatus.ERROR)
    expect(statusMessage).toBeUndefined()
    expect(statusIcon).toMatchSnapshot()
  })
  it('returns AlertCircle for WARNING', () => {
    const { statusIcon, statusMessage } = getTransactionStatus(TransactionStatus.WARNING)
    expect(statusMessage).toBeUndefined()
    expect(statusIcon).toMatchSnapshot()
  })
  it('returns Clock for COMPLETED', () => {
    const { statusIcon, statusMessage } = getTransactionStatus(TransactionStatus.COMPLETED)
    expect(statusMessage).toBeUndefined()
    expect(statusIcon).toMatchSnapshot()
  })
  it('returns default for undefined status', () => {
    const { statusIcon, statusMessage } = getTransactionStatus(undefined)
    expect(statusMessage).toBeUndefined()
    expect(statusIcon).toMatchSnapshot()
  })
  it('returns custom message if provided', () => {
    const { statusMessage } = getTransactionStatus(TransactionStatus.SUCCESS, 'Custom!')
    expect(statusMessage).toBe('Custom!')
  })
  it('applies correct icon size', () => {
    const { statusIcon } = getTransactionStatus(TransactionStatus.SUCCESS, undefined, 'lg')
    expect(statusIcon).toMatchSnapshot()
  })
})

describe('validateNumberInput', () => {
  const max = new BN(1000)
  const mockToken = mockApp1.token
  it('returns valid: false and required message for NaN', () => {
    const result = validateNumberInput(Number.NaN, max, mockToken)
    expect(result.valid).toBe(false)
    expect(result.helperText).toBe('Amount is required.')
  })
  it('returns valid: false and number message for non-numeric', () => {
    const result = validateNumberInput('abc' as unknown as number, max, mockToken)
    expect(result.valid).toBe(false)
    expect(result.helperText).toBe('Amount must be a number.')
  })
  it('returns valid: false and greater than zero message for zero or negative', () => {
    expect(validateNumberInput(0, max, mockToken)).toEqual({ valid: false, helperText: 'Amount must be greater than zero.' })
    expect(validateNumberInput(-5, max, mockToken)).toEqual({ valid: false, helperText: 'Amount must be greater than zero.' })
  })
  it('returns valid: false and max message for value above max', () => {
    const result = validateNumberInput(1001, max, mockToken)
    expect(result.valid).toBe(false)
    expect(result.helperText).toBe('Amount cannot exceed your staked balance (0.0000001 DOT).')
  })
  it('returns valid: true for valid numbers within range', () => {
    expect(validateNumberInput(123, max, mockToken)).toEqual({ valid: true, helperText: '' })
    expect(validateNumberInput(123.45, max, mockToken)).toEqual({ valid: true, helperText: '' })
    expect(validateNumberInput(1000, max, mockToken)).toEqual({ valid: true, helperText: '' })
  })
})
