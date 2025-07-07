# API & Integration Documentation

This document provides comprehensive information about the APIs, data sources, and integration points used by the Polkadot Migration Assistant.

## 🔗 API Overview

### Primary Data Sources

The Migration Assistant integrates with multiple data sources to provide comprehensive account information:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Blockchain    │    │    Subscan      │    │     Ledger      │
│   RPC Nodes     │    │   Indexer API   │    │  Hardware API   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              Polkadot Migration Assistant                       │
└─────────────────────────────────────────────────────────────────┘
```

### API Architecture

**1. Direct Blockchain Integration**
- WebSocket connections to RPC endpoints
- Real-time chain state queries
- Transaction submission and monitoring

**2. Indexer Services**
- Subscan API for historical data
- Account balance and transaction history
- Multisig and identity information

**3. Hardware Wallet Integration**
- WebUSB transport layer
- Ledger device communication
- Transaction signing and verification

---

## 🌐 Blockchain RPC Integration

### Supported Networks and Endpoints

#### Production RPC Endpoints

**Polkadot Network:**
```javascript
const POLKADOT_ENDPOINTS = {
  primary: 'wss://polkadot.api.onfinality.io/public-ws',
  fallback: [
    'wss://rpc.polkadot.io',
    'wss://polkadot-rpc.dwellir.com',
    'wss://polkadot.public.curie.radiumblock.co/ws'
  ]
};
```

**Kusama Network:**
```javascript
const KUSAMA_ENDPOINTS = {
  primary: 'wss://kusama.api.onfinality.io/public-ws',
  fallback: [
    'wss://kusama-rpc.polkadot.io',
    'wss://kusama-rpc.dwellir.com',
    'wss://kusama.public.curie.radiumblock.co/ws'
  ]
};
```

**AssetHub Networks:**
```javascript
const ASSETHUB_ENDPOINTS = {
  polkadot: 'wss://polkadot-asset-hub-rpc.polkadot.io',
  kusama: 'wss://kusama-asset-hub-rpc.polkadot.io'
};
```

**People Chain:**
```javascript
const PEOPLE_ENDPOINTS = {
  polkadot: 'wss://polkadot-people-rpc.polkadot.io',
  kusama: 'wss://kusama-people-rpc.polkadot.io'
};
```

### RPC API Usage

#### Connection Management

```typescript
import { ApiPromise, WsProvider } from '@polkadot/api';

class ChainClient {
  private api: ApiPromise | null = null;
  private provider: WsProvider | null = null;

  async connect(endpoint: string): Promise<void> {
    this.provider = new WsProvider(endpoint);
    this.api = await ApiPromise.create({ provider: this.provider });
  }

  async disconnect(): Promise<void> {
    if (this.api) {
      await this.api.disconnect();
    }
    if (this.provider) {
      await this.provider.disconnect();
    }
  }
}
```

#### Account Information Queries

**Balance Queries:**
```typescript
// Get account balance information
async function getAccountBalance(api: ApiPromise, address: string): Promise<AccountBalance> {
  const accountInfo = await api.query.system.account(address);
  
  return {
    free: accountInfo.data.free.toString(),
    reserved: accountInfo.data.reserved.toString(),
    frozen: accountInfo.data.frozen.toString(),
    total: accountInfo.data.free.add(accountInfo.data.reserved).toString()
  };
}

