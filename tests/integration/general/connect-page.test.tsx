import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import MigratePage from '@/app/migrate/page'
import { verifyConnectPageContent } from '../helpers/connect'
import { renderWithProviders } from '../helpers/renderWithProviders'
import { verifyConnectTabActive, verifyTabsRendered } from '../helpers/tabs'

describe('Connect Page', () => {
  it('shows connect page ready state', () => {
    renderWithProviders(<MigratePage />)
    verifyTabsRendered()
    verifyConnectTabActive()
    verifyConnectPageContent()
  })
})
