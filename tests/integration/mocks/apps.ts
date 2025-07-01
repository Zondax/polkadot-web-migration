export const mockPolkadotAppConfigs = {
  name: 'Polkadot',
  id: 'polkadot',
  bip44Path: "m/44'/354'/0'/0'/0'", // 354 = 0x80000162
  ss58Prefix: 0,
  rpcEndpoint: 'wss://rpc.polkadot.io',
  token: {
    symbol: 'DOT',
    decimals: 10,
    logoId: 'polkadot',
  },
  explorer: {
    id: 'subscan',
    network: 'polkadot',
  },
  eraTimeInHours: 24,
}

export const mockKusamaAppConfig = {
  id: 'kusama',
  name: 'Kusama',
  bip44Path: "m/44'/434'/0'/0'/0'",
  ss58Prefix: 2,
  rpcEndpoint: 'wss://kusama-rpc.polkadot.io',
  token: {
    symbol: 'KSM',
    decimals: 12,
  },
  explorer: {
    id: 'subscan',
    network: 'kusama',
  },
  eraTimeInHours: 6,
}

export const mockAcalaAppConfig = {
  id: 'acala',
  name: 'Acala',
  bip44Path: "m/44'/787'/0'/0'/0'",
  ss58Prefix: 10,
  rpcEndpoint: 'wss://acala-rpc.aca-api.network',
  token: {
    symbol: 'ACA',
    decimals: 12,
  },
  explorer: {
    id: 'subscan',
    network: 'acala',
  },
  eraTimeInHours: 24,
}

export const mockApps = {
  kusama: mockKusamaAppConfig,
  acala: mockAcalaAppConfig,
  polkadot: mockPolkadotAppConfigs,
}

export const mockApp = {
  id: 'kusama',
  name: 'Kusama',
  token: {
    symbol: 'KSM',
    decimals: 12,
  },
  status: 'synchronized',
  accounts: [
    {
      address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      path: "m/44'/434'/0'/0'/0'",
      pubKey: '0x123456',
    },
  ],
}
