import { z } from 'zod'

export const supportedCurrencies = ['MAD', 'XAF', 'XOF', 'EUR', 'USD'] as const

export const ExtractedTransactionSchema = z
  .object({
    type: z.enum(['income', 'expense']),
    amount: z.number().finite().positive(),
    currency: z.enum(supportedCurrencies).nullable(),
    category: z.string().trim().min(1).max(64),
    description: z.string().trim().min(1).max(240),
    date: z.iso.date().nullable(),
    missingInformation: z.array(z.string().trim().min(1).max(160)).max(12),
  })
  .strict()

export const TransactionExtractionSchema = z
  .object({
    transactions: z.array(ExtractedTransactionSchema).min(1).max(10),
  })
  .strict()

export type ExtractedTransaction = z.infer<typeof ExtractedTransactionSchema>

export const transactionResponseJsonSchema = {
  type: 'object',
  properties: {
    transactions: {
      type: 'array',
      minItems: 1,
      maxItems: 10,
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['income', 'expense'],
          },
          amount: {
            type: 'number',
            minimum: 0.01,
          },
          currency: {
            type: 'string',
            enum: [...supportedCurrencies],
            nullable: true,
            description:
              'Use null if currency is missing or ambiguous. FCFA is ambiguous between XAF and XOF unless an explicit business currency resolves it.',
          },
          category: { type: 'string', maxLength: 64 },
          description: { type: 'string', maxLength: 240 },
          date: {
            type: 'string',
            nullable: true,
            description: 'ISO 8601 date (YYYY-MM-DD) only when determinable.',
          },
          missingInformation: {
            type: 'array',
            maxItems: 12,
            items: { type: 'string', maxLength: 160 },
          },
        },
        required: [
          'type',
          'amount',
          'currency',
          'category',
          'description',
          'date',
          'missingInformation',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['transactions'],
  additionalProperties: false,
} satisfies Record<string, unknown>

export type TransactionParseResult =
  | { success: true; transactions: ExtractedTransaction[] }
  | { success: false; issues: string[] }

export function parseTransactionExtraction(
  responseText: string,
  sourceText: string,
  businessCurrency?: (typeof supportedCurrencies)[number],
): TransactionParseResult {
  let decoded: unknown

  try {
    decoded = JSON.parse(responseText)
  } catch {
    return {
      success: false,
      issues: ['The model response was not valid JSON. Nothing was saved.'],
    }
  }

  const parsed = TransactionExtractionSchema.safeParse(decoded)
  if (!parsed.success) {
    return {
      success: false,
      issues: parsed.error.issues.map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : 'response'
        return `${path}: ${issue.message}`
      }),
    }
  }

  const hasAmbiguousFCFA = /\bFCFA\b/i.test(sourceText)
  const resolvesFCFA = businessCurrency === 'XAF' || businessCurrency === 'XOF'

  if (hasAmbiguousFCFA && !resolvesFCFA) {
    return {
      success: true,
      transactions: parsed.data.transactions.map((transaction) => ({
        ...transaction,
        currency: null,
        missingInformation: [
          ...new Set([
            ...transaction.missingInformation,
            'Clarify whether FCFA means XAF or XOF.',
          ]),
        ],
      })),
    }
  }

  if (hasAmbiguousFCFA && businessCurrency) {
    return {
      success: true,
      transactions: parsed.data.transactions.map((transaction) => ({
        ...transaction,
        currency: businessCurrency,
        missingInformation: transaction.missingInformation.filter(
          (item) => !/clarify whether FCFA means XAF or XOF/i.test(item),
        ),
      })),
    }
  }

  return { success: true, transactions: parsed.data.transactions }
}
