import { vi } from 'vitest'
import { TEST_ADDRESSES } from '../addresses'
import { TEST_AMOUNTS } from '../balances'

/**
 * Common transaction scenarios for testing
 */

export const transactionScenarios = {
  /**
   * Simple transfer transaction
   */
  simpleTransfer: {
    from: TEST_ADDRESSES.ALICE,
    to: TEST_ADDRESSES.ADDRESS1,
    amount: TEST_AMOUNTS.TEN_DOT,
    fee: TEST_AMOUNTS.TRANSFER_FEE,
    expected: {
      method: 'balances.transferKeepAlive',
      args: {
        dest: TEST_ADDRESSES.ADDRESS1,
        value: TEST_AMOUNTS.TEN_DOT.toString(),
      },
    },
  },

  /**
   * Unstake transaction
   */
  unstake: {
    address: TEST_ADDRESSES.KUSAMA_STAKING_WITH_BONDED,
    amount: TEST_AMOUNTS.HUNDRED_DOT,
    fee: TEST_AMOUNTS.UNSTAKE_FEE,
    expected: {
      method: 'staking.unbond',
      args: {
        value: TEST_AMOUNTS.HUNDRED_DOT.toString(),
      },
    },
  },

  /**
   * Withdraw unbonded transaction
   */
  withdrawUnbonded: {
    address: TEST_ADDRESSES.KUSAMA_STAKING_WITH_BONDED,
    numSlashingSpans: 0,
    fee: TEST_AMOUNTS.UNSTAKE_FEE,
    expected: {
      method: 'staking.withdrawUnbonded',
      args: {
        numSlashingSpans: 0,
      },
    },
  },

  /**
   * Remove identity transaction
   */
  removeIdentity: {
    address: TEST_ADDRESSES.ADDRESS_WITH_IDENTITY_AND_PARENT,
    fee: TEST_AMOUNTS.IDENTITY_REMOVAL_FEE,
    expected: {
      method: 'identity.killIdentity',
      args: {
        target: TEST_ADDRESSES.ADDRESS_WITH_IDENTITY_AND_PARENT,
      },
    },
  },

  /**
   * Remove proxies transaction
   */
  removeProxies: {
    address: TEST_ADDRESSES.ADDRESS2,
    fee: TEST_AMOUNTS.PROXY_REMOVAL_FEE,
    expected: {
      method: 'proxy.removeProxies',
      args: {},
    },
  },

  /**
   * Batch transaction (multiple operations)
   */
  batchOperations: {
    address: TEST_ADDRESSES.ALICE,
    operations: [
      {
        method: 'balances.transferKeepAlive',
        args: {
          dest: TEST_ADDRESSES.ADDRESS1,
          value: TEST_AMOUNTS.TEN_DOT.toString(),
        },
      },
      {
        method: 'staking.unbond',
        args: {
          value: TEST_AMOUNTS.HUNDRED_DOT.toString(),
        },
      },
    ],
    fee: TEST_AMOUNTS.TRANSFER_FEE.muln(3), // Higher fee for batch
    expected: {
      method: 'utility.batchAll',
      callCount: 2,
    },
  },

  /**
   * Multisig approval
   */
  multisigApproval: {
    multisigAddress: TEST_ADDRESSES.MULTISIG_ADDRESS,
    signatories: [TEST_ADDRESSES.ADDRESS1, TEST_ADDRESSES.ADDRESS2, TEST_ADDRESSES.ADDRESS3],
    threshold: 2,
    callHash: '0x1234567890abcdef',
    fee: TEST_AMOUNTS.TRANSFER_FEE.muln(2),
    expected: {
      method: 'multisig.approveAsMulti',
      args: {
        threshold: 2,
        otherSignatories: [TEST_ADDRESSES.ADDRESS2, TEST_ADDRESSES.ADDRESS3],
        maybeTimepoint: null,
        callHash: '0x1234567890abcdef',
        maxWeight: { refTime: '1000000000', proofSize: '0' },
      },
    },
  },
}

/**
 * Transaction error scenarios
 */
export const transactionErrors = {
  insufficientBalance: {
    from: TEST_ADDRESSES.ALICE,
    to: TEST_ADDRESSES.ADDRESS1,
    amount: TEST_AMOUNTS.MAX_BALANCE, // More than available
    expectedError: 'Insufficient balance',
  },

  invalidAddress: {
    from: TEST_ADDRESSES.ALICE,
    to: 'invalid-address-format',
    amount: TEST_AMOUNTS.ONE_DOT,
    expectedError: 'Invalid address format',
  },

  accountNotFound: {
    from: '5xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    to: TEST_ADDRESSES.ADDRESS1,
    amount: TEST_AMOUNTS.ONE_DOT,
    expectedError: 'Account not found',
  },

  feeExceedsBalance: {
    from: TEST_ADDRESSES.ALICE,
    to: TEST_ADDRESSES.ADDRESS1,
    amount: TEST_AMOUNTS.DUST_AMOUNT,
    // Assume balance is just enough for amount but not fee
    expectedError: 'Cannot cover transaction fee',
  },

  stakingNotBonded: {
    address: TEST_ADDRESSES.ADDRESS1, // Not a staking address
    operation: 'unbond',
    expectedError: 'No active stake found',
  },

  noUnlockingFunds: {
    address: TEST_ADDRESSES.KUSAMA_STAKING_WITH_BONDED,
    operation: 'withdrawUnbonded',
    expectedError: 'No unlocking funds available',
  },
}

/**
 * Mock transaction results
 */
export const mockTransactionResults = {
  pending: {
    status: 'pending',
    message: 'Transaction is being processed...',
  },

  success: {
    status: {
      isFinalized: true,
      isInBlock: true,
      asFinalized: { toHex: () => '0xblockhash123' },
    },
    events: [
      {
        event: {
          method: 'ExtrinsicSuccess',
          section: 'system',
        },
      },
    ],
    txHash: { toHex: () => '0xtxhash123' },
    blockNumber: 1000000,
  },

  failed: {
    status: {
      isFinalized: true,
      isInBlock: true,
    },
    events: [
      {
        event: {
          method: 'ExtrinsicFailed',
          section: 'system',
          data: {
            dispatchError: {
              isModule: true,
              asModule: {
                index: 0,
                error: 1,
              },
            },
          },
        },
      },
    ],
    txHash: { toHex: () => '0xfailedtx123' },
  },

  rejected: {
    error: 'Transaction was rejected by user',
  },
}

/**
 * Helper to create a mock extrinsic
 */
export function createMockExtrinsic(scenario: keyof typeof transactionScenarios) {
  const data = transactionScenarios[scenario]

  return {
    method: {
      section: data.expected.method.split('.')[0],
      method: data.expected.method.split('.')[1],
    },
    args: 'args' in data.expected ? data.expected.args : {},
    paymentInfo: () =>
      Promise.resolve({
        partialFee: data.fee,
      }),
    signAndSend: vi.fn(),
    send: vi.fn(),
  }
}
