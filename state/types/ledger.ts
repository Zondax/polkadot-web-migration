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
  dispatchError?: string // Raw error returned by the Polkadot runtime when dispatching an extrinsic
  /**
   * The actual amount of native tokens to transfer.
   *
   * In production: Equal to the full transferable balance
   * In development: May be overridden by NEXT_PUBLIC_NATIVE_TRANSFER_AMOUNT for testing
   * The fee will substrate from this amount if it is full migration. Otherwise, it will be the amount to transfer.
   */
  nativeAmount?: BN
  /**
   * Estimated transaction fee in native tokens
   */
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
  CONVICTION_VOTING = 'conviction_voting',
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

export enum ActionType {
  UNSTAKE = 'unstake',
  WITHDRAW = 'withdraw',
  IDENTITY = 'identity',
  MULTISIG_CALL = 'multisig-call',
  MULTISIG_TRANSFER = 'multisig-transfer',
  ACCOUNT_INDEX = 'account-index',
  PROXY = 'proxy',
  GOVERNANCE = 'governance',
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
  pendingActions?: ActionType[] // array of pending actions determined during synchronization
  governanceActivity?: ConvictionVotingInfo // governance voting and delegation activity
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
  convictionVoting?: ConvictionVotingInfo
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

/**
 * Conviction levels for governance voting
 */
export enum Conviction {
  None = 'None',
  Locked1x = 'Locked1x',
  Locked2x = 'Locked2x',
  Locked3x = 'Locked3x',
  Locked4x = 'Locked4x',
  Locked5x = 'Locked5x',
  Locked6x = 'Locked6x',
}

/**
 * Information about a vote on a referendum
 */
export interface VoteInfo {
  trackId: number
  referendumIndex: number
  vote: {
    aye: boolean
    conviction: Conviction
    balance: BN
  }
  referendumStatus: 'ongoing' | 'finished'
  canRemoveVote: boolean
  unlockAt?: number
}

/**
 * Information about delegated voting power
 */
export interface DelegationInfo {
  target: string
  conviction: Conviction
  balance: BN
  lockPeriod?: number
  trackId: number
  unlockAt?: number
  canUndelegate: boolean
}

/**
 * Information about conviction voting locks
 */
export interface ConvictionVotingInfo {
  votes: VoteInfo[]
  delegations: DelegationInfo[]
  totalLocked: BN
  unlockableAmount: BN
  classLocks: {
    class: number
    amount: BN
    unlockAt?: number
  }[]
}

export enum FetchingAddressesPhase {
  FETCHING_ADDRESSES = 'fetching_addresses',
  PROCESSING_ACCOUNTS = 'processing_accounts',
}

/**
 * Information about the progress of a synchronization operation
 */
export interface SyncProgress {
  scanned: number
  total: number
  percentage: number
  phase?: FetchingAddressesPhase
}

/**
 * Information about the progress of a deep scan operation
 */
export interface DeepScanProgress {
  scanned: number
  total: number
  percentage: number
  currentChain: string
  phase?: FetchingAddressesPhase
}
