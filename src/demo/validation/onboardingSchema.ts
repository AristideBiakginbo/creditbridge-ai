import { z } from 'zod'

const currencies = ['MAD', 'XAF', 'XOF', 'EUR', 'USD'] as const

export const onboardingSchema = z.object({
  businessName: z.string().trim().min(2).max(80),
  sector: z.string().trim().min(2).max(60),
  businessType: z.enum(['sole-trader', 'family-business', 'small-team']),
  country: z.string().trim().min(2).max(60),
  currency: z.enum(currencies),
  goals: z.array(z.string().min(1)).min(1).max(5),
  cloudEducationConsent: z.boolean(),
  cloudSyncConsent: z.literal(false),
})

export type OnboardingDraft = z.infer<typeof onboardingSchema>
