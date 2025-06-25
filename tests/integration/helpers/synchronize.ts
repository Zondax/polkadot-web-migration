import { screen } from '@testing-library/react'
import { expect } from 'vitest'

export const verifySynchronizePageContent = () => {
  // Check main heading
  expect(screen.getByText('Synchronized Accounts')).toBeInTheDocument()

  // Check for the text above loading bar
  expect(screen.getByText('Synchronizing apps')).toBeInTheDocument()
}
