import { describe, it } from 'vitest'
import { setupTransportAndAppConnectedState, setupTransportConnectedState } from '../helpers/transport'

import MigratePage from '@/app/migrate/page'
import { verifyAllStepsDefault, verifyConnectPageContent, verifyStep3Failed, verifyStep3Success } from '../helpers/connect'
import { renderWithProviders } from '../helpers/renderWithProviders'

describe('Connect States', () => {
  describe('Device not connected', () => {
    it('Shows all steps in black', () => {
      renderWithProviders(<MigratePage />)

      verifyConnectPageContent()
      verifyAllStepsDefault()
    })

    it('Shows notification', () => {
      renderWithProviders(<MigratePage />)

      verifyConnectPageContent()
      verifyAllStepsDefault()
    })
  })

  describe('Device connected', () => {
    it('App not open', () => {
      setupTransportConnectedState()
      renderWithProviders(<MigratePage />)

      verifyStep3Failed()
    })

    it('App open', () => {
      setupTransportAndAppConnectedState()
      renderWithProviders(<MigratePage />)

      verifyStep3Success()
    })
  })
})
