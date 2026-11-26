import { useEffect, useState } from 'react'
import {
  Activity,
  BrainCircuit,
  CircleCheck,
  CircleX,
  Cloud,
  ShieldCheck,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { firebaseApp, firebaseConfigValidation } from './lib/firebase'

function App() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const updateNetworkStatus = () => setIsOnline(navigator.onLine)

    window.addEventListener('online', updateNetworkStatus)
    window.addEventListener('offline', updateNetworkStatus)

    return () => {
      window.removeEventListener('online', updateNetworkStatus)
      window.removeEventListener('offline', updateNetworkStatus)
    }
  }, [])

  const checks = [
    {
      title: 'Firebase SDK',
      detail: firebaseApp
        ? 'Firebase app initialized in this browser'
        : 'Waiting for valid Firebase configuration',
      ready: firebaseApp !== null,
      icon: Cloud,
    },
    {
      title: 'Configuration',
      detail: firebaseConfigValidation.isValid
        ? 'Required environment variables are present'
        : 'One or more required environment variables are missing',
      ready: firebaseConfigValidation.isValid,
      icon: ShieldCheck,
    },
    {
      title: 'Browser network',
      detail: isOnline
        ? 'Browser reports an online network connection'
        : 'Browser reports that this device is offline',
      ready: isOnline,
      icon: isOnline ? Wifi : WifiOff,
    },
    {
      title: 'Hybrid AI',
      detail: 'Not tested — no AI requests have been made',
      ready: false,
      icon: BrainCircuit,
    },
  ]

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8 sm:py-12">
      <header className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-white shadow-sm">
          <Activity aria-hidden="true" size={23} strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-lg font-bold tracking-tight text-primary">
            CreditBridge AI
          </p>
          <p className="text-xs font-medium tracking-wide text-slate-500">
            FINANCIAL TOOLS, BUILT WITH CARE
          </p>
        </div>
      </header>

      <section className="my-auto py-12">
        <div className="mb-8 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-primary ring-1 ring-emerald-100">
            <span className="size-2 rounded-full bg-accent" />
            Phase 1 · Technical foundation
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-text sm:text-5xl">
            Your foundation is <span className="text-secondary">taking shape.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            A quick local status check for the building blocks of CreditBridge
            AI. This page does not test Firebase backend access or AI inference.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {checks.map(({ title, detail, ready, icon: Icon }) => (
            <article
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              key={title}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-primary">
                  <Icon aria-hidden="true" size={20} />
                </div>
                {title === 'Hybrid AI' ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    Not tested
                  </span>
                ) : ready ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-primary">
                    <CircleCheck aria-hidden="true" size={14} />
                    Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                    <CircleX aria-hidden="true" size={14} />
                    Needs attention
                  </span>
                )}
              </div>
              <h2 className="mt-5 text-base font-semibold text-text">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
            </article>
          ))}
        </div>

        {!firebaseConfigValidation.isValid && (
          <p
            className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            role="status"
          >
            {firebaseConfigValidation.error}
          </p>
        )}

        <aside className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
          <div className="flex gap-3">
            <ShieldCheck
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-primary"
              size={19}
            />
            <div>
              <h2 className="text-sm font-semibold text-primary">
                Privacy-first by design
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                No financial data is collected or sent from this status page.
                Firebase initialization only prepares the client SDK; it does
                not confirm a connection to Firebase services.
              </p>
            </div>
          </div>
        </aside>
      </section>

      <footer className="border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500">
        Offline-aware · Consent-led cloud features · No automated credit
        decisions
      </footer>
    </main>
  )
}

export default App
