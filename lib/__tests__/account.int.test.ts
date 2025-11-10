// @vitest-environment node

import type { ApiPromise, WsProvider } from '@polkadot/api'
import type { Option, Vec, u128, u32 } from '@polkadot/types-codec'
import type { AccountId32, Balance, Multisig, ProxyDefinition, Registration, StakingLedger } from '@polkadot/types/interfaces'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { disconnectSafely, getApiAndProvider } from '../account'
import { KUSAMA_ASSET_HUB_RPC, KUSAMA_PEOPLE_RPC, KUSAMA_RPC, TEST_ADDRESSES } from './utils/__mocks__/mockData'

describe('Account Integration', () => {
  // Shared connections for each endpoint
  let api: ApiPromise | undefined
  let provider: WsProvider | undefined
  let error: string | undefined

  let assetHubApi: ApiPromise | undefined
  let assetHubProvider: WsProvider | undefined
  let assetHubError: string | undefined

  let peopleApi: ApiPromise | undefined
  let peopleProvider: WsProvider | undefined
  let peopleError: string | undefined

  beforeAll(async () => {
    // Connect to all endpoints in parallel for faster setup
    const [result, assetHubResult, peopleResult] = await Promise.all([
      getApiAndProvider(KUSAMA_RPC),
      getApiAndProvider(KUSAMA_ASSET_HUB_RPC),
      getApiAndProvider(KUSAMA_PEOPLE_RPC),
    ])

    api = result.api
    provider = result.provider
    error = result.error

    assetHubApi = assetHubResult.api
    assetHubProvider = assetHubResult.provider
    assetHubError = assetHubResult.error

    peopleApi = peopleResult.api
    peopleProvider = peopleResult.provider
    peopleError = peopleResult.error
  }, 30000) // 30 second timeout for network connections

  afterAll(async () => {
    if (api && provider) {
      await disconnectSafely(api, provider)
    }
    if (assetHubApi && assetHubProvider) {
      await disconnectSafely(assetHubApi, assetHubProvider)
    }
    if (peopleApi && peopleProvider) {
      await disconnectSafely(peopleApi, peopleProvider)
    }
  }, 10000) // 10 second timeout for cleanup

  // Used in: getNativeBalance, getBalance, prepareTransactionPayload
  describe('api.query.system.account', () => {
    it('Polkadot API response for api.query.system.account has expected structure', async () => {
      if (!api || !provider || error) {
        throw new Error('Failed to initialize API', { cause: error })
      }
      const raw = await api.query.system.account(TEST_ADDRESSES.ADDRESS2)

      // The response from api.query.system.account should be a Codec with a toHuman() method,
      // but to access the actual data, we need to cast it to the expected type.
      // We'll use AccountInfo from @polkadot/types/interfaces for type safety.

      expect(typeof raw.toHuman).toBe('function')
      const accountInfo = raw as any // AccountData is not updated in @polkadot/types

      // Check that the response has the expected properties
      expect(accountInfo).toHaveProperty('data')
      expect(accountInfo.data).toHaveProperty('free')
      expect(accountInfo.data).toHaveProperty('frozen')
      expect(accountInfo.data).toHaveProperty('reserved')
      expect(typeof accountInfo.data.free.toString()).toBe('string')
      expect(typeof accountInfo.data.frozen.toString()).toBe('string')
      expect(typeof accountInfo.data.reserved.toString()).toBe('string')
    })
  })

  // Used in: getStakingInfo
  describe('api.query.staking.bonded', () => {
    it('Polkadot API api.query.staking.bonded returns Option<AccountId32>', async () => {
      if (!api || !provider || error) {
        throw new Error('Failed to initialize API', { cause: error })
      }

      const address = TEST_ADDRESSES.ADDRESS9

      // The response from api.query.staking.bonded should be an Option<AccountId32>
      const bonded = (await api.query.staking.bonded(address)) as Option<AccountId32>

      // Check that the response has the expected properties
      expect(bonded).toHaveProperty('isSome')
      expect(bonded).toHaveProperty('isNone')
      expect(typeof bonded.isSome).toBe('boolean')
      expect(typeof bonded.isNone).toBe('boolean')

      if (bonded.isSome) {
        const controller = bonded.unwrap()
        expect(typeof controller.toHuman()).toBe('string')
      }
    })
  })

  // Used in: getUniquesOwnedByAccount, getBalance
  describe('api.query.uniques.account.entries', () => {
    it('Polkadot API api.query.uniques.account.entries returns an array of entries', async () => {
      if (!assetHubApi || !assetHubProvider || assetHubError) {
        throw new Error('Failed to initialize API', { cause: assetHubError })
      }

      const address = TEST_ADDRESSES.ADDRESS8

      // The response from api.query.uniques.account.entries should be an array of [StorageKey, value] tuples
      const entries = await assetHubApi.query.uniques.account.entries(address)

      // Check that the response has the expected properties
      expect(Array.isArray(entries)).toBe(true)
      if (entries.length > 0) {
        expect(Array.isArray(entries[0])).toBe(true)
        expect(entries[0].length).toBe(2)
      }
    })
  })

  // Used in: getNFTsOwnedByAccount, getBalance
  describe('api.query.nfts.account.entries', () => {
    it('Polkadot API api.query.nfts.account.entries returns an array of [StorageKey, value] tuples and keys are extractable', async () => {
      if (!assetHubApi || !assetHubProvider || assetHubError) throw new Error('Failed to initialize API', { cause: assetHubError })

      const address = TEST_ADDRESSES.ADDRESS2

      // The response from api.query.nfts.account.entries should be an array of [StorageKey, value] tuples
      const entries = await assetHubApi.query.nfts.account.entries(address)

      // Check that the response has the expected properties
      expect(Array.isArray(entries)).toBe(true)
      if (entries.length > 0) {
        // Check that the first entry is a tuple [StorageKey, value]
        expect(Array.isArray(entries[0])).toBe(true)
        expect(entries[0].length).toBe(2)
        // Check that key.args is an array and has at least 3
        const [key] = entries[0]
        expect(Array.isArray(key.args)).toBe(true)
        expect(key.args.length).toBeGreaterThanOrEqual(3)
        // Optionally, check that collectionId and itemId are present and can be stringified
        const collectionId = key.args[1]
        const itemId = key.args[2]
        expect(typeof collectionId.toString()).toBe('string')
        expect(typeof itemId.toString()).toBe('string')
      }
    })
  })

  // Used in: getStakingInfo
  describe('api.query.staking.ledger', () => {
    it('Polkadot API api.query.staking.ledger returns Option<StakingLedger>', async () => {
      if (!api || !provider || error) {
        throw new Error('Failed to initialize API', { cause: error })
      }

      const address = TEST_ADDRESSES.ADDRESS9
      // First, get the controller address from bonded
      const bonded = (await api.query.staking.bonded(address)) as Option<AccountId32>
      if (!bonded.isSome) {
        // If not bonded, skip this test
        console.log(
          'Polkadot API api.query.staking.ledger returns Option<StakingLedger>: the test is not valid because the address is not bonded'
        )
        return
      }
      const controller = bonded.unwrap().toHuman() as string

      // The response from api.query.staking.ledger should be an Option<StakingLedger>
      const ledger = (await api.query.staking.ledger(controller)) as Option<StakingLedger>

      // Check that the response has the expected properties
      expect(ledger).toHaveProperty('isSome')
      expect(ledger).toHaveProperty('isEmpty')
      expect(typeof ledger.isSome).toBe('boolean')
      expect(typeof ledger.isEmpty).toBe('boolean')

      if (ledger.isSome) {
        const stakingLedger = ledger.unwrap()
        expect(stakingLedger).toHaveProperty('active')
        expect(stakingLedger).toHaveProperty('total')
        expect(stakingLedger).toHaveProperty('unlocking')
        expect(typeof stakingLedger.active.toNumber()).toBe('number')
        expect(typeof stakingLedger.total.toNumber()).toBe('number')
        expect(typeof stakingLedger.active.toString()).toBe('string')
        expect(typeof stakingLedger.total.toString()).toBe('string')
        expect(Array.isArray(stakingLedger.unlocking)).toBe(true)
      }
    })
  })

  // Used in: getStakingInfo
  describe('api.query.staking.currentEra', () => {
    it('Polkadot API api.query.staking.currentEra returns Option<u32>', async () => {
      if (!api || !provider || error) {
        throw new Error('Failed to initialize API', { cause: error })
      }

      // The response from api.query.staking.currentEra should be an Option<u32>
      const currentEra = (await api.query.staking.currentEra()) as Option<u32>

      // Check that the response has the expected properties
      expect(currentEra).toHaveProperty('isSome')
      expect(currentEra).toHaveProperty('isNone')
      expect(typeof currentEra.isSome).toBe('boolean')
      expect(typeof currentEra.isNone).toBe('boolean')
      if (currentEra.isSome) {
        const eraValue = currentEra.unwrap()
        // Should be a number or string convertible to number
        expect(typeof eraValue.toString()).toBe('string')
        expect(!Number.isNaN(Number(eraValue.toString()))).toBe(true)
      }
    })
  })

  // Used in: prepareRemoveIdentityTransaction
  describe('api.tx.identity.clearIdentity', () => {
    it('should create a valid remove identity extrinsic for ADDRESS10', async () => {
      if (!peopleApi || !peopleProvider || peopleError) {
        throw new Error('Failed to initialize API', { cause: peopleError })
      }
      const extrinsic = peopleApi.tx.identity.clearIdentity()

      // Check that the extrinsic is of the correct type: SubmittableExtrinsic<'promise', ISubmittableResult>
      expect(typeof extrinsic.send).toBe('function')
      expect(typeof extrinsic.addSignature).toBe('function')
      expect(extrinsic.method).toBeDefined()

      // Check that method.toHex returns a string starting with '0x'
      expect(typeof extrinsic.method.toHex()).toBe('string')
      expect(extrinsic.method.toHex().startsWith('0x')).toBe(true)
    })
  })

  // Used in: getIdentityInfo
  describe('api.derive.accounts.identity', () => {
    it('should return derived identity info for ADDRESS10 and ADDRESS11', async () => {
      if (!peopleApi || !peopleProvider || peopleError) {
        throw new Error('Failed to initialize API', { cause: peopleError })
      }
      const addresses = [TEST_ADDRESSES.ADDRESS11, TEST_ADDRESSES.ADDRESS10]
      for (const address of addresses) {
        const derived = await peopleApi.derive.accounts.identity(address)
        expect(derived).toBeDefined()
        // Should have display and displayParent (may be undefined)
        expect(derived).toHaveProperty('display')
        expect('displayParent' in derived).toBe(true)
        // If identity has a parent, it should have the function toHuman()
        if (derived.parent !== undefined && derived.parent !== null) {
          expect(typeof derived.parent.toHuman).toBe('function')
        }
        // if displayParent is present, it should be a string
        if (derived.displayParent !== undefined && derived.displayParent !== null) {
          expect(typeof derived.displayParent).toBe('string')
        }
      }
    })
  })

  // Used in: getIdentityInfo
  describe('api.query.identity.identityOf', () => {
    it('should return Option<Registration> for ADDRESS11', async () => {
      if (!peopleApi || !peopleProvider || peopleError) {
        throw new Error('Failed to initialize API', { cause: peopleError })
      }
      const address = TEST_ADDRESSES.ADDRESS11
      const option = (await peopleApi.query.identity.identityOf(address)) as Option<Registration>
      expect(option).toBeDefined()
      expect(option).toHaveProperty('isNone')
      expect(option).toHaveProperty('isSome')
      expect(typeof option.unwrap).toBe('function')
      expect(typeof option.isNone).toBe('boolean')
      expect(typeof option.isSome).toBe('boolean')
      if (option.isSome) {
        const registration = option.unwrap()
        expect(registration).toHaveProperty('info')
        expect(registration).toHaveProperty('deposit')
        expect(typeof registration.deposit.toString()).toBe('string')
        expect(registration.info).toHaveProperty('display')
        expect(registration.info).toHaveProperty('legal')
        expect(registration.info).toHaveProperty('web')
        expect(registration.info).toHaveProperty('email')
        expect(registration.info).toHaveProperty('image')
      } else {
        console.warn('The result of api.query.identity.identityOf could not be tested because the address has no identity')
      }
    })
  })

  // Used in: getIdentityInfo
  describe('api.query.identity.subsOf', () => {
    it('should return a tuple [deposit, subAccounts] for ADDRESS10', async () => {
      if (!peopleApi || !peopleProvider || peopleError) {
        throw new Error('Failed to initialize API', { cause: peopleError })
      }
      const address = TEST_ADDRESSES.ADDRESS10
      const subs = (await peopleApi.query.identity.subsOf(address)) as unknown as [Balance, Vec<AccountId32>]
      expect(subs).toBeDefined()
      // Should be a tuple [deposit, subAccounts]
      expect(Array.isArray(subs)).toBe(true)
      expect(subs.length).toBe(2)
      const [deposit, subAccounts] = subs
      expect(typeof deposit.toString()).toBe('string')
      expect(Array.isArray(subAccounts.toHuman())).toBe(true)
    })
  })

  // Used in: prepareApproveAsMultiTx
  describe('api.query.multisig.multisigs', () => {
    it('should return Option<Multisig> for a multisig address and call hash', async () => {
      if (!api || !provider || error) {
        throw new Error('Failed to initialize API', { cause: error })
      }
      const multisigAddress = TEST_ADDRESSES.ADDRESS2
      // Use a proper 32-byte hash format
      const callHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      const option = (await api.query.multisig.multisigs(multisigAddress, callHash)) as Option<Multisig>

      // Check that the response has the expected properties
      expect(option).toBeDefined()
      expect(option).toHaveProperty('isNone')
      expect(option).toHaveProperty('isSome')
      expect(typeof option.isNone).toBe('boolean')
      expect(typeof option.isSome).toBe('boolean')

      if (option.isSome) {
        const multisig = option.unwrap()
        expect(multisig).toHaveProperty('when')
        expect(multisig).toHaveProperty('deposit')
        expect(multisig).toHaveProperty('depositor')
        expect(multisig).toHaveProperty('approvals')

        // Check when property
        expect(multisig.when).toHaveProperty('height')
        expect(multisig.when).toHaveProperty('index')
        expect(typeof multisig.when.height.toNumber()).toBe('number')
        expect(typeof multisig.when.index.toNumber()).toBe('number')

        // Check deposit and depositor
        expect(typeof multisig.deposit.toString()).toBe('string')
        expect(typeof multisig.depositor.toString()).toBe('string')

        // Check approvals array
        expect(Array.isArray(multisig.approvals)).toBe(true)
        if (multisig.approvals.length > 0) {
          expect(typeof multisig.approvals[0].toString()).toBe('string')
        }
      }
    })
  })

  // Used in: prepareApproveAsMultiTx
  describe('api.query.multisig.multisigs.entries', () => {
    it('should return an array of [StorageKey, Option<Multisig>] entries', async () => {
      if (!api || !provider || error) {
        throw new Error('Failed to initialize API', { cause: error })
      }
      const entries = await api.query.multisig.multisigs.entries()

      // Check that entries is an array
      expect(Array.isArray(entries)).toBe(true)

      if (entries.length > 0) {
        // Check the structure of the first entry
        const [key, value] = entries[0]

        // Check storage key
        expect(key).toBeDefined()
        expect(Array.isArray(key.args)).toBe(true)
        expect(key.args.length).toBe(2) // Should have two arguments (multisig address and call hash)
        expect(typeof key.args[0].toString()).toBe('string') // Multisig address should be a string
        expect(typeof key.args[1].toString()).toBe('string') // Call hash should be a string

        // Check value structure
        const option = value as Option<Multisig>
        expect(option).toHaveProperty('isNone')
        expect(option).toHaveProperty('isSome')
        expect(typeof option.isNone).toBe('boolean')
        expect(typeof option.isSome).toBe('boolean')

        if (option.isSome) {
          const multisig = option.unwrap()
          expect(multisig).toHaveProperty('when')
          expect(multisig).toHaveProperty('deposit')
          expect(multisig).toHaveProperty('depositor')
          expect(multisig).toHaveProperty('approvals')

          // Check when property
          expect(multisig.when).toHaveProperty('height')
          expect(multisig.when).toHaveProperty('index')
          expect(typeof multisig.when.height.toNumber()).toBe('number')
          expect(typeof multisig.when.index.toNumber()).toBe('number')

          // Check deposit and depositor
          expect(typeof multisig.deposit.toString()).toBe('string')
          expect(typeof multisig.depositor.toString()).toBe('string')

          // Check approvals array
          expect(Array.isArray(multisig.approvals)).toBe(true)
          if (multisig.approvals.length > 0) {
            expect(typeof multisig.approvals[0].toString()).toBe('string')
          }
        }
      }
    })
  })

  // Used in: getProxyInfo
  describe('api.query.proxy.proxies', () => {
    it('should return a tuple [Vec<ProxyDefinition>, u128] for an address', async () => {
      if (!api || !provider || error) {
        throw new Error('Failed to initialize API', { cause: error })
      }
      const address = TEST_ADDRESSES.ADDRESS2
      const proxiesResult = (await api.query.proxy.proxies(address)) as unknown as [Vec<ProxyDefinition>, u128]

      // Check that the result is defined and is a tuple
      expect(proxiesResult).toBeDefined()
      expect(Array.isArray(proxiesResult)).toBe(true)
      expect(proxiesResult.length).toBe(2)

      // Extract the proxies and deposit
      const [proxies, deposit] = proxiesResult

      // Check proxies array
      expect(Array.isArray(proxies.toHuman())).toBe(true)

      // Check deposit
      expect(typeof deposit.toString()).toBe('string')
      expect(!Number.isNaN(Number(deposit.toString()))).toBe(true)

      // If there are proxies, check their structure
      const proxiesHuman = proxies.toHuman() as ProxyDefinition[] | undefined
      if (proxiesHuman && proxiesHuman.length > 0) {
        const proxy = proxiesHuman[0]
        expect(proxy).toHaveProperty('proxyType')
        expect(proxy).toHaveProperty('delegate')
        expect(proxy).toHaveProperty('delay')
        expect(typeof proxy.proxyType).toBe('string')
        expect(typeof proxy.delegate).toBe('string')
        expect(typeof proxy.delay).toBe('string')
      }
    })
  })

  // Used in: prepareRemoveProxiesTransaction
  describe('api.tx.proxy.removeProxies', () => {
    it('should create a valid remove proxies extrinsic', async () => {
      if (!api || !provider || error) {
        throw new Error('Failed to initialize API', { cause: error })
      }
      const extrinsic = api.tx.proxy.removeProxies()

      // Check that the extrinsic is of the correct type: SubmittableExtrinsic<'promise', ISubmittableResult>
      expect(typeof extrinsic.send).toBe('function')
      expect(typeof extrinsic.addSignature).toBe('function')
      expect(extrinsic.method).toBeDefined()

      // Check that method.toHex returns a string starting with '0x'
      expect(typeof extrinsic.method.toHex()).toBe('string')
      expect(extrinsic.method.toHex().startsWith('0x')).toBe(true)

      // Check that the method section and method name are correct
      expect(extrinsic.method.section).toBe('proxy')
      expect(extrinsic.method.method).toBe('removeProxies')
    })
  })
})
