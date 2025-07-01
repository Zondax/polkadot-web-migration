import { describe, it } from 'vitest'

import MigratePage from '@/app/migrate/page'
import { renderWithProviders } from '../helpers/renderWithProviders'
import { verifyConnectTabActive, verifyTabsRendered } from '../helpers/tabs'

describe('Tabs', () => {
  it('should render Connect Device, Synchronize Accounts, and Migrate tabs with correct titles', () => {
    renderWithProviders(<MigratePage />)
    verifyTabsRendered()
  })

  it('should display Connect Device tab as active by default with other tabs inactive', () => {
    renderWithProviders(<MigratePage />)
    verifyTabsRendered()
    verifyConnectTabActive()
  })
})
