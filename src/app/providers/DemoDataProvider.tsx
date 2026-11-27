import {
  useCallback,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { seedTransactions } from '../../demo/data/seedTransactions'
import {
  createDemoRepository,
  DemoRepositoryError,
  type DemoTransactionInput,
  type DemoTransactionRepository,
} from '../../demo/repository'
import {
  DemoDataContext,
  type DemoDataState,
} from './demoDataContext'

function messageFromError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The demonstration workspace could not access its local data.'
}

function initializeState(): DemoDataState {
  try {
    const repository = createDemoRepository(window.localStorage, seedTransactions)
    try {
      return { repository, transactions: repository.list(), error: null }
    } catch (error) {
      return { repository, transactions: [], error: messageFromError(error) }
    }
  } catch (error) {
    return {
      repository: null,
      transactions: [],
      error: messageFromError(error),
    }
  }
}

export function DemoDataProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<DemoDataState>(initializeState)

  const mutate = useCallback(
    <Result,>(operation: (repository: DemoTransactionRepository) => Result): Result => {
      if (!state.repository) {
        const error = new DemoRepositoryError(
          state.error ?? 'The local demonstration repository is unavailable.',
        )
        setState((current) => ({ ...current, error: error.message }))
        throw error
      }

      try {
        const result = operation(state.repository)
        const transactions = state.repository.list()
        setState((current) => ({ ...current, transactions, error: null }))
        return result
      } catch (error) {
        setState((current) => ({ ...current, error: messageFromError(error) }))
        throw error
      }
    },
    [state.error, state.repository],
  )

  const createTransaction = useCallback(
    (input: DemoTransactionInput) => mutate((repository) => repository.create(input)),
    [mutate],
  )
  const createTransactions = useCallback(
    (inputs: DemoTransactionInput[]) =>
      mutate((repository) => repository.createMany(inputs)),
    [mutate],
  )
  const updateTransaction = useCallback(
    (id: string, input: DemoTransactionInput) =>
      mutate((repository) => repository.update(id, input)),
    [mutate],
  )
  const deleteTransaction = useCallback(
    (id: string) => mutate((repository) => repository.remove(id)),
    [mutate],
  )
  const resetDemoData = useCallback(
    () => mutate((repository) => repository.reset()),
    [mutate],
  )

  const value = useMemo(
    () => ({
      ...state,
      createTransaction,
      createTransactions,
      updateTransaction,
      deleteTransaction,
      resetDemoData,
    }),
    [
      state,
      createTransaction,
      createTransactions,
      updateTransaction,
      deleteTransaction,
      resetDemoData,
    ],
  )

  return (
    <DemoDataContext.Provider value={value}>
      {children}
    </DemoDataContext.Provider>
  )
}
