import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  InferenceSource,
  type GenerativeModel,
} from 'firebase/ai'
import { firebaseApp, firebaseConfigValidation } from '../firebase'
import {
  initializeAppCheckSafely,
  verifyAppCheckTokenAcquisition,
} from '../appCheck'
import { AIServiceError, toSafeAIError } from './errors'
import { runUnderPrivacyPolicy } from './privacyPolicy'
import { getPlaygroundScenario } from './scenarios'
import { parseTransactionExtraction, transactionResponseJsonSchema } from './schemas'
import type { InferenceMetadata, InferenceMode as InferencePolicy, PlaygroundResult } from './types'

const CLOUD_MODEL = 'gemini-3.5-flash-lite'

interface ModelRequest {
  prompt: string
  mode: InferencePolicy
  language: 'en' | 'fr'
  structured: boolean
  onDownloadProgress?: (progress: number) => void
}

interface ModelResponse {
  text: string
  metadata: InferenceMetadata
}

function buildModel(
  mode: InferencePolicy,
  language: 'en' | 'fr',
  structured: boolean,
): GenerativeModel {
  if (!firebaseApp || !firebaseConfigValidation.isValid) {
    throw new AIServiceError({
      code: 'firebase-config-missing',
      category: 'request',
      message:
        firebaseConfigValidation.error ?? 'Firebase configuration is incomplete.',
    })
  }

  const ai = getAI(firebaseApp, {
    backend: new GoogleAIBackend(),
    useLimitedUseAppCheckTokens: true,
  })

  const languageOptions = {
    expectedInputs: [{ type: 'text' as const, languages: [language] }],
    expectedOutputs: [{ type: 'text' as const, languages: [language] }],
  }

  if (structured) {
    return getGenerativeModel(ai, {
      mode,
      inCloudParams: {
        model: CLOUD_MODEL,
        generationConfig: {
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
          responseJsonSchema: transactionResponseJsonSchema,
        },
      },
      onDeviceParams: {
        createOptions: languageOptions,
        promptOptions: {
          responseConstraint: transactionResponseJsonSchema,
        },
      },
    })
  }

  return getGenerativeModel(ai, {
    mode,
    inCloudParams: {
      model: CLOUD_MODEL,
      generationConfig: { maxOutputTokens: 512 },
    },
    onDeviceParams: { createOptions: languageOptions },
  })
}

function getInferenceSource(source: string | undefined): InferenceMetadata['source'] {
  if (source === InferenceSource.ON_DEVICE) return 'on-device'
  if (source === InferenceSource.IN_CLOUD) return 'cloud'
  return 'unknown'
}

function makeMetadata(
  mode: InferencePolicy,
  source: string | undefined,
  startTime: number,
  validation: InferenceMetadata['validation'],
): InferenceMetadata {
  return {
    requestedMode: mode,
    source: getInferenceSource(source),
    durationMs: Math.max(0, Math.round(performance.now() - startTime)),
    validation,
  }
}

function buildExtractionPrompt(
  sourceText: string,
  referenceDate: string,
  timeZone: string,
  businessCurrency?: string,
): string {
  return [
    'Extract each income or expense as structured transaction data from the synthetic or user-provided text below.',
    'Return only JSON matching the provided schema. Do not calculate totals, invent missing values, or infer unsupported facts.',
    'Use type income or expense. Use an ISO currency code only when it is explicit and unambiguous.',
    'FCFA is ambiguous between XAF and XOF: set currency to null and add a clarification to missingInformation unless an explicit configured business currency is supplied.',
    'Resolve relative dates only against the explicit reference date and timezone below. Set date to null when it cannot be determined.',
    `Reference date: ${referenceDate}. Timezone: ${timeZone}.`,
    ...(businessCurrency ? [`Explicit business currency: ${businessCurrency}.`] : []),
    `Text to extract: ${sourceText}`,
  ].join('\n')
}

