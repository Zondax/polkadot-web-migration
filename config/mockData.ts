import type { AppId } from './apps'
import { getEnvList, getEnvString, getEnvInteger } from '@/lib/utils/env'

export const mockBalances = (() => {
  const mockBalancesStr = getEnvString('NEXT_PUBLIC_MOCK_BALANCES')
  if (!mockBalancesStr) return []
  
  try {
    return mockBalancesStr.split(',').map(pair => {
      const [address, balanceStr] = pair.split(':')
      const balance = Number(balanceStr)
      
      if (!address || Number.isNaN(balance)) {
        console.warn('[mockData] Invalid mock balance format, skipping:', pair)
        return null
      }
      
      return { address: address.trim(), balance }
    }).filter(Boolean) as Array<{ address: string; balance: number }>
  } catch (error) {
    console.warn('[mockData] Failed to parse NEXT_PUBLIC_MOCK_BALANCES:', error)
    return []
  }
})()

export const errorAddresses = getEnvList('NEXT_PUBLIC_ERROR_SYNC_ADDRESSES')

export const syncApps = getEnvList('NEXT_PUBLIC_SYNC_APPS') as AppId[]

export const errorApps = getEnvList('NEXT_PUBLIC_ERROR_SYNC_APPS') as AppId[]

export const MINIMUM_AMOUNT = (() => {
  const amountStr = getEnvString('NEXT_PUBLIC_NATIVE_TRANSFER_AMOUNT')
  if (!amountStr) return undefined
  
  const amount = getEnvInteger('NEXT_PUBLIC_NATIVE_TRANSFER_AMOUNT', 0, { min: 0 })
  return amount > 0 ? amount : undefined
})()
