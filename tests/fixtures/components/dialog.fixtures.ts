import { vi } from 'vitest'
import type { AppId, Token } from '@/config/apps'
import { BalanceType } from '@/state/types/ledger'
import { createTestAccount } from '../../utils/testHelpers'
import { TEST_ADDRESSES } from '../addresses'
import { createTestNativeBalance, createTestReservedBalance, TEST_AMOUNTS } from '../balances'

/**
 * Common props for dialog component tests
 */

export const mockToken: Token = {
  symbol: 'DOT',
  decimals: 10,
}

export const mockKusamaToken: Token = {
  symbol: 'KSM',
  decimals: 12,
}

export const dialogTestScenarios = {
  /**
   * Remove proxy dialog scenarios
   */
  removeProxy: {
    withSingleProxy: {
      account: createTestAccount({
        address: TEST_ADDRESSES.ADDRESS1,
        proxy: {
          deposit: TEST_AMOUNTS.TEN_DOT,
          proxies: [
            {
              address: TEST_ADDRESSES.ADDRESS2,
              type: 'Any',
              delay: 0,
            },
          ],
        },
      }),
      expectedDeposit: '10000000000 DOT',
      expectedProxyCount: 1,
    },

    withMultipleProxies: {
      account: createTestAccount({
        address: TEST_ADDRESSES.ADDRESS1,
        proxy: {
          deposit: TEST_AMOUNTS.HUNDRED_DOT,
          proxies: [
            {
              address: TEST_ADDRESSES.ADDRESS2,
              type: 'Any',
              delay: 0,
            },
            {
              address: TEST_ADDRESSES.ADDRESS3,
              type: 'Staking',
              delay: 10,
            },
            {
              address: TEST_ADDRESSES.ADDRESS4,
              type: 'Governance',
              delay: 0,
            },
          ],
        },
      }),
      expectedDeposit: '100000000000 DOT',
      expectedProxyCount: 3,
    },

    withNoProxies: {
      account: createTestAccount({
        address: TEST_ADDRESSES.ADDRESS1,
        proxy: undefined,
      }),
      expectedDeposit: null,
      expectedProxyCount: 0,
    },
  },

  /**
   * Remove identity dialog scenarios
   */
  removeIdentity: {
    withIdentity: {
      account: createTestAccount({
        address: TEST_ADDRESSES.ADDRESS_WITH_IDENTITY_AND_PARENT,
        registration: {
          deposit: TEST_AMOUNTS.TEN_DOT,
          identity: {
            display: 'Alice',
            email: 'alice@example.com',
            twitter: '@alice',
          },
          subIdentities: undefined,
          canRemove: true,
        },
      }),
      expectedDeposit: '10000000000 DOT',
    },

    withSubIdentity: {
      account: createTestAccount({
        address: TEST_ADDRESSES.ADDRESS_WITH_IDENTITY_AND_PARENT,
        registration: {
          deposit: TEST_AMOUNTS.ONE_DOT,
          identity: {
            display: 'Alice Sub',
            displayParent: 'Alice Main',
          },
          subIdentities: undefined,
          canRemove: true,
        },
      }),
      expectedDeposit: '10000000000 DOT',
      hasParent: true,
    },

    withoutIdentity: {
      account: createTestAccount({
        address: TEST_ADDRESSES.ADDRESS1,
        registration: undefined,
      }),
      expectedDeposit: null,
    },
  },

  /**
   * Unstake dialog scenarios
   */
  unstake: {
    fullyStaked: {
      account: createTestAccount({
        address: TEST_ADDRESSES.KUSAMA_STAKING_WITH_BONDED,
        balances: [
          {
            type: BalanceType.NATIVE,
            balance: createTestNativeBalance(TEST_AMOUNTS.THOUSAND_DOT, createTestReservedBalance(TEST_AMOUNTS.ZERO), TEST_AMOUNTS.ZERO, {
              total: TEST_AMOUNTS.THOUSAND_DOT,
              active: TEST_AMOUNTS.THOUSAND_DOT,
              unlocking: [],
              claimedRewards: [],
              canUnstake: true,
            }),
          },
        ],
      }),
      maxUnstakeAmount: '10000000000000',
    },

    partiallyUnstaking: {
      account: createTestAccount({
        address: TEST_ADDRESSES.KUSAMA_STAKING_WITH_BONDED,
        balances: [
          {
            type: BalanceType.NATIVE,
            balance: createTestNativeBalance(TEST_AMOUNTS.THOUSAND_DOT, createTestReservedBalance(TEST_AMOUNTS.ZERO), TEST_AMOUNTS.ZERO, {
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
              canUnstake: true,
            }),
          },
        ],
      }),
      maxUnstakeAmount: '800000000000', // Only active amount can be unstaked
    },

    notStaking: {
      account: createTestAccount({
        address: TEST_ADDRESSES.ADDRESS1,
        balances: [
          {
            type: BalanceType.NATIVE,
            balance: createTestNativeBalance(
              TEST_AMOUNTS.HUNDRED_DOT,
              createTestReservedBalance(TEST_AMOUNTS.ZERO),
              TEST_AMOUNTS.ZERO,
              undefined // No staking
            ),
          },
        ],
      }),
      shouldDisableDialog: true,
    },
  },

  /**
   * Common dialog props
   */
  defaultProps: {
    open: true,
    setOpen: vi.fn(),
    appId: 'polkadot' as AppId,
    token: mockToken,
  },
}
