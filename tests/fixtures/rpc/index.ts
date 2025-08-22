/**
 * RPC endpoint configurations for testing
 */

/**
 * Test RPC endpoints for different networks
 */
export const TEST_RPC_ENDPOINTS = {
  // Polkadot
  POLKADOT: 'wss://polkadot-rpc.dwellir.com',
  POLKADOT_PEOPLE: 'wss://people-polkadot.api.onfinality.io/public-ws',
  POLKADOT_ASSET_HUB: 'wss://asset-hub-polkadot-rpc.dwellir.com',

  // Kusama
  KUSAMA: 'wss://kusama-rpc.polkadot.io',
  KUSAMA_PEOPLE: 'wss://people-kusama.api.onfinality.io/public-ws',
  KUSAMA_ASSET_HUB: 'wss://asset-hub-kusama-rpc.dwellir.com',

  // Local development
  LOCAL: 'ws://localhost:9944',

  // Mock endpoints for testing
  MOCK: 'ws://mock-endpoint:9944',
} as const

/**
 * Network configurations for testing
 */
export const TEST_NETWORK_CONFIGS = {
  polkadot: {
    name: 'Polkadot',
    rpcEndpoints: [TEST_RPC_ENDPOINTS.POLKADOT],
    ss58Format: 0,
    tokenSymbol: 'DOT',
    tokenDecimals: 10,
    blockTime: 6000, // 6 seconds
  },

  kusama: {
    name: 'Kusama',
    rpcEndpoints: [TEST_RPC_ENDPOINTS.KUSAMA],
    ss58Format: 2,
    tokenSymbol: 'KSM',
    tokenDecimals: 12,
    blockTime: 6000, // 6 seconds
  },

  'polkadot-asset-hub': {
    name: 'Polkadot Asset Hub',
    rpcEndpoints: [TEST_RPC_ENDPOINTS.POLKADOT_ASSET_HUB],
    ss58Format: 0,
    tokenSymbol: 'DOT',
    tokenDecimals: 10,
    blockTime: 12000, // 12 seconds
  },

  'kusama-asset-hub': {
    name: 'Kusama Asset Hub',
    rpcEndpoints: [TEST_RPC_ENDPOINTS.KUSAMA_ASSET_HUB],
    ss58Format: 2,
    tokenSymbol: 'KSM',
    tokenDecimals: 12,
    blockTime: 12000, // 12 seconds
  },

  'people-polkadot': {
    name: 'People Polkadot',
    rpcEndpoints: [TEST_RPC_ENDPOINTS.POLKADOT_PEOPLE],
    ss58Format: 0,
    tokenSymbol: 'DOT',
    tokenDecimals: 10,
    blockTime: 12000, // 12 seconds
  },

  'people-kusama': {
    name: 'People Kusama',
    rpcEndpoints: [TEST_RPC_ENDPOINTS.KUSAMA_PEOPLE],
    ss58Format: 2,
    tokenSymbol: 'KSM',
    tokenDecimals: 12,
    blockTime: 12000, // 12 seconds
  },

  // Local/mock network for testing
  local: {
    name: 'Local Development',
    rpcEndpoints: [TEST_RPC_ENDPOINTS.LOCAL],
    ss58Format: 42,
    tokenSymbol: 'UNIT',
    tokenDecimals: 12,
    blockTime: 6000,
  },
} as const

/**
 * Connection timeout configurations
 */
export const TEST_CONNECTION_CONFIGS = {
  // Fast timeout for unit tests
  UNIT_TEST: {
    timeout: 1000, // 1 second
    retries: 1,
  },

  // Medium timeout for integration tests
  INTEGRATION_TEST: {
    timeout: 5000, // 5 seconds
    retries: 2,
  },

  // Long timeout for e2e tests
  E2E_TEST: {
    timeout: 30000, // 30 seconds
    retries: 3,
  },

  // No timeout for manual testing
  MANUAL: {
    timeout: 0, // No timeout
    retries: 0,
  },
} as const

/**
 * Mock WebSocket provider for testing
 */
export class MockWsProvider {
  private connected = false
  private listeners: { [key: string]: ((...args: any[]) => void)[] } = {}

  constructor(private endpoint: string) {}

  async connect(): Promise<void> {
    this.connected = true
    this.emit('connected')
  }

  async disconnect(): Promise<void> {
    this.connected = false
    this.emit('disconnected')
  }

  isConnected(): boolean {
    return this.connected
  }

  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(callback)
  }

  off(event: string, callback: (...args: any[]) => void): void {
    if (this.listeners[event]) {
      const index = this.listeners[event].indexOf(callback)
      if (index > -1) {
        this.listeners[event].splice(index, 1)
      }
    }
  }

  private emit(event: string, ...args: any[]): void {
    if (this.listeners[event]) {
      for (const callback of this.listeners[event]) {
        callback(...args)
      }
    }
  }

  send(method: string, params: any[]): Promise<any> {
    // Mock implementation that returns appropriate responses
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Provider not connected'))
        return
      }

      // Simulate network delay
      setTimeout(() => {
        resolve(this.getMockResponse(method, params))
      }, 10)
    })
  }

  private getMockResponse(method: string, _params: any[]): any {
    // Return mock responses based on method
    switch (method) {
      case 'system_chain':
        return 'Development'
      case 'system_name':
        return 'Substrate Node'
      case 'system_version':
        return '3.0.0'
      case 'chain_getBlockHash':
        return '0x1234567890abcdef'
      case 'chain_getFinalizedHead':
        return '0xabcdef1234567890'
      default:
        return null
    }
  }
}

/**
 * Helper to create mock provider
 */
export function createMockProvider(endpoint: string = TEST_RPC_ENDPOINTS.MOCK): MockWsProvider {
  return new MockWsProvider(endpoint)
}

/**
 * Connection test scenarios
 */
export const connectionTestScenarios = {
  // Successful connection
  success: {
    endpoint: TEST_RPC_ENDPOINTS.MOCK,
    shouldConnect: true,
    expectedDelay: 100, // ms
  },

  // Connection timeout
  timeout: {
    endpoint: 'wss://invalid-endpoint.example.com',
    shouldConnect: false,
    expectedError: 'Connection timeout',
  },

  // Connection refused
  refused: {
    endpoint: 'ws://localhost:9999', // Non-existent port
    shouldConnect: false,
    expectedError: 'Connection refused',
  },

  // Invalid endpoint
  invalid: {
    endpoint: 'invalid-url',
    shouldConnect: false,
    expectedError: 'Invalid endpoint URL',
  },
}
