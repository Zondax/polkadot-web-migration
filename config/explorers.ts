/**
 * Explorer item types
 */
export enum ExplorerItemType {
  Transaction = 'transaction',
  Address = 'address',
  BlockHash = 'blockHash',
  BlockNumber = 'blockNumber',
}

// Import the JSON data directly
const explorersConfigData: ExplorerConfigJSON[] = require('./explorersConfig.json')

/**
 * Explorer configuration interface
 */
export interface ExplorerConfig {
  /**
   * Explorer identifier
   */
  id: ExplorerId
  /**
   * Display name
   */
  name: string
  /**
   * Base URL of the explorer
   */
  baseUrl: string
  /**
   * Path pattern for transaction URLs
   * Use {value} as placeholder for the transaction hash
   */
  txPath: string
  /**
   * Path pattern for address URLs
   * Use {value} as placeholder for the account address
   */
  addressPath: string
  /**
   * Path pattern for block URLs
   * Use {value} as placeholder for the block hash
   */
  blockPath: string
}

/**
 * JSON structure of explorer config
 */
interface ExplorerConfigJSON {
  id: string
  name: string
  baseUrl: string
  txPath: string
  addressPath: string
  blockPath: string
}

/**
 * Available explorer types
 */
export type ExplorerId = (typeof explorersConfigData)[number]['id']

/**
 * Explorer configurations loaded from JSON
 */
export const explorers: ExplorerConfig[] = explorersConfigData

/**
 * For compatibility with existing code - Map of explorer configs
 */
export const explorersMap = new Map<ExplorerId, ExplorerConfig>(explorers.map(explorer => [explorer.id, explorer]))

/**
 * Get an explorer configuration by ID
 * @param id Explorer ID
 * @returns Explorer configuration or undefined if not found
 */
export function getExplorerConfig(id: ExplorerId): ExplorerConfig | undefined {
  return explorers.find(explorer => explorer.id === id)
}

/**
 * Build a complete explorer URL for a specific network and item
 * @param explorerId - The ID of the explorer configuration to use
 * @param network - The network identifier (e.g., "polkadot", "kusama")
 * @param itemType - The type of item to link to (transaction, address, or block)
 * @param value - The hash or address value
 * @returns The complete explorer URL
 */
export function buildExplorerUrl(explorerId: ExplorerId, network: string, itemType: ExplorerItemType, value: string): string {
  const explorer = getExplorerConfig(explorerId)
  if (!explorer) return ''

  let path = ''
  switch (itemType) {
    case ExplorerItemType.Transaction:
      path = explorer.txPath.replace('{value}', value)
      break
    case ExplorerItemType.Address:
      path = explorer.addressPath.replace('{value}', value)
      break
    case ExplorerItemType.BlockHash:
      path = explorer.blockPath.replace('{value}', value)
      break
    case ExplorerItemType.BlockNumber:
      path = explorer.blockPath.replace('{value}', value)
      break
  }

  // Replace network placeholder
  const baseUrl = explorer.baseUrl.replace('{network}', network)

  return `${baseUrl}${path}`
}
