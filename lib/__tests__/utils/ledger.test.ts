import type { App } from 'state/ledger'
import type { Address } from 'state/types/ledger'
import { TransactionStatus } from 'state/types/ledger'
import { describe, expect, it } from 'vitest'

import {
  filterAppsWithErrors,
  filterAppsWithoutErrors,
  getAppTotalAccounts,
  hasAccountsWithErrors,
  hasAppAccounts,
  setDefaultDestinationAddress,
} from '../../utils/ledger'
import {
  mockAddress1,
  mockAddress2,
  mockApp1,
  mockApp2,
  mockAppMixedErrorTypes,
  mockAppMixedMultisigErrors,
  mockAppNoAccounts,
  mockAppOnlyMultisigAccounts,
  mockApps,
  mockAppWithAppError,
  mockAppWithMigrationError,
  mockAppWithMultisigAccounts,
  mockAppWithMultisigErrors,
  mockMultisigAddress1,
  mockMultisigAddressWithMigrationError,
} from './__mocks__/mockData'

// =========== Helper Functions ===========
const getAppById = (apps: App[], id: string) => apps.find(app => app.id === id)
const getAccountByPath = (accounts: Address[], path: string) => accounts.find(account => account.path === path)

// =========== Tests: filterAppsWithoutErrors ===========
describe('filterAppsWithoutErrors', () => {
  it('should filter out apps with errors', () => {
    const result = filterAppsWithoutErrors(mockApps)
    expect(result).toHaveLength(3)
    expect(result[0].name).toBe('App 1')
    expect(result[1].name).toBe('App 2')
    expect(result[2].name).toBe('App 3') // This app has only migration errors which are allowed
  })

  it('should filter out accounts with errors within apps', () => {
    const result = filterAppsWithoutErrors(mockApps)
    expect(result[0].accounts).toHaveLength(2)
    const app2Filtered = getAppById(result, 'kusama')
    expect(app2Filtered?.accounts?.length).toBe(1) // App2 should have only one account left
  })

  it('should handle empty apps array', () => {
    const result = filterAppsWithoutErrors([])
    expect(result).toHaveLength(0)
  })

  it('should handle apps with no accounts', () => {
    const appsWithNoAccounts = [{ ...mockApp1, accounts: [] }]
    const result = filterAppsWithoutErrors(appsWithNoAccounts)
    expect(result).toHaveLength(0)
  })

  it('should handle apps with undefined accounts property', () => {
    const appsWithUndefinedAccounts = [{ ...mockApp1, accounts: undefined }]
    const result = filterAppsWithoutErrors(appsWithUndefinedAccounts)
    expect(result).toHaveLength(0)
  })

  it('should retain accounts with migration errors', () => {
    const result = filterAppsWithoutErrors([mockAppWithMigrationError])
    expect(result).toHaveLength(1)
    expect(result[0].accounts).toHaveLength(1)
    if (result[0].accounts?.[0].error) {
      expect(result[0].accounts[0].error.source).toBe('migration')
    }
  })

  it('should handle apps with multisig accounts', () => {
    const result = filterAppsWithoutErrors([mockAppWithMultisigAccounts, mockApp1])
    expect(result).toHaveLength(2)
    expect(result[0].multisigAccounts).toHaveLength(1)
  })

  // New multisig tests
  it('should filter out multisig accounts with errors', () => {
    const result = filterAppsWithoutErrors([mockAppWithMultisigErrors])
    expect(result).toHaveLength(1)
    expect(result[0].multisigAccounts).toHaveLength(1) // Only migration error account should remain
    if (result[0].multisigAccounts?.[0].error) {
      expect(result[0].multisigAccounts[0].error.source).toBe('migration')
    }
  })

  it('should handle apps with only multisig accounts', () => {
    const result = filterAppsWithoutErrors([mockAppOnlyMultisigAccounts])
    expect(result).toHaveLength(1)
    expect(result[0].accounts).toHaveLength(0)
    expect(result[0].multisigAccounts).toHaveLength(2)
  })

  it('should handle apps with mixed account and multisig errors', () => {
    const result = filterAppsWithoutErrors([mockAppMixedMultisigErrors])
    expect(result).toHaveLength(1)
    expect(result[0].accounts).toHaveLength(1) // Only account without error
    expect(result[0].multisigAccounts).toHaveLength(2) // multisig without error + migration error one
  })

  it('should handle apps with undefined multisigAccounts property', () => {
    const appWithUndefinedMultisig = { ...mockApp1, multisigAccounts: undefined }
    const result = filterAppsWithoutErrors([appWithUndefinedMultisig])
    expect(result).toHaveLength(1)
    expect(result[0].multisigAccounts).toHaveLength(0)
  })
})

