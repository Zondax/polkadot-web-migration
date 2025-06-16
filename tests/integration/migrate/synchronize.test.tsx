import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import MigratePage from '@/app/migrate/page'
import { verifyAllStepsDefault, verifyConnectPageContent, verifyStep3Failed } from '../helpers/connect'
import { renderWithProviders } from '../helpers/renderWithProviders'
import { verifySynchronizePageContent } from '../helpers/synchronize'
import { verifySynchronizeTabActive } from '../helpers/tabs'
import {
  mockLedgerClientConnectDevice,
  mockLedgerClientSynchronizeAccounts,
  setupTransportAndAppConnectedState,
  setupTransportConnectedState,
} from '../helpers/testUtils'

describe('Connect States', () => {
  describe('Device not connected', () => {
    it('Shows all steps in black', () => {
      renderWithProviders(<MigratePage />)

      verifyConnectPageContent()
      verifyAllStepsDefault()
    })
  })

  describe('Device connected', () => {
    it('App not open', () => {
      setupTransportConnectedState()
      renderWithProviders(<MigratePage />)

      verifyConnectPageContent()
      verifyStep3Failed()
    })

    it('App open', () => {
      setupTransportAndAppConnectedState()
      renderWithProviders(<MigratePage />)

      // Mock the ledgerClient.connectDevice to return a custom object
      mockLedgerClientConnectDevice()

      // Simulate pressing the "Synchronize Accounts" tab button
      const syncButton = screen.getByTestId('connect-ledger-button')
      syncButton.click()

      // Mock the ledgerClient.synchronizeAccounts to return a custom object
      mockLedgerClientSynchronizeAccounts()

      // Get all text nodes on the screen and log their text content
      const allText = Array.from(document.body.querySelectorAll('*'))
        .map(el => el.textContent)
        .filter(Boolean)
        .join('\n')
      // eslint-disable-next-line no-console
      console.log(allText)

      // verifySynchronizeTabActive()
      // verifySynchronizePageContent()
    })
  })
})
