import { TransactionStatus } from '@/state/types/ledger'
import { BN } from '@polkadot/util'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useTransactionStatus } from '../useTransactionStatus'

describe('useTransactionStatus hook', () => {
  const mockTransactionFn = vi.fn()
  const mockFeeTxFn = vi.fn()
  const mockSyncFn = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should return correct initial state', () => {
      const { result } = renderHook(() => useTransactionStatus(mockTransactionFn))

      expect(result.current.txStatus).toBeUndefined()
      expect(result.current.isTxFinished).toBe(false)
      expect(result.current.isTxFailed).toBe(false)
      expect(result.current.isSynchronizing).toBe(false)
      expect(result.current.estimatedFee).toBeUndefined()
      expect(result.current.estimatedFeeLoading).toBe(false)
      expect(typeof result.current.runTransaction).toBe('function')
      expect(typeof result.current.updateSynchronization).toBe('function')
      expect(typeof result.current.getEstimatedFee).toBe('function')
      expect(typeof result.current.clearTx).toBe('function')
    })
  })

  describe('runTransaction', () => {
    it('should set initial loading status and call transaction function', async () => {
      mockTransactionFn.mockImplementation(async updateTxStatus => {
        updateTxStatus(TransactionStatus.SUCCESS, 'Transaction completed')
      })

      const { result } = renderHook(() => useTransactionStatus(mockTransactionFn))

      await act(async () => {
        await result.current.runTransaction('arg1', 'arg2')
      })

      expect(mockTransactionFn).toHaveBeenCalledWith(expect.any(Function), 'arg1', 'arg2')
      expect(result.current.isTxFinished).toBe(true)
      expect(result.current.txStatus?.status).toBe(TransactionStatus.SUCCESS)
      expect(result.current.txStatus?.statusMessage).toBe('Transaction completed')
    })

    it('should handle transaction failure', async () => {
      mockTransactionFn.mockImplementation(async updateTxStatus => {
        updateTxStatus(TransactionStatus.FAILED, 'Transaction failed')
      })

      const { result } = renderHook(() => useTransactionStatus(mockTransactionFn))

      await act(async () => {
        await result.current.runTransaction()
      })

      expect(result.current.isTxFailed).toBe(true)
      expect(result.current.txStatus?.status).toBe(TransactionStatus.FAILED)
      expect(result.current.txStatus?.statusMessage).toBe('Transaction failed')
    })

    it('should handle transaction error status', async () => {
      mockTransactionFn.mockImplementation(async updateTxStatus => {
        updateTxStatus(TransactionStatus.ERROR, 'Transaction error')
      })

      const { result } = renderHook(() => useTransactionStatus(mockTransactionFn))

      await act(async () => {
        await result.current.runTransaction()
      })

      expect(result.current.isTxFailed).toBe(true)
      expect(result.current.txStatus?.status).toBe(TransactionStatus.ERROR)
    })

    it('should update transaction status with hash and block details', async () => {
      const txDetails = {
        txHash: '0x123',
        blockHash: '0x456',
        blockNumber: 100,
      }

      mockTransactionFn.mockImplementation(async updateTxStatus => {
        updateTxStatus(TransactionStatus.SUCCESS, 'Transaction completed', undefined, txDetails)
      })

      const { result } = renderHook(() => useTransactionStatus(mockTransactionFn))

      await act(async () => {
        await result.current.runTransaction()
      })

      expect(result.current.txStatus).toEqual({
        status: TransactionStatus.SUCCESS,
        statusMessage: 'Transaction completed',
        dispatchError: undefined,
        hash: '0x123',
        blockHash: '0x456',
        blockNumber: 100,
      })
    })
  })

  describe('getEstimatedFee', () => {
    it('should return undefined when no fee function is provided', async () => {
      const { result } = renderHook(() => useTransactionStatus(mockTransactionFn))

      const fee = await act(async () => {
        return await result.current.getEstimatedFee('arg1')
      })

      expect(fee).toBeUndefined()
      expect(result.current.estimatedFee).toBeUndefined()
      expect(result.current.estimatedFeeLoading).toBe(false)
    })

    it('should calculate and return estimated fee', async () => {
      const expectedFee = new BN(1000)
      mockFeeTxFn.mockResolvedValue(expectedFee)

      const { result } = renderHook(() => useTransactionStatus(mockTransactionFn, mockFeeTxFn))

      await act(async () => {
        await result.current.getEstimatedFee('arg1', 'arg2')
      })

      expect(mockFeeTxFn).toHaveBeenCalledWith('arg1', 'arg2')
      expect(result.current.estimatedFee).toBe(expectedFee)
      expect(result.current.estimatedFeeLoading).toBe(false)
    })

    it('should handle fee loading state correctly', async () => {
      const expectedFee = new BN(2000)
      let resolvePromise: (value: BN) => void
      const feePromise = new Promise<BN>(resolve => {
        resolvePromise = resolve
      })
      mockFeeTxFn.mockReturnValue(feePromise)

      const { result } = renderHook(() => useTransactionStatus(mockTransactionFn, mockFeeTxFn))

      // Start fee calculation
      act(() => {
        result.current.getEstimatedFee('arg1')
      })

      // Should be loading
      expect(result.current.estimatedFeeLoading).toBe(true)

      // Resolve the fee calculation
      await act(async () => {
        resolvePromise(expectedFee)
        await feePromise
      })

      expect(result.current.estimatedFeeLoading).toBe(false)
      expect(result.current.estimatedFee).toBe(expectedFee)
    })
  })

  describe('updateSynchronization', () => {
    it('should do nothing when no sync function is provided', async () => {
      const { result } = renderHook(() => useTransactionStatus(mockTransactionFn))

      await act(async () => {
        await result.current.updateSynchronization()
      })

      expect(result.current.isSynchronizing).toBe(false)
    })

    it('should execute sync function and track synchronization state', async () => {
      let resolveSyncPromise: () => void
      const syncPromise = new Promise<void>(resolve => {
        resolveSyncPromise = resolve
      })
      mockSyncFn.mockReturnValue(syncPromise)

      const { result } = renderHook(() => useTransactionStatus(mockTransactionFn))

      // Start synchronization
      act(() => {
        result.current.updateSynchronization(mockSyncFn, 'syncArg1', 'syncArg2')
      })

      // Should be synchronizing
      expect(result.current.isSynchronizing).toBe(true)

      // Complete synchronization
      await act(async () => {
        resolveSyncPromise()
        await syncPromise
      })

      expect(mockSyncFn).toHaveBeenCalledWith('syncArg1', 'syncArg2')
      expect(result.current.isSynchronizing).toBe(false)
    })
  })

  describe('clearTx', () => {
    it('should reset transaction status and finished state', async () => {
      // First run a transaction
      mockTransactionFn.mockImplementation(async updateTxStatus => {
        updateTxStatus(TransactionStatus.SUCCESS, 'Transaction completed')
      })

      const { result } = renderHook(() => useTransactionStatus(mockTransactionFn))

      await act(async () => {
        await result.current.runTransaction()
      })

      // Verify transaction ran
      expect(result.current.txStatus).toBeDefined()
      expect(result.current.isTxFinished).toBe(true)

      // Clear transaction
      act(() => {
        result.current.clearTx()
      })

      expect(result.current.txStatus).toBeUndefined()
      expect(result.current.isTxFinished).toBe(false)
    })
  })

  describe('isTxFailed computed state', () => {
    it('should correctly identify non-failed states', async () => {
      mockTransactionFn.mockImplementation(async updateTxStatus => {
        updateTxStatus(TransactionStatus.SUCCESS, 'Success')
      })

      const { result } = renderHook(() => useTransactionStatus(mockTransactionFn))

      await act(async () => {
        await result.current.runTransaction()
      })

      expect(result.current.isTxFailed).toBe(false)
    })

    it('should handle missing transaction status gracefully', () => {
      const { result } = renderHook(() => useTransactionStatus(mockTransactionFn))

      expect(result.current.isTxFailed).toBe(false)
    })

    it('should correctly identify loading state as not failed', async () => {
      // TODO: review expectations - verify if IS_LOADING should be considered non-failed
      mockTransactionFn.mockImplementation(async updateTxStatus => {
        updateTxStatus(TransactionStatus.IS_LOADING, 'Loading')
      })

      const { result } = renderHook(() => useTransactionStatus(mockTransactionFn))

      await act(async () => {
        await result.current.runTransaction()
      })

      expect(result.current.isTxFailed).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle updateTxStatus with partial transaction details', async () => {
      mockTransactionFn.mockImplementation(async updateTxStatus => {
        updateTxStatus(TransactionStatus.SUCCESS, 'Success', undefined, { txHash: '0x123' })
      })

      const { result } = renderHook(() => useTransactionStatus(mockTransactionFn))

      await act(async () => {
        await result.current.runTransaction()
      })

      expect(result.current.txStatus).toEqual({
        status: TransactionStatus.SUCCESS,
        statusMessage: 'Success',
        dispatchError: undefined,
        hash: '0x123',
        blockHash: undefined,
        blockNumber: undefined,
      })
    })

    it('should handle multiple status updates correctly', async () => {
      mockTransactionFn.mockImplementation(async updateTxStatus => {
        updateTxStatus(TransactionStatus.IS_LOADING, 'Starting')
        updateTxStatus(TransactionStatus.PENDING, 'Pending')
        updateTxStatus(TransactionStatus.SUCCESS, 'Completed')
      })

      const { result } = renderHook(() => useTransactionStatus(mockTransactionFn))

      await act(async () => {
        await result.current.runTransaction()
      })

      // Should have the final status
      expect(result.current.txStatus?.status).toBe(TransactionStatus.SUCCESS)
      expect(result.current.txStatus?.statusMessage).toBe('Completed')
      expect(result.current.isTxFailed).toBe(false)
    })

    it('should handle dispatchError parameter correctly', async () => {
      const dispatchError = 'Module error: BadOrigin'
      mockTransactionFn.mockImplementation(async updateTxStatus => {
        updateTxStatus(TransactionStatus.FAILED, 'Transaction failed', dispatchError, { txHash: '0xabc' })
      })

      const { result } = renderHook(() => useTransactionStatus(mockTransactionFn))

      await act(async () => {
        await result.current.runTransaction()
      })

      expect(result.current.txStatus).toEqual({
        status: TransactionStatus.FAILED,
        statusMessage: 'Transaction failed',
        dispatchError: 'Module error: BadOrigin',
        hash: '0xabc',
        blockHash: undefined,
        blockNumber: undefined,
      })
      expect(result.current.isTxFailed).toBe(true)
    })
  })
})
