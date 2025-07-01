import { screen } from '@testing-library/react'
import { expect } from 'vitest'
import { TEXT } from '../constants'

export const verifySynchronizePageContent = () => {
  try {
    // Check main heading
    expect(screen.getByText(TEXT.SYNCHRONIZE_PAGE.HEADING)).toBeInTheDocument()

    // Check for the text above loading bar
    expect(screen.getByText(TEXT.SYNCHRONIZE_PAGE.SYNCHRONIZING)).toBeInTheDocument()
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Synchronize page content verification failed: ${errorMessage}`)
  }
}
