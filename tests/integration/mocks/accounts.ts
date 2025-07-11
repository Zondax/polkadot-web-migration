import type { Address } from '@/state/types/ledger'
import { MOCK_ADDRESSES, MOCK_PATHS } from '../constants'

export const mockKusamaAccount: Partial<Address> = {
  address: MOCK_ADDRESSES.KUSAMA,
  path: MOCK_PATHS.KUSAMA,
  pubKey: '0x123456',
}

export const mockAcalaAccount: Partial<Address> = {
  address: MOCK_ADDRESSES.ACALA,
  path: MOCK_PATHS.ACALA,
  pubKey: '0x123456',
}

export const mockPolkadotAccount: Partial<Address> = {
  address: MOCK_ADDRESSES.POLKADOT,
  path: MOCK_PATHS.POLKADOT,
  pubKey: '0x789abc',
}

export const mockAccounts = {
  kusama: mockKusamaAccount,
  acala: mockAcalaAccount,
  polkadot: mockPolkadotAccount,
}

export const getMockAccount = (appId: string) => {
  return mockAccounts[appId as keyof typeof mockAccounts]
}
