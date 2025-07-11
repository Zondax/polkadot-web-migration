import { BN } from '@polkadot/util'
import type { Native, Reserved, Staking } from '@/state/types/ledger'

/**
 * Common balance amounts used in tests
 */
export const TEST_AMOUNTS = {
  ZERO: new BN(0),
  ONE_DOT: new BN(10_000_000_000), // 1 DOT = 10^10 planck
  TEN_DOT: new BN(100_000_000_000),
  HUNDRED_DOT: new BN(1_000_000_000_000),
  THOUSAND_DOT: new BN(10_000_000_000_000),

  // Common fee amounts
  TRANSFER_FEE: new BN(1_000_000_000), // 0.1 DOT
  UNSTAKE_FEE: new BN(1_500_000_000), // 0.15 DOT
  IDENTITY_REMOVAL_FEE: new BN(2_000_000_000), // 0.2 DOT
  PROXY_REMOVAL_FEE: new BN(1_500_000_000), // 0.15 DOT

  // Edge case amounts
  MAX_BALANCE: new BN('9999999999999999999999999999'),
  DUST_AMOUNT: new BN(1),
} as const

/**
 * Test cases for native balances
 */
export const nativeBalanceTestCases = {
  zeroBalance: {
    input: createTestNativeBalance(TEST_AMOUNTS.ZERO, createTestReservedBalance(TEST_AMOUNTS.ZERO), TEST_AMOUNTS.ZERO),
    expected: {
      free: '0',
      reserved: { total: '0' },
      frozen: '0',
      transferable: '0',
      total: '0',
    },
  },

  standardBalance: {
    input: createTestNativeBalance(TEST_AMOUNTS.HUNDRED_DOT, createTestReservedBalance(TEST_AMOUNTS.TEN_DOT), TEST_AMOUNTS.ONE_DOT),
    expected: {
      free: '1000000000000',
      reserved: { total: '100000000000' },
      frozen: '10000000000',
      transferable: '990000000000', // free - frozen
      total: '1100000000000', // free + reserved
    },
  },

  insufficientForFee: {
    input: createTestNativeBalance(
      TEST_AMOUNTS.TRANSFER_FEE.subn(1), // Just under fee amount
      createTestReservedBalance(TEST_AMOUNTS.ZERO),
      TEST_AMOUNTS.ZERO
    ),
    expected: {
      canPayFee: false,
      transferable: TEST_AMOUNTS.TRANSFER_FEE.subn(1).toString(),
    },
  },
}

/**
 * Test cases for staking balances
 */
export const stakingTestCases = {
  notStaking: {
    input: undefined,
    expected: {
      isStaking: false,
      total: '0',
      active: '0',
      unlocking: [],
    },
  },

  activeStaking: {
    input: {
      total: TEST_AMOUNTS.THOUSAND_DOT,
      active: TEST_AMOUNTS.THOUSAND_DOT,
      unlocking: [],
      claimedRewards: [],
      canUnstake: true,
    } as Staking,
    expected: {
      isStaking: true,
      hasUnlocking: false,
      canUnstake: true,
    },
  },

  withUnlocking: {
    input: {
      total: TEST_AMOUNTS.THOUSAND_DOT,
      active: TEST_AMOUNTS.HUNDRED_DOT.muln(8), // 800 DOT
      unlocking: [
        {
          value: TEST_AMOUNTS.HUNDRED_DOT,
          era: 2400,
          timeRemaining: '7 days',
          canWithdraw: false,
        },
        {
          value: TEST_AMOUNTS.HUNDRED_DOT,
          era: 2500,
          timeRemaining: '14 days',
          canWithdraw: false,
        },
      ],
      claimedRewards: [],
      canUnstake: false,
    } as Staking,
    expected: {
      isStaking: true,
      hasUnlocking: true,
      totalUnlocking: '200000000000',
      canUnstake: false,
    },
  },

  readyToWithdraw: {
    input: {
      total: TEST_AMOUNTS.HUNDRED_DOT,
      active: TEST_AMOUNTS.ZERO,
      unlocking: [
        {
          value: TEST_AMOUNTS.HUNDRED_DOT,
          era: 2300,
          timeRemaining: '0 days',
          canWithdraw: true,
        },
      ],
      claimedRewards: [],
      canUnstake: false,
    } as Staking,
    expected: {
      hasWithdrawable: true,
      withdrawableAmount: '100000000000',
    },
  },
}

/**
 * Helper to create test reserved balance
 */
export function createTestReservedBalance(
  total: BN = TEST_AMOUNTS.ZERO,
  proxy?: { deposit: BN },
  identity?: { deposit: BN },
  multisig?: { total: BN; deposits: { callHash: string; deposit: BN }[] },
  index?: { deposit: BN }
): Reserved {
  return {
    total,
    ...(proxy && { proxy }),
    ...(identity && { identity }),
    ...(multisig && { multisig }),
    ...(index && { index }),
  }
}

/**
 * Helper to create test native balance
 */
export function createTestNativeBalance(
  free: BN = TEST_AMOUNTS.HUNDRED_DOT,
  reserved: Reserved = createTestReservedBalance(),
  frozen: BN = TEST_AMOUNTS.ZERO,
  staking?: Staking
): Native {
  const total = free.add(reserved.total)
  const transferable = free.sub(frozen)

  return {
    free,
    reserved,
    frozen,
    total,
    transferable: transferable.isNeg() ? TEST_AMOUNTS.ZERO : transferable,
    ...(staking && { staking }),
  }
}

/**
 * Helper to create test staking balance
 */
