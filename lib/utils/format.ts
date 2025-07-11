import { BN } from '@polkadot/util'
import type { ResponseVersion } from '@zondax/ledger-js'

import type { Token } from '@/config/apps'
import { defaultDecimals } from '@/config/config'

/**
 * Truncates the middle of a string to a specified maximum length.
 * @param str - The string to truncate.
 * @param maxLength - The maximum length of the string.
 * @returns The truncated string, or null if the input string is empty.
 */
export const truncateMiddleOfString = (str: string, maxLength: number) => {
  if (!str) {
    return null
  }
  if (str.length <= maxLength) {
    return str
  }
  const middle = Math.floor(maxLength / 2)
  const start = str.substring(0, middle)
  const end = str.substring(str.length - middle, str.length)
  return `${start}...${end}`
}

/**
 * Formats a balance to a human-readable string.
 *
 * @param {BN} balance - The balance to format.
 * @param {Token} token - Token information.
 * @param {number} maxDecimals - Optional maximum decimal places to display.
 * @returns {string} The formatted balance.
 */
export const formatBalance = (balance: BN, token?: Token, maxDecimals: number = defaultDecimals, hideTokenSymbol?: boolean): string => {
  if (balance.isZero()) {
    return hideTokenSymbol || !token ? '0' : `0 ${token?.symbol}`
  }

  const decimals = token?.decimals ?? 0
  if (decimals > 0) {
    const divisor = new BN(10).pow(new BN(decimals))
    const adjusted = balance.divmod(divisor)
    // Format integer part with commas
    const intPart = Number(adjusted.div.toString()).toLocaleString()
    let fracPart = adjusted.mod.toString().padStart(decimals, '0')
    if (maxDecimals !== undefined) {
      fracPart = fracPart.slice(0, maxDecimals)
    }
    const trimmedFrac = fracPart.replace(/0+$/, '')
    const formattedBalance = trimmedFrac ? `${intPart}.${trimmedFrac}` : intPart
    return hideTokenSymbol || !token ? formattedBalance : `${formattedBalance} ${token?.symbol}`
  }
  // No decimals, just return as string with commas
  const intString = Number(balance.toString()).toLocaleString()
  return hideTokenSymbol || !token ? intString : `${intString} ${token?.symbol}`
}

/**
 * Converts a human-readable token amount to raw units based on token decimals.
 *
 * @param {number} amount - The amount in token units to convert.
 * @param {Token} token - Token information containing decimals.
 * @returns {number} The amount converted to raw units.
 */
export const convertToRawUnits = (amount: number, token: Token): number => {
  if (!token?.decimals) {
    return amount
  }

  return Math.round(amount * 10 ** token.decimals)
}

/**
 * Formats a version object into a string.
 *
 * @param {ResponseVersion} version - The version object to format.
 * @returns {string} The formatted version string.
 */
export const formatVersion = (version: ResponseVersion): string => {
  const { major, minor, patch } = version
  return `${major}.${minor}.${patch}`
}
