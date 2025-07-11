import { vi } from 'vitest'

/**
 * Common mock setup for dialog components
 */
export function setupDialogMocks() {
  vi.mock('@/components/ui/dialog', () => ({
    Dialog: vi.fn(({ children, open, onOpenChange }: any) =>
      open
        ? {
            type: 'div',
            props: {
              'data-testid': 'dialog',
              role: 'dialog',
              onBlur: () => onOpenChange?.(false),
              children,
            },
          }
        : null
    ),
    DialogContent: vi.fn(({ children }: any) => ({
      type: 'div',
      props: { 'data-testid': 'dialog-content', children },
    })),
    DialogHeader: vi.fn(({ children }: any) => ({
      type: 'div',
      props: { 'data-testid': 'dialog-header', children },
    })),
    DialogTitle: vi.fn(({ children }: any) => ({
      type: 'h2',
      props: { 'data-testid': 'dialog-title', children },
    })),
    DialogDescription: vi.fn(({ children }: any) => ({
      type: 'div',
      props: { 'data-testid': 'dialog-description', children },
    })),
    DialogBody: vi.fn(({ children }: any) => ({
      type: 'div',
      props: { 'data-testid': 'dialog-body', children },
    })),
    DialogFooter: vi.fn(({ children }: any) => ({
      type: 'div',
      props: { 'data-testid': 'dialog-footer', children },
    })),
  }))
}

/**
 * Common mock setup for Polkadot API
 */
export function setupApiMocks() {
  const mockApi = {
    query: {
      system: {
        account: vi.fn().mockResolvedValue({
          data: {
            free: '1000000000000',
            reserved: '0',
            frozen: '0',
          },
        }),
      },
    },
    disconnect: vi.fn(),
  }

  return mockApi
}

/**
 * Common mock setup for Explorer Link component
 */
export function setupExplorerLinkMock() {
  vi.mock('@/components/ExplorerLink', () => ({
    ExplorerLink: vi.fn(({ value, appId, explorerLinkType, size }: any) => ({
      type: 'div',
      props: {
        'data-testid': 'explorer-link',
        'data-value': value,
        'data-app-id': appId,
        'data-explorer-type': explorerLinkType,
        'data-size': size,
        children: value,
      },
    })),
  }))
}

/**
 * Common mock setup for transaction hooks
 */
export function setupTransactionMocks() {
  const mockTransactionStatus = {
    runTransaction: vi.fn(),
    txStatus: null,
    clearTx: vi.fn(),
    isTxFinished: false,
    isTxFailed: false,
    updateSynchronization: vi.fn(),
    isSynchronizing: false,
    getEstimatedFee: vi.fn(),
    estimatedFee: undefined,
    estimatedFeeLoading: false,
  }

  vi.mock('@/components/hooks/useTransactionStatus', () => ({
    useTransactionStatus: vi.fn(() => mockTransactionStatus),
  }))

  return mockTransactionStatus
}

/**
 * Common mock setup for format utilities
 */
export function setupFormatMocks() {
  vi.mock('@/lib/utils/format', () => ({
    formatBalance: vi.fn((balance, token) => (balance ? `${balance.toString()} ${token.symbol}` : `0 ${token.symbol}`)),
    convertToRawUnits: vi.fn((amount, token) => {
      const BN = require('@polkadot/util').BN
      return new BN(amount * 10 ** token.decimals)
    }),
  }))
}

/**
 * Setup all common mocks for a test suite
 */
export function setupCommonMocks() {
  setupDialogMocks()
  setupExplorerLinkMock()
  setupTransactionMocks()
  setupFormatMocks()

  // Mock console methods to reduce noise in tests
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
}

/**
 * Clean up all mocks after tests
 */
export function cleanupMocks() {
  vi.clearAllMocks()
  vi.restoreAllMocks()
}