async function requestModel(
  request: ModelRequest,
  classification: Parameters<typeof runUnderPrivacyPolicy>[0]['classification'],
  cloudConsent: boolean,
): Promise<ModelResponse> {
  return runUnderPrivacyPolicy(
    { classification, mode: request.mode, cloudConsent },
    async () => {
      const appCheck = initializeAppCheckSafely()
      if (appCheck.sdk !== 'initialized') {
        throw new AIServiceError({
          code: 'app-check-not-initialized',
          category: 'app-check',
          message: appCheck.message,
        })
      }

      if (request.mode !== InferenceMode.ONLY_ON_DEVICE) {
        const token = await verifyAppCheckTokenAcquisition()
        if (token.status !== 'acquired') {
          throw new AIServiceError({
            code: token.errorCode ?? 'app-check-token-failed',
            category: 'app-check',
            message: token.message,
          })
        }
      }

      const startTime = performance.now()
      let requestStarted = false
      try {
        const model = buildModel(request.mode, request.language, request.structured)
        if (request.mode === InferenceMode.ONLY_ON_DEVICE) {
          await model.initializeDeviceModel(request.onDownloadProgress)
        }

        requestStarted = true
        const result = await model.generateContent(request.prompt)
        const responseText = result.response.text()

        return {
          text: responseText,
          metadata: makeMetadata(
            request.mode,
            result.response.inferenceSource,
            startTime,
            request.structured ? 'valid' : 'not-applicable',
          ),
        }
      } catch (error) {
        const partialMetadata = makeMetadata(request.mode, undefined, startTime, 'not-applicable')
        const safeError = toSafeAIError(error, partialMetadata)
        throw new AIServiceError({
          ...safeError.details,
          requestStarted,
        })
      }
    },
  ).catch((error: unknown) => {
    if (error instanceof AIServiceError) throw error
    if (error instanceof Error && 'code' in error && error.code === 'SENSITIVE_DATA_ON_DEVICE_ONLY') {
      throw new AIServiceError({
        code: 'SENSITIVE_DATA_ON_DEVICE_ONLY',
        category: 'privacy',
        message: error.message,
      })
    }
    if (error instanceof Error && 'code' in error && error.code === 'CLOUD_CONSENT_REQUIRED') {
      throw new AIServiceError({
        code: 'CLOUD_CONSENT_REQUIRED',
        category: 'consent',
        message: error.message,
      })
    }
    throw toSafeAIError(error)
  })
}

export async function prepareOnDeviceModel(
  language: 'en' | 'fr',
  onDownloadProgress?: (progress: number) => void,
): Promise<void> {
  const appCheck = initializeAppCheckSafely()
  if (appCheck.sdk !== 'initialized') {
    throw new AIServiceError({
      code: 'app-check-not-initialized',
      category: 'app-check',
      message: appCheck.message,
    })
  }

  const model = buildModel(InferenceMode.ONLY_ON_DEVICE, language, false)
  try {
    await model.initializeDeviceModel(onDownloadProgress)
  } catch (error) {
    throw toSafeAIError(error)
  }
}

