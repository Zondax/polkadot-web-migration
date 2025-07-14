import { vi } from 'vitest'

export const transportMock = {
  deviceModel: {
    id: 'nanos',
    productName: 'Nano S',
  },
  exchange: vi.fn(),
  close: vi.fn(),
}
