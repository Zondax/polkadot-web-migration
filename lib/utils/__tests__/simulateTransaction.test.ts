import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TransactionStatus } from '@/state/types/ledger'
import { simulateAndHandleTransaction } from '../simulateTransaction'

describe('simulateAndHandleTransaction', () => {
  let mockUpdateStatus: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockUpdateStatus = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('successful transaction simulation', () => {
    it('should simulate successful transaction with default options', async () => {
      const promise = simulateAndHandleTransaction(mockUpdateStatus)

      // Should immediately call IN_BLOCK status
      expect(mockUpdateStatus).toHaveBeenCalledWith(TransactionStatus.IN_BLOCK, 'Transaction is in block', {
        txHash: '0xSIMULATED_TX_HASH',
        blockHash: '0xSIMULATED_BLOCK_HASH',
        blockNumber: '0xSIMULATED_BLOCK_NUMBER',
      })
      expect(mockUpdateStatus).toHaveBeenCalledTimes(1)

      // Advance timer and check COMPLETED status
      await vi.advanceTimersByTimeAsync(4000)
      expect(mockUpdateStatus).toHaveBeenCalledWith(TransactionStatus.COMPLETED, 'Transaction is completed. Waiting confirmation...', {
        txHash: '0xSIMULATED_TX_HASH',
        blockHash: '0xSIMULATED_BLOCK_HASH',
        blockNumber: '0xSIMULATED_BLOCK_NUMBER',
      })
      expect(mockUpdateStatus).toHaveBeenCalledTimes(2)

      // Advance timer and check FINALIZED status
      await vi.advanceTimersByTimeAsync(4000)
      expect(mockUpdateStatus).toHaveBeenCalledWith(TransactionStatus.FINALIZED, 'Transaction is finalized. Waiting the result...', {
        txHash: '0xSIMULATED_TX_HASH',
        blockHash: '0xSIMULATED_BLOCK_HASH',
        blockNumber: '0xSIMULATED_BLOCK_NUMBER',
      })
      expect(mockUpdateStatus).toHaveBeenCalledTimes(3)

      // Advance timer and check SUCCESS status
      await vi.advanceTimersByTimeAsync(4000)
      expect(mockUpdateStatus).toHaveBeenCalledWith(TransactionStatus.SUCCESS, 'Successful Transaction', {
        txHash: '0xSIMULATED_TX_HASH',
        blockHash: '0xSIMULATED_BLOCK_HASH',
        blockNumber: '0xSIMULATED_BLOCK_NUMBER',
      })
      expect(mockUpdateStatus).toHaveBeenCalledTimes(4)

      await promise
    })

    it('should use custom transaction details when provided', async () => {
      const customOptions = {
        txHash: '0xCUSTOM_TX_HASH',
        blockHash: '0xCUSTOM_BLOCK_HASH',
        blockNumber: '0xCUSTOM_BLOCK_NUMBER',
      }

      const promise = simulateAndHandleTransaction(mockUpdateStatus, customOptions)

      expect(mockUpdateStatus).toHaveBeenCalledWith(TransactionStatus.IN_BLOCK, 'Transaction is in block', {
        txHash: '0xCUSTOM_TX_HASH',
        blockHash: '0xCUSTOM_BLOCK_HASH',
        blockNumber: '0xCUSTOM_BLOCK_NUMBER',
      })

      await vi.runAllTimersAsync()
      await promise
    })

    it('should use custom delay when provided', async () => {
      const promise = simulateAndHandleTransaction(mockUpdateStatus, {
        simulateDelayMs: 1000,
      })

      expect(mockUpdateStatus).toHaveBeenCalledTimes(1)

      // First delay
      await vi.advanceTimersByTimeAsync(1000)
      expect(mockUpdateStatus).toHaveBeenCalledTimes(2)

      // Second delay
      await vi.advanceTimersByTimeAsync(1000)
      expect(mockUpdateStatus).toHaveBeenCalledTimes(3)

      // Third delay
      await vi.advanceTimersByTimeAsync(1000)
      expect(mockUpdateStatus).toHaveBeenCalledTimes(4)

      await promise
    })
  })

  describe('failed transaction simulation', () => {
    it('should simulate failed transaction when simulateSuccess is false', async () => {
      const promise = simulateAndHandleTransaction(mockUpdateStatus, {
        simulateSuccess: false,
      })

      // Run through all the intermediate states
      await vi.advanceTimersByTimeAsync(4000) // IN_BLOCK -> COMPLETED
      await vi.advanceTimersByTimeAsync(4000) // COMPLETED -> FINALIZED
      await vi.advanceTimersByTimeAsync(4000) // FINALIZED -> FAILED

      expect(mockUpdateStatus).toHaveBeenLastCalledWith(TransactionStatus.FAILED, 'Simulated transaction failure', {
        txHash: '0xSIMULATED_TX_HASH',
        blockHash: '0xSIMULATED_BLOCK_HASH',
        blockNumber: '0xSIMULATED_BLOCK_NUMBER',
      })
      expect(mockUpdateStatus).toHaveBeenCalledTimes(4)

      await promise
    })

    it('should complete all status updates even for failed transactions', async () => {
      const promise = simulateAndHandleTransaction(mockUpdateStatus, {
        simulateSuccess: false,
        simulateDelayMs: 100,
      })

      const expectedStatuses = [
        TransactionStatus.IN_BLOCK,
        TransactionStatus.COMPLETED,
        TransactionStatus.FINALIZED,
        TransactionStatus.FAILED,
      ]

      for (let i = 0; i < expectedStatuses.length; i++) {
        if (i > 0) {
          await vi.advanceTimersByTimeAsync(100)
        }
        expect(mockUpdateStatus).toHaveBeenCalledTimes(i + 1)
        expect(mockUpdateStatus).toHaveBeenNthCalledWith(i + 1, expectedStatuses[i], expect.any(String), expect.any(Object))
      }

      await promise
    })
  })

  describe('edge cases', () => {
    it('should handle undefined options', async () => {
      const promise = simulateAndHandleTransaction(mockUpdateStatus, undefined)

      expect(mockUpdateStatus).toHaveBeenCalledWith(TransactionStatus.IN_BLOCK, 'Transaction is in block', {
        txHash: '0xSIMULATED_TX_HASH',
        blockHash: '0xSIMULATED_BLOCK_HASH',
        blockNumber: '0xSIMULATED_BLOCK_NUMBER',
      })

      await vi.runAllTimersAsync()
      await promise
    })

    it('should handle empty options object', async () => {
      const promise = simulateAndHandleTransaction(mockUpdateStatus, {})

      expect(mockUpdateStatus).toHaveBeenCalledWith(TransactionStatus.IN_BLOCK, 'Transaction is in block', {
        txHash: '0xSIMULATED_TX_HASH',
        blockHash: '0xSIMULATED_BLOCK_HASH',
        blockNumber: '0xSIMULATED_BLOCK_NUMBER',
      })

      await vi.runAllTimersAsync()
      await promise
    })

    it('should handle zero delay', async () => {
      const promise = simulateAndHandleTransaction(mockUpdateStatus, {
        simulateDelayMs: 0,
      })

      // All status updates should happen immediately
      await vi.runAllTimersAsync()

      expect(mockUpdateStatus).toHaveBeenCalledTimes(4)
      expect(mockUpdateStatus).toHaveBeenLastCalledWith(TransactionStatus.SUCCESS, 'Successful Transaction', expect.any(Object))

      await promise
    })

    it('should handle partial options', async () => {
      const promise = simulateAndHandleTransaction(mockUpdateStatus, {
        txHash: '0xONLY_TX_HASH',
        // blockHash and blockNumber will use defaults
      })

      expect(mockUpdateStatus).toHaveBeenCalledWith(TransactionStatus.IN_BLOCK, 'Transaction is in block', {
        txHash: '0xONLY_TX_HASH',
        blockHash: '0xSIMULATED_BLOCK_HASH',
        blockNumber: '0xSIMULATED_BLOCK_NUMBER',
      })

      await vi.runAllTimersAsync()
      await promise
    })
  })

  describe('status update sequence', () => {
    it('should call status updates in correct order', async () => {
      const statusOrder: TransactionStatus[] = []
      mockUpdateStatus.mockImplementation((status: TransactionStatus) => {
        statusOrder.push(status)
      })

      const promise = simulateAndHandleTransaction(mockUpdateStatus, {
        simulateDelayMs: 10,
      })

      await vi.runAllTimersAsync()
      await promise

      expect(statusOrder).toEqual([
        TransactionStatus.IN_BLOCK,
        TransactionStatus.COMPLETED,
        TransactionStatus.FINALIZED,
        TransactionStatus.SUCCESS,
      ])
    })

    it('should pass correct messages for each status', async () => {
      const messages: string[] = []
      mockUpdateStatus.mockImplementation((_status: TransactionStatus, message: string) => {
        messages.push(message)
      })

      const promise = simulateAndHandleTransaction(mockUpdateStatus)

      await vi.runAllTimersAsync()
      await promise

      expect(messages).toEqual([
        'Transaction is in block',
        'Transaction is completed. Waiting confirmation...',
        'Transaction is finalized. Waiting the result...',
        'Successful Transaction',
      ])
    })

    it('should maintain consistent transaction details throughout simulation', async () => {
      const options = {
        txHash: '0xCONSISTENT_TX',
        blockHash: '0xCONSISTENT_BLOCK',
        blockNumber: '12345',
      }

      const transactionDetails: any[] = []
      mockUpdateStatus.mockImplementation((_status: TransactionStatus, _message: string, details: any) => {
        transactionDetails.push(details)
      })

      const promise = simulateAndHandleTransaction(mockUpdateStatus, options)

      await vi.runAllTimersAsync()
      await promise

      // All calls should have the same transaction details
      expect(transactionDetails).toHaveLength(4)
      for (const details of transactionDetails) {
        expect(details).toEqual({
          txHash: '0xCONSISTENT_TX',
          blockHash: '0xCONSISTENT_BLOCK',
          blockNumber: '12345',
        })
      }
    })
  })
})
