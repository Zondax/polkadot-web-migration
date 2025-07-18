import type { BN } from '@polkadot/util'
import type { GenericeResponseAddress } from '@zondax/ledger-substrate/dist/common'
import type { AppId, Token } from 'config/apps'

/**
 * Status of an address in the migration process
 */
export enum AddressStatus {
  SYNCHRONIZED = 'synchronized',
  MIGRATED = 'migrated',
}

/**
 * Status of a transaction through its lifecycle
 */
export enum TransactionStatus {
  PREPARING_TX = 'preparingTx',
  SIGNING = 'signing',
  SUBMITTING = 'submitting',
  IS_LOADING = 'isLoading',
  PENDING = 'pending',
  IN_BLOCK = 'inBlock',
  FINALIZED = 'finalized',
  SUCCESS = 'success',
  FAILED = 'failed',
  ERROR = 'error',
  WARNING = 'warning',
  UNKNOWN = 'unknown',
  COMPLETED = 'completed',
}

/**
 * Details of a blockchain transaction
 */
export interface Transaction extends TransactionDetails {
  status?: TransactionStatus
  statusMessage?: string
  nativeAmount?: BN // Native amount that takes into account the estimated fee
  estimatedFee?: BN
}

export interface TransactionDetails {
  txHash?: string
  blockHash?: string
  blockNumber?: string
  callData?: string // Used in multisig transactions - call data of the transaction
  callHash?: string // Used in multisig transactions - hash of the call data
}

/**
 * Settings for preparing a blockchain transaction, such as destination and signatory addresses.
 */
export interface TransactionSettings {
  destinationAddress?: string
  signatoryAddress?: string // Used in multisig transactions - address of the signatory address that will be used to sign the transaction
}

/**
 * Types of balances that can be migrated
 */
export enum BalanceType {
  NATIVE = 'native',
  UNIQUE = 'unique',
  NFT = 'nft',
}

export enum AccountType {
  MULTISIG = 'multisig',
  ACCOUNT = 'account',
}

export type UpdateMigratedStatusFn = (appId: AppId, accountType: AccountType, accountAddress: string, txDetails?: Transaction) => void

/**
 * Balance information for an account
 */
export interface NativeBalance {
  type: BalanceType.NATIVE
  balance: Native
  transaction?: TransactionSettings
}

/**
 * Balance information for an account
 */
export interface NftBalance {
  type: BalanceType.UNIQUE | BalanceType.NFT
  balance: Nft[]
  transaction?: TransactionSettings
}

/**
 * Union type for all balance types
 */
export type AddressBalance = NativeBalance | NftBalance

export interface MultisigMember {
  address: string
  path?: string
  internal: boolean // true if the address was synchronised from the same device
}

export interface MultisigCall {
  callHash: string
  deposit: BN
  depositor: string
  signatories: string[]
}

/**
 * Information about a multisig address
 */
export interface MultisigAddress extends Address {
  threshold: number
  members: MultisigMember[]
  pendingMultisigCalls: MultisigCall[]
}

/**
 * Extended address information including balance, status and transaction details
 */
export interface Address extends GenericeResponseAddress {
  balances?: AddressBalance[]
  status?: AddressStatus
  isLoading?: boolean
  error?: {
    source: 'migration' | 'balance_fetch'
    description: string
  }
  path: string
  registration?: Registration
  memberMultisigAddresses?: string[] // addresses of the multisig addresses that the account is a member of
  proxy?: AccountProxy
  index?: AccountIndex // base-58 AccountIndex string
  selected?: boolean
  transaction?: Transaction
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFYING = 'verifying',
  VERIFIED = 'verified',
  FAILED = 'failed',
}

export interface AddressWithVerificationStatus {
  address: string
  path: string
  status: VerificationStatus
}

/**
 * Essential NFT Information
 */
export interface Nft {
  collectionId: number | string
  itemId: number | string
  creator: string
  owner: string
  isUnique?: boolean
  isFrozen?: boolean
}

/**
 * Information about an NFT collection
 */
export interface Collection {
  collectionId: number
  owner?: string
  items?: number
  name?: string
  image?: string
  description?: string
  external_url?: string
  mediaUri?: string
  attributes?: {
    trait_type: string
    value: string
  }[]
  error?: {
    source: 'collection_info_fetch'
    description: string
  }
}

/**
 * All NFTs owned by an address
 */
export interface NftsInfo {
  nfts: Nft[]
  collections: Collection[]
  error?: {
    source: 'nft_info_fetch' | 'uniques_info_fetch'
    description: string
  }
}

/**
 * Information about a staking balance
 */
export interface Staking {
  total?: BN
  active?: BN
  unlocking?: {
    value: BN
    era: number
    timeRemaining: string
    canWithdraw: boolean
  }[]
  claimedRewards?: BN[]
  stash?: string
  controller?: string
  canUnstake: boolean
}

/**
 * Information about the reserved balance, including breakdown by source.
 */
export interface Reserved {
  total: BN
  proxy?: { deposit: BN }
  identity?: { deposit: BN }
  multisig?: { total: BN; deposits: { callHash: string; deposit: BN }[] }
  index?: { deposit: BN }
}

/**
 * Information about a native balance
 */
export interface Native {
  free: BN
  reserved: Reserved
  frozen: BN
  total: BN
  transferable: BN
  staking?: Staking
}

export interface IdentityInfo {
  display?: string
  displayParent?: string
  parent?: string
  legal?: string
  web?: string
  email?: string
  pgpFingerprint?: string
  image?: string
  twitter?: string
}

export interface SubIdentities {
  deposit?: BN
  subAccounts?: string[]
}

export interface Registration {
  deposit?: BN
  identity?: IdentityInfo
  subIdentities?: SubIdentities // review the type
  canRemove: boolean
}

export interface ProxyDefinition {
  type: string // Any, NonTransfer, Governance, Staking from @polkadot/types/interfaces/proxy/types.d.ts
  address: string
  delay: number
}

export interface AccountProxy {
  proxies: ProxyDefinition[]
  deposit?: BN
}

export interface AccountIndex {
  index: string
  deposit?: BN
}

export interface MigratingItem {
  appId: AppId
  appName: string
  token: Token
  account: Address
  transaction?: Transaction
}

export interface PreTxInfo {
  fee: BN
  callHash: string
}