// =========== Tests: filterAppsWithErrors ===========
describe('filterAppsWithErrors', () => {
  it('should filter out apps without errors', () => {
    const appWithNoErrors = { ...mockApp1, accounts: [mockAddress1, mockAddress2] }
    const result = filterAppsWithErrors([appWithNoErrors, mockAppWithAppError])
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('App 4')
  })

  it('should include apps with account errors', () => {
    const result = filterAppsWithErrors(mockApps)
    expect(result).toHaveLength(2) // App2 has account errors, App4 has app-level errors
    expect(getAppById(result, 'kusama')).toBeDefined()
    expect(getAppById(result, 'acala')).toBeDefined()
    // App3 has migration errors which should be filtered out by filterAppsWithErrors
    expect(getAppById(result, 'westend')).toBeUndefined()
  })

  it('should handle empty apps array', () => {
    const result = filterAppsWithErrors([])
    expect(result).toHaveLength(0)
  })

  it('should handle apps with no accounts', () => {
    const result = filterAppsWithErrors([mockAppNoAccounts])
    expect(result).toHaveLength(0)
  })

  it('should handle apps with undefined accounts property', () => {
    const appsWithUndefinedAccounts = [{ ...mockAppWithAppError, accounts: undefined }]
    const result = filterAppsWithErrors(appsWithUndefinedAccounts)
    expect(result).toHaveLength(1) // Still has the app error
  })

  it('should include apps with app-level errors', () => {
    const result = filterAppsWithErrors([mockAppWithAppError])
    expect(result).toHaveLength(1)
    if (result[0].error) {
      expect(result[0].error.source).toBe('synchronization')
    }
  })

  it('should include apps with mixed error types', () => {
    const result = filterAppsWithErrors([mockAppMixedErrorTypes])
    expect(result).toHaveLength(1)
    // mockAppMixedErrorTypes has 3 accounts: mockAddress1 (no error),
    // mockAddressWithError (balance_fetch error), and mockAddressWithMigrationError (migration error)
    // filterAppsWithErrors should only include the account with balance_fetch error
    // and filter out the account with migration error
    expect(result[0].accounts?.length).toBe(1)
    expect(result[0].accounts?.[0].error?.source).toBe('balance_fetch')
  })

  // Multisig tests
  it('should include apps with multisig account errors', () => {
    const result = filterAppsWithErrors([mockAppWithMultisigErrors])
    expect(result).toHaveLength(1)
    expect(result[0].accounts).toHaveLength(0) // Regular account without error gets filtered out
    expect(result[0].multisigAccounts).toHaveLength(1) // Only error multisig account (not migration error)
    if (result[0].multisigAccounts?.[0].error) {
      expect(result[0].multisigAccounts[0].error.source).toBe('balance_fetch')
    }
  })

  it('should exclude apps with only multisig migration errors', () => {
    const appWithOnlyMigrationErrors = {
      ...mockApp1,
      accounts: [],
      multisigAccounts: [mockMultisigAddressWithMigrationError],
    }
    const result = filterAppsWithErrors([appWithOnlyMigrationErrors])
    expect(result).toHaveLength(0)
  })

  it('should handle mixed multisig and regular account errors', () => {
    const result = filterAppsWithErrors([mockAppMixedMultisigErrors])
    expect(result).toHaveLength(1)
    expect(result[0].accounts).toHaveLength(1) // Only account with error
    expect(result[0].multisigAccounts).toHaveLength(1) // Only multisig with error (not migration)
  })

  it('should handle apps with undefined multisigAccounts property', () => {
    const appWithUndefinedMultisig = { ...mockAppWithAppError, multisigAccounts: undefined }
    const result = filterAppsWithErrors([appWithUndefinedMultisig])
    expect(result).toHaveLength(1) // Still has the app error
    expect(result[0].multisigAccounts).toHaveLength(0)
  })
})

