# Developer & Contributor Guide

This guide provides comprehensive information for developers who want to contribute to the Polkadot Migration Assistant project or build integrations with it.

## 🚀 Getting Started

### Development Environment Setup

#### Prerequisites
```bash
# Required software
Node.js >= 18.0.0
pnpm >= 8.0.0
Git >= 2.30.0

# Optional but recommended
VS Code with extensions:
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense
- Prettier - Code formatter
- ESLint
```

#### Project Setup
```bash
# Clone the repository
git clone https://github.com/your-org/polkadot-web-migration.git
cd polkadot-web-migration

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
pnpm dev

# Run tests
pnpm test

# Run linting
pnpm lint
```

#### Environment Variables
```bash
# .env.local
NEXT_PUBLIC_POLKADOT_RPC=wss://polkadot.api.onfinality.io/public-ws
NEXT_PUBLIC_KUSAMA_RPC=wss://kusama.api.onfinality.io/public-ws
NEXT_PUBLIC_ASSETHUB_RPC=wss://polkadot-asset-hub-rpc.polkadot.io

# Optional: API keys for enhanced functionality
SUBSCAN_API_KEY=your-subscan-api-key
ONFINALITY_API_KEY=your-onfinality-api-key

# Development settings
NODE_ENV=development
NEXT_PUBLIC_DEBUG=true
```

---

## 🏗️ Project Architecture

### Technology Stack
```typescript
// Core frameworks and libraries
Framework: Next.js 14+ (App Router)
Language: TypeScript
Styling: Tailwind CSS
UI Components: shadcn/ui + Radix UI
State Management: Zustand
Blockchain: Polkadot-JS API
Hardware Wallets: Ledger Transport WebUSB
Testing: Vitest + Playwright
Linting: Biome
```

### Directory Structure
```
src/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   ├── migrate/           # Migration interface
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Base UI components (shadcn/ui)
│   ├── sections/         # Page-specific components
│   └── hooks/            # Custom React hooks
├── lib/                  # Core business logic
│   ├── account.ts        # Account management
│   ├── ledger/           # Ledger integration
│   └── utils/            # Utility functions
├── state/                # Global state (Zustand)
├── config/               # Configuration files
└── tests/                # Test files and fixtures
```

### Core Dependencies
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "typescript": "^5.0.0",
    "@polkadot/api": "^10.0.0",
    "@polkadot/util-crypto": "^12.0.0",
    "@ledgerhq/hw-transport-webusb": "^6.28.0",
    "@zondax/ledger-polkadot": "^0.45.0",
    "zustand": "^4.4.0",
    "tailwindcss": "^3.3.0",
    "@radix-ui/react-dialog": "^1.0.0"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "playwright": "^1.40.0",
    "@biomejs/biome": "1.4.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0"
  }
}
```

---

## 🧩 Development Guidelines

### Code Style and Standards

#### TypeScript Configuration
```typescript
// tsconfig.json key settings
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

#### Code Formatting (Biome)
```json
// biome.json
{
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": {
        "useImportType": "error",
        "useConst": "error"
      }
    }
  }
}
```

#### Naming Conventions
```typescript
// Files: kebab-case
account-service.ts
migration-dialog.tsx

// Components: PascalCase
function MigrationDialog() {}
const AccountBalance = () => {}

// Functions and variables: camelCase
const getUserAccount = () => {}
const isConnected = true

// Constants: SCREAMING_SNAKE_CASE
const DEFAULT_TIMEOUT = 30000
const SUPPORTED_NETWORKS = ['polkadot', 'kusama']

// Types and interfaces: PascalCase
interface AccountInfo {}
type MigrationStatus = 'pending' | 'complete'
```

### Component Development

#### Component Structure
```tsx
// components/sections/migrate/account-row.tsx
import type { Account } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { formatBalance } from '@/lib/utils/format'

interface AccountRowProps {
  account: Account
  onSelect: (account: Account) => void
  isSelected: boolean
}

export function AccountRow({ account, onSelect, isSelected }: AccountRowProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1">
        <div className="font-medium">{account.address}</div>
        <div className="text-sm text-muted-foreground">
          {formatBalance(account.balance.free, account.chainId)}
        </div>
      </div>
      
      <Button
        variant={isSelected ? "default" : "outline"}
        onClick={() => onSelect(account)}
      >
        {isSelected ? "Selected" : "Select"}
      </Button>
    </div>
  )
}
```