// Get asset balances (for AssetHub)
async function getAssetBalances(api: ApiPromise, address: string): Promise<AssetBalance[]> {
  const entries = await api.query.assets.account.entries();
  const balances: AssetBalance[] = [];

  for (const [key, value] of entries) {
    const [assetId, account] = key.args;
    if (account.toString() === address) {
      balances.push({
        assetId: assetId.toString(),
        balance: value.unwrap().balance.toString(),
        status: value.unwrap().status.toString()
      });
    }
  }

  return balances;
}
```

**Staking Information:**
```typescript
async function getStakingInfo(api: ApiPromise, address: string): Promise<StakingInfo> {
  const [ledger, nominations, validatorPrefs] = await Promise.all([
    api.query.staking.ledger(address),
    api.query.staking.nominators(address),
    api.query.staking.validators(address)
  ]);

  const stakingInfo: StakingInfo = {
    isStash: false,
    isController: false,
    total: '0',
    active: '0',
    unlocking: []
  };

  if (ledger.isSome) {
    const ledgerInfo = ledger.unwrap();
    stakingInfo.isController = true;
    stakingInfo.total = ledgerInfo.total.toString();
    stakingInfo.active = ledgerInfo.active.toString();
    stakingInfo.unlocking = ledgerInfo.unlocking.map(chunk => ({
      value: chunk.value.toString(),
      era: chunk.era.toString()
    }));
  }

  if (nominations.isSome) {
    stakingInfo.isStash = true;
    stakingInfo.nominations = nominations.unwrap().targets.map(t => t.toString());
  }

  return stakingInfo;
}
```

**Identity Information:**
```typescript
async function getIdentityInfo(api: ApiPromise, address: string): Promise<IdentityInfo | null> {
  const identity = await api.query.identity.identityOf(address);
  
  if (identity.isNone) {
    return null;
  }

  const identityData = identity.unwrap();
  return {
    display: identityData.info.display.toString(),
    legal: identityData.info.legal.toString(),
    web: identityData.info.web.toString(),
    riot: identityData.info.riot.toString(),
    email: identityData.info.email.toString(),
    twitter: identityData.info.twitter.toString(),
    judgements: identityData.judgements.map(j => ({
      registrarIndex: j[0].toString(),
      judgement: j[1].toString()
    }))
  };
}
```

#### Transaction Construction

**Basic Transaction:**
```typescript
async function createTransaction(
  api: ApiPromise,
  method: string,
  section: string,
  args: any[]
): Promise<SubmittableExtrinsic> {
  return api.tx[section][method](...args);
}

// Example: Transfer transaction
const transferTx = await createTransaction(
  api,
  'transfer',
  'balances',
  [destinationAddress, amount]
);
```

**Batch Transactions:**
```typescript
async function createBatchTransaction(
  api: ApiPromise,
  transactions: SubmittableExtrinsic[]
): Promise<SubmittableExtrinsic> {
  return api.tx.utility.batch(transactions);
}
```

**Fee Estimation:**
```typescript
async function estimateTransactionFee(
  api: ApiPromise,
  transaction: SubmittableExtrinsic,
  address: string
): Promise<string> {
  const paymentInfo = await transaction.paymentInfo(address);
  return paymentInfo.partialFee.toString();
}
```

---

## 📊 Subscan API Integration

### API Endpoints and Usage

#### Base Configuration

```typescript
const SUBSCAN_CONFIG = {
  polkadot: {
    baseUrl: 'https://polkadot.api.subscan.io',
    apiKey: process.env.SUBSCAN_API_KEY // Optional but recommended
  },
  kusama: {
    baseUrl: 'https://kusama.api.subscan.io',
    apiKey: process.env.SUBSCAN_API_KEY
  }
};

class SubscanClient {
  constructor(private network: string, private apiKey?: string) {}

  private async request(endpoint: string, data?: any): Promise<any> {
    const url = `${SUBSCAN_CONFIG[this.network].baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data || {})
    });

    return response.json();
  }
}
```

#### Account Information

**Account Details:**
```typescript
async function getAccountInfo(address: string): Promise<SubscanAccountInfo> {
  const response = await this.request('/api/v2/scan/account', {
    address
  });

  return {
    address: response.data.address,
    balance: response.data.balance,
    lock: response.data.lock,
    reserved: response.data.reserved,
    nonce: response.data.nonce,
    democracy_lock: response.data.democracy_lock,
    election_lock: response.data.election_lock
  };
}
```

**Transaction History:**
```typescript
async function getAccountTransactions(
  address: string,
  page: number = 0,
  pageSize: number = 100
): Promise<SubscanTransaction[]> {
  const response = await this.request('/api/v2/scan/transfers', {
    address,
    page,
    row: pageSize
  });

  return response.data.transfers.map(tx => ({
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    amount: tx.amount,
    fee: tx.fee,
    block_num: tx.block_num,
    block_timestamp: tx.block_timestamp,
    success: tx.success
  }));
}
```

**Multisig Information:**
```typescript
async function getMultisigInfo(address: string): Promise<MultisigInfo[]> {
  const response = await this.request('/api/v2/scan/multisig', {
    address
  });

  return response.data.multisigs.map(ms => ({
    multi_account_id: ms.multi_account_id,
    multi_account_display: ms.multi_account_display,
    threshold: ms.threshold,
    signatories: ms.signatories,
    balance: ms.balance,
    status: ms.status
  }));
}
```

#### NFT and Asset Information

**NFT Collections:**
```typescript
async function getNFTCollections(address: string): Promise<NFTCollection[]> {
  const response = await this.request('/api/v2/scan/nfts', {
    address
  });

  return response.data.nfts.map(nft => ({
    collection_id: nft.collection_id,
    token_id: nft.token_id,
    metadata: nft.metadata,
    owner: nft.owner,
    created_at: nft.created_at
  }));
}
```

---

## 🔌 Ledger Hardware Integration

### WebUSB Transport

#### Connection Management

```typescript
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import { PolkadotApp } from '@zondax/ledger-polkadot';

class LedgerManager {
  private transport: TransportWebUSB | null = null;
  private polkadotApp: PolkadotApp | null = null;

  async connect(): Promise<void> {
    // Request device access
    this.transport = await TransportWebUSB.create();
    
    // Initialize Polkadot app
    this.polkadotApp = new PolkadotApp(this.transport);
    
    // Get app version to verify connection
    const version = await this.polkadotApp.getVersion();
    console.log('Connected to Ledger Polkadot app:', version);
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
      this.polkadotApp = null;
    }
  }
}
```

#### Address Derivation

```typescript
async function getAddress(path: string): Promise<LedgerAddress> {
  if (!this.polkadotApp) {
    throw new Error('Ledger not connected');
  }

  const response = await this.polkadotApp.getAddress(path, false, 0); // ss58 prefix 0 for Polkadot
  
  return {
    address: response.address,
    publicKey: response.pubKey,
    path: path
  };
}

// Generate addresses for account discovery
async function discoverAccounts(maxIndex: number = 10): Promise<LedgerAddress[]> {
  const addresses: LedgerAddress[] = [];
  
  for (let i = 0; i < maxIndex; i++) {
    const path = `m/44'/354'/0'/0'/${i}'`; // Polkadot derivation path
    const address = await this.getAddress(path);
    addresses.push(address);
  }
  