// =========== Tests: hasAccountsWithErrors ===========
describe('hasAccountsWithErrors', () => {
  it('should return true if any account has an error', () => {
    expect(hasAccountsWithErrors([mockApp2])).toBe(true)
  })

  it('should return false if no accounts have errors', () => {
    expect(hasAccountsWithErrors([mockApp1])).toBe(false)
  })

  it('should return false for migration errors', () => {
    expect(hasAccountsWithErrors([mockAppWithMigrationError])).toBe(false)
  })

  it('should handle empty accounts array', () => {
    expect(hasAccountsWithErrors([mockAppNoAccounts])).toBe(false)
  })

  it('should handle undefined accounts property', () => {
    const appWithUndefinedAccounts = { ...mockApp1, accounts: undefined }
    expect(hasAccountsWithErrors([appWithUndefinedAccounts])).toBe(false)
  })

  it('should handle accounts with undefined error property', () => {
    const accountWithUndefinedError = { ...mockAddress1, error: undefined }
    const appWithAccountWithUndefinedError = { ...mockApp1, accounts: [accountWithUndefinedError] }
    expect(hasAccountsWithErrors([appWithAccountWithUndefinedError])).toBe(false)
  })

  it('should handle app with mixed account error types', () => {
    expect(hasAccountsWithErrors([mockAppMixedErrorTypes])).toBe(true)
  })

  // Multisig cases
  it('should return true if any multisig account has an error', () => {
    expect(hasAccountsWithErrors([mockAppWithMultisigErrors])).toBe(true)
  })

  it('should return false for multisig accounts with only migration errors', () => {
    const appWithOnlyMigrationErrors = {
      ...mockApp1,
      accounts: [],
      multisigAccounts: [mockMultisigAddressWithMigrationError],
    }
    expect(hasAccountsWithErrors([appWithOnlyMigrationErrors])).toBe(false)
  })

  it('should return true for mixed multisig and regular errors', () => {
    expect(hasAccountsWithErrors([mockAppMixedMultisigErrors])).toBe(true)
  })

  it('should handle undefined multisigAccounts property', () => {
    const appWithUndefinedMultisig = { ...mockApp1, multisigAccounts: undefined }
    expect(hasAccountsWithErrors([appWithUndefinedMultisig])).toBe(false)
  })

  it('should return true for app-level synchronization errors', () => {
    expect(hasAccountsWithErrors([mockAppWithAppError])).toBe(true)
  })
})

// =========== Tests: hasAppAccounts ===========
describe('hasAppAccounts', () => {
  it('should return true if app has regular accounts', () => {
    expect(hasAppAccounts(mockApp1)).toBe(true)
  })

  it('should return true if app has multisig accounts', () => {
    expect(hasAppAccounts(mockAppOnlyMultisigAccounts)).toBe(true)
  })

  it('should return true if app has both regular and multisig accounts', () => {
    expect(hasAppAccounts(mockAppWithMultisigAccounts)).toBe(true)
  })

  it('should return false if app has no accounts', () => {
    expect(hasAppAccounts(mockAppNoAccounts)).toBe(false)
  })

  it('should return false if app has empty accounts arrays', () => {
    const emptyApp = { ...mockApp1, accounts: [], multisigAccounts: [] }
    expect(hasAppAccounts(emptyApp)).toBe(false)
  })

  it('should return false if app has undefined accounts properties', () => {
    const undefinedApp = { ...mockApp1, accounts: undefined, multisigAccounts: undefined }
    expect(hasAppAccounts(undefinedApp)).toBe(false)
  })

  it('should return true if only regular accounts exist', () => {
    const regularOnlyApp = { ...mockApp1, multisigAccounts: undefined }
    expect(hasAppAccounts(regularOnlyApp)).toBe(true)
  })

  it('should return true if only multisig accounts exist', () => {
    const multisigOnlyApp = { ...mockAppOnlyMultisigAccounts, accounts: undefined }
    expect(hasAppAccounts(multisigOnlyApp)).toBe(true)
  })
})