#### Custom Hooks Pattern
```tsx
// components/hooks/use-account-info.ts
import { useState, useEffect } from 'react'
import { getAccountInfo } from '@/lib/account'
import type { Account, AccountInfo } from '@/lib/types'

export function useAccountInfo(account: Account | null) {
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!account) {
      setAccountInfo(null)
      return
    }

    const fetchAccountInfo = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const info = await getAccountInfo(account.address, account.chainId)
        setAccountInfo(info)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAccountInfo()
  }, [account])

  return { accountInfo, isLoading, error }
}
```

### State Management

#### Zustand Store Pattern
```typescript
// state/migration.ts
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Account, MigrationPlan } from '@/lib/types'

interface MigrationState {
  // State
  selectedAccounts: Account[]
  migrationPlan: MigrationPlan | null
  isExecuting: boolean
  currentStep: number
  
  // Actions
  selectAccount: (account: Account) => void
  unselectAccount: (accountId: string) => void
  setMigrationPlan: (plan: MigrationPlan) => void
  startExecution: () => void
  completeStep: (stepIndex: number) => void
  reset: () => void
}

export const useMigrationStore = create<MigrationState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    selectedAccounts: [],
    migrationPlan: null,
    isExecuting: false,
    currentStep: 0,

    // Actions
    selectAccount: (account) =>
      set((state) => ({
        selectedAccounts: [...state.selectedAccounts, account]
      })),

    unselectAccount: (accountId) =>
      set((state) => ({
        selectedAccounts: state.selectedAccounts.filter(
          (acc) => acc.id !== accountId
        )
      })),

    setMigrationPlan: (plan) => set({ migrationPlan: plan }),

    startExecution: () => set({ isExecuting: true, currentStep: 0 }),

    completeStep: (stepIndex) =>
      set((state) => ({
        currentStep: Math.max(state.currentStep, stepIndex + 1)
      })),

    reset: () =>
      set({
        selectedAccounts: [],
        migrationPlan: null,
        isExecuting: false,
        currentStep: 0
      })
  }))
)

// Selector hooks for performance
export const useSelectedAccounts = () =>
  useMigrationStore((state) => state.selectedAccounts)

export const useMigrationPlan = () =>
  useMigrationStore((state) => state.migrationPlan)
```

---

## 🧪 Testing Strategy

### Unit Testing with Vitest

#### Test Setup
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
```

#### Component Testing
```typescript
// tests/components/account-row.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AccountRow } from '@/components/sections/migrate/account-row'
import type { Account } from '@/lib/types'

const mockAccount: Account = {
  id: 'test-account',
  address: '1ChFweNRLzrZsT77vYzqhTHhgFhc5fy8sZ6UnMZU1xhyGGNF',
  chainId: 'polkadot',
  balance: {
    free: '1000000000000',
    reserved: '0',
    frozen: '0'
  }
}

describe('AccountRow', () => {
  it('renders account information correctly', () => {
    const onSelect = vi.fn()
    
    render(
      <AccountRow
        account={mockAccount}
        onSelect={onSelect}
        isSelected={false}
      />
    )
    
    expect(screen.getByText(mockAccount.address)).toBeInTheDocument()
    expect(screen.getByText('100.00 DOT')).toBeInTheDocument()
    expect(screen.getByText('Select')).toBeInTheDocument()
  })

  it('calls onSelect when button is clicked', () => {
    const onSelect = vi.fn()
    
    render(
      <AccountRow
        account={mockAccount}
        onSelect={onSelect}
        isSelected={false}
      />
    )
    
    fireEvent.click(screen.getByText('Select'))
    expect(onSelect).toHaveBeenCalledWith(mockAccount)
  })

  it('shows selected state correctly', () => {
    const onSelect = vi.fn()
    
    render(
      <AccountRow
        account={mockAccount}
        onSelect={onSelect}
        isSelected={true}
      />
    )
    
    expect(screen.getByText('Selected')).toBeInTheDocument()
  })
})
```

#### Business Logic Testing
```typescript
// tests/lib/account.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getAccountInfo, prepareTransfer } from '@/lib/account'

