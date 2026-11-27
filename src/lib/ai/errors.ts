import type { AIErrorDetails, InferenceMetadata } from './types'

export class AIServiceError extends Error {
  readonly details: AIErrorDetails

  constructor(details: AIErrorDetails) {
    super(details.message)
    this.name = 'AIServiceError'
    this.details = details
  }
}

export function getSafeErrorCode(error: unknown): string | undefined {
  if (
    error instanceof Error &&
    'code' in error &&
    typeof error.code === 'string' &&
    /^[a-z0-9/-]+$/i.test(error.code)
  ) {
    return error.code
  }

  return undefined
}

export function toSafeAIError(
  error: unknown,
  metadata?: InferenceMetadata,
): AIServiceError {
  if (error instanceof AIServiceError) return error

  const code = getSafeErrorCode(error) ?? 'ai-request-failed'
  const normalizedCode = code.toLowerCase()

  if (normalizedCode.includes('app-check')) {
    return new AIServiceError({
      code,
      category: 'app-check',
      message: 'App Check verification failed. No retry without App Check was attempted.',
      ...(metadata ? { metadata } : {}),
    })
  }

  if (normalizedCode.includes('quota') || normalizedCode.includes('resource-exhausted')) {
    return new AIServiceError({
      code,
      category: 'quota',
      message: 'The AI provider quota was reached. Check the provider configuration and quota in Firebase Console.',
      ...(metadata ? { metadata } : {}),
    })
  }

  if (
    normalizedCode.includes('network') ||
    normalizedCode.includes('fetch') ||
    normalizedCode.includes('unavailable')
  ) {
    return new AIServiceError({
      code,
      category: 'network',
      message: 'The AI request could not reach its required service. Check the network and Firebase AI Logic setup.',
      ...(metadata ? { metadata } : {}),
    })
  }

  if (normalizedCode.includes('model') || normalizedCode.includes('device')) {
    return new AIServiceError({
      code,
      category: 'model',
      message: 'The requested model is unavailable on this device or for this request.',
      ...(metadata ? { metadata } : {}),
    })
  }

  return new AIServiceError({
    code,
    category: 'request',
    message: 'The AI request failed. No prompt or response was written to diagnostic logs.',
    ...(metadata ? { metadata } : {}),
  })
}
