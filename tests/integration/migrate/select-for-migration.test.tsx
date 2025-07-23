import { mockWsProvider, simpleMockApi } from '../mocks/api'
import { mockAcalaAppConfig, mockKusamaAppConfig, mockPolkadotAppConfigs } from '../mocks/apps'

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual('next/navigation')
  return {
    ...actual,
    useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
  }
})

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
    apps: [mockKusamaAppConfig, mockAcalaAppConfig],
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
import { verifyMigrateTabActive, verifySynchronizeTabActive } from '../helpers/tabs'

describe('Migrate', () => {
  it.skip('Can select 1 app for migration from total 2 apps', async () => {
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
    expect(tableDropdownAppName.length).toBe(2)
    expect(tableDropdownAppName[0]).toHaveTextContent('Kusama')
    expect(tableDropdownAppName[1]).toHaveTextContent('Acala')

    const migrateButton = screen.getByTestId('migrate-button')
    expect(migrateButton).toBeInTheDocument()
    await act(async () => {
      migrateButton.click()
    })

    verifyMigrateTabActive()

    const verifyAddressesButton = screen.getByTestId('migrate-verify-addresses-button')
    expect(verifyAddressesButton).toBeInTheDocument()

    const migrateAccountsTable = screen.getByTestId('migrate-accounts-table')
    expect(migrateAccountsTable).toBeInTheDocument()

    const migrateAccountTableRows = screen.getAllByTestId('migrate-accounts-table-row')
    expect(migrateAccountTableRows.length).toBe(2)
    expect(migrateAccountTableRows[0]).toHaveTextContent('Kusama')
    expect(migrateAccountTableRows[1]).toHaveTextContent('Acala')

    verifyMigrateTabActive()
  })
})
