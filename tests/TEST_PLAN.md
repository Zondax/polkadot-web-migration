# Polkadot Web Migration Test Plan

## Overview

This document outlines the comprehensive test strategy for the Polkadot Web Migration application. Our testing approach ensures reliability, security, and user experience quality across all features.

## Test Organization

### Directory Structure

```
tests/
├── fixtures/              # Centralized test data
│   ├── addresses/         # Common test addresses
│   ├── balances/          # Balance test data
│   ├── transactions/      # Transaction test cases
│   ├── api-responses/     # Mock API responses
│   ├── components/        # Component-specific test data
│   └── schemas/           # Data validation schemas
├── utils/                 # Shared test utilities
├── integration/           # Integration tests
└── e2e/                   # End-to-end tests
```

### Test Categories

1. **Unit Tests** - Test individual functions and components in isolation
2. **Integration Tests** - Test interactions between multiple components
3. **E2E Tests** - Test complete user workflows

## Feature Coverage

### 1. Connection & Hardware Wallet Integration
- **Location**: `components/hooks/__tests__/useConnection.test.ts`
- **Coverage**: Ledger connection, app detection, error handling
- **Critical Paths**: 
  - Initial device connection
  - App open detection
  - Connection error recovery

### 2. Account Synchronization
- **Location**: `tests/integration/sync/`
- **Coverage**: Account discovery, balance fetching, multi-chain sync
- **Critical Paths**:
  - Synchronize accounts across all chains
  - Handle API failures gracefully
  - Update UI with sync progress

### 3. Balance Management
- **Location**: `lib/__tests__/utils/balance.test.ts`
- **Coverage**: Balance calculations, fee estimations, transferable amounts
- **Test Data**: `tests/fixtures/balances/`
- **Critical Paths**:
  - Calculate transferable balance
  - Verify sufficient balance for fees
  - Handle edge cases (zero, dust, max values)

### 4. Migration Transactions
- **Location**: `state/client/__tests__/ledger.test.tsx`
- **Coverage**: Transaction creation, signing, submission
- **Critical Paths**:
  - Create valid migration transaction
  - Sign with Ledger device
  - Handle transaction errors

### 5. Staking Operations
- **Location**: `components/sections/migrate/dialogs/__tests__/unstake-dialog.test.tsx`
- **Coverage**: Unstake, withdraw, fee calculation
- **Status**: 7 TODO tests need implementation
- **Critical Paths**:
  - Validate unstake amounts
  - Calculate accurate fees
  - Handle unlocking periods

### 6. Identity & Proxy Management
- **Location**: `components/sections/migrate/dialogs/__tests__/remove-identity-dialog.test.tsx`
- **Coverage**: Identity removal, proxy removal, deposit returns
- **Critical Paths**:
  - Remove on-chain identity
  - Clear all proxies
  - Return deposits

### 7. UI Components
- **Location**: `components/__tests__/`
- **Coverage**: All reusable UI components
- **Critical Components**:
  - ExplorerLink - blockchain explorer integration
  - CopyButton - address copying
  - TokenIcon - chain-specific icons
  - Tabs - navigation

## Test Data Management

### Fixture Files
All test data is centralized in `tests/fixtures/` for:
- **Consistency**: Same test data across all tests
- **Maintenance**: Update data in one location
- **Type Safety**: TypeScript interfaces for all fixtures

### Key Fixtures
1. **addresses/index.ts** - Common test addresses and paths
2. **balances/index.ts** - Balance amounts and test cases
3. **transactions/index.ts** - Transaction scenarios
4. **api-responses/index.ts** - Mock API responses

## Adding New Tests

### 1. Create Test File
Place in appropriate directory following naming convention:
- Unit tests: `[component-name].test.tsx`
- Integration tests: `tests/integration/[feature]/[test-name].test.tsx`

### 2. Use Fixtures
Import test data from fixtures:
```typescript
import { TEST_ADDRESSES, createTestAddress } from '@/tests/fixtures/addresses'
import { TEST_AMOUNTS, createTestNativeBalance } from '@/tests/fixtures/balances'
```

### 3. Follow Test Structure
```typescript
describe('Feature Name', () => {
  describe('Scenario', () => {
    it('should handle specific case', () => {
      // Arrange - Set up test data
      // Act - Execute the function
      // Assert - Verify the result
    })
  })
})
```

### 4. Document Edge Cases
Always test:
- Zero/empty values
- Maximum values
- Invalid inputs
- Error scenarios
- Loading states

## Skipped Tests Status

### Currently Skipped (10 tests)
1. **useTokenLogo.test.ts** (2) - Icon handling edge cases
2. **loadIcons.test.ts** (1) - Undefined handler
3. **account.test.ts** (2) - API error handling
4. **destination-address-select.test.tsx** (1) - Observer wrapper
5. **synchronize.test.tsx** (1) - Full sync integration
6. **select-for-migration.test.tsx** (1) - Migration selection
7. **balance-visualizations.test.tsx** (2) - Zero balance cases

### TODO Tests (7 tests)
All in **unstake-dialog.test.tsx**:
- Amount validation
- Fee estimation
- Form state management
- Transaction submission

## Running Tests

### All Tests
```bash
pnpm test
```

### Watch Mode
```bash
pnpm test:watch
```

### Coverage Report
```bash
pnpm test:coverage
```

### Specific File
```bash
pnpm test [filename]
```

### Integration Tests Only
```bash
pnpm test tests/integration
```

## Test Quality Standards

1. **Descriptive Names**: Test names should clearly describe what is being tested
2. **Isolated Tests**: Each test should be independent
3. **Mock External Dependencies**: Use mocks for APIs, hardware, etc.
4. **Assert Specific Values**: Avoid generic assertions
5. **Test User Interactions**: Not just function outputs
6. **Document Complex Scenarios**: Add comments for non-obvious test cases

## Continuous Improvement

### Monthly Review
- Review skipped tests
- Update fixtures with new edge cases
- Add tests for new features
- Remove obsolete tests

### Coverage Goals
- Maintain >80% code coverage
- 100% coverage for critical paths
- Document reasons for any excluded files