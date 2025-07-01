import { screen } from '@testing-library/react'
import { expect } from 'vitest'

export const verifyConnectPageContent = () => {
  // Check main heading
  expect(screen.getByText('Connect Your Device')).toBeInTheDocument()

  // Check instruction list
  const steps = ['Connect your Ledger device', 'Enter your PIN code', 'Open the Migration App', 'Click Connect']

  for (const step of steps) {
    expect(screen.getByText(step)).toBeInTheDocument()
  }

  // Check connect button
  expect(screen.getByTestId('connect-ledger-button')).toBeInTheDocument()
}

export const verifyAllStepsDefault = () => {
  const steps_ids = ['connect-step-1-icon', 'connect-step-2-icon', 'connect-step-3-icon', 'connect-step-4-icon']

  for (const step_id of steps_ids) {
    const step = screen.getByTestId(step_id)
    expect(step).not.toHaveClass('text-polkadot-green')
    expect(step).not.toHaveClass('text-rose-400')
  }
}

export const verifyStep3Failed = () => {
  // steps 1 and 2 are green
  const step1 = screen.getByTestId('connect-step-1-icon')
  const step2 = screen.getByTestId('connect-step-2-icon')
  expect(step1).toHaveClass('text-polkadot-green')
  expect(step2).toHaveClass('text-polkadot-green')

  // step 3 is red
  const step3 = screen.getByTestId('connect-step-3-icon')
  expect(step3).toHaveClass('text-rose-400')
}

export const verifyStep3Success = () => {
  const steps_ids = ['connect-step-1-icon', 'connect-step-2-icon', 'connect-step-3-icon']

  for (const step_id of steps_ids) {
    const step = screen.getByTestId(step_id)
    expect(step).toHaveClass('text-polkadot-green')
  }
}
