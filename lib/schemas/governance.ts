import { BN } from '@polkadot/util'
import { z } from 'zod'

// Helper to convert various types to BN
const toBN = (value: unknown): BN => {
  if (value instanceof BN) return value
  if (typeof value === 'string' || typeof value === 'number') return new BN(value)
  if (typeof value === 'object' && value !== null && 'toString' in value) {
    return new BN((value as { toString(): string }).toString())
  }
  throw new Error(`Cannot convert ${value} to BN`)
}

const BNLikeSchema = z.preprocess(toBN, z.instanceof(BN))

// Simple array schema that handles both arrays and iterables
const ArrayLikeSchema = <T>(itemSchema: z.ZodType<T>) =>
  z.preprocess(val => {
    if (Array.isArray(val)) return val
    if (val && typeof val === 'object' && Symbol.iterator in val) {
      return Array.from(val as Iterable<unknown>)
    }
    return val
  }, z.array(itemSchema))

// Simple tuple schema
const TupleSchema = <T extends [z.ZodType, z.ZodType]>(first: T[0], second: T[1]) => z.tuple([first, second])

// Option schema - simplified
const OptionSchema = <T>(innerSchema: z.ZodType<T>) =>
  z
    .object({
      isSome: z.boolean(),
      isNone: z.boolean(),
      unwrap: z.function().optional(),
    })
    .transform(opt => ({
      isSome: opt.isSome,
      value: opt.isSome && opt.unwrap ? innerSchema.parse(opt.unwrap()) : undefined,
    }))

// Track info schema based on PalletReferendaTrackInfo
const TrackInfoSchema = z.object({
  name: z.string(),
  maxDeciding: z.number(),
  decisionDeposit: BNLikeSchema,
  preparePeriod: z.number(),
  decisionPeriod: z.number(),
  confirmPeriod: z.number(),
  minEnactmentPeriod: z.number(),
  minApproval: z.unknown(), // PalletReferendaCurve - not needed for our use case
  minSupport: z.unknown(), // PalletReferendaCurve - not needed for our use case
})

// Governance-specific schemas
export const TrackSchema = TupleSchema(z.number(), TrackInfoSchema)
export const TracksSchema = ArrayLikeSchema(TrackSchema)

export const ClassLockSchema = TupleSchema(z.number(), BNLikeSchema)
export const ClassLocksResultSchema = ArrayLikeSchema(ClassLockSchema)

export const ConvictionSchema = z.object({
  isNone: z.boolean(),
  isLocked1x: z.boolean(),
  isLocked2x: z.boolean(),
  isLocked3x: z.boolean(),
  isLocked4x: z.boolean(),
  isLocked5x: z.boolean(),
  isLocked6x: z.boolean(),
  type: z.enum(['None', 'Locked1x', 'Locked2x', 'Locked3x', 'Locked4x', 'Locked5x', 'Locked6x']),
})

// Voting data schemas
const VoteDataSchema = z.object({
  vote: z.object({
    isAye: z.boolean(),
    conviction: ConvictionSchema,
  }),
  balance: BNLikeSchema,
})

const AccountVoteSchema = z.object({
  isStandard: z.boolean(),
  asStandard: z.object({
    vote: z.object({
      isAye: z.boolean(),
      conviction: ConvictionSchema,
    }),
    balance: BNLikeSchema,
  }),
  isSplit: z.boolean(),
  asSplit: z.object({
    aye: BNLikeSchema,
    nay: BNLikeSchema,
  }),
  isSplitAbstain: z.boolean(),
  asSplitAbstain: z.object({
    aye: BNLikeSchema,
    nay: BNLikeSchema,
    abstain: BNLikeSchema,
  }),
})

const VoteEntrySchema = TupleSchema(
  z.number(), // referendum index
  AccountVoteSchema
)

const DelegationsSchema = z.object({
  votes: BNLikeSchema,
  capital: BNLikeSchema,
})

const PriorLockSchema = TupleSchema(z.number(), BNLikeSchema)

const DelegatingSchema = z.object({
  target: z.string(),
  conviction: ConvictionSchema,
  balance: BNLikeSchema,
  delegations: DelegationsSchema,
  prior: PriorLockSchema,
})

const DirectSchema = z.object({
  votes: z.array(VoteEntrySchema),
  delegations: DelegationsSchema,
  prior: PriorLockSchema,
})

// VotingFor union schema - simplified
export const VotingForSchema = z.object({
    isDelegating: z.boolean(),
    isDirect: z.boolean(),
    asDelegating: DelegatingSchema,
    asDirect: DirectSchema,
    type: z.enum(['Direct', 'Delegating']),
  })

export const ReferendumInfoSchema = OptionSchema(z.object({ isOngoing: z.boolean() }))

export const CurrentBlockSchema = z.number()

// Helper functions
export function safeParse<T>(schema: z.ZodType<T>, data: unknown): T | null {
  try {
    return schema.parse(data)
  } catch (error) {
    console.error('Zod validation error:', error)
    return null
  }
}

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown, errorMessage: string): T {
  try {
    return schema.parse(data)
  } catch (error) {
    console.error(`${errorMessage}:`, error)
    throw new Error(errorMessage)
  }
}
