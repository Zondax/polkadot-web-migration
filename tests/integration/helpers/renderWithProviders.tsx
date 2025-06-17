import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { vi } from 'vitest'

// Here we can add mocks for dependencies

// Mock the ledger state
// vi.mock('state/ledger', () => ({
//   ledgerState$: {
//     device: {
//       connection: {
//         get: vi.fn(),
//         set: vi.fn(),
//       },
//       isLoading: {
//         get: vi.fn(),
//         set: vi.fn(),
//       },
//     },
//     apps: {
//       apps: {
//         get: vi.fn(),
//         set: vi.fn(),
//       },
//       status: {
//         get: vi.fn(),
//         set: vi.fn(),
//       },
//       syncProgress: {
//         get: vi.fn(),
//         set: vi.fn(),
//       },
//     },
//     connectLedger: vi.fn(),
//     disconnectLedger: vi.fn(),
//     synchronizeAccounts: vi.fn(),
//     clearSynchronization: vi.fn(),
//   },
//   AppStatus: {
//     LOADING: 'loading',
//     SYNCHRONIZED: 'synchronized',
//     ERROR: 'error',
//   },
// }))

// Mock the notifications state
// vi.mock('state/notifications', () => ({
//   notifications$: {
//     push: vi.fn(),
//   },
// }))

export function renderWithProviders(ui: ReactElement) {
  return render(ui)
}
