import type { BN } from '@polkadot/util'
import { useCallback, useMemo, useState } from 'react'

import type { UpdateTransactionStatus } from '@/lib/account'
import { TransactionStatus, type Transaction } from '@/state/types/ledger'

type GenericFunction = (...args: any[]) => Promise<void>

interface TransactionStatusReturn<T extends GenericFunction> {
  runTransaction: (...args: Parameters<T>) => Promise<void>
  txStatus: Transaction | undefined
  isTxFinished: boolean
  isTxFailed: boolean
  updateSynchronization: (syncFn?: GenericFunction, ...args: any[]) => Promise<void>
  isSynchronizing: boolean
  estimatedFee: BN | undefined
  estimatedFeeLoading: boolean
  getEstimatedFee: (...args: Parameters<T>) => Promise<BN | undefined>
  clearTx: () => void
}

/**
 * Generic hook for handling blockchain transactions with status tracking
 * @returns Functions for running a transaction and tracking its status
 */
export const useTransactionStatus = <T extends GenericFunction>(
  transactionFn: (updateTxStatus: UpdateTransactionStatus, ...args: Parameters<T>) => Promise<void>,
  feeTxFn?: (...args: Parameters<T>) => Promise<BN | undefined>
): TransactionStatusReturn<T> => {
  // Track the status of transactions
  const [fee, setFee] = useState<BN | undefined>(undefined)
  const [feeLoading, setFeeLoading] = useState<boolean>(false)
  const [txStatus, setTxStatus] = useState<Transaction | undefined>(undefined)
  const [isTxFinished, setIsTxFinished] = useState<boolean>(false)
  const [isSynchronizing, setIsSynchronizing] = useState<boolean>(false)

  const isTxFailed = useMemo(() => {
    return Boolean(txStatus?.status && [TransactionStatus.FAILED, TransactionStatus.ERROR].includes(txStatus.status))
  }, [txStatus])

  const getEstimatedFee = useCallback(
    async (...args: Parameters<T>) => {
      if (!feeTxFn) return undefined
      setFeeLoading(true)
      const fee = await feeTxFn(...args)
      setFeeLoading(false)
      setFee(fee)
      return fee
    },
    [feeTxFn]
  )

  /**
   * Updates the transaction status for a specific operation
   */
  const updateTxStatus: UpdateTransactionStatus = useCallback((status, message, dispatchError, txDetails) => {
    setTxStatus(prev => ({
      ...prev,
      status: status,
      statusMessage: message,
      dispatchError,
      hash: txDetails?.txHash,
      blockHash: txDetails?.blockHash,
      blockNumber: txDetails?.blockNumber,
      callData: txDetails?.callData,
      callHash: txDetails?.callHash,
    }))
  }, [])

  // Run a generic transaction
  const runTransaction = useCallback(
    async (...args: Parameters<T>) => {
      try {
        setTxStatus({
          status: TransactionStatus.IS_LOADING,
        })
        await transactionFn(updateTxStatus, ...args)
        setIsTxFinished(true)
      } catch (error) {
        console.error('[useTransactionStatus] Transaction error:', error)
        setTxStatus({
          status: TransactionStatus.ERROR,
          statusMessage: 'An unexpected error occurred',
        })
        setIsTxFinished(true)
        throw error
      }
    },
    [transactionFn, updateTxStatus]
  )

  // Optionally, provide a synchronization function if needed
  const updateSynchronization = useCallback(async (syncFn?: (...args: any[]) => Promise<any>, ...args: any[]) => {
    if (!syncFn) return
    setIsSynchronizing(true)
    await syncFn(...args)
    setIsSynchronizing(false)
  }, [])

  const clearTx = useCallback(() => {
    setTxStatus(undefined)
    setIsTxFinished(false)
  }, [])

  return {
    runTransaction,
    txStatus,
    isTxFinished,
    isTxFailed,
    updateSynchronization,
    isSynchronizing,
    estimatedFee: fee,
    estimatedFeeLoading: feeLoading,
    getEstimatedFee,
    clearTx,
  }
}