// Mock external dependencies
vi.mock('@polkadot/api', () => ({
  ApiPromise: {
    create: vi.fn()
  }
}))

describe('Account Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAccountInfo', () => {
    it('should fetch account information successfully', async () => {
      // Mock API response
      const mockApi = {
        query: {
          system: {
            account: vi.fn().mockResolvedValue({
              data: {
                free: '1000000000000',
                reserved: '0',
                frozen: '0'
              }
            })
          }
        }
      }

      const accountInfo = await getAccountInfo('test-address', mockApi)

      expect(accountInfo).toEqual({
        address: 'test-address',
        balance: {
          free: '1000000000000',
          reserved: '0',
          frozen: '0'
        }
      })
    })

    it('should handle API errors gracefully', async () => {
      const mockApi = {
        query: {
          system: {
            account: vi.fn().mockRejectedValue(new Error('API Error'))
          }
        }
      }

      await expect(getAccountInfo('test-address', mockApi))
        .rejects.toThrow('API Error')
    })
  })
})
```

### Integration Testing

#### React Testing Library Setup
```typescript
// tests/helpers/test-utils.tsx
import { render, type RenderOptions } from '@testing-library/react'
import { type ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Test providers wrapper
function AllTheProviders({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

// Custom render function
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
```

### End-to-End Testing with Playwright

#### Playwright Configuration
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

#### E2E Test Example
```typescript
// e2e/migration-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Migration Flow', () => {
  test('should complete basic migration workflow', async ({ page }) => {
    await page.goto('/')
    
    // Navigate to migration interface
    await page.click('text=Start Migration')
    await expect(page).toHaveURL('/migrate')
    
    // Mock Ledger connection for testing
    await page.evaluate(() => {
      // Mock WebUSB for testing
      global.navigator.usb = {
        requestDevice: () => Promise.resolve({}),
        getDevices: () => Promise.resolve([{}])
      }
    })
    
    // Connect Ledger
    await page.click('text=Connect Ledger')
    await expect(page.locator('text=Connected')).toBeVisible()
    
    // Account discovery
    await page.click('text=Discover Accounts')
    await expect(page.locator('[data-testid="account-list"]')).toBeVisible()
    
    // Select account for migration
    await page.click('[data-testid="select-account-0"]')
    await expect(page.locator('text=1 account selected')).toBeVisible()
    
    // Review migration plan
    await page.click('text=Review Migration')
    await expect(page.locator('[data-testid="migration-plan"]')).toBeVisible()
    
    // Execute migration (mocked)
    await page.click('text=Start Migration')
    await expect(page.locator('text=Migration Complete')).toBeVisible()
  })
})
```

---

## 🔌 API Development

### Adding New Chain Support

#### Chain Configuration
```typescript
// config/chains.ts
import type { ChainConfig } from '@/lib/types'

export const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  'new-parachain': {
    id: 'new-parachain',
    name: 'New Parachain',
    displayName: 'New Parachain Network',
    
    // Network endpoints
    rpcEndpoint: 'wss://new-parachain-rpc.io',
    wsEndpoint: 'wss://new-parachain-ws.io',
    
    // Token configuration
    tokenSymbol: 'NEW',
    tokenDecimals: 12,
    
    // Address configuration
    addressPrefix: 42,
    
    // Network parameters
    blockTime: 12000, // 12 seconds
    existentialDeposit: '1000000000000', // 1 NEW
    
    // Feature flags
    features: {
      staking: true,
      identity: false,
      multisig: true,
      assets: false,
      nfts: false
    },
    
    // Migration support status
    migrationStatus: 'planned' as const
  }
}
```

#### API Client Implementation
```typescript
// lib/clients/new-parachain.ts
import { ApiPromise, WsProvider } from '@polkadot/api'
import type { ChainClient, AccountInfo } from '@/lib/types'

export class NewParachainClient implements ChainClient {
  private api: ApiPromise | null = null

