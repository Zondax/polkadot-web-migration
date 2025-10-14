import { mockAcalaAppConfig, mockKusamaAppConfig, mockPolkadotAppConfigs } from '../mocks/apps'

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
