# Technical Architecture

## Overview

The Polkadot Migration Assistant is built as a modern web application using Next.js, TypeScript, and integrates directly with Ledger hardware wallets through WebUSB. This document provides an in-depth look at the technical architecture, design decisions, and implementation details.

## Core Technologies

### Frontend Stack
- **Next.js 14+** - React framework with App Router
- **TypeScript** - Type-safe JavaScript development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Reusable UI component library
- **Zustand** - Lightweight state management
- **React Query** - Server state management and caching

### Blockchain Integration
- **Polkadot-JS API** - Substrate blockchain interactions
- **Ledger Transport WebUSB** - Hardware wallet communication
- **@polkadot/util-crypto** - Cryptographic utilities
- **Subscan API** - Blockchain data indexing

### Testing & Quality
- **Vitest** - Unit and integration testing
- **Playwright** - End-to-end testing
- **Biome** - Code linting and formatting
- **TypeScript** - Static type checking

## Application Architecture

### Directory Structure

```
/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   │   └── subscan/       # Subscan proxy endpoints
│   ├── migrate/           # Migration interface
│   └── page.tsx           # Landing page
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui components
│   ├── sections/         # Page-specific sections
│   │   ├── home/         # Landing page sections
│   │   └── migrate/      # Migration flow sections
│   └── hooks/            # Custom React hooks
├── lib/                  # Core business logic
│   ├── account.ts        # Account management
│   ├── ledger/           # Ledger device integration
│   ├── utils/            # Utility functions
│   └── client/           # API clients
├── state/                # Global state management
│   ├── ledger.ts         # Ledger connection state
│   ├── notifications.ts  # Toast notifications
│   └── ui.ts             # UI state
├── config/               # Application configuration
│   ├── apps.ts           # Supported app definitions
│   ├── explorers.ts      # Block explorer configurations
│   └── errors.ts         # Error handling
└── tests/                # Test suites and fixtures
```

### Component Architecture

#### 1. Page Components
- **Landing Page** (`/`) - Marketing and education
- **Migration Interface** (`/migrate`) - Main application interface

#### 2. Section Components
- **Home Sections** - Landing page content blocks
- **Migration Sections** - Functional migration components
- **Dialog Components** - Modal interfaces for transactions

#### 3. Utility Components
- **UI Components** - Reusable interface elements
- **Hook Components** - Custom React hooks for business logic

## State Management

### Zustand Stores

#### Ledger Store (`state/ledger.ts`)
```typescript
interface LedgerState {
  // Connection state
  isConnected: boolean;
  device: LedgerDevice | null;
  transport: Transport | null;
  
  // Account state
  accounts: Account[];
  selectedAccount: Account | null;
  
  // Operations
  connect: () => Promise<void>;
  disconnect: () => void;
  scanAccounts: () => Promise<Account[]>;
}
```

#### UI Store (`state/ui.ts`)
```typescript
interface UIState {
  // Navigation
  activeTab: 'connect' | 'synchronize' | 'migrate';
  
  // Loading states
  isScanning: boolean;
  isMigrating: boolean;
  
  // Selection
  selectedAccounts: string[];
  
  // Actions
  setActiveTab: (tab: string) => void;
  setSelectedAccounts: (accounts: string[]) => void;
}
```

#### Notifications Store (`state/notifications.ts`)
```typescript
interface NotificationState {
  notifications: Notification[];
  
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}
```

## Core Modules

### Account Management (`lib/account.ts`)

The account module handles all account-related operations:

```typescript
// Primary functions
export async function getAccountInfo(address: string, chainId: string): Promise<AccountInfo>
export async function getStakingInfo(address: string, chainId: string): Promise<StakingInfo>
export async function getIdentityInfo(address: string, chainId: string): Promise<IdentityInfo>
export async function getMultisigAddresses(address: string): Promise<MultisigAddress[]>
export async function getProxyInfo(address: string, chainId: string): Promise<ProxyInfo>

// Transaction preparation
export async function prepareTransaction(
  account: Account,
  operation: Operation,
  params: TransactionParams
): Promise<PreparedTransaction>
```

