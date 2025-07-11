# Integration Tests

This directory contains integration tests for the Polkadot Web Migration application. These tests verify that components work correctly together and that user flows function as expected.

## Test Structure

- **general/**: Basic tests for common components and functionality
  - `connect-page.test.tsx`: Tests for the Connect page
  - `connect-states.test.tsx`: Tests for different device connection states
  - `tabs.test.tsx`: Tests for tab navigation and state

- **migrate/**: Tests for the migration flow
  - `select-for-migration.test.tsx`: Tests for account selection during migration

- **sync/**: Tests for the synchronization flow
  - `sync-progress.test.tsx`: Tests for app synchronization progress
  - `synchronize.test.tsx`: Tests for account synchronization

- **helpers/**: Reusable test utilities
  - `accounts.ts`: Account-related test helpers
  - `connect.ts`: Connect page verification helpers
  - `ledgerClient.ts`: Ledger client mocking utilities
  - `renderWithProviders.tsx`: Component rendering with providers
  - `synchronize.ts`: Synchronization verification helpers
  - `tabs.ts`: Tab-related verification helpers
  - `transport.ts`: Transport setup utilities

- **mocks/**: Mock data and implementations
  - `accounts.ts`: Mock account data
  - `api.ts`: Mock API implementations
  - `apps.ts`: Mock app configurations
  - `genericApp.ts`: Mock generic app implementations
  - `ledger.ts`: Mock Ledger data
  - `ledgerClient.ts`: Mock Ledger client
  - `transport.ts`: Mock transport implementations

- **constants.ts**: Shared constants for test IDs, mock data, and text content

## Best Practices

1. **Use constants**: Always use the constants defined in `constants.ts` for test IDs, mock data, and text content
2. **Error handling**: All verification helpers include proper error handling with descriptive messages
3. **Specific test descriptions**: Use detailed test descriptions that explain what is being tested
4. **Reusable helpers**: Create and use helper functions for common verification tasks
5. **Mock consistency**: Maintain consistent mock data across tests

## Running Tests

To run the tests:

```bash
pnpm test
```

To run tests with coverage:

```bash
pnpm test:coverage
```

## Adding New Tests

When adding new tests:

1. Follow the existing structure and patterns
2. Use the helper functions and constants
3. Add proper error handling
4. Write specific test descriptions
5. Keep mock data consistent with existing tests 