  return addresses;
}
```

#### Transaction Signing

```typescript
async function signTransaction(
  path: string,
  payload: Uint8Array
): Promise<LedgerSignature> {
  if (!this.polkadotApp) {
    throw new Error('Ledger not connected');
  }

  const signature = await this.polkadotApp.sign(path, payload);
  
  return {
    signature: signature.signature,
    path: path
  };
}

// Complete transaction signing flow
async function signAndSubmitTransaction(
  api: ApiPromise,
  transaction: SubmittableExtrinsic,
  signerAddress: string,
  signerPath: string
): Promise<string> {
  // Create signing payload
  const signingPayload = api.createType('ExtrinsicPayload', {
    method: transaction.method,
    era: transaction.era,
    nonce: transaction.nonce,
    tip: transaction.tip,
    specVersion: api.runtimeVersion.specVersion,
    transactionVersion: api.runtimeVersion.transactionVersion,
    genesisHash: api.genesisHash,
    blockHash: transaction.blockHash
  });

  // Sign with Ledger
  const signature = await this.signTransaction(signerPath, signingPayload.toU8a(true));
  
  // Add signature to transaction
  transaction.addSignature(signerAddress, signature.signature, signingPayload);
  
  // Submit to network
  const hash = await transaction.send();
  
  return hash.toString();
}
```

---

## 🏗️ Internal API Architecture

### Core Services

#### Account Service

```typescript
// lib/account.ts
export class AccountService {
  constructor(
    private chainClient: ChainClient,
    private subscanClient: SubscanClient,
    private ledgerManager: LedgerManager
  ) {}

  async getCompleteAccountInfo(address: string): Promise<CompleteAccountInfo> {
    const [balance, staking, identity, multisigs] = await Promise.all([
      this.chainClient.getBalance(address),
      this.chainClient.getStaking(address),
      this.chainClient.getIdentity(address),
      this.subscanClient.getMultisigInfo(address)
    ]);

    return {
      address,
      balance,
      staking,
      identity,
      multisigs,
      lastUpdated: Date.now()
    };
  }

  async prepareTransaction(
    operation: TransactionOperation,
    params: TransactionParams
  ): Promise<PreparedTransaction> {
    // Validate parameters
    this.validateTransactionParams(operation, params);
    
    // Build transaction
    const transaction = await this.buildTransaction(operation, params);
    
    // Estimate fees
    const fee = await this.estimateTransactionFee(transaction, params.signerAddress);
    
    // Create signing payload
    const payload = this.createSigningPayload(transaction);
    
    return {
      transaction,
      fee,
      payload,
      operation,
      params
    };
  }
}
```

#### Migration Service

```typescript
// lib/migration.ts
export class MigrationService {
  constructor(private accountService: AccountService) {}