#### Account Discovery Process
1. **Ledger Connection** - Establish WebUSB connection
2. **App Detection** - Scan for installed Polkadot apps
3. **Address Derivation** - Generate addresses using different derivation paths
4. **Balance Queries** - Check balances across all supported chains
5. **Asset Analysis** - Identify tokens, NFTs, staking positions, identities

### Ledger Integration (`lib/ledger/`)

#### LedgerService (`lib/ledger/ledgerService.ts`)
```typescript
class LedgerService {
  private transport: Transport | null = null;
  private polkadotApp: PolkadotApp | null = null;

  async connect(): Promise<void>
  async disconnect(): Promise<void>
  async getAddress(path: string): Promise<{ address: string; publicKey: string }>
  async signTransaction(path: string, payload: Uint8Array): Promise<Signature>
  async signMessage(path: string, message: Uint8Array): Promise<Signature>
}
```

#### App Management (`lib/ledger/openApp.ts`)
```typescript
// Supported Ledger apps
export const SUPPORTED_APPS = {
  'Polkadot Universal': {
    name: 'Polkadot Universal',
    coinType: 354,
    slip44: 354,
    addressPrefix: 0
  },
  'Kusama': {
    name: 'Kusama',
    coinType: 434,
    slip44: 434,
    addressPrefix: 2
  }
  // ... other legacy apps
}

export async function openPolkadotApp(transport: Transport): Promise<PolkadotApp>
export async function detectInstalledApps(transport: Transport): Promise<string[]>
```

### Blockchain Integration

#### Chain Configuration (`config/apps.ts`)
```typescript
export interface ChainConfig {
  id: string;
  name: string;
  rpcEndpoint: string;
  wsEndpoint: string;
  addressPrefix: number;
  tokenSymbol: string;
  tokenDecimals: number;
  blockTime: number;
  existentialDeposit: string;
}

export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    id: 'polkadot',
    name: 'Polkadot',
    rpcEndpoint: 'https://polkadot.api.onfinality.io/public',
    wsEndpoint: 'wss://polkadot.api.onfinality.io/public-ws',
    addressPrefix: 0,
    tokenSymbol: 'DOT',
    tokenDecimals: 10,
    blockTime: 6000,
    existentialDeposit: '10000000000'
  }
  // ... other chains
]
```

#### API Client (`lib/client/`)
```typescript
class ChainClient {
  private api: ApiPromise;
  
  constructor(endpoint: string) {
    this.api = new ApiPromise({
      provider: new WsProvider(endpoint)
    });
  }

  async getBalance(address: string): Promise<Balance>
  async getStaking(address: string): Promise<StakingInfo>
  async getIdentity(address: string): Promise<IdentityInfo>
  async submitTransaction(signedTx: Uint8Array): Promise<Hash>
  async queryMultisig(address: string): Promise<MultisigInfo>
}
```

## Transaction Flow

### 1. Transaction Preparation
```typescript
// 1. Validate inputs
const validation = validateTransactionInputs(params);
if (!validation.isValid) throw new Error(validation.error);

// 2. Estimate fees
const feeEstimate = await estimateTransactionFee(chain, operation, params);

// 3. Build transaction
const unsignedTx = await buildTransaction(chain, operation, params);

// 4. Prepare for signing
const preparedTx: PreparedTransaction = {
  unsigned: unsignedTx,
  fee: feeEstimate,
  payload: createSigningPayload(unsignedTx)
};
```

### 2. Transaction Signing
```typescript
// 1. Send to Ledger for signing
const signature = await ledgerService.signTransaction(
  derivationPath,
  preparedTx.payload
);

// 2. Attach signature to transaction
const signedTx = attachSignature(preparedTx.unsigned, signature);

// 3. Validate signed transaction
const isValid = validateSignedTransaction(signedTx);
if (!isValid) throw new Error('Invalid signature');
```

### 3. Transaction Submission
```typescript
// 1. Submit to blockchain
const txHash = await chainClient.submitTransaction(signedTx);

// 2. Monitor inclusion
const monitor = new TransactionMonitor(txHash);
monitor.on('included', (blockHash) => {
  updateUI({ status: 'included', blockHash });
});
monitor.on('finalized', (blockHash) => {
  updateUI({ status: 'finalized', blockHash });
});

// 3. Handle results
await monitor.waitForFinalization();
```

