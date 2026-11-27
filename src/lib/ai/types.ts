import type { InferenceMode } from 'firebase/ai'

export type { InferenceMode }

export type InferenceSourceLabel = 'on-device' | 'cloud' | 'unknown'
export type ValidationStatus = 'valid' | 'invalid' | 'not-applicable'

export interface InferenceMetadata {
  requestedMode: InferenceMode
  source: InferenceSourceLabel
  durationMs: number
  validation: ValidationStatus
}

export interface AIErrorDetails {
  code: string
  category: 'privacy' | 'consent' | 'app-check' | 'quota' | 'network' | 'model' | 'validation' | 'request'
  message: string
  metadata?: InferenceMetadata
  requestStarted?: boolean
}

export type PlaygroundResult =
  | {
      kind: 'text'
      text: string
      metadata: InferenceMetadata
    }
  | {
      kind: 'transactions'
      transactions: import('./schemas').ExtractedTransaction[]
      metadata: InferenceMetadata
    }
  | {
      kind: 'policy-check'
      blocked: true
      message: string
    }

export interface PlaygroundRunOptions {
  scenarioId: string
  mode: InferenceMode
  cloudConsent: boolean
  onDownloadProgress?: (progress: number) => void
}
