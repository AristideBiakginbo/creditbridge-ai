import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BrainCircuit,
  CheckCircle2,
  Cloud,
  Cpu,
  FlaskConical,
  LockKeyhole,
  ShieldCheck,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { StatusCard, type StatusTone } from '../../components/StatusCard'
import {
  extractPrivateTransactions,
  getDeviceModelAvailability,
  playgroundScenarios,
  prepareOnDeviceModel,
  runPlaygroundScenario,
  type InferenceMetadata,
  type InferenceMode,
  type PlaygroundResult,
} from '../../lib/ai'
import { getPlaygroundScenario } from '../../lib/ai/scenarios'
import {
  getAppCheckTokenDiagnostic,
  getAppCheckDiagnostic,
  verifyAppCheckTokenAcquisition,
  type AppCheckDiagnostic,
  type AppCheckTokenDiagnostic,
} from '../../lib/appCheck'
import { firebaseApp, firebaseConfigValidation } from '../../lib/firebase'
import { AIServiceError } from '../../lib/ai/errors'
import { TransactionReview } from './TransactionReview'
import { ManualTransactionEntry } from './ManualTransactionEntry'
import { PrivateTransactionEntry } from './PrivateTransactionEntry'

const modes: Array<{ value: InferenceMode; label: string; description: string }> = [
  {
    value: 'only_on_device',
    label: 'ONLY_ON_DEVICE',
    description: 'Private/local only; no cloud fallback.',
  },
  {
    value: 'prefer_on_device',
    label: 'PREFER_ON_DEVICE',
    description: 'Try local first; may fall back to cloud.',
  },
  {
    value: 'prefer_in_cloud',
    label: 'PREFER_IN_CLOUD',
    description: 'Try cloud first; may fall back to local.',
  },
  {
    value: 'only_in_cloud',
    label: 'ONLY_IN_CLOUD',
    description: 'Cloud only; no local fallback.',
  },
]

type CloudStatus = 'not-tested' | 'cloud-reported' | 'request-failed'

function sourceLabel(source: InferenceMetadata['source']): string {
  if (source === 'on-device') return 'On-device (SDK reported)'
  if (source === 'cloud') return 'Cloud (SDK reported)'
  return 'Unknown (SDK did not report a source)'
}