export function createTestStakingBalance(
  total: BN = TEST_AMOUNTS.THOUSAND_DOT,
  active: BN = TEST_AMOUNTS.THOUSAND_DOT,
  unlocking: Staking['unlocking'] = []
): Staking {
  return {
    total,
    active,
    unlocking,
    claimedRewards: [],
    canUnstake: unlocking.length === 0,
  }
}

/**
 * Pre-defined native balance variations from legacy tests
 */
export const NATIVE_BALANCE_VARIATIONS = {
  // Empty balance (all zeros)
  EMPTY: createTestNativeBalance(TEST_AMOUNTS.ZERO, createTestReservedBalance(TEST_AMOUNTS.ZERO), TEST_AMOUNTS.ZERO),

  // Free balance only
  FREE_ONLY: createTestNativeBalance(TEST_AMOUNTS.THOUSAND_DOT, createTestReservedBalance(TEST_AMOUNTS.ZERO), TEST_AMOUNTS.ZERO),

  // Reserved balance only
  RESERVED_ONLY: createTestNativeBalance(TEST_AMOUNTS.ZERO, createTestReservedBalance(TEST_AMOUNTS.THOUSAND_DOT), TEST_AMOUNTS.ZERO),

  // Frozen balance only
  FROZEN_ONLY: createTestNativeBalance(TEST_AMOUNTS.ZERO, createTestReservedBalance(TEST_AMOUNTS.ZERO), TEST_AMOUNTS.THOUSAND_DOT),

  // With staking
  WITH_STAKING: createTestNativeBalance(
    TEST_AMOUNTS.THOUSAND_DOT,
    createTestReservedBalance(TEST_AMOUNTS.ZERO),
    TEST_AMOUNTS.ZERO,
    createTestStakingBalance()
  ),

  // Mixed balances
  MIXED: createTestNativeBalance(
    TEST_AMOUNTS.HUNDRED_DOT, // free
    createTestReservedBalance(TEST_AMOUNTS.TEN_DOT), // reserved
    TEST_AMOUNTS.ONE_DOT // frozen
  ),

  // Edge case: negative transferable (when frozen > free)
  NEGATIVE_TRANSFERABLE: {
    free: TEST_AMOUNTS.TEN_DOT,
    reserved: createTestReservedBalance(TEST_AMOUNTS.ZERO),
    frozen: TEST_AMOUNTS.HUNDRED_DOT, // Higher than free
    total: TEST_AMOUNTS.TEN_DOT,
    transferable: TEST_AMOUNTS.ZERO, // Should be calculated as max(0, free - frozen)
  } as Native,
} as const

/**
 * Reserved balance variations for specific scenarios
 */
export const RESERVED_BALANCE_VARIATIONS = {
  // Proxy deposit only
  PROXY_ONLY: createTestReservedBalance(TEST_AMOUNTS.TEN_DOT, { deposit: TEST_AMOUNTS.TEN_DOT }),

  // Identity deposit only
  IDENTITY_ONLY: createTestReservedBalance(TEST_AMOUNTS.TEN_DOT, undefined, { deposit: TEST_AMOUNTS.TEN_DOT }),

  // Multisig deposit only
  MULTISIG_ONLY: createTestReservedBalance(TEST_AMOUNTS.TEN_DOT, undefined, undefined, {
    total: TEST_AMOUNTS.TEN_DOT,
    deposits: [{ callHash: '0x1234', deposit: TEST_AMOUNTS.TEN_DOT }],
  }),

  // Account index deposit only
  INDEX_ONLY: createTestReservedBalance(TEST_AMOUNTS.ONE_DOT, undefined, undefined, undefined, { deposit: TEST_AMOUNTS.ONE_DOT }),

  // All types combined
  ALL_TYPES: createTestReservedBalance(
    TEST_AMOUNTS.HUNDRED_DOT,
    { deposit: TEST_AMOUNTS.TEN_DOT }, // proxy
    { deposit: TEST_AMOUNTS.TEN_DOT }, // identity
    {
      // multisig
      total: TEST_AMOUNTS.TEN_DOT,
      deposits: [{ callHash: '0x1234', deposit: TEST_AMOUNTS.TEN_DOT }],
    },
    { deposit: TEST_AMOUNTS.ONE_DOT } // index
  ),
} as const

/**
 * Staking balance variations for different scenarios
 */
export const STAKING_VARIATIONS = {
  // Fully staked, no unlocking
  FULLY_STAKED: createTestStakingBalance(TEST_AMOUNTS.THOUSAND_DOT, TEST_AMOUNTS.THOUSAND_DOT, []),

  // Partially unlocking
  PARTIAL_UNLOCKING: createTestStakingBalance(
    TEST_AMOUNTS.THOUSAND_DOT,
    TEST_AMOUNTS.HUNDRED_DOT.muln(8), // 800 DOT active
    [
      {
        value: TEST_AMOUNTS.HUNDRED_DOT,
        era: 2400,
        timeRemaining: '7 days',
        canWithdraw: false,
      },
      {
        value: TEST_AMOUNTS.HUNDRED_DOT,
        era: 2500,
        timeRemaining: '14 days',
        canWithdraw: false,
      },
    ]
  ),

  // Ready to withdraw
  READY_TO_WITHDRAW: createTestStakingBalance(TEST_AMOUNTS.HUNDRED_DOT, TEST_AMOUNTS.ZERO, [
    {
      value: TEST_AMOUNTS.HUNDRED_DOT,
      era: 2300,
      timeRemaining: '0 days',
      canWithdraw: true,
    },
  ]),

  // No staking
  NO_STAKING: undefined,
} as const