function getReferenceDate(timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

async function extractTransactionText(
  sourceText: string,
  language: 'en' | 'fr',
  mode: InferencePolicy,
  cloudConsent: boolean,
  referenceDate: string,
  timeZone: string,
  businessCurrency?: 'MAD' | 'XAF' | 'XOF' | 'EUR' | 'USD',
  onDownloadProgress?: (progress: number) => void,
): Promise<PlaygroundResult> {
  if (!sourceText.trim() || sourceText.length > 2000) {
    throw new AIServiceError({
      code: 'transaction-input-invalid',
      category: 'validation',
      message: 'Enter between 1 and 2,000 characters for transaction extraction.',
    })
  }

  let validReferenceDate = false
  try {
    const parsedDate = new Date(`${referenceDate}T00:00:00.000Z`)
    validReferenceDate =
      /^\d{4}-\d{2}-\d{2}$/.test(referenceDate) &&
      !Number.isNaN(parsedDate.getTime()) &&
      parsedDate.toISOString().slice(0, 10) === referenceDate
    new Intl.DateTimeFormat('en', { timeZone }).format()
  } catch {
    validReferenceDate = false
  }

  if (!validReferenceDate) {
    throw new AIServiceError({
      code: 'transaction-date-context-invalid',
      category: 'validation',
      message: 'A valid reference date and timezone are required for transaction extraction.',
    })
  }

  const result = await requestModel(
    {
      prompt: buildExtractionPrompt(
        sourceText,
        referenceDate,
        timeZone,
        businessCurrency,
      ),
      mode,
      language,
      structured: true,
      ...(onDownloadProgress ? { onDownloadProgress } : {}),
    },
    'financial_transactions',
    cloudConsent,
  )

  if (result.metadata.source !== 'on-device') {
    throw new AIServiceError({
      code: 'sensitive-inference-source-unverified',
      category: 'privacy',
      message:
        'The SDK did not confirm on-device inference for sensitive data. The result was discarded and was not saved.',
      metadata: { ...result.metadata, validation: 'invalid' },
    })
  }

  const parsed = parseTransactionExtraction(
    result.text,
    sourceText,
    businessCurrency,
  )
  if (!parsed.success) {
    throw new AIServiceError({
      code: 'invalid-structured-output',
      category: 'validation',
      message: `The model response did not pass transaction validation. ${parsed.issues.join(' ')}`,
      metadata: { ...result.metadata, validation: 'invalid' },
    })
  }

  return {
    kind: 'transactions',
    transactions: parsed.transactions,
    metadata: { ...result.metadata, validation: 'valid' },
  }
}

export async function extractPrivateTransactions(
  sourceText: string,
  language: 'en' | 'fr',
  onDownloadProgress?: (progress: number) => void,
): Promise<PlaygroundResult> {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  return extractTransactionText(
    sourceText,
    language,
    InferenceMode.ONLY_ON_DEVICE,
    false,
    getReferenceDate(timeZone),
    timeZone,
    undefined,
    onDownloadProgress,
  )
}

export async function runPlaygroundScenario(
  scenarioId: string,
  mode: InferencePolicy,
  cloudConsent: boolean,
  onDownloadProgress?: (progress: number) => void,
): Promise<PlaygroundResult> {
  const scenario = getPlaygroundScenario(scenarioId)
  if (!scenario) {
    throw new AIServiceError({
      code: 'scenario-not-allowlisted',
      category: 'request',
      message: 'Choose one of the predefined diagnostic scenarios.',
    })
  }

  if (scenario.kind === 'policy-check') {
    try {
      await runUnderPrivacyPolicy(
        {
          classification: 'financial_transactions',
          mode: InferenceMode.ONLY_IN_CLOUD,
          cloudConsent: true,
        },
        async () => {
          throw new AIServiceError({
            code: 'privacy-policy-unexpectedly-allowed',
            category: 'privacy',
            message: 'The privacy check did not block a sensitive cloud request.',
          })
        },
      )
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'SENSITIVE_DATA_ON_DEVICE_ONLY'
      ) {
        return {
          kind: 'policy-check',
          blocked: true,
          message:
            'Policy check passed: sensitive data was blocked before any AI SDK call.',
        }
      }
      throw error
    }

    throw new AIServiceError({
      code: 'privacy-policy-unexpectedly-allowed',
      category: 'privacy',
      message: 'The privacy check did not block a sensitive cloud request.',
    })
  }

  if (scenario.kind === 'transaction') {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return extractTransactionText(
      scenario.prompt,
      scenario.language,
      mode,
      cloudConsent,
      getReferenceDate(timeZone),
      timeZone,
      undefined,
      onDownloadProgress,
    )
  }

  const result = await requestModel(
    {
      prompt: scenario.prompt,
      mode,
      language: scenario.language,
      structured: false,
      ...(onDownloadProgress ? { onDownloadProgress } : {}),
    },
    scenario.classification,
    cloudConsent,
  )

  return { kind: 'text', text: result.text, metadata: result.metadata }
}
