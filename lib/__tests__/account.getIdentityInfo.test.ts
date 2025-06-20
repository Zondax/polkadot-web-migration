import type { ApiPromise } from '@polkadot/api'
import type { DeriveAccountRegistration } from '@polkadot/api-derive/types'
import type { Option, Vec } from '@polkadot/types-codec'
import type { AccountId32, Balance, Registration } from '@polkadot/types/interfaces'
import { BN } from '@polkadot/util'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getIdentityInfo } from '../account'

const mockAddress = '5FakeAddress1234567890'

function createApiMock({
  derivedIdentity,
  identityOf,
  subsOf,
}: { derivedIdentity?: DeriveAccountRegistration; identityOf?: Option<Registration>; subsOf?: [Balance, Vec<AccountId32>] }) {
  return {
    derive: {
      accounts: {
        identity: vi.fn().mockResolvedValue(derivedIdentity),
      },
    },
    query: {
      identity: {
        identityOf: vi.fn().mockResolvedValue(identityOf),
        subsOf: vi.fn().mockResolvedValue(subsOf),
      },
    },
  } as unknown as ApiPromise
}

describe('getIdentityInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns correct registration when there is a parent account', async () => {
    const derivedIdentity = {
      displayParent: 'ParentName',
      display: 'ChildName',
      parent: { toHuman: () => 'ParentAddress' },
      judgements: [],
    } as unknown as DeriveAccountRegistration
    const identityOf = {
      isNone: true,
    } as Option<Registration>
    const api = createApiMock({ derivedIdentity, identityOf })

    const result = await getIdentityInfo(mockAddress, api)
    expect(result).toEqual({
      canRemove: false,
      identity: {
        displayParent: 'ParentName',
        display: 'ChildName',
        parent: 'ParentAddress',
      },
    })
  })

  it('returns correct registration when there is no parent and there is identity', async () => {
    const mockRawResponse = {
      info: {
        display: { isRaw: true, asRaw: { toUtf8: () => 'DisplayName' } },
        legal: { isRaw: true, asRaw: { toUtf8: () => 'LegalName' } },
        web: { isRaw: true, asRaw: { toUtf8: () => 'https://web.site' } },
        email: { isRaw: true, asRaw: { toUtf8: () => 'mail@mail.com' } },
        pgpFingerprint: { isSome: true, unwrap: () => '0x1234' },
        image: { isRaw: true, asRaw: { toUtf8: () => 'img.png' } },
        twitter: { isRaw: true, asRaw: { toUtf8: () => '@twitter' } },
      },
      deposit: { toString: () => '42' },
    }
    const mockIdentityOf = {
      isNone: false,
      unwrap: () => mockRawResponse,
    } as unknown as Option<Registration>
    const mockSubs = [
      { toString: () => '100' }, // deposit
      { toHuman: () => ['sub1', 'sub2'] }, // subAccounts
    ] as unknown as [Balance, Vec<AccountId32>]
    const derivedIdentity = { display: 'DisplayName', judgements: [] } as unknown as DeriveAccountRegistration
    const api = createApiMock({ derivedIdentity, identityOf: mockIdentityOf, subsOf: mockSubs })

    const result = await getIdentityInfo(mockAddress, api)
    expect(result).toEqual({
      canRemove: true,
      identity: {
        display: 'DisplayName',
        legal: 'LegalName',
        web: 'https://web.site',
        email: 'mail@mail.com',
        pgpFingerprint: '0x1234',
        image: 'img.png',
        twitter: '@twitter',
      },
      deposit: new BN(42),
      subIdentities: {
        subAccounts: ['sub1', 'sub2'],
        deposit: new BN(100),
      },
    })
  })

  it('returns undefined when there is no parent and no identity', async () => {
    const mockIdentityOf = {
      isNone: true,
    } as Option<Registration>
    const derivedIdentity = { display: 'DisplayName', judgements: [] } as unknown as DeriveAccountRegistration
    const api = createApiMock({ derivedIdentity, identityOf: mockIdentityOf })

    const result = await getIdentityInfo(mockAddress, api)
    expect(result).toBeUndefined()
  })
})
