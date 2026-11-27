import { z } from 'zod'

export const demoCurrencies = ['MAD', 'XAF', 'XOF', 'EUR', 'USD'] as const
export type DemoCurrency = (typeof demoCurrencies)[number]

export const DemoTransactionSchema = z
  .object({
    id: z.string().min(1).max(80),
    date: z.iso.date(),
    type: z.enum(['income', 'expense']),
    description: z.string().trim().min(2).max(140),
    category: z.string().trim().min(2).max(48),
    amount: z.number().finite().positive().max(100_000_000),
    currency: z.enum(demoCurrencies),
  })
  .strict()

export const DemoTransactionInputSchema = DemoTransactionSchema.omit({
  id: true,
})

export type DemoTransaction = z.infer<typeof DemoTransactionSchema>
export type DemoTransactionInput = z.infer<typeof DemoTransactionInputSchema>

export interface DemoStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export class DemoRepositoryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DemoRepositoryError'
  }
}

const STORAGE_KEY = 'creditbridge.demo.transactions.v1'

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `demo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function createDemoRepository(
  storage: DemoStorage,
  seed: DemoTransaction[],
) {
  const parsedSeed = z.array(DemoTransactionSchema).safeParse(seed)
  if (!parsedSeed.success || !parsedSeed.data) {
    throw new DemoRepositoryError('The built-in demonstration data is invalid.')
  }
  const initialSeed = parsedSeed.data

  function write(transactions: DemoTransaction[]): void {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(transactions))
    } catch {
      throw new DemoRepositoryError(
        'The demonstration data could not be saved in this browser.',
      )
    }
  }

  function read(): DemoTransaction[] {
    let serialized: string | null
    try {
      serialized = storage.getItem(STORAGE_KEY)
    } catch {
      throw new DemoRepositoryError(
        'The demonstration data could not be read from this browser.',
      )
    }

    if (serialized === null) {
      const initial = initialSeed.map((transaction) => ({ ...transaction }))
      write(initial)
      return initial
    }

    let decoded: unknown
    try {
      decoded = JSON.parse(serialized)
    } catch {
      throw new DemoRepositoryError(
        'The saved demonstration data is not valid JSON. Reset it to restore the synthetic sample.',
      )
    }

    const parsed = z.array(DemoTransactionSchema).safeParse(decoded)
    if (!parsed.success) {
      throw new DemoRepositoryError(
        'The saved demonstration data is invalid. Reset it to restore the synthetic sample.',
      )
    }
    return parsed.data
  }

  return {
    list(): DemoTransaction[] {
      return read()
    },
    create(input: DemoTransactionInput): DemoTransaction {
      const created = this.createMany([input])[0]
      if (!created) throw new DemoRepositoryError('The transaction was not created.')
      return created
    },
    createMany(inputs: DemoTransactionInput[]): DemoTransaction[] {
      const parsed = z.array(DemoTransactionInputSchema).min(1).safeParse(inputs)
      if (!parsed.success) {
        throw new DemoRepositoryError('Enter valid demonstration transaction details.')
      }
      const transactions = read()
      const created = parsed.data.map((input) =>
        DemoTransactionSchema.parse({ ...input, id: createId() }),
      )
      write([...created, ...transactions])
      return created
    },
    update(id: string, input: DemoTransactionInput): DemoTransaction {
      const parsed = DemoTransactionInputSchema.safeParse(input)
      if (!parsed.success) {
        throw new DemoRepositoryError('Enter valid demonstration transaction details.')
      }
      const transactions = read()
      if (!transactions.some((transaction) => transaction.id === id)) {
        throw new DemoRepositoryError('That demonstration transaction no longer exists.')
      }
      const updated = DemoTransactionSchema.parse({ ...parsed.data, id })
      write(transactions.map((transaction) => transaction.id === id ? updated : transaction))
      return updated
    },
    remove(id: string): void {
      const transactions = read()
      if (!transactions.some((transaction) => transaction.id === id)) {
        throw new DemoRepositoryError('That demonstration transaction no longer exists.')
      }
      write(transactions.filter((transaction) => transaction.id !== id))
    },
    reset(): DemoTransaction[] {
      const restored = initialSeed.map((transaction) => ({ ...transaction }))
      write(restored)
      return restored
    },
  }
}

export type DemoTransactionRepository = ReturnType<typeof createDemoRepository>
