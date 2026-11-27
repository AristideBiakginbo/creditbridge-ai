export type PlaygroundScenarioId =
  | 'cloud-education'
  | 'hybrid-guidance'
  | 'local-transaction'
  | 'multiple-transactions'
  | 'french-transaction'
  | 'privacy-guard'

export type PlaygroundScenario =
  | {
      id: PlaygroundScenarioId
      kind: 'education'
      title: string
      description: string
      prompt: string
      classification: 'general_education' | 'general_business_guidance'
      language: 'en'
    }
  | {
      id: PlaygroundScenarioId
      kind: 'transaction'
      title: string
      description: string
      prompt: string
      classification: 'financial_transactions'
      language: 'en' | 'fr'
    }
  | {
      id: 'privacy-guard'
      kind: 'policy-check'
      title: string
      description: string
      prompt: null
      classification: 'financial_transactions'
      language: 'en'
    }

export const playgroundScenarios: PlaygroundScenario[] = [
  {
    id: 'cloud-education',
    kind: 'education',
    title: 'Financial education · Cloud',
    description: 'A general financial literacy question with no personal context.',
    prompt:
      'Explain the difference between cash flow and profit to a small shop owner. Use one simple, clearly hypothetical example.',
    classification: 'general_education',
    language: 'en',
  },
  {
    id: 'hybrid-guidance',
    kind: 'education',
    title: 'Record-keeping guidance · Hybrid',
    description: 'General business guidance with no private records.',
    prompt:
      'Suggest three practical ways a market trader can keep clearer daily records. Do not make lending or credit decisions.',
    classification: 'general_business_guidance',
    language: 'en',
  },
  {
    id: 'local-transaction',
    kind: 'transaction',
    title: 'Single transaction · On-device',
    description: 'Synthetic English sample, always restricted to on-device inference.',
    prompt:
      'Today I sold 15 bags of rice for 450 MAD and paid 80 MAD for transport.',
    classification: 'financial_transactions',
    language: 'en',
  },
  {
    id: 'multiple-transactions',
    kind: 'transaction',
    title: 'Multiple transactions · On-device',
    description: 'Synthetic English sample containing income and expenses.',
    prompt:
      'This morning I received 320 MAD from repair work, then spent 45 MAD on packaging and 25 MAD on delivery.',
    classification: 'financial_transactions',
    language: 'en',
  },
  {
    id: 'french-transaction',
    kind: 'transaction',
    title: 'Transaction en français · On-device',
    description: 'Synthetic French sample; FCFA remains unresolved unless explicitly configured.',
    prompt:
      "Aujourd'hui, j'ai vendu des marchandises pour 2 500 FCFA et dépensé 700 FCFA pour le transport.",
    classification: 'financial_transactions',
    language: 'fr',
  },
  {
    id: 'privacy-guard',
    kind: 'policy-check',
    title: 'Sensitive cloud-block test',
    description: 'Verifies that private financial data cannot use a cloud-capable mode.',
    prompt: null,
    classification: 'financial_transactions',
    language: 'en',
  },
]

export function getPlaygroundScenario(id: string): PlaygroundScenario | undefined {
  return playgroundScenarios.find((scenario) => scenario.id === id)
}
