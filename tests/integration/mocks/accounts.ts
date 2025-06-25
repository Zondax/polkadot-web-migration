import type { Address } from '@/state/types/ledger'

export const mockKusamaAccount: Partial<Address> = {
  address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
  path: "m/44'/434'/0'/0'/0'",
  pubKey: '0x123456',
}

export const mockAcalaAccount: Partial<Address> = {
  address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
  path: "m/44'/787'/0'/0'/0'",
  pubKey: '0x123456',
}

export const mockPolkadotAccount: Partial<Address> = {
  address: '15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5',
  path: "m/44'/354'/0'/0'/0'",
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
