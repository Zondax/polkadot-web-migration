import { vi } from 'vitest'
import { ledgerClient } from '@/lib/client/ledger'
import type { DeviceConnectionProps } from '@/lib/ledger/types'

import type { Address } from '@/state/types/ledger'
import { getMockAccount } from '../mocks/accounts'
import { mockDeviceConnection } from '../mocks/ledgerClient'

/**
 * Mock the ledgerClient.connectDevice
 * used in:
 * - ledgerState$.connectLedger
 */
export function mockLedgerClientConnectDevice() {
  vi.spyOn(ledgerClient, 'connectDevice').mockResolvedValue({
    connection: {
      ...(mockDeviceConnection as unknown as DeviceConnectionProps),
      isAppOpen: true,
    },
    error: undefined,
  })
}

/**
 * Mock the ledgerClient.synchronizeAccounts
 * used in:
 * - ledgerState$.fetchAndProcessAccountsForApp
 * - ledgerState$.fetchAndProcessPolkadotAccounts
 */
export function mockLedgerClientSynchronizeAccounts() {
  vi.spyOn(ledgerClient, 'synchronizeAccounts').mockImplementation(appConfig => {
    return Promise.resolve({
      result: [getMockAccount(appConfig.id) as Address],
    })
  })
}
