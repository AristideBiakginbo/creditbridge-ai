import type { LocalTransaction, LocalTransactionInput } from '../db/schema.ts'

export interface ProposedTransaction {
  id: string
  input: LocalTransactionInput
}

function normalizeText(value: string | undefined): string {
  return (value ?? '').trim().toLocaleLowerCase().replace(/\s+/g, ' ')
}

function sameTransaction(
  left: Pick<LocalTransactionInput, 'type' | 'amountMinor' | 'currency' | 'transactionDate' | 'description' | 'receiptReference'>,
  right: Pick<LocalTransaction, 'type' | 'amountMinor' | 'currency' | 'transactionDate' | 'description' | 'receiptReference'>,
): boolean {
  const sameCore =
    left.type === right.type
    && left.amountMinor === right.amountMinor
    && left.currency === right.currency
    && left.transactionDate === right.transactionDate
  const leftReference = normalizeText(left.receiptReference)
  const rightReference = normalizeText(right.receiptReference)
  if (leftReference && rightReference && leftReference === rightReference) return sameCore
  return sameCore && normalizeText(left.description) === normalizeText(right.description)
}

export function findPotentialDuplicates(
  proposals: ProposedTransaction[],
  existing: LocalTransaction[],
  ownerId: string,
  businessId: string,
): Set<string> {
  const possibleDuplicates = new Set<string>()
  const inScope = existing.filter(
    (item) => item.ownerId === ownerId && item.businessId === businessId,
  )

  proposals.forEach((proposal, index) => {
    if (inScope.some((item) => sameTransaction(proposal.input, item))) {
      possibleDuplicates.add(proposal.id)
    }
    for (let previous = 0; previous < index; previous += 1) {
      if (sameTransaction(proposal.input, proposals[previous].input)) {
        possibleDuplicates.add(proposal.id)
        possibleDuplicates.add(proposals[previous].id)
      }
    }
  })
  return possibleDuplicates
}
