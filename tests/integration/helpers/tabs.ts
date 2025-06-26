import { screen } from '@testing-library/react'
import { expect } from 'vitest'

export const verifyTabsRendered = () => {
  // Check for all tab titles
  expect(screen.getByText('Connect Device')).toBeInTheDocument()
  expect(screen.getByText('Synchronize Accounts')).toBeInTheDocument()
  expect(screen.getByText('Migrate')).toBeInTheDocument()
}

export const verifyConnectTabActive = () => {
  // Check that Connect Device tab is active
  const connectTab = screen.getByRole('button', { name: 'Connect Device' })
  expect(connectTab).toHaveAttribute('data-state', 'active')

  // Check that other tabs are not active
  const syncTab = screen.getByRole('button', { name: 'Synchronize Accounts' })
  const migrateTab = screen.getByRole('button', { name: 'Migrate' })
  expect(syncTab).not.toHaveAttribute('data-state', 'active')
  expect(migrateTab).not.toHaveAttribute('data-state', 'active')
}

export const verifySynchronizeTabActive = () => {
  // Check that Synchronize Accounts tab is active
  const syncTab = screen.getByTestId('tab-synchronize-accounts')
  expect(syncTab).toHaveAttribute('data-state', 'active')

  // Check that other tabs are not active
  const connectTab = screen.getByTestId('tab-connect-device')
  const migrateTab = screen.getByTestId('tab-migrate')
  expect(connectTab).not.toHaveAttribute('data-state', 'active')
  expect(migrateTab).not.toHaveAttribute('data-state', 'active')
}

export const verifyMigrateTabActive = () => {
  // Check that Migrate tab is active
  const migrateTab = screen.getByTestId('tab-migrate')
  expect(migrateTab).toHaveAttribute('data-state', 'active')

  // Check that other tabs are not active
  const connectTab = screen.getByTestId('tab-connect-device')
  const syncTab = screen.getByTestId('tab-synchronize-accounts')
  expect(connectTab).not.toHaveAttribute('data-state', 'active')
  expect(syncTab).not.toHaveAttribute('data-state', 'active')
}