// =========== Tests: getAppTotalAccounts ===========
describe('getAppTotalAccounts', () => {
  it('should count regular accounts only', () => {
    expect(getAppTotalAccounts(mockApp1)).toBe(2)
  })

  it('should count multisig accounts only', () => {
    expect(getAppTotalAccounts(mockAppOnlyMultisigAccounts)).toBe(2)
  })

  it('should count both regular and multisig accounts', () => {
    expect(getAppTotalAccounts(mockAppWithMultisigAccounts)).toBe(3) // 2 regular + 1 multisig
  })

  it('should return 0 for apps with no accounts', () => {
    expect(getAppTotalAccounts(mockAppNoAccounts)).toBe(0)
  })

  it('should handle undefined accounts arrays', () => {
    const undefinedApp = { ...mockApp1, accounts: undefined, multisigAccounts: undefined }
    expect(getAppTotalAccounts(undefinedApp)).toBe(0)
  })

  it('should handle mixed defined and undefined arrays', () => {
    const mixedApp = { ...mockApp1, multisigAccounts: undefined }
    expect(getAppTotalAccounts(mixedApp)).toBe(2) // Only regular accounts counted
  })

  it('should handle empty arrays', () => {
    const emptyApp = { ...mockApp1, accounts: [], multisigAccounts: [] }
    expect(getAppTotalAccounts(emptyApp)).toBe(0)
  })
})

// =========== Tests: setDefaultDestinationAddress ===========
describe('setDefaultDestinationAddress', () => {
  const defaultAddress = 'default-address-123'

  it('should set destination address for regular account with transactions', () => {
    const accountWithTx = {
      ...mockAddress1,
      balances: [
        {
          ...mockAddress1.balances?.[0],
          transaction: {
            destinationAddress: '',
          },
        },
      ],
    }

    const result = setDefaultDestinationAddress(accountWithTx, defaultAddress)

    expect(result.balances?.[0].transaction?.destinationAddress).toBe(defaultAddress)
  })

  it('should not override existing destination address', () => {
    const existingAddress = 'existing-address-456'
    const accountWithExistingTx = {
      ...mockAddress1,
      balances: [
        {
          ...mockAddress1.balances?.[0],
          transaction: {
            destinationAddress: existingAddress,
          },
        },
      ],
    }

    const result = setDefaultDestinationAddress(accountWithExistingTx, defaultAddress)

    expect(result.balances?.[0].transaction?.destinationAddress).toBe(existingAddress)
  })

  it('should handle account with no balances', () => {
    const accountNoBalances = { ...mockAddress1, balances: undefined }

    const result = setDefaultDestinationAddress(accountNoBalances, defaultAddress)

    expect(result.balances).toBeUndefined()
  })

  it('should handle multisig account with transactions', () => {
    const multisigWithTx = {
      ...mockMultisigAddress1,
      balances: [
        {
          ...mockMultisigAddress1.balances?.[0],
          transaction: {
            destinationAddress: '',
          },
        },
      ],
    }

    const result = setDefaultDestinationAddress(multisigWithTx, defaultAddress)

    expect(result.balances?.[0].transaction?.destinationAddress).toBe(defaultAddress)
  })

  it('should handle empty balances array', () => {
    const accountEmptyBalances = { ...mockAddress1, balances: [] }

    const result = setDefaultDestinationAddress(accountEmptyBalances, defaultAddress)

    expect(result.balances).toHaveLength(0)
  })

  it('should preserve other transaction properties', () => {
    const accountWithComplexTx = {
      ...mockAddress1,
      balances: [
        {
          ...mockAddress1.balances?.[0],
          transaction: {
            destinationAddress: '',
            status: TransactionStatus.PENDING,
            statusMessage: 'Test message',
          },
        },
      ],
    }

    const result = setDefaultDestinationAddress(accountWithComplexTx, defaultAddress)

    expect(result.balances?.[0].transaction?.destinationAddress).toBe(defaultAddress)
    expect(result.balances?.[0].transaction?.status).toBe(TransactionStatus.PENDING)
    expect(result.balances?.[0].transaction?.statusMessage).toBe('Test message')
  })
})
