import { mockWsProvider, simpleMockApi } from '../mocks/api'
import { mockAcalaAppConfig, mockKusamaAppConfig, mockPolkadotAppConfigs } from '../mocks/apps'

vi.mock('@/lib/account', async () => {
  const actual = await vi.importActual('@/lib/account')
  return {
    ...actual,
    getApiAndProvider: vi.fn().mockResolvedValue({ api: simpleMockApi, provider: mockWsProvider }),
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
import { AppStatus, ledgerState$ } from '@/state/ledger'
import { mockGetBalance } from '../helpers/accounts'
import { mockLedgerClientConnectDevice, mockLedgerClientSynchronizeAccounts } from '../helpers/ledgerClient'
import { renderWithProviders } from '../helpers/renderWithProviders'
import { verifySynchronizeTabActive } from '../helpers/tabs'

describe('Synchronize', () => {
  it.skip('Synchronize 1 app successfully', async () => {
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

    const tableDropdownAppName = screen.getAllByTestId('synchronized-app')
    expect(tableDropdownAppName.length).toBe(1)
    expect(tableDropdownAppName[0]).toHaveTextContent('Kusama')
  })

  it.skip('Can retry synchronizing', async () => {
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

    // Check for the progress bar not visible
    expect(screen.queryByTestId('app-sync-progress-bar')).toBeInTheDocument()

    ledgerState$.apps.status.set(AppStatus.SYNCHRONIZED)

    // Check for the retry button
    const retryButton = screen.getByTestId('retry-synchronize-button')
    expect(retryButton).toBeInTheDocument()
    await act(async () => {
      retryButton.click()
    })
  })
})
