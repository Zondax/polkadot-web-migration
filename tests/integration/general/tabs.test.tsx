import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import MigratePage from '@/app/migrate/page'
import { renderWithProviders } from '../helpers/renderWithProviders'
import { verifyConnectTabActive, verifyTabsRendered } from '../helpers/tabs'

describe('Tabs', () => {
  it('renders all three tabs with correct titles', () => {
    renderWithProviders(<MigratePage />)
    verifyTabsRendered()
  })

  it('shows Connect Device tab as active by default', () => {
    renderWithProviders(<MigratePage />)
    verifyTabsRendered()
    verifyConnectTabActive()
  })
})
