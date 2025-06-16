import { screen } from '@testing-library/react'
import { expect } from 'vitest'

export const verifyConnectPageContent = () => {
  // Check main heading
  expect(screen.getByText('Connect Your Ledger Device')).toBeInTheDocument()

  const steps_ids = ['connect-step-1', 'connect-step-2', 'connect-step-3', 'connect-step-4']

  for (const step_id of steps_ids) {
    const step = screen.getByTestId(step_id)
    expect(step).toBeInTheDocument()
  }

  // Check instruction list
  const steps = [
    'Connect your Ledger device to your computer',
    'Enter your PIN code on the device',
    'Open the Migration App on your Ledger',
    'Click the Connect button below',
  ]

  for (const step of steps) {
    expect(screen.getByText(step)).toBeInTheDocument()
  }

  // Check connect button
  expect(screen.getByRole('button', { name: 'Connect Ledger' })).toBeInTheDocument()
}

export const verifyAllStepsDefault = () => {
  const steps_ids = ['connect-step-1', 'connect-step-2', 'connect-step-3', 'connect-step-4']

  for (const step_id of steps_ids) {
    const step = screen.getByTestId(step_id)
    expect(step).not.toHaveClass('text-polkadot-green')
    expect(step).not.toHaveClass('text-rose-400')
  }
}

export const verifyStep3Failed = () => {
  // steps 1 and 2 are green
  const step1 = screen.getByTestId('connect-step-1')
  const step2 = screen.getByTestId('connect-step-2')
  expect(step1).toHaveClass('text-polkadot-green')
  expect(step2).toHaveClass('text-polkadot-green')

  // step 3 is red
  const step3 = screen.getByTestId('connect-step-3')
  expect(step3).toHaveClass('text-rose-400')
}
