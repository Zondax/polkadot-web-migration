import { vi } from 'vitest'
import type { DeviceConnectionProps } from '@/lib/ledger/types'
import { ledgerState$ } from '@/state/ledger'
import { mockDeviceConnection } from '../mocks/ledgerClient'

// Setup state with transport connected, and polkadot app defined, but app not open
export const setupTransportConnectedState = () => {
  vi.clearAllMocks()

  ledgerState$.device.set({
    connection: mockDeviceConnection as unknown as DeviceConnectionProps,
    isLoading: false,
    error: undefined,
  })
}

// Setup state with transport connected and app open
export const setupTransportAndAppConnectedState = () => {
  vi.clearAllMocks()

  ledgerState$.device.set({
    connection: {
      ...(mockDeviceConnection as unknown as DeviceConnectionProps),
      isAppOpen: true,
    },
    isLoading: false,
    error: undefined,
  })
}
