import { z } from 'zod'

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
const OptionSchema = <T>(innerSchema: z.ZodType<T>): z.ZodUnion<[
  z.ZodEffects<z.ZodObject<any>, { isSome: true; value: T }>,
  z.ZodEffects<z.ZodObject<any>, { isSome: false; value: undefined }>
]> =>
  z.union([
    z.object({
      isSome: z.literal(true),
      isNone: z.literal(false),
      unwrap: z.function(),
    }).transform(opt => ({
      isSome: true as const,
      value: innerSchema.parse(opt.unwrap()) as T,
    })),
    z.object({
      isSome: z.literal(false),
      isNone: z.literal(true),
      unwrap: z.function().optional(),
    }).transform(() => ({
      isSome: false as const,
      value: undefined as undefined,
    })),
  ])

// Track info schema based on PalletReferendaTrackInfo
const TrackInfoSchema = z.object({
  name: z.string(),
  maxDeciding: z.number(),
  decisionDeposit: z.number(),
  preparePeriod: z.number(),
  decisionPeriod: z.number(),
  confirmPeriod: z.number(),
  minEnactmentPeriod: z.number(),
  minApproval: z.union([
    z.object({
      reciprocal: z.object({
        factor: z.number(),
        xOffset: z.number(),
        yOffset: z.number(),
      }),
    }),
    z.object({
      linearDecreasing: z.object({
        length: z.number(),
        floor: z.number(),
        ceil: z.number(),
      }),
    }),
  ]),
  minSupport: z.union([
    z.object({
      reciprocal: z.object({
        factor: z.number(),
        xOffset: z.number(),
        yOffset: z.number(),
      }),
    }),
    z.object({
      linearDecreasing: z.object({
        length: z.number(),
        floor: z.number(),
        ceil: z.number(),
      }),
    }),
  ]),
})

// Governance-specific schemas
export const TracksSchema = z.array(z.tuple([z.number(), TrackInfoSchema]))

export const ClassLockSchema = TupleSchema(z.number(), z.number())
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
}).transform(conv => conv.type)

// Voting data schemas
const AccountVoteSchema = z.object({
  isStandard: z.boolean(),
  asStandard: z.object({
    vote: z.object({
      isAye: z.boolean(),
      conviction: ConvictionSchema,
    }),
    balance: z.number(),
  }),
  isSplit: z.boolean(),
  asSplit: z.object({
    aye: z.number(),
    nay: z.number(),
  }),
  isSplitAbstain: z.boolean(),
  asSplitAbstain: z.object({
    aye: z.number(),
    nay: z.number(),
    abstain: z.number(),
  }),
})

const VoteEntrySchema = TupleSchema(
  z.number(), // referendum index
  AccountVoteSchema
)

const DelegationsSchema = z.object({
  votes: z.number(),
  capital: z.number(),
})

const PriorLockSchema = TupleSchema(z.number(), z.number())

const DelegatingSchema = z.object({
  target: z.string(),
  conviction: ConvictionSchema,
  balance: z.number(),
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
  isDelegating: z.boolean().optional(),
  isDirect: z.boolean().optional(),
  isCasting: z.boolean().optional(),
  asDelegating: DelegatingSchema.optional(),
  asDirect: DirectSchema.optional(),
  asCasting: DirectSchema.optional(),
  type: z.enum(['Direct', 'Delegating']).optional(),
}).transform(data => ({
  ...data,
  isDelegating: data.isDelegating ?? false,
  isDirect: data.isDirect ?? false,
  isCasting: data.isCasting ?? false,
})) as z.ZodType<{
  isDelegating: boolean;
  isDirect: boolean;
  isCasting: boolean;
  type?: 'Direct' | 'Delegating';
  asDelegating?: any;
  asDirect?: any;
  asCasting?: any;
}>

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
