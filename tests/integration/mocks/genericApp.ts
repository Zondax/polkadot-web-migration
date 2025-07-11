import { vi } from 'vitest'

export const genericAppMock = {
  getVersion: vi.fn(),
  getAddress: vi.fn(),
  getAddressEd25519: vi.fn(),
  getAddressEcdsa: vi.fn(),
  sign: vi.fn(),
  signEd25519: vi.fn(),
  signEcdsa: vi.fn(),
  signRaw: vi.fn(),
  signRawEd25519: vi.fn(),
  signRawEcdsa: vi.fn(),
  signWithMetadata: vi.fn(),
  signWithMetadataEd25519: vi.fn(),
  signWithMetadataEcdsa: vi.fn(),
}