  async planMigration(addresses: string[]): Promise<MigrationPlan> {
    const accounts = await Promise.all(
      addresses.map(addr => this.accountService.getCompleteAccountInfo(addr))
    );

    const operations: MigrationOperation[] = [];

    for (const account of accounts) {
      // Check if unstaking needed
      if (account.staking.isStash && account.staking.active > 0) {
        operations.push({
          type: 'unstake',
          account: account.address,
          params: { amount: account.staking.active }
        });
      }

      // Check if identity removal needed
      if (account.identity && !account.identity.parent) {
        operations.push({
          type: 'removeIdentity',
          account: account.address,
          params: {}
        });
      }

      // Add transfer operation for remaining balance
      operations.push({
        type: 'transfer',
        account: account.address,
        params: {
          destination: this.getUniversalAddress(account.address),
          amount: this.calculateTransferAmount(account)
        }
      });
    }

    return {
      accounts,
      operations,
      totalOperations: operations.length,
      estimatedDuration: this.estimateMigrationDuration(operations)
    };
  }
}
```

### State Management Integration

#### Zustand Store Integration

```typescript
// state/migration.ts
interface MigrationState {
  // Connection state
  isConnected: boolean;
  connectedDevice: string | null;
  
  // Discovery state
  discoveredAccounts: Account[];
  selectedAccounts: string[];
  
  // Migration state
  migrationPlan: MigrationPlan | null;
  currentOperation: MigrationOperation | null;
  completedOperations: string[];
  
  // Actions
  connect: () => Promise<void>;
  discoverAccounts: () => Promise<void>;
  selectAccounts: (addresses: string[]) => void;
  startMigration: () => Promise<void>;
  executeOperation: (operation: MigrationOperation) => Promise<void>;
}

export const useMigrationStore = create<MigrationState>((set, get) => ({
  // Initial state
  isConnected: false,
  connectedDevice: null,
  discoveredAccounts: [],
  selectedAccounts: [],
  migrationPlan: null,
  currentOperation: null,
  completedOperations: [],

  // Actions
  connect: async () => {
    const ledgerManager = new LedgerManager();
    await ledgerManager.connect();
    
    set({
      isConnected: true,
      connectedDevice: 'Ledger Device'
    });
  },

  discoverAccounts: async () => {
    const accountService = new AccountService(/* dependencies */);
    const addresses = await ledgerManager.discoverAccounts();
    
    const accounts = await Promise.all(
      addresses.map(addr => accountService.getCompleteAccountInfo(addr.address))
    );
    
    set({ discoveredAccounts: accounts });
  },

  // ... other actions
}));
```

---

## 🔧 Configuration and Environment

### Environment Variables

```typescript
// Environment configuration
interface EnvironmentConfig {
  // RPC endpoints
  POLKADOT_RPC_ENDPOINT: string;
  KUSAMA_RPC_ENDPOINT: string;
  ASSETHUB_RPC_ENDPOINT: string;
  
  // API keys
  SUBSCAN_API_KEY?: string;
  
  // Feature flags
  ENABLE_MULTISIG: boolean;
  ENABLE_IDENTITY_OPERATIONS: boolean;
  ENABLE_STAKING_OPERATIONS: boolean;
  
  // Network settings
  TRANSACTION_TIMEOUT: number;
  CONNECTION_RETRY_ATTEMPTS: number;
  
  // Development settings
  DEBUG_MODE: boolean;
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
}

const config: EnvironmentConfig = {
  POLKADOT_RPC_ENDPOINT: process.env.POLKADOT_RPC_ENDPOINT || 'wss://polkadot.api.onfinality.io/public-ws',
  KUSAMA_RPC_ENDPOINT: process.env.KUSAMA_RPC_ENDPOINT || 'wss://kusama.api.onfinality.io/public-ws',
  ASSETHUB_RPC_ENDPOINT: process.env.ASSETHUB_RPC_ENDPOINT || 'wss://polkadot-asset-hub-rpc.polkadot.io',
  
  SUBSCAN_API_KEY: process.env.SUBSCAN_API_KEY,
  
  ENABLE_MULTISIG: process.env.ENABLE_MULTISIG !== 'false',
  ENABLE_IDENTITY_OPERATIONS: process.env.ENABLE_IDENTITY_OPERATIONS !== 'false',
  ENABLE_STAKING_OPERATIONS: process.env.ENABLE_STAKING_OPERATIONS !== 'false',
  
  TRANSACTION_TIMEOUT: parseInt(process.env.TRANSACTION_TIMEOUT || '60000'),
  CONNECTION_RETRY_ATTEMPTS: parseInt(process.env.CONNECTION_RETRY_ATTEMPTS || '3'),
  
  DEBUG_MODE: process.env.NODE_ENV === 'development',
  LOG_LEVEL: (process.env.LOG_LEVEL as any) || 'info'
};
```

### API Rate Limiting

```typescript
// Rate limiting configuration
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  async checkRateLimit(endpoint: string, limit: number, window: number): Promise<boolean> {
    const now = Date.now();
    const requests = this.requests.get(endpoint) || [];
    
    // Clean old requests outside the window
    const validRequests = requests.filter(time => now - time < window);
    
    if (validRequests.length >= limit) {
      return false; // Rate limit exceeded
    }
    
    validRequests.push(now);
    this.requests.set(endpoint, validRequests);
    
    return true;
  }
}

