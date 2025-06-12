import type { ExplorerId } from './explorers'

// Import the JSON data directly
const appsConfigData: AppConfigJSON[] = require('./appsConfig.json')

/**
 * Token configuration
 */
export interface Token {
  /**
   * Token symbol (e.g., "DOT", "KSM")
   */
  symbol: string
  /**
   * Token decimal places
   */
  decimals: number
  /**
   * Optional custom logo ID, defaults to app ID
   */
  logoId?: string
}

/**
 * Explorer configuration in app config
 */
export interface AppExplorerConfig {
  /**
   * Explorer identifier
   */
  id: ExplorerId
  /**
   * Custom base URL (overrides the default)
   */
  baseUrl?: string
  /**
   * Network identifier used in URL templates
   */
  network?: string
}

/**
 * JSON structure of app config
 */
interface AppConfigJSON {
  id: string
  name: string
  bip44Path: string
  ss58Prefix: number
  rpcEndpoint?: string
  peopleRpcEndpoint?: string
  token: Token
  subscanId?: string
  explorer?: AppExplorerConfig
  eraTimeInHours?: number
}

/**
 * Available app IDs
 */
export type AppId = (typeof appsConfigData)[number]['id'] | 'polkadot'

/**
 * App/chain configuration interface
 */
export interface AppConfig {
  /**
   * Unique identifier for the app/chain
   */
  id: AppId
  /**
   * Display name
   */
  name: string
  /**
   * BIP44 derivation path
   */
  bip44Path: string
  /**
   * SS58 address format prefix
   */
  ss58Prefix: number
  /**
   * RPC endpoint for the chain
   */
  rpcEndpoint?: string
  /**
   * People's RPC endpoint for the chain
   */
  peopleRpcEndpoint?: string
  /**
   * Token configuration
   */
  token: Token
  /**
   * Subscan api id of the network: https://support.subscan.io/
   */
  subscanId?: string
  /**
   * Explorer configuration
   */
  explorer?: AppExplorerConfig
  /**
   * Era time in hours
   */
  eraTimeInHours?: number
}

/**
 * Polkadot app config
 */
export const polkadotAppConfig: AppConfig = {
  name: 'Polkadot',
  id: 'polkadot',
  bip44Path: "m/44'/354'/0'/0'/0'", // 354 = 0x80000162
  ss58Prefix: 0,
  rpcEndpoint: 'wss://rpc.polkadot.io',
  subscanId: 'polkadot',
  token: {
    symbol: 'DOT',
    decimals: 10,
    logoId: 'polkadot',
  },
  explorer: {
    id: 'subscan',
    network: 'polkadot',
  },
  eraTimeInHours: 24,
}

/**
 * Typed app configurations
 */
export const apps: AppConfig[] = [
  ...appsConfigData.map(app => ({
    ...app,
    id: app.id as AppId,
    // Add token field for compatibility
    token: {
      symbol: app.token.symbol,
      decimals: app.token.decimals,
      logoId: app.token.logoId || app.id,
    },
    subscanId: app.subscanId,
  })),
  polkadotAppConfig,
]

/**
 * For compatibility with existing code - Map of app configs
 */
export const appsConfigs = new Map<AppId, AppConfig>(apps.map(app => [app.id, app]))

/**
 * For compatibility with existing code - Object of app configs
 */
export const appsConfigsObj = Object.fromEntries(appsConfigs)

/**
 * Get an app configuration by ID
 * @param id App ID
 * @returns App configuration or undefined if not found
 */
export function getAppConfig(id: AppId): AppConfig | undefined {
  return apps.find(app => app.id === id)
}

/**
 * Get the display name of a chain by ID
 * @param id Chain ID
 * @returns Chain display name or the ID if not found
 */
export function getChainName(id: AppId): string {
  const app = getAppConfig(id)
  return app?.name || id
}

/**
 * Get the RPC endpoint for a chain
 * @param id Chain ID
 * @returns RPC endpoint or undefined if not available
 */
export function getRpcEndpoint(id: AppId): string | undefined {
  const app = getAppConfig(id)
  return app?.rpcEndpoint
}

/**
 * Helper function to get BIP44 path for a chain (compatibility)
 */
export const getChainPath = (appId: AppId): string | undefined => {
  const appConfig = appsConfigs.get(appId)
  return appConfig ? appConfig.bip44Path : undefined
}

/**
 * Helper function to get SS58 prefix for a chain (compatibility)
 */
export const getChainPrefix = (appId: AppId): number | undefined => {
  const appConfig = appsConfigs.get(appId)
  return appConfig ? appConfig.ss58Prefix : undefined
}

export const getEraTimeByAppId = (appId: AppId): number | undefined => {
  const appConfig = appsConfigs.get(appId)
  console.log('appConfig', appConfig)
  return appConfig ? appConfig.eraTimeInHours : 24
}
