/**
 * Common test addresses used across the test suite
 * These addresses are used for consistent testing scenarios
 */

export const TEST_ADDRESSES = {
  // Basic test addresses
  ADDRESS1: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
  ADDRESS2: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
  ADDRESS3: '5DAAnrj7VHTznn2C221g2pvCnvVy9AHbLP7RP9ueGZFg7AAW',
  ADDRESS4: '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw',
  ADDRESS5: '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL',
  ADDRESS6: '5H4MvAsobfZ6bBCDyj5dsrWYLrA8HrRzaqa9p61UXtxMhSCY',
  ADDRESS7: '5DAUh2JEqgjoq7xKmvUdaNkDRRtwqYGtxKzovLHdkkNcsuFJ',

  // Special purpose addresses
  KUSAMA_ASSET_HUB_WITH_UNIQUES: 'Gsmu7iGq4cQg7oAxFgAA9dUPKu9iRKGvbFLNUGhEkEB3Ybt',
  KUSAMA_STAKING_WITH_BONDED: 'Gq9CTYACKtgA1dyrM5yh7oDK6yh1P3ErjcxZvDmJu9YjdB5',
  ADDRESS_WITH_IDENTITY_AND_PARENT: 'F4aqRHwLaCk2EoEewPWKpJBGdrvkssQAtrBmQ5LdNSweUfV',
  ADDRESS_WITH_IDENTITY_NO_PARENT: 'HHEEgVzcqL3kCXgsxSfJMbsTy8dxoTctuXtpY94n4s8F4pS',

  // Common test address used in many component tests
  ALICE: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',

  // Multisig addresses
  MULTISIG_ADDRESS: '5DjYJStmdZ2rcqXbXGX7TW85JsrW6uG4y9MUcLq2BoPMpRA7',
} as const

export type TestAddress = (typeof TEST_ADDRESSES)[keyof typeof TEST_ADDRESSES]

/**
 * Test paths for Ledger hardware wallet
 */
export const TEST_PATHS = {
  DEFAULT: "m/44'/354'/0'/0'/0'",
  SECOND_ACCOUNT: "m/44'/354'/0'/0'/1'",
  KUSAMA_DEFAULT: "m/44'/434'/0'/0'/0'",
} as const

/**
 * Test public keys corresponding to addresses
 */
export const TEST_PUBKEYS = {
  [TEST_ADDRESSES.ALICE]: '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d',
  [TEST_ADDRESSES.ADDRESS1]: '0x8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a48',
} as const

/**
 * Helper to create a test address object
 */
export interface TestAddressData {
  address: string
  path: string
  pubKey: string
}

export function createTestAddress(
  address: string = TEST_ADDRESSES.ALICE,
  path: string = TEST_PATHS.DEFAULT,
  pubKey?: string
): TestAddressData {
  return {
    address,
    path,
    pubKey: pubKey || TEST_PUBKEYS[address as keyof typeof TEST_PUBKEYS] || '0x00',
  }
}
