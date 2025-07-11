import { describe, it } from 'vitest'
import { setupTransportAndAppConnectedState, setupTransportConnectedState } from '../helpers/transport'

import MigratePage from '@/app/migrate/page'
import { verifyAllStepsDefault, verifyConnectPageContent, verifyStep3Failed, verifyStep3Success } from '../helpers/connect'
import { renderWithProviders } from '../helpers/renderWithProviders'

describe('Connect States', () => {
  describe('Device not connected', () => {
    it('should display all connection steps in default state when device is not connected', () => {
      renderWithProviders(<MigratePage />)

      verifyConnectPageContent()
      verifyAllStepsDefault()
    })

    it('should show appropriate notification when device is not connected', () => {
      renderWithProviders(<MigratePage />)

      verifyConnectPageContent()
      verifyAllStepsDefault()
    })
  })

  describe('Device connected', () => {
    it('should display error state when device is connected but app is not open', () => {
      setupTransportConnectedState()
      renderWithProviders(<MigratePage />)

      verifyStep3Failed()
    })

    it('should display success state when device is connected and app is open', () => {
      setupTransportAndAppConnectedState()
      renderWithProviders(<MigratePage />)

      verifyStep3Success()
    })
  })
})
