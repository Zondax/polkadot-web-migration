import { screen } from '@testing-library/react'
import { expect } from 'vitest'
import { TEST_IDS, TEXT } from '../constants'

export const verifyTabsRendered = () => {
  try {
    // Check for all tab titles
    expect(screen.getByText(TEXT.TABS.CONNECT)).toBeInTheDocument()
    expect(screen.getByText(TEXT.TABS.SYNCHRONIZE)).toBeInTheDocument()
    expect(screen.getByText(TEXT.TABS.MIGRATE)).toBeInTheDocument()
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Tab rendering verification failed: ${errorMessage}`)
  }
}

export const verifyConnectTabActive = () => {
  try {
    // Check that Connect Device tab is active
    const connectTab = screen.getByRole('button', { name: TEXT.TABS.CONNECT })
    expect(connectTab).toHaveAttribute('data-state', 'active')

    // Check that other tabs are not active
    const syncTab = screen.getByRole('button', { name: TEXT.TABS.SYNCHRONIZE })
    const migrateTab = screen.getByRole('button', { name: TEXT.TABS.MIGRATE })
    expect(syncTab).not.toHaveAttribute('data-state', 'active')
    expect(migrateTab).not.toHaveAttribute('data-state', 'active')
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Connect tab active verification failed: ${errorMessage}`)
  }
}

export const verifySynchronizeTabActive = () => {
  try {
    // Check that Synchronize Accounts tab is active
    const syncTab = screen.getByTestId(TEST_IDS.TAB_SYNCHRONIZE_ACCOUNTS)
    expect(syncTab).toHaveAttribute('data-state', 'active')

    // Check that other tabs are not active
    const connectTab = screen.getByTestId(TEST_IDS.TAB_CONNECT_DEVICE)
    const migrateTab = screen.getByTestId(TEST_IDS.TAB_MIGRATE)
    expect(connectTab).not.toHaveAttribute('data-state', 'active')
    expect(migrateTab).not.toHaveAttribute('data-state', 'active')
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Synchronize tab active verification failed: ${errorMessage}`)
  }
}

export const verifyMigrateTabActive = () => {
  try {
    // Check that Migrate tab is active
    const migrateTab = screen.getByTestId(TEST_IDS.TAB_MIGRATE)
    expect(migrateTab).toHaveAttribute('data-state', 'active')

    // Check that other tabs are not active
    const connectTab = screen.getByTestId(TEST_IDS.TAB_CONNECT_DEVICE)
    const syncTab = screen.getByTestId(TEST_IDS.TAB_SYNCHRONIZE_ACCOUNTS)
    expect(connectTab).not.toHaveAttribute('data-state', 'active')
    expect(syncTab).not.toHaveAttribute('data-state', 'active')
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Migrate tab active verification failed: ${errorMessage}`)
  }
}
