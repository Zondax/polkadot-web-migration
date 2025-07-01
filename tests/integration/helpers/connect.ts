import { screen } from '@testing-library/react'
import { expect } from 'vitest'
import { TEST_IDS, TEXT } from '../constants'

export const verifyConnectPageContent = () => {
  try {
    // Check main heading
    expect(screen.getByText(TEXT.CONNECT_PAGE.HEADING)).toBeInTheDocument()

    // Check instruction list
    for (const step of TEXT.CONNECT_PAGE.STEPS) {
      expect(screen.getByText(step)).toBeInTheDocument()
    }

    // Check connect button
    expect(screen.getByTestId(TEST_IDS.CONNECT_LEDGER_BUTTON)).toBeInTheDocument()
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Connect page content verification failed: ${errorMessage}`)
  }
}

export const verifyAllStepsDefault = () => {
  try {
    const steps_ids = [
      TEST_IDS.CONNECT_STEP_1_ICON,
      TEST_IDS.CONNECT_STEP_2_ICON,
      TEST_IDS.CONNECT_STEP_3_ICON,
      TEST_IDS.CONNECT_STEP_4_ICON,
    ]

    for (const step_id of steps_ids) {
      const step = screen.getByTestId(step_id)
      expect(step).not.toHaveClass('text-polkadot-green')
      expect(step).not.toHaveClass('text-rose-400')
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Step verification failed: ${errorMessage}`)
  }
}

export const verifyStep3Failed = () => {
  try {
    // steps 1 and 2 are green
    const step1 = screen.getByTestId(TEST_IDS.CONNECT_STEP_1_ICON)
    const step2 = screen.getByTestId(TEST_IDS.CONNECT_STEP_2_ICON)
    expect(step1).toHaveClass('text-polkadot-green')
    expect(step2).toHaveClass('text-polkadot-green')

    // step 3 is red
    const step3 = screen.getByTestId(TEST_IDS.CONNECT_STEP_3_ICON)
    expect(step3).toHaveClass('text-rose-400')
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Step 3 failure verification failed: ${errorMessage}`)
  }
}

export const verifyStep3Success = () => {
  try {
    const steps_ids = [TEST_IDS.CONNECT_STEP_1_ICON, TEST_IDS.CONNECT_STEP_2_ICON, TEST_IDS.CONNECT_STEP_3_ICON]

    for (const step_id of steps_ids) {
      const step = screen.getByTestId(step_id)
      expect(step).toHaveClass('text-polkadot-green')
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Step 3 success verification failed: ${errorMessage}`)
  }
}
