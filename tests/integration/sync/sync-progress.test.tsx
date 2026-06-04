import { mockAcalaAppConfig, mockKusamaAppConfig, mockPolkadotAppConfigs } from '../mocks/apps'

// Stub the blockchain connection so the account-processing phase never opens a real
// WebSocket to the (real) RPC endpoints in the mocked app configs. The connection is left
// pending (never resolving) on purpose: it suspends synchronization at the same point the
// slow real network previously did, keeping the page in its "scanning" state so the sync
// grid stays visible for this test. Without the stub, the real socket's handshake resolves
// asynchronously after the test ends and undici's `instanceof Event` check fails against
// jsdom's global Event, surfacing as an unhandled error in whichever test is running then.
vi.mock('@/lib/account', async () => {
  const actual = await vi.importActual('@/lib/account')
  return {
    ...actual,
    getApiAndProvider: vi.fn().mockReturnValue(new Promise(() => {})),
  }
})

// Mock the apps config module before tests
vi.mock('@/config/apps', async () => {
  return {
    apps: [mockKusamaAppConfig],
    appsConfigs: new Map([
      ['kusama', mockKusamaAppConfig],
      ['acala', mockAcalaAppConfig],
    ]),
    appsConfigsObj: { kusama: mockKusamaAppConfig, acala: mockAcalaAppConfig },
    polkadotAppConfig: mockPolkadotAppConfigs,
  }
})

import { screen } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import MigratePage from '@/app/migrate/page'
import { mockGetBalance } from '../helpers/accounts'
import { mockLedgerClientConnectDevice, mockLedgerClientSynchronizeAccounts } from '../helpers/ledgerClient'
import { renderWithProviders } from '../helpers/renderWithProviders'
import { verifySynchronizeTabActive } from '../helpers/tabs'

describe('Synchronize progress', () => {
  it('See 3 apps in the sync grid (including Polkadot)', async () => {
    // Mock the ledgerClient.connectDevice to return a custom object with transport, genericApp, and isAppOpen: true
    mockLedgerClientConnectDevice()

    // Mock the getBalance function
    mockGetBalance()

    // Mock the ledgerClient.synchronizeAccounts to return a custom object
    mockLedgerClientSynchronizeAccounts()

    // Render the page
    renderWithProviders(<MigratePage />)

    // Simulate pressing the "Synchronize Accounts" tab button
    const syncButton = screen.getByTestId('connect-ledger-button')
    await act(async () => {
      syncButton.click()
    })

    verifySynchronizeTabActive()

    // Check for the app scanning grid
    expect(screen.getByTestId('app-sync-grid')).toBeInTheDocument()

    // Check for the progress bar
    expect(screen.getByTestId('app-sync-progress-bar')).toBeInTheDocument()

    // Verify we have exactly 3 apps in the grid (including Polkadot)
    const appSyncGridItems = screen.getAllByTestId('app-sync-grid-item')
    expect(appSyncGridItems.length).toBe(3)
    expect(appSyncGridItems[0]).toHaveTextContent('Kusama')
    expect(appSyncGridItems[1]).toHaveTextContent('Acala')
    expect(appSyncGridItems[2]).toHaveTextContent('Polkadot')
  })
})
