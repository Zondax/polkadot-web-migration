import { getIntegerFromEnv, getListFromEnv } from '@/lib/utils/env'
import type { AppId } from './apps'

export const mockBalances = (() => {
  const mockBalancesStr = process.env.NEXT_PUBLIC_MOCK_BALANCES
  if (!mockBalancesStr) return []

  try {
    return mockBalancesStr
      .split(',')
      .map(pair => {
        const [address, balanceStr] = pair.split(':')
        const balance = Number(balanceStr)

        if (!address || Number.isNaN(balance)) {
          console.warn('[mockData] Invalid mock balance format, skipping:', pair)
          return null
        }

        return { address: address.trim(), balance }
      })
      .filter(Boolean) as Array<{ address: string; balance: number }>
  } catch (error) {
    console.warn('[mockData] Failed to parse NEXT_PUBLIC_MOCK_BALANCES:', error)
    return []
  }
})()

export const errorAddresses = ((): string[] => {
  const value = process.env.NEXT_PUBLIC_ERROR_SYNC_ADDRESSES
  return getListFromEnv('NEXT_PUBLIC_ERROR_SYNC_ADDRESSES', value)
})()

export const syncApps = ((): AppId[] => {
  const value = process.env.NEXT_PUBLIC_SYNC_APPS
  return getListFromEnv('NEXT_PUBLIC_SYNC_APPS', value)
})()

export const errorApps = ((): AppId[] => {
  const value = process.env.NEXT_PUBLIC_ERROR_SYNC_APPS
  return getListFromEnv('NEXT_PUBLIC_ERROR_SYNC_APPS', value)
})()

export const MINIMUM_AMOUNT = (() => {
  const amountStr = process.env.NEXT_PUBLIC_NATIVE_TRANSFER_AMOUNT
  if (!amountStr) return undefined

  return getIntegerFromEnv('NEXT_PUBLIC_NATIVE_TRANSFER_AMOUNT', amountStr, 0, { min: 0 })
})()
