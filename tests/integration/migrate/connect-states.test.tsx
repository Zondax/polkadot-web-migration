import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import MigratePage from '@/app/migrate/page'
import { verifyAllStepsDefault, verifyConnectPageContent, verifyStep3Failed } from '../helpers/connect'
import { renderWithProviders } from '../helpers/renderWithProviders'
import { setupTransportAndAppConnectedState, setupTransportConnectedState } from '../helpers/testUtils'

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

      verifyConnectPageContent()
      verifyStep3Failed()
    })

    it('App open', () => {
      setupTransportAndAppConnectedState()
      renderWithProviders(<MigratePage />)

      verifyConnectPageContent()
      verifyStep3Failed()
    })
  })
})
