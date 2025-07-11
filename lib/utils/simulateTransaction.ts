import { TransactionStatus } from '@/state/types/ledger'

import type { UpdateTransactionStatus } from '../account'

/**
 * Simulates the transaction submission and status updates without actually sending the transaction.
 * Useful for testing UI flows or dry runs.
 * @param updateStatus - Callback to update transaction status
 * @param options - Optional simulation options (success/failure, delays)
 */
export async function simulateAndHandleTransaction(
  updateStatus: UpdateTransactionStatus,
  options?: {
    simulateSuccess?: boolean
    simulateDelayMs?: number
    txHash?: string
    blockHash?: string
    blockNumber?: string
  }
): Promise<void> {
  const {
    simulateSuccess = true,
    simulateDelayMs = 4000,
    txHash = '0xSIMULATED_TX_HASH',
    blockHash = '0xSIMULATED_BLOCK_HASH',
    blockNumber = '0xSIMULATED_BLOCK_NUMBER',
  } = options || {}

  // Helper to wait
  const wait = (ms: number) => new Promise(res => setTimeout(res, ms))

  // Simulate the status updates
  updateStatus(TransactionStatus.IN_BLOCK, 'Transaction is in block', {
    txHash,
    blockHash,
    blockNumber,
  })
  await wait(simulateDelayMs)

  updateStatus(TransactionStatus.COMPLETED, 'Transaction is completed. Waiting confirmation...', {
    txHash,
    blockHash,
    blockNumber,
  })
  await wait(simulateDelayMs)

  updateStatus(TransactionStatus.FINALIZED, 'Transaction is finalized. Waiting the result...', {
    txHash,
    blockHash,
    blockNumber,
  })
  await wait(simulateDelayMs)

  if (simulateSuccess) {
    updateStatus(TransactionStatus.SUCCESS, 'Successful Transaction', {
      txHash,
      blockHash,
      blockNumber,
    })
  } else {
    updateStatus(TransactionStatus.FAILED, 'Simulated transaction failure', {
      txHash,
      blockHash,
      blockNumber,
    })
  }
}
