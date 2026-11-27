import type { InferenceMode } from './types'

export type DataClassification =
  | 'general_education'
  | 'general_business_guidance'
  | 'synthetic_demo'
  | 'financial_transactions'
  | 'receipt_contents'
  | 'bank_information'
  | 'personal_identification'
  | 'customer_information'
  | 'confidential_business_document'

export interface InferenceAuthorizationRequest {
  classification: DataClassification
  mode: InferenceMode
  cloudConsent: boolean
}

export type InferenceAuthorization =
  | { allowed: true }
  | {
      allowed: false
      code: 'SENSITIVE_DATA_ON_DEVICE_ONLY' | 'CLOUD_CONSENT_REQUIRED'
      message: string
    }

const sensitiveClassifications = new Set<DataClassification>([
  'financial_transactions',
  'receipt_contents',
  'bank_information',
  'personal_identification',
  'customer_information',
  'confidential_business_document',
])

export function authorizeInference(
  request: InferenceAuthorizationRequest,
): InferenceAuthorization {
  if (
    sensitiveClassifications.has(request.classification) &&
    request.mode !== 'only_on_device'
  ) {
    return {
      allowed: false,
      code: 'SENSITIVE_DATA_ON_DEVICE_ONLY',
      message:
        'This request contains private financial or personal information and is restricted to on-device inference. No cloud request was sent.',
    }
  }

  if (request.mode !== 'only_on_device' && !request.cloudConsent) {
    return {
      allowed: false,
      code: 'CLOUD_CONSENT_REQUIRED',
      message:
        'This inference mode may use cloud AI. Give explicit consent for this request or choose ONLY_ON_DEVICE.',
    }
  }

  return { allowed: true }
}

export class PrivacyPolicyViolation extends Error {
  readonly code: 'SENSITIVE_DATA_ON_DEVICE_ONLY' | 'CLOUD_CONSENT_REQUIRED'

  constructor(
    code: 'SENSITIVE_DATA_ON_DEVICE_ONLY' | 'CLOUD_CONSENT_REQUIRED',
    message: string,
  ) {
    super(message)
    this.name = 'PrivacyPolicyViolation'
    this.code = code
  }
}

export async function runUnderPrivacyPolicy<T>(
  request: InferenceAuthorizationRequest,
  operation: () => Promise<T>,
): Promise<T> {
  const authorization = authorizeInference(request)
  if (!authorization.allowed) {
    throw new PrivacyPolicyViolation(authorization.code, authorization.message)
  }

  return operation()
}
