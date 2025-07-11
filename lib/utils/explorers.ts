import { type AppId, getAppConfig } from '@/config/apps'
import { buildExplorerUrl, ExplorerItemType } from '@/config/explorers'

/**
 * Get the explorer URL for a transaction
 * @param appId Chain ID
 * @param hash Transaction hash
 * @returns Explorer URL for the transaction
 */
export function getTransactionExplorerUrl(appId: AppId, hash: string): string {
  const app = getAppConfig(appId)
  if (!app || !app.explorer) return ''

  return buildExplorerUrl(app.explorer.id, app.explorer.network || app.id, ExplorerItemType.Transaction, hash)
}

/**
 * Get the explorer URL for an address
 * @param appId Chain ID
 * @param address Account address
 * @returns Explorer URL for the address
 */
export function getAddressExplorerUrl(appId: AppId, address: string): string {
  const app = getAppConfig(appId)
  if (!app || !app.explorer) return ''

  return buildExplorerUrl(app.explorer.id, app.explorer.network || app.id, ExplorerItemType.Address, address)
}

/**
 * Get the explorer URL for a block
 * @param appId Chain ID
 * @param hash Block hash
 * @returns Explorer URL for the block
 */
export function getBlockExplorerUrl(appId: AppId, hash: string): string {
  const app = getAppConfig(appId)
  if (!app || !app.explorer) return ''

  return buildExplorerUrl(app.explorer.id, app.explorer.network || app.id, ExplorerItemType.BlockHash, hash)
}
