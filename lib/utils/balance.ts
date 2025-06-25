import { MINIMUM_AMOUNT } from '@/config/mockData'
import {
  type Address,
  type AddressBalance,
  BalanceType,
  type Native,
  type NativeBalance,
  type Nft,
  type NftBalance,
} from '@/state/types/ledger'
import { BN } from '@polkadot/util'

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
 * Determines the type of balance (native or NFT), and returns the transferable amount and NFTs to transfer.
 * Used for preparing migration transactions.
 *
 * @param balance - The balance object to inspect (AddressBalance)
 * @param account - The parent account (Address), required for NFT balances to get native transferable
 * @returns An object with nftsToTransfer (Nft[]), nativeAmount (number | undefined), and transferableAmount (number)
 */
export function getTransferableAndNfts(
  balance: AddressBalance,
  account: Address
): { nftsToTransfer: Nft[]; nativeAmount: BN | undefined; transferableAmount: BN } {
  let nftsToTransfer: Nft[] = []
  let nativeAmount: BN | undefined = undefined
  let transferableAmount = new BN(0)

  if (isNativeBalance(balance)) {
    nativeAmount = balance.balance.transferable
    transferableAmount = balance.balance.transferable
  } else if (isNftBalance(balance)) {
    nftsToTransfer = balance.balance
    // Find the native balance in the account to get its transferable amount
    transferableAmount = account.balances?.find(b => isNativeBalance(b))?.balance.transferable ?? new BN(0)
  }

  // Use minimum amount for development if needed
  if (process.env.NEXT_PUBLIC_NODE_ENV === 'development' && MINIMUM_AMOUNT && isNativeBalance(balance)) {
    nativeAmount = new BN(MINIMUM_AMOUNT)
  }

  return { nftsToTransfer, nativeAmount, transferableAmount }
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
