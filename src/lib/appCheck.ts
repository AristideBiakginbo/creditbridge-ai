import {
  getToken,
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from 'firebase/app-check'
import { firebaseApp, firebaseConfigValidation } from './firebase'

export type AppCheckConfigurationStatus = 'available' | 'missing'
export type AppCheckSdkStatus = 'initialized' | 'not-initialized' | 'failed'
export type AppCheckTokenStatus = 'not-tested' | 'acquired' | 'failed'

export interface AppCheckDiagnostic {
  configuration: AppCheckConfigurationStatus
  sdk: AppCheckSdkStatus
  token: AppCheckTokenStatus
  message: string
  errorCode?: string
}

export interface AppCheckTokenDiagnostic {
  status: AppCheckTokenStatus
  message: string
  errorCode?: string
}

interface AppCheckHotData {
  appCheckInstance?: AppCheck
}

const recaptchaSiteKey = import.meta.env.VITE_FIREBASE_RECAPTCHA_SITE_KEY?.trim()
const hotData = import.meta.hot?.data as AppCheckHotData | undefined
let appCheckInstance = hotData?.appCheckInstance
let initializationDiagnostic: AppCheckDiagnostic | undefined
let tokenDiagnostic: AppCheckTokenDiagnostic = {
  status: 'not-tested',
  message: 'Token acquisition has not been tested.',
}

function isApprovedLocalOrigin(): boolean {
  return (
    window.location.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
  )
}

function getErrorCode(error: unknown): string | undefined {
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

function describeError(error: unknown): AppCheckTokenDiagnostic {
  const errorCode = getErrorCode(error)

  if (errorCode?.includes('recaptcha')) {
    return {
      status: 'failed',
      message: 'reCAPTCHA could not verify this browser. Check the registered site key and allowed domain.',
      errorCode,
    }
  }

  return {
    status: 'failed',
    message: 'App Check could not acquire a token. Review the provider configuration and network status.',
    ...(errorCode ? { errorCode } : {}),
  }
}

export function initializeAppCheckSafely(): AppCheckDiagnostic {
  if (initializationDiagnostic) return initializationDiagnostic

  if (!firebaseApp || !firebaseConfigValidation.isValid) {
    initializationDiagnostic = {
      configuration: 'missing',
      sdk: 'not-initialized',
      token: 'not-tested',
      message: firebaseConfigValidation.error ?? 'Firebase app configuration is unavailable.',
    }
    return initializationDiagnostic
  }

  if (!recaptchaSiteKey) {
    initializationDiagnostic = {
      configuration: 'missing',
      sdk: 'not-initialized',
      token: 'not-tested',
      message: 'Missing VITE_FIREBASE_RECAPTCHA_SITE_KEY. Add the public reCAPTCHA Enterprise site key to .env.local.',
    }
    return initializationDiagnostic
  }

  if (!appCheckInstance) {
    const useDebugProvider =
      import.meta.env.DEV && isApprovedLocalOrigin()

    if (useDebugProvider) {
      const debugToken = import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN?.trim()

      if (!debugToken) {
        initializationDiagnostic = {
          configuration: 'missing',
          sdk: 'not-initialized',
          token: 'not-tested',
          message: 'Local App Check requires VITE_FIREBASE_APPCHECK_DEBUG_TOKEN in the ignored .env.development.local file.',
        }
        return initializationDiagnostic
      }

      window.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken
    }

    try {
      appCheckInstance = initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      })

      if (import.meta.hot) {
        import.meta.hot.data.appCheckInstance = appCheckInstance
      }
    } catch (error) {
      const tokenDiagnostic = describeError(error)
      initializationDiagnostic = {
        configuration: 'available',
        sdk: 'failed',
        token: 'not-tested',
        message: tokenDiagnostic.message,
        ...(tokenDiagnostic.errorCode ? { errorCode: tokenDiagnostic.errorCode } : {}),
      }
      return initializationDiagnostic
    }
  }

  initializationDiagnostic = {
    configuration: 'available',
    sdk: 'initialized',
    token: 'not-tested',
    message: 'App Check SDK initialized with reCAPTCHA Enterprise. Token acquisition has not been tested.',
  }
  return initializationDiagnostic
}

export function getAppCheckDiagnostic(): AppCheckDiagnostic {
  return (
    initializationDiagnostic ?? {
      configuration: recaptchaSiteKey ? 'available' : 'missing',
      sdk: 'not-initialized',
      token: 'not-tested',
      message: 'App Check has not been initialized yet.',
    }
  )
}

export function getAppCheckTokenDiagnostic(): AppCheckTokenDiagnostic {
  return tokenDiagnostic
}

export async function verifyAppCheckTokenAcquisition(): Promise<AppCheckTokenDiagnostic> {
  const diagnostic = initializeAppCheckSafely()
  if (diagnostic.sdk !== 'initialized' || !appCheckInstance) {
    tokenDiagnostic = {
      status: 'failed',
      message: diagnostic.message,
      ...(diagnostic.errorCode ? { errorCode: diagnostic.errorCode } : {}),
    }
    return tokenDiagnostic
  }

  try {
    const tokenResult = await getToken(appCheckInstance)
    if (!tokenResult.token) {
      tokenDiagnostic = {
        status: 'failed',
        message: 'App Check returned an empty token.',
      }
      return tokenDiagnostic
    }

    tokenDiagnostic = {
      status: 'acquired',
      message: 'App Check token acquired. The token value is not displayed or stored by the app.',
    }
    return tokenDiagnostic
  } catch (error) {
    tokenDiagnostic = describeError(error)
    return tokenDiagnostic
  }
}