  async connect(endpoint: string): Promise<void> {
    const provider = new WsProvider(endpoint)
    this.api = await ApiPromise.create({ provider })
  }

  async disconnect(): Promise<void> {
    if (this.api) {
      await this.api.disconnect()
    }
  }

  async getAccountInfo(address: string): Promise<AccountInfo> {
    if (!this.api) throw new Error('Not connected')

    const accountData = await this.api.query.system.account(address)
    
    return {
      address,
      balance: {
        free: accountData.data.free.toString(),
        reserved: accountData.data.reserved.toString(),
        frozen: accountData.data.frozen.toString()
      },
      nonce: accountData.nonce.toNumber()
    }
  }

  // Implement other required methods...
}
```

### Adding New Migration Operations

#### Operation Definition
```typescript
// lib/operations/custom-operation.ts
import type { MigrationOperation, PreparedTransaction } from '@/lib/types'

export interface CustomOperationParams {
  amount: string
  destination: string
  customParam: string
}

export class CustomOperation implements MigrationOperation {
  type = 'custom-operation' as const

  constructor(private params: CustomOperationParams) {}

  async prepare(api: ApiPromise, signer: string): Promise<PreparedTransaction> {
    // Validate parameters
    this.validateParams()
    
    // Build transaction
    const transaction = api.tx.customPallet.customMethod(
      this.params.destination,
      this.params.amount,
      this.params.customParam
    )
    
    // Estimate fees
    const paymentInfo = await transaction.paymentInfo(signer)
    
    return {
      transaction,
      fee: paymentInfo.partialFee.toString(),
      operation: this,
      signer
    }
  }

  private validateParams(): void {
    if (!this.params.amount || BigInt(this.params.amount) <= 0) {
      throw new Error('Invalid amount')
    }
    
    if (!this.params.destination) {
      throw new Error('Destination address required')
    }
    
    // Add custom validation logic
  }

  getDescription(): string {
    return `Custom operation: ${this.params.amount} to ${this.params.destination}`
  }
}
```

---

## 🎨 UI/UX Development

### Design System

#### Theme Configuration
```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // ... other color definitions
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

#### Component Variants
```typescript
// components/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'underline-offset-4 hover:underline text-primary',
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-3 rounded-md',
        lg: 'h-11 px-8 rounded-md',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
```

### Accessibility Guidelines

#### ARIA Implementation
```tsx
// Accessible dialog component
export function MigrationDialog({ isOpen, onClose, children }: DialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
        className="sm:max-w-[425px]"
      >
        <DialogHeader>
          <DialogTitle id="dialog-title">Migration Progress</DialogTitle>
          <DialogDescription id="dialog-description">
            Monitor your account migration progress below.
          </DialogDescription>
        </DialogHeader>
        
        {children}
        
        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

#### Keyboard Navigation
```tsx
// Custom hook for keyboard navigation
export function useKeyboardNavigation(
  items: string[],
  onSelect: (item: string) => void
) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % items.length)
          break
        case 'ArrowUp':
          event.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + items.length) % items.length)
          break
        case 'Enter':
          event.preventDefault()
          onSelect(items[selectedIndex])
          break
        case 'Escape':
          setSelectedIndex(0)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [items, selectedIndex, onSelect])

  return { selectedIndex, setSelectedIndex }
}
```

---

## 🚀 Deployment & CI/CD

### Build Configuration

#### Next.js Production Build
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  experimental: {
    optimizePackageImports: ['@polkadot/api'],
  },
  
  webpack: (config) => {
    // Polkadot-JS requires specific webpack configuration
    config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: false,
      stream: false,
      assert: false,
      http: false,
      https: false,
      os: false,
      url: false,
    }
    
    return config
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
```

#### Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN corepack enable pnpm && pnpm build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### GitHub Actions Workflow
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 8
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'pnpm'
    
    - name: Install dependencies
      run: pnpm install --frozen-lockfile
    
    - name: Run linting
      run: pnpm lint
    
    - name: Run type checking
      run: pnpm type-check
    
    - name: Run unit tests
      run: pnpm test
    
    - name: Run build
      run: pnpm build

  e2e:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 8
    
    - name: Use Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18.x'
        cache: 'pnpm'
    
    - name: Install dependencies
      run: pnpm install --frozen-lockfile
    
    - name: Install Playwright browsers
      run: pnpm exec playwright install --with-deps
    
    - name: Run E2E tests
      run: pnpm test:e2e
    
    - uses: actions/upload-artifact@v3
      if: failure()
      with:
        name: playwright-report
        path: playwright-report/

  deploy:
    runs-on: ubuntu-latest
    needs: [test, e2e]
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Deploy to production
      run: |
        # Add deployment commands here
        echo "Deploying to production..."
```

---

## 📊 Performance Optimization

### Bundle Analysis
```javascript
// scripts/analyze-bundle.js
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (process.env.ANALYZE === 'true') {
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: isServer
            ? '../analyze/server.html'
            : './analyze/client.html',
        })
      )
    }
    
    return config
  },
}

module.exports = nextConfig
```

### Code Splitting Strategies
```typescript
// Dynamic imports for large dependencies
const PolkadotAPIProvider = dynamic(
  () => import('@/components/providers/polkadot-api-provider'),
  {
    loading: () => <div>Loading blockchain connection...</div>,
    ssr: false
  }
)

// Route-based code splitting
const MigrationInterface = dynamic(
  () => import('@/components/sections/migrate/migration-interface'),
  {
    loading: () => <MigrationSkeleton />,
    ssr: false
  }
)
```

### Performance Monitoring
```typescript
// lib/performance.ts
export function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now()
  
  return fn().finally(() => {
    const duration = performance.now() - start
    console.log(`${name} took ${duration.toFixed(2)}ms`)
    
    // Send to analytics if configured
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'timing_complete', {
        name,
        value: Math.round(duration)
      })
    }
  })
}

// Usage
const accountInfo = await measurePerformance(
  'account-discovery',
  () => discoverAccounts(ledgerService)
)
```

---

## 🤝 Contributing Guidelines

### Pull Request Process

1. **Fork and Branch**
   ```bash
   git checkout -b feature/new-feature-name
   ```

2. **Development**
   - Follow coding standards and conventions
   - Write tests for new functionality
   - Update documentation as needed

3. **Testing**
   ```bash
   pnpm test        # Unit tests
   pnpm test:e2e    # End-to-end tests
   pnpm lint        # Code linting
   pnpm type-check  # TypeScript checking
   ```

4. **Commit Guidelines**
   ```bash
   # Conventional commit format
   git commit -m "feat: add support for new parachain"
   git commit -m "fix: resolve connection timeout issue"
   git commit -m "docs: update API documentation"
   ```

5. **Pull Request**
   - Provide clear description of changes
   - Include testing instructions
   - Reference related issues
   - Ensure CI passes

### Code Review Process

**Review Checklist:**
- [ ] Code follows project conventions
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No security vulnerabilities introduced
- [ ] Performance impact considered
- [ ] Accessibility standards met

### Release Process

1. **Version Bump**
   ```bash
   pnpm version patch|minor|major
   ```

2. **Changelog Update**
   - Document all changes
   - Follow conventional changelog format

3. **Testing**
   - Run full test suite
   - Manual testing on staging environment

4. **Deployment**
   - Deploy to staging
   - Verify functionality
   - Deploy to production

---

## 📚 Resources & References

### Documentation Links
- [Next.js Documentation](https://nextjs.org/docs)
- [Polkadot-JS API Documentation](https://polkadot.js.org/docs/)
- [Ledger Hardware Wallet Integration](https://developers.ledger.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### Development Tools
- [VS Code Extensions](https://marketplace.visualstudio.com/)
- [React Developer Tools](https://reactjs.org/blog/2019/08/15/new-react-devtools.html)
- [Polkadot-JS Apps](https://polkadot.js.org/apps/)

### Community & Support
- [GitHub Repository](https://github.com/your-org/polkadot-web-migration)
- [Discord Community](https://discord.gg/polkadot)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/polkadot)

This developer guide provides everything needed to contribute effectively to the Polkadot Migration Assistant project. Whether you're fixing bugs, adding features, or improving documentation, these guidelines will help ensure high-quality contributions.