## Security Architecture

### Private Key Security
- **Hardware-only** - Private keys never leave the Ledger device
- **Secure communication** - All Ledger communication over authenticated channels
- **Payload verification** - Transaction payloads verified before signing
- **User confirmation** - All operations require explicit user approval on device

### Data Privacy
- **No storage** - No sensitive data stored in browser
- **Minimal data** - Only necessary blockchain data cached
- **Session-only** - All state cleared on page refresh
- **HTTPS-only** - All communications encrypted in transit

### Transaction Security
- **Payload inspection** - Users can inspect transaction details on Ledger
- **Fee validation** - Automatic fee estimation and validation
- **Address verification** - Destination addresses verified
- **Amount confirmation** - Transaction amounts displayed clearly

## Performance Optimization

### Connection Management
- **Connection pooling** - Reuse WebUSB connections
- **Reconnection logic** - Automatic reconnection on disconnect
- **Timeout handling** - Graceful timeout management
- **Error recovery** - Robust error handling and recovery

### Data Fetching
- **Parallel queries** - Simultaneous multi-chain queries
- **Caching strategy** - Intelligent caching of blockchain data
- **Pagination** - Efficient handling of large datasets
- **Background refresh** - Non-blocking data updates

### UI Performance  
- **Virtual scrolling** - Efficient rendering of large lists
- **Lazy loading** - Progressive loading of components
- **Debounced inputs** - Optimized user input handling
- **Skeleton loading** - Smooth loading experiences

## Error Handling

### Error Categories
1. **Connection Errors** - Ledger device communication issues
2. **Transaction Errors** - Blockchain transaction failures
3. **Network Errors** - RPC endpoint connectivity issues
4. **Validation Errors** - Input validation failures
5. **System Errors** - Browser or system-level issues

### Error Recovery
```typescript
// Automatic retry with exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

## Testing Strategy

### Unit Tests
- **Pure functions** - Logic functions with predictable inputs/outputs
- **Component behavior** - React component functionality
- **State management** - Store actions and reducers
- **Utility functions** - Helper and formatting functions

### Integration Tests
- **API integration** - Blockchain API interactions
- **Component integration** - Multi-component workflows
- **State integration** - Cross-store interactions
- **User workflows** - Complete user journey testing

### End-to-End Tests
- **Migration flows** - Complete migration scenarios
- **Error scenarios** - Error handling and recovery
- **Device interactions** - Ledger device communication
- **Cross-browser** - Compatibility across browsers

## Deployment Architecture

### Build Process
1. **TypeScript compilation** - Type checking and JavaScript generation
2. **Asset optimization** - CSS/JS minification and bundling
3. **Static generation** - Pre-rendered pages where possible
4. **Bundle analysis** - Size optimization and tree shaking

### Environment Configuration
```typescript
// Environment-specific settings
export const CONFIG = {
  production: {
    rpcEndpoints: PRODUCTION_ENDPOINTS,
    logging: 'error',
    caching: true
  },
  development: {
    rpcEndpoints: DEVELOPMENT_ENDPOINTS,
    logging: 'debug',
    caching: false
  }
};
```

### Monitoring & Analytics
- **Error tracking** - Automatic error reporting
- **Performance monitoring** - Core web vitals tracking
- **Usage analytics** - Anonymous usage statistics
- **Transaction monitoring** - Success/failure rates

## Future Architecture Considerations

### Scalability
- **Worker threads** - Offload heavy computation
- **Service workers** - Offline capability and caching
- **WebAssembly** - Performance-critical operations
- **Streaming** - Real-time data updates

### Extensibility
- **Plugin architecture** - Third-party integrations
- **API versioning** - Backward compatibility
- **Configuration system** - Runtime configuration
- **Theme system** - Customizable user interface

### Security Enhancements
- **Content Security Policy** - XSS protection
- **Subresource Integrity** - Asset integrity verification
- **Permission management** - Granular permission control
- **Audit logging** - Security event tracking