export function HybridAIPlayground() {
  const [scenarioId, setScenarioId] = useState('cloud-education')
  const [mode, setMode] = useState<InferenceMode>('only_on_device')
  const [cloudConsent, setCloudConsent] = useState(false)
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [appCheck] = useState<AppCheckDiagnostic>(getAppCheckDiagnostic)
  const [tokenDiagnostic, setTokenDiagnostic] =
    useState<AppCheckTokenDiagnostic>(getAppCheckTokenDiagnostic)
  const [deviceAvailability, setDeviceAvailability] = useState<{
    status: 'unsupported' | 'unavailable' | 'downloadable' | 'downloading' | 'available' | 'unknown'
    message: string
  }>({ status: 'unknown', message: 'Checking browser model availability…' })
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('not-tested')
  const [isPreparing, setIsPreparing] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<number>()
  const [result, setResult] = useState<PlaygroundResult>()
  const [resultId, setResultId] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string>()
  const [requestMetadata, setRequestMetadata] = useState<InferenceMetadata>()

  const scenario = useMemo(
    () => getPlaygroundScenario(scenarioId),
    [scenarioId],
  )

  useEffect(() => {
    const updateNetwork = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', updateNetwork)
    window.addEventListener('offline', updateNetwork)
    return () => {
      window.removeEventListener('online', updateNetwork)
      window.removeEventListener('offline', updateNetwork)
    }
  }, [])

  useEffect(() => {
    let active = true
    const language = scenario?.language ?? 'en'

    void getDeviceModelAvailability(language).then((availability) => {
      if (active) setDeviceAvailability(availability)
    })

    return () => {
      active = false
    }
  }, [scenario?.language])

  const appCheckTone: StatusTone =
    appCheck?.sdk === 'initialized'
      ? 'success'
      : appCheck?.sdk === 'failed'
        ? 'error'
        : 'warning'
  const tokenTone: StatusTone =
    tokenDiagnostic.status === 'acquired'
      ? 'success'
      : tokenDiagnostic.status === 'failed'
        ? 'error'
        : 'neutral'
  const deviceTone: StatusTone =
    deviceAvailability.status === 'available'
      ? 'success'
      : deviceAvailability.status === 'unavailable' ||
          deviceAvailability.status === 'unsupported'
        ? 'warning'
        : 'neutral'
  const cloudTone: StatusTone =
    cloudStatus === 'cloud-reported'
      ? 'success'
      : cloudStatus === 'request-failed'
        ? 'error'
        : 'neutral'

  async function verifyAppCheckToken() {
    setTokenDiagnostic({
      status: 'not-tested',
      message: 'Requesting an App Check token…',
    })
    const diagnostic = await verifyAppCheckTokenAcquisition()
    setTokenDiagnostic(diagnostic)
  }

  async function runPrivateTransactionExtraction(
    sourceText: string,
    language: 'en' | 'fr',
  ): Promise<boolean> {
    setErrorMessage(undefined)
    setResult(undefined)
    setRequestMetadata(undefined)
    setIsRunning(true)

    try {
      const nextResult = await extractPrivateTransactions(
        sourceText,
        language,
        (progress) => {
          setDownloadProgress(Math.min(100, Math.max(0, Math.round(progress * 100))))
          setDeviceAvailability({
            status: 'downloading',
            message: 'Firebase AI Logic reports that the on-device model is being prepared.',
          })
        },
      )
      setResult(nextResult)
      setResultId((current) => current + 1)
      if (nextResult.kind === 'transactions') {
        setRequestMetadata(nextResult.metadata)
        setDeviceAvailability({
          status: 'available',
          message: 'Firebase AI Logic reported on-device inference for this response.',
        })
      }
      setTokenDiagnostic(getAppCheckTokenDiagnostic())
      return true
    } catch (error) {
      setErrorMessage(
        error instanceof AIServiceError
          ? error.details.message
          : 'On-device extraction failed. No cloud fallback was attempted.',
      )
      if (error instanceof AIServiceError && error.details.metadata) {
        setRequestMetadata(error.details.metadata)
      }
      setDeviceAvailability(await getDeviceModelAvailability(language))
      setTokenDiagnostic(getAppCheckTokenDiagnostic())
      return false
    } finally {
      setIsRunning(false)
    }
  }

  async function prepareDeviceModel() {
    if (!scenario || scenario.kind === 'policy-check') return

    setErrorMessage(undefined)
    setIsPreparing(true)
    setDownloadProgress(0)

    try {
      await prepareOnDeviceModel(scenario.language, (progress) => {
        setDownloadProgress(Math.min(100, Math.max(0, Math.round(progress * 100))))
        setDeviceAvailability({
          status: 'downloading',
          message: 'Firebase AI Logic reports that the on-device model is being prepared.',
        })
      })
      setDownloadProgress(100)
      setDeviceAvailability({
        status: 'available',
        message: 'Firebase AI Logic completed on-device model preparation.',
      })
    } catch (error) {
      setErrorMessage(
        error instanceof AIServiceError
          ? error.details.message
          : 'On-device model preparation failed. Check this browser and device compatibility.',
      )
      const availability = await getDeviceModelAvailability(scenario.language)
      setDeviceAvailability(availability)
    } finally {
      setIsPreparing(false)
    }
  }

  async function runScenario() {
    if (!scenario) return

    setErrorMessage(undefined)
    setResult(undefined)
    setRequestMetadata(undefined)
    setIsRunning(true)
    if (mode !== 'only_on_device' && scenario.kind !== 'policy-check') {
      setCloudStatus('not-tested')
    }

    try {
      const nextResult = await runPlaygroundScenario(
        scenario.id,
        mode,
        cloudConsent,
        (progress) => {
          setDownloadProgress(Math.min(100, Math.max(0, Math.round(progress * 100))))
          setDeviceAvailability({
            status: 'downloading',
            message: 'Firebase AI Logic reports that the on-device model is being prepared.',
          })
        },
      )
      setResult(nextResult)
      setResultId((current) => current + 1)

      if (nextResult.kind !== 'policy-check') {
        setRequestMetadata(nextResult.metadata)
        if (nextResult.metadata.source === 'cloud') {
          setCloudStatus('cloud-reported')
        } else if (nextResult.metadata.source === 'on-device') {
          setDeviceAvailability({
            status: 'available',
            message: 'Firebase AI Logic reported on-device inference for this response.',
          })
        }
      }
      setTokenDiagnostic(getAppCheckTokenDiagnostic())
    } catch (error) {
      if (
        mode !== 'only_on_device' &&
        error instanceof AIServiceError &&
        error.details.requestStarted
      ) {
        setCloudStatus('request-failed')
      }
      setTokenDiagnostic(getAppCheckTokenDiagnostic())
      setErrorMessage(
        error instanceof AIServiceError
          ? error.details.message
          : 'The request failed. Review the diagnostics and try again.',
      )
      if (error instanceof AIServiceError && error.details.metadata) {
        setRequestMetadata(error.details.metadata)
      }
    } finally {
      setIsRunning(false)
      if (mode !== 'only_on_device') setCloudConsent(false)
    }
  }

  const browserNetworkDetail = isOnline
    ? 'Browser reports online; this does not verify Firebase reachability.'
    : 'Browser reports offline; this does not verify local model readiness.'
  const configStatus = firebaseConfigValidation.isValid ? 'Valid' : 'Incomplete'
  const appCheckConfig = appCheck?.configuration === 'available' ? 'Available' : 'Missing'
  const appCheckSdk = appCheck?.sdk ?? 'not-initialized'
  const deviceStatusLabel = deviceAvailability.status.replace('-', ' ')
  const cloudStatusLabel = {
    'not-tested': 'Not tested',
    'cloud-reported': 'Cloud response reported',
    'request-failed': 'No response verified',
  }[cloudStatus]
  const modelLanguage = scenario?.language ?? 'en'
  const isSensitiveScenario = scenario?.classification === 'financial_transactions'

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-7 sm:py-9">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-white">
            <Activity aria-hidden="true" size={23} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-primary">
              CreditBridge AI
            </p>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Financial tools, built with care
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-200">
            <FlaskConical aria-hidden="true" size={15} />
            Development diagnostic
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
            {isOnline ? (
              <Wifi aria-hidden="true" className="text-emerald-700" size={15} />
            ) : (
              <WifiOff aria-hidden="true" className="text-amber-700" size={15} />
            )}
            {isOnline ? 'Browser online' : 'Browser offline'}
          </span>
        </div>
      </header>

      <section className="py-7 sm:py-9">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-secondary">
            Hybrid AI Playground
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text sm:text-4xl">
            Test the AI foundation, with privacy built in.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Run predefined synthetic demonstrations using Firebase AI Logic.
            SDK setup is not proof of cloud connectivity, App Check enforcement,
            or model availability.
          </p>
        </div>
      </section>

      <section aria-labelledby="technical-status-heading">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text" id="technical-status-heading">
              Technical status
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Service status is shown only when verified by an actual SDK result.
            </p>
          </div>
          <button
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={tokenDiagnostic.status === 'not-tested' && tokenDiagnostic.message.includes('Requesting')}
            onClick={() => void verifyAppCheckToken()}
            type="button"
          >
            Verify App Check token
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatusCard
            detail={firebaseApp ? 'Firebase app instance created; backend access is untested.' : 'App is not initialized until required config is present.'}
            icon={Cloud}
            label="Firebase SDK"
            tone={firebaseApp ? 'success' : 'warning'}
            value={firebaseApp ? 'Initialized' : 'Not initialized'}
          />
          <StatusCard
            detail={firebaseConfigValidation.error ?? 'Required Firebase Vite variables are present.'}
            icon={ShieldCheck}
            label="Firebase configuration"
            tone={firebaseConfigValidation.isValid ? 'success' : 'error'}
            value={configStatus}
          />
          <StatusCard
            detail={appCheck?.message ?? 'App Check has not been initialized.'}
            icon={ShieldCheck}
            label="App Check SDK"
            tone={appCheckTone}
            value={`${appCheckConfig} · ${appCheckSdk}`}
          />
          <StatusCard
            detail={tokenDiagnostic.message}
            icon={LockKeyhole}
            label="App Check token"
            tone={tokenTone}
            value={tokenDiagnostic.status.replace('-', ' ')}
          />
          <StatusCard
            detail={browserNetworkDetail}
            icon={isOnline ? Wifi : WifiOff}
            label="Browser network"
            tone={isOnline ? 'success' : 'warning'}
            value={isOnline ? 'Online (browser-reported)' : 'Offline (browser-reported)'}
          />
          <StatusCard
            detail={deviceAvailability.message}
            icon={Cpu}
            label="On-device model"
            tone={deviceTone}
            value={deviceStatusLabel}
          />
          <StatusCard
            detail="This client cannot verify provider activation or App Check enforcement in Firebase Console."
            icon={Cloud}
            label="Last cloud-capable request"
            tone={cloudTone}
            value={cloudStatusLabel}
          />
          <StatusCard
            detail="Enforcement state is not read from the Firebase project by this page."
            icon={ShieldCheck}
            label="App Check enforcement"
            tone="neutral"
            value="Not independently verified"
          />
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Cloud client configured to use Gemini Developer API
          (<code className="rounded bg-slate-100 px-1 py-0.5">GoogleAIBackend</code>).
          Confirm the project provider in Firebase Console before a cloud test;
          this page does not inspect remote provider settings.
        </p>
      </section>

      <section
        aria-labelledby="inference-heading"
        className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]"
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <BrainCircuit aria-hidden="true" className="text-primary" size={20} />
            <h2 className="text-lg font-semibold text-text" id="inference-heading">
              Inference configuration
            </h2>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Synthetic scenario
              <select
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                onChange={(event) => {
                  setScenarioId(event.target.value)
                  setResult(undefined)
                  setErrorMessage(undefined)
                  setCloudConsent(false)
                }}
                value={scenarioId}
              >
                {playgroundScenarios.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              Inference mode
              <select
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                onChange={(event) => {
                  const nextMode = modes.find(
                    (option) => option.value === event.target.value,
                  )?.value
                  if (nextMode) setMode(nextMode)
                  setCloudConsent(false)
                }}
                value={mode}
              >
                {modes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs font-normal text-slate-500">
                {modes.find((option) => option.value === mode)?.description}
              </span>
            </label>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {scenario?.kind === 'transaction' ? 'Synthetic input preview' : 'Prompt preview'}
              </p>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                {isSensitiveScenario ? 'Sensitive · on-device only' : 'Non-sensitive allowlisted'}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {scenario?.prompt ??
                'No prompt will be sent. This runs the local privacy-policy guard only.'}
            </p>
          </div>

          {isSensitiveScenario && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-950">
              This request is always restricted to ONLY_ON_DEVICE. Selecting a
              cloud-capable mode is blocked before the AI SDK is called; cloud
              consent cannot override this rule.
            </p>
          )}

          {mode !== 'only_on_device' && !isSensitiveScenario && (
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
              <input
                checked={cloudConsent}
                className="mt-0.5 size-4 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                onChange={(event) => setCloudConsent(event.target.checked)}
                type="checkbox"
              />
              <span>
                I explicitly authorize this predefined, non-sensitive prompt to
                use cloud inference if the selected mode requires it. No
                personal financial context is included.
              </span>
            </label>
          )}

          {mode !== 'only_on_device' && isSensitiveScenario && (
            <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-600">
              <LockKeyhole aria-hidden="true" className="mt-0.5 shrink-0" size={15} />
              A consent checkbox is intentionally unavailable for sensitive
              requests: user consent does not permit cloud fallback.
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isRunning || isPreparing}
              onClick={() => void runScenario()}
              type="button"
            >
              <Activity aria-hidden="true" size={16} />
              {isRunning
                ? 'Running…'
                : scenario?.kind === 'policy-check'
                  ? 'Run local policy check'
                  : 'Run real inference'}
            </button>
            {scenario?.kind !== 'policy-check' && (
              <button
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={
                  isRunning ||
                  isPreparing ||
                  deviceAvailability.status === 'unsupported' ||
                  deviceAvailability.status === 'unavailable' ||
                  deviceAvailability.status === 'available'
                }
                onClick={() => void prepareDeviceModel()}
                type="button"
              >
                {isPreparing
                  ? 'Preparing local model…'
                  : deviceAvailability.status === 'available'
                    ? 'On-device model ready'
                    : 'Prepare on-device model'}
              </button>
            )}
          </div>

          {downloadProgress !== undefined && (isPreparing || downloadProgress > 0) && (
            <div className="mt-4" aria-live="polite">
              <div className="mb-1 flex justify-between text-xs text-slate-600">
                <span>On-device model preparation</span>
                <span>{downloadProgress}%</span>
              </div>
              <div
                aria-label={`On-device model download ${downloadProgress}%`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={downloadProgress}
                className="h-2 overflow-hidden rounded-full bg-slate-200"
                role="progressbar"
              >
                <div
                  className="h-full rounded-full bg-secondary transition-[width]"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <aside className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <LockKeyhole aria-hidden="true" className="text-primary" size={19} />
            <h2 className="text-base font-semibold text-primary">
              Privacy status
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            {isSensitiveScenario
              ? 'Transaction examples are classified as sensitive and may only run on-device. They are never sent to cloud AI.'
              : mode === 'only_on_device'
                ? 'This request is restricted to on-device inference.'
                : cloudConsent
                  ? 'Cloud consent is enabled for this allowlisted non-sensitive scenario.'
                  : 'Cloud consent is off. Cloud-capable inference will be blocked.'}
          </p>
          <ul className="mt-4 space-y-2 text-xs leading-5 text-slate-600">
            <li className="flex gap-2">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-700" size={15} />
              Only predefined prompts can be run from this playground.
            </li>
            <li className="flex gap-2">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-700" size={15} />
              Prompts and model responses are not written to diagnostic logs.
            </li>
            <li className="flex gap-2">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-700" size={15} />
              App Check token values are never displayed or retained.
            </li>
          </ul>
        </aside>
      </section>

      <section
        aria-label="Private transaction tools"
        className="mt-8 grid gap-5 lg:grid-cols-2"
      >
        <PrivateTransactionEntry
          deviceStatus={deviceStatusLabel}
          disabled={
            isRunning ||
            deviceAvailability.status === 'unsupported' ||
            deviceAvailability.status === 'unavailable'
          }
          isRunning={isRunning}
          onExtract={runPrivateTransactionExtraction}
        />
        <ManualTransactionEntry />
      </section>

      <section aria-labelledby="response-heading" className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <Activity aria-hidden="true" className="text-primary" size={19} />
          <h2 className="text-lg font-semibold text-text" id="response-heading">
            Response and diagnostics
          </h2>
        </div>
        {errorMessage ? (
          <div
            className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-950"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : result?.kind === 'policy-check' ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950" role="status">
            {result.message}
          </div>
        ) : result ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {result.kind === 'text' && (
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
                {result.text}
              </p>
            )}
            {result.kind === 'transactions' && (
              <p className="text-sm leading-6 text-slate-700">
                Structured response validated. Review the editable transactions
                below; none have been saved.
              </p>
            )}
            {result.metadata && (
              <dl className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-4">
                <div>
                  <dt className="text-slate-500">Requested mode</dt>
                  <dd className="mt-1 font-semibold text-slate-800">
                    {result.metadata.requestedMode}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Inference source</dt>
                  <dd className="mt-1 font-semibold text-slate-800">
                    {sourceLabel(result.metadata.source)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Duration</dt>
                  <dd className="mt-1 font-semibold tabular-nums text-slate-800">
                    {result.metadata.durationMs} ms
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Output validation</dt>
                  <dd className="mt-1 font-semibold capitalize text-slate-800">
                    {result.metadata.validation}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
            <FlaskConical aria-hidden="true" className="mx-auto text-slate-400" size={24} />
            <p className="mt-3 text-sm font-semibold text-slate-700">
              No inference has been run
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Choose a scenario and mode. Real requests begin only after you
              activate the run button.
            </p>
          </div>
        )}
      </section>

      {result?.kind === 'transactions' && (
        <div className="mt-6">
          <TransactionReview
            key={resultId}
            transactions={result.transactions}
          />
        </div>
      )}

      {requestMetadata?.validation === 'invalid' && (
        <p className="mt-3 text-sm text-rose-800" role="alert">
          Structured output failed validation. No transaction was saved.
        </p>
      )}

      <footer className="mt-10 border-t border-slate-200 py-5 text-xs leading-5 text-slate-500">
        <p>
          {modelLanguage === 'fr'
            ? 'Les modèles locaux sont dépendants du navigateur et de l’appareil.'
            : 'On-device model availability depends on browser version, hardware, language and model download state.'}
        </p>
        <p className="mt-1">
          Firebase SDK setup does not verify Firebase backend connectivity,
          cloud-provider setup, App Check enforcement, or successful inference.
          No financial records are persisted by this playground.
        </p>
      </footer>
    </main>
  )
}
