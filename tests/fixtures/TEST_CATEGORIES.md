# Test Categories and Organization

This document describes how test data is organized and categorized in the fixtures directory.

## Directory Structure

```
fixtures/
├── addresses/          # Address-related test data
├── balances/           # Balance and amount test data  
├── transactions/       # Transaction scenarios and mocks
├── api-responses/      # Mock API responses
├── components/         # Component-specific test scenarios
└── schemas/            # Data validation schemas
```

## Test Data Categories

### 1. Addresses (`addresses/`)

**Purpose**: Common blockchain addresses used across tests

**Contents**:
- `TEST_ADDRESSES` - Named test addresses for different scenarios
- `TEST_PATHS` - Ledger derivation paths
- `TEST_PUBKEYS` - Public keys for addresses
- Helper functions to create test address objects

**Usage Example**:
```typescript
import { TEST_ADDRESSES, createTestAddress } from '@/tests/fixtures/addresses'

const testAddress = createTestAddress(TEST_ADDRESSES.ALICE)
```

### 2. Balances (`balances/`)

**Purpose**: Balance amounts and test cases for financial calculations

**Contents**:
- `TEST_AMOUNTS` - Common amounts (1 DOT, fees, etc.)
- `nativeBalanceTestCases` - Scenarios for native token balances
- `stakingTestCases` - Scenarios for staking balances
- Helper functions to create balance objects

**Test Scenarios**:
- Zero balances
- Standard balances
- Insufficient balance for fees
- Maximum values
- Dust amounts

### 3. Transactions (`transactions/`)

**Purpose**: Transaction scenarios for testing signing and submission

**Contents**:
- `transactionScenarios` - Valid transaction cases
- `transactionErrors` - Error scenarios
- `mockTransactionResults` - Mock transaction outcomes
- Helper to create mock extrinsics

**Test Scenarios**:
- Simple transfers
- Staking operations (unbond, withdraw)
- Identity removal
- Proxy removal
- Batch transactions
- Multisig operations

### 4. API Responses (`api-responses/`)

**Purpose**: Mock responses from blockchain APIs and external services

**Planned Contents**:
- Subscan API responses
- RPC call responses
- Error responses
- Rate limit responses

### 5. Components (`components/`)

**Purpose**: Component-specific test scenarios combining multiple fixtures

**Contents**:
- `dialog.fixtures.ts` - Dialog component test scenarios
- Additional component fixtures as needed

**Features**:
- Combines addresses, balances, and other data
- Provides complete props for component testing
- Scenarios for different component states

### 6. Schemas (`schemas/`)

**Purpose**: JSON schemas for validating test data structure

**Planned Contents**:
- Address schema
- Balance schema
- Transaction schema
- API response schemas

## Best Practices

### 1. Naming Conventions

- Use UPPERCASE for constants: `TEST_ADDRESSES`, `TEST_AMOUNTS`
- Use camelCase for test cases: `nativeBalanceTestCases`
- Use descriptive names: `ADDRESS_WITH_IDENTITY_AND_PARENT`

### 2. Data Organization

- Group related data together
- Provide both valid and invalid test cases
- Include edge cases (zero, max, negative scenarios)
- Document special addresses/values

### 3. Type Safety

- Export TypeScript types for all data structures
- Use const assertions for literal types
- Provide helper functions with proper typing

### 4. Reusability

- Make fixtures composable
- Provide helper functions to create variations
- Avoid hardcoding values in test files

## Adding New Fixtures

1. **Choose the Right Category**
   - Is it address-related? → `addresses/`
   - Is it about amounts/balances? → `balances/`
   - Is it transaction-specific? → `transactions/`
   - Is it component-specific? → `components/`

2. **Follow the Pattern**
   ```typescript
   // 1. Define constants
   export const TEST_DATA = { ... } as const
   
   // 2. Define test cases
   export const testCases = {
     validCase: { input: ..., expected: ... },
     errorCase: { input: ..., expectedError: ... }
   }
   
   // 3. Provide helpers
   export function createTestData(...) { ... }
   ```

3. **Document the Data**
   - Add comments explaining special values
   - Document what each test case is testing
   - Include usage examples

4. **Export from Index**
   - Add exports to the category index file
   - Update the main fixtures index if needed

## Test Case Coverage

Each fixture category should include:

1. **Happy Path Cases** - Normal, expected usage
2. **Edge Cases** - Boundary values (0, max, etc.)
3. **Error Cases** - Invalid inputs, missing data
4. **Security Cases** - Malicious inputs, overflows
5. **Performance Cases** - Large data sets

## Maintenance

- Review fixtures quarterly
- Remove obsolete test data
- Update when APIs change
- Keep synchronized with actual chain data