// Usage in API clients
const rateLimiter = new RateLimiter();

async function makeAPIRequest(endpoint: string, data: any): Promise<any> {
  // Check rate limit (100 requests per minute)
  const canProceed = await rateLimiter.checkRateLimit(endpoint, 100, 60000);
  
  if (!canProceed) {
    throw new Error('Rate limit exceeded. Please wait before making more requests.');
  }
  
  // Proceed with request
  return fetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
  });
}
```

---

## 📈 Performance Optimization

### Connection Pooling

```typescript
class ConnectionPool {
  private pools: Map<string, ApiPromise[]> = new Map();
  private maxConnections = 5;

  async getConnection(endpoint: string): Promise<ApiPromise> {
    const pool = this.pools.get(endpoint) || [];
    
    if (pool.length > 0) {
      return pool.pop()!;
    }
    
    // Create new connection if pool is empty
    const provider = new WsProvider(endpoint);
    return ApiPromise.create({ provider });
  }

  async releaseConnection(endpoint: string, api: ApiPromise): Promise<void> {
    const pool = this.pools.get(endpoint) || [];
    
    if (pool.length < this.maxConnections) {
      pool.push(api);
      this.pools.set(endpoint, pool);
    } else {
      // Close excess connections
      await api.disconnect();
    }
  }
}
```

### Caching Strategy

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class APICache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  set<T>(key: string, data: T, ttl: number = 300000): void { // 5 minute default TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Usage in API calls
const cache = new APICache();

async function getCachedAccountInfo(address: string): Promise<AccountInfo> {
  const cacheKey = `account:${address}`;
  const cached = cache.get<AccountInfo>(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  const accountInfo = await fetchAccountInfo(address);
  cache.set(cacheKey, accountInfo, 30000); // Cache for 30 seconds
  
  return accountInfo;
}
```

---

## 🧪 Testing and Mocking

### API Mocking for Tests

```typescript
// Test utilities for API mocking
export class MockChainClient {
  private accounts: Map<string, MockAccountData> = new Map();

  setMockAccount(address: string, data: MockAccountData): void {
    this.accounts.set(address, data);
  }

  async getBalance(address: string): Promise<Balance> {
    const account = this.accounts.get(address);
    return account?.balance || { free: '0', reserved: '0', frozen: '0' };
  }

  async getStaking(address: string): Promise<StakingInfo> {
    const account = this.accounts.get(address);
    return account?.staking || { isStash: false, total: '0', active: '0' };
  }
}

// Test setup
describe('Account Service', () => {
  let mockChainClient: MockChainClient;
  let accountService: AccountService;

  beforeEach(() => {
    mockChainClient = new MockChainClient();
    accountService = new AccountService(mockChainClient, /* other mocks */);
    
    // Setup mock data
    mockChainClient.setMockAccount('test-address', {
      balance: { free: '1000000000000', reserved: '0', frozen: '0' },
      staking: { isStash: true, total: '500000000000', active: '500000000000' }
    });
  });

  it('should return complete account information', async () => {
    const info = await accountService.getCompleteAccountInfo('test-address');
    expect(info.balance.free).toBe('1000000000000');
    expect(info.staking.isStash).toBe(true);
  });
});
```

---

## 📋 Error Handling and Monitoring

### Structured Error Handling

```typescript
// Error types and handling
export enum APIErrorType {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  LEDGER_ERROR = 'LEDGER_ERROR'
}

export class APIError extends Error {
  constructor(
    public type: APIErrorType,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Error handling middleware
async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Log error for monitoring
    console.error(`Error in ${context}:`, error);
    
    // Re-throw as structured error
    if (error instanceof APIError) {
      throw error;
    }
    
    // Convert unknown errors
    throw new APIError(
      APIErrorType.NETWORK_ERROR,
      `Failed to execute ${context}: ${error.message}`,
      { originalError: error }
    );
  }
}
```

This comprehensive API documentation provides developers and integrators with detailed information about how the Migration Assistant interfaces with various blockchain networks, indexing services, and hardware wallets. The structured approach ensures reliable and maintainable integrations.