export const currencies = ['MAD', 'XAF', 'XOF', 'EUR', 'USD'] as const
export type Currency = (typeof currencies)[number]
