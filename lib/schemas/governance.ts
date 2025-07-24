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

// Basic conversion schemas
const NumberLikeSchema = z.union([z.number(), z.object({ toNumber: z.function().returns(z.number()) }).transform(obj => obj.toNumber())])

const BNLikeSchema = z.preprocess(toBN, z.instanceof(BN))

const StringLikeSchema = z.union([z.string(), z.object({ toString: z.function().returns(z.string()) }).transform(obj => obj.toString())])

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

// Governance-specific schemas
export const TrackSchema = TupleSchema(NumberLikeSchema, z.unknown())
export const TracksSchema = ArrayLikeSchema(TrackSchema)

export const ClassLockSchema = TupleSchema(NumberLikeSchema, BNLikeSchema)
export const ClassLocksResultSchema = ArrayLikeSchema(ClassLockSchema)

export const ConvictionSchema = StringLikeSchema.transform(
  str => str as 'None' | 'Locked1x' | 'Locked2x' | 'Locked3x' | 'Locked4x' | 'Locked5x' | 'Locked6x'
)

// Voting data schemas
const VoteDataSchema = z.object({
  vote: z.object({
    isAye: z.boolean(),
    conviction: ConvictionSchema,
  }),
  balance: BNLikeSchema,
})

const VoteEntrySchema = TupleSchema(
  NumberLikeSchema, // referendum index
  z.object({ asStandard: VoteDataSchema })
)

const DelegatingSchema = z.object({
  target: StringLikeSchema,
  conviction: ConvictionSchema,
  balance: BNLikeSchema,
  prior: z.optional(TupleSchema(NumberLikeSchema, BNLikeSchema)),
})

const CastingSchema = z.object({
  votes: ArrayLikeSchema(VoteEntrySchema),
})

// VotingFor union schema - simplified
export const VotingForSchema = z
  .object({
    isDelegating: z.boolean(),
    isCasting: z.boolean(),
    asDelegating: z.optional(DelegatingSchema),
    asCasting: z.optional(CastingSchema),
  })
  .transform(data => {
    if (data.isDelegating && data.asDelegating) {
      return {
        isDelegating: true as const,
        isCasting: false as const,
        asDelegating: data.asDelegating,
      }
    }
    if (data.isCasting && data.asCasting) {
      return {
        isDelegating: false as const,
        isCasting: true as const,
        asCasting: data.asCasting,
      }
    }
    return {
      isDelegating: false as const,
      isCasting: false as const,
    }
  })

export const ReferendumInfoSchema = OptionSchema(z.object({ isOngoing: z.boolean() }))

export const CurrentBlockSchema = NumberLikeSchema

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
