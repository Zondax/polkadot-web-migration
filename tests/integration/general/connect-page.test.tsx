import { describe, it } from 'vitest'

import MigratePage from '@/app/migrate/page'
import { verifyConnectPageContent } from '../helpers/connect'
import { renderWithProviders } from '../helpers/renderWithProviders'
import { verifyConnectTabActive, verifyTabsRendered } from '../helpers/tabs'

describe('Connect Page', () => {
  it('should display connect page with instructions and connect button in ready state', () => {
    renderWithProviders(<MigratePage />)
    verifyTabsRendered()
    verifyConnectTabActive()
    verifyConnectPageContent()
  })
})
