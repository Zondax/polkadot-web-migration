import { genericAppMock } from './genericApp'
import { transportMock } from './transport'

// Simplified mock for testing purposes
export const mockDeviceConnection = {
  transport: transportMock,
  genericApp: genericAppMock,
  isAppOpen: false,
}

export const mockConnection = {
  error: undefined,
  connection: mockDeviceConnection,
}
