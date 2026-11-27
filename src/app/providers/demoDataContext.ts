import { createContext } from 'react'
import type {
  DemoTransaction,
  DemoTransactionInput,
  DemoTransactionRepository,
} from '../../demo/repository'

export interface DemoDataState {
  repository: DemoTransactionRepository | null
  transactions: DemoTransaction[]
  error: string | null
}

export interface DemoDataContextValue extends DemoDataState {
  createTransaction: (input: DemoTransactionInput) => DemoTransaction
  createTransactions: (inputs: DemoTransactionInput[]) => DemoTransaction[]
  updateTransaction: (
    id: string,
    input: DemoTransactionInput,
  ) => DemoTransaction
  deleteTransaction: (id: string) => void
  resetDemoData: () => DemoTransaction[]
}

export const DemoDataContext = createContext<DemoDataContextValue | null>(null)
