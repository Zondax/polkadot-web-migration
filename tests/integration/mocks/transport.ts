import { DeviceModelId } from '@ledgerhq/devices'
import { vi } from 'vitest'

export const transportMock = {
  deviceModel: {
    id: DeviceModelId.nanoS,
    productName: 'Nano S',
  },
  exchange: vi.fn(),
  close: vi.fn(),
}
