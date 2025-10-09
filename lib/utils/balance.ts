import { MINIMUM_AMOUNT } from '@/config/mockData'
import { BalanceType, type Address, type AddressBalance, type Native, type NativeBalance, type NftBalance } from '@/state/types/ledger'
import { BN } from '@polkadot/util'
import { isDevelopment } from './env'

/**
 * Type guard to check if a balance is a native balance
 * @param balance - The balance to check
 * @returns true if the balance is a native balance
 */
export const isNativeBalance = (balance?: AddressBalance): balance is NativeBalance => {
  return Boolean(balance && balance.type === BalanceType.NATIVE)
}

/**
 * Type guard to check if a balance is an NFT or Unique balance
 * @param balance - The balance to check
 * @returns true if the balance is an NFT or Unique balance
 */
export const isNftBalance = (balance?: AddressBalance): balance is NftBalance => {
  return Boolean(balance && (balance.type === BalanceType.NFT || balance.type === BalanceType.UNIQUE))
}

/**
 * Checks if a balance is specifically an NFT balance type
 * @param balance - The balance to check
 * @returns true if the balance is an NFT balance type
 */
export const isNftBalanceType = (balance?: AddressBalance): boolean => {
  return Boolean(balance && balance.type === BalanceType.NFT)
}

/**
 * Checks if a balance is specifically a Unique balance type
 * @param balance - The balance to check
 * @returns true if the balance is a Unique balance type
 */
export const isUniqueBalanceType = (balance?: AddressBalance): boolean => {
  return Boolean(balance && balance.type === BalanceType.UNIQUE)
}

/**
 * Checks if a native balance has non-transferable funds by comparing transferable and total amounts
 * @param balance - The native balance to check
 * @returns true if transferable amount is less than total amount, indicating non-transferable funds exist
 */
export const hasNonTransferableBalance = (balance: NativeBalance): boolean => {
  return balance.balance.transferable.lt(balance.balance.total)
}

/**
 * Checks if a native balance has any staked funds
 * @param balance - The native balance to check
 * @returns true if the balance has staking information and total staked amount is greater than 0
 */
export const hasStakedBalance = (balance?: NativeBalance): boolean => {
  if (!balance || !balance.balance.staking) return false
  return Boolean(balance.balance.staking?.total?.gt(new BN(0)))
}

/**
 * Checks if a native balance can be unstaked
 * @param balance - The native balance to check
 * @returns true if the balance has staking information, can be unstaked, and has active staking
 */
export const canUnstake = (balance?: NativeBalance): boolean => {
  if (!balance || !balance.balance.staking) return false
  return Boolean(balance.balance.staking?.canUnstake && balance.balance.staking.active?.gt(new BN(0)))
}

/**
 * Checks if a collection of balances contains any non-zero values
 * @param balances Array of address balances to check
 * @param checkTransferable If true, checks if the transferable balance is greater than 0
 * @returns True if any balance exists (native currency > 0 or collections with items)
 */
export const hasBalance = (balances: AddressBalance[], checkTransferable = false): boolean => {
  if (!balances) return false
  return balances.some(balance => {
    if (isNativeBalance(balance)) {
      return checkTransferable ? balance.balance.transferable.gt(new BN(0)) : balance.balance.total.gt(new BN(0))
    }
    return Array.isArray(balance.balance) && balance.balance.length > 0
  })
}

/**
 * Checks if a native balance has a negative value
 * @param balance - The native balance to check
 * @returns true if the balance is negative (less than zero)
 */
export const hasNegativeBalance = (balances?: AddressBalance[]): boolean => {
  if (!balances) return false
  return balances.some(balance => {
    if (isNativeBalance(balance)) {
      return (
        balance.balance.free.isNeg() ||
        balance.balance.reserved.total.isNeg() ||
        balance.balance.frozen.isNeg() ||
        balance.balance.total.isNeg()
      )
    }
    return false
  })
}

/**
 * Checks if an account has any balance (native, NFTs, or uniques)
 * @param account The account to check
 * @returns True if the account has any balance, false otherwise
 */
export const hasAddressBalance = (account: Address): boolean => {
  if (!account.balances) return false
  return hasBalance(account.balances)
}

/**
 * Returns the transferable balance for an account (Address).
 * If a native balance is found, returns its transferable amount.
 * Otherwise, returns BN(0).
 * @param account The account to check
 * @returns The transferable balance as BN
 */
export function getAccountTransferableBalance(account: Address): BN {
  if (!account?.balances) return new BN(0)
  const native = account.balances.find(isNativeBalance)
  return native ? native.balance.transferable : new BN(0)
}

/**
 * Calculates the non-transferable (locked or reserved) portion of a native balance.
 * This is the difference between the total balance and the transferable balance.
 * @param balance - The native balance object.
 * @returns The amount of non-transferable funds.
 */
export const getNonTransferableBalance = (balance: Native): BN => {
  if (!balance) return new BN(0)
  const total = new BN(balance.total)
  const transferable = new BN(balance.transferable)
  return total.sub(transferable)
}

/**
 * Validates that the sum of the reserved breakdown components (identity, multisig, proxy, index)
 * matches the total reserved amount.
 *
 * @param identityDeposit - The deposit reserved for identity.
 * @param multisigDeposit - The deposit reserved for multisig.
 * @param proxyDeposit - The deposit reserved for proxy.
 * @param indexDeposit - The deposit reserved for index.
 * @param total - The total reserved amount.
 * @returns True if the sum of the components equals the total, false otherwise.
 */
export const validateReservedBreakdown = (
  identityDeposit: BN,
  multisigDeposit: BN,
  proxyDeposit: BN,
  indexDeposit: BN,
  total: BN
): boolean => {
  // Check that no value is negative
  if (identityDeposit.isNeg() || multisigDeposit.isNeg() || proxyDeposit.isNeg() || indexDeposit.isNeg() || total.isNeg()) {
    return false
  }
  return identityDeposit.add(multisigDeposit).add(proxyDeposit).add(indexDeposit).lte(total)
}

/**
 * Checks if the transferable balance is insufficient to cover the required fee.
 * Returns true if the transferable balance is less than the fee, false otherwise.
 *
 * @param transferableBalance - The available transferable balance as a BN.
 * @param fee - The required fee as a BN.
 * @returns True if the balance is insufficient, false otherwise.
 */

export const cannotCoverFee = (transferableBalance: BN, fee: BN): boolean => {
  if (!transferableBalance || !fee) return false
  return transferableBalance.lt(fee)
}

/**
 * Gets the actual amount to transfer for native tokens.
 *
 * @description
 * - In production: Returns the full transferable balance to migrate everything
 * - In development: Can be overridden via NEXT_PUBLIC_NATIVE_TRANSFER_AMOUNT env var for testing
 *
 * @param balance - The native balance object
 * @returns The actual amount that will be transferred
 */
export function getActualTransferAmount(balance: NativeBalance): BN {
  const fullTransferable = balance.balance.transferable

  // Development override for testing with smaller amounts
  if (isDevelopment() && MINIMUM_AMOUNT) {
    return new BN(MINIMUM_AMOUNT)
  }

  return fullTransferable
}

/**
 * Checks if the actual transfer amount is equal to the available transferable balance.
 *
 * @param nativeTransfer - The native transfer amount.
 * @param transferableBalance - The available transferable balance as a BN.
 * @returns True if the actual transfer amount is equal to the available transferable balance, false otherwise.
 */
export const isFullMigration = (nativeTransferAmount: BN, transferableBalance: BN): boolean => {
  if (!nativeTransferAmount || !transferableBalance) return false
  return nativeTransferAmount.eq(transferableBalance)
}
