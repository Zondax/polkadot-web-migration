import { getIntegerFromEnv } from '@/lib/utils/env'

/**
 * @constant truncateMaxCharacters
 * @description Maximum characters for truncation.
 */
export const truncateMaxCharacters = 16

export const DEFAULT_MAX_ADDRESSES_TO_FETCH = 10

/**
 * @constant maxAddressesToFetch
 * @description Maximum number of addresses to fetch from each app of the Ledger device. Can be set via NEXT_PUBLIC_MAX_ADDRESSES_TO_FETCH environment variable.
 */
export const maxAddressesToFetch = (() => {
  const amountStr = process.env.NEXT_PUBLIC_MAX_ADDRESSES_TO_FETCH
  if (!amountStr) return DEFAULT_MAX_ADDRESSES_TO_FETCH

  return (
    getIntegerFromEnv('NEXT_PUBLIC_MAX_ADDRESSES_TO_FETCH', amountStr, DEFAULT_MAX_ADDRESSES_TO_FETCH, { min: 1, max: 100 }) ??
    DEFAULT_MAX_ADDRESSES_TO_FETCH
  )
})()

/**
 * @constant defaultDecimals
 * @description Default number of decimals to display for balances.
 */
export const defaultDecimals = 4

/**
 * @constant MULTISIG_WEIGHT_BUFFER
 * @description Buffer multiplier to add for multisig overhead when estimating weight (e.g., 1.2 = 20% more).
 */
export const MULTISIG_WEIGHT_BUFFER = 1.2

/**
 * @constant defaultWeights
 * @description Default weights for common operations.
 */
export const defaultWeights: Record<string, number> = {
  'balances.transfer': 200_000_000,
  'balances.transferKeepAlive': 200_000_000,
  'balances.transferAll': 300_000_000,
  'assets.transfer': 300_000_000,
  'nfts.transfer': 500_000_000,
  'uniques.transfer': 500_000_000,
  'utility.batchAll': 1_000_000_000, // Higher for batch operations
  'proxy.proxy': 400_000_000,
  'staking.bond': 800_000_000,
  'staking.unbond': 600_000_000,
  'identity.setIdentity': 1_500_000_000,
  'multisig.approveAsMulti': 800_000_000,
  'multisig.asMulti': 1_200_000_000,
  'multisig.cancelAsMulti': 600_000_000,
}
