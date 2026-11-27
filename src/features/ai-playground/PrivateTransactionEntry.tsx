import { useState, type FormEvent } from 'react'
import { LockKeyhole } from 'lucide-react'

interface PrivateTransactionEntryProps {
  disabled: boolean
  deviceStatus: string
  isRunning: boolean
  onExtract: (sourceText: string, language: 'en' | 'fr') => Promise<boolean>
}

export function PrivateTransactionEntry({
  disabled,
  deviceStatus,
  isRunning,
  onExtract,
}: PrivateTransactionEntryProps) {
  const [sourceText, setSourceText] = useState('')
  const [language, setLanguage] = useState<'en' | 'fr'>('en')
  const [inputError, setInputError] = useState<string>()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!sourceText.trim() || sourceText.length > 2000) {
      setInputError('Enter between 1 and 2,000 characters.')
      return
    }

    setInputError(undefined)
    const succeeded = await onExtract(sourceText, language)
    if (succeeded) setSourceText('')
  }

  return (
    <section
      aria-labelledby="private-extraction-heading"
      className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex items-center gap-2">
        <LockKeyhole aria-hidden="true" className="text-primary" size={19} />
        <h2 className="text-lg font-semibold text-text" id="private-extraction-heading">
          Private transaction extraction
        </h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        This path always uses ONLY_ON_DEVICE. The text is sent only to the
        browser&apos;s local model through Firebase AI Logic; cloud fallback and
        cloud consent are not available. Nothing is saved.
      </p>

      <form className="mt-4 space-y-3" onSubmit={(event) => void submit(event)}>
        <label className="block text-sm font-medium text-slate-700">
          Transaction notes
          <textarea
            autoComplete="off"
            className="mt-1 block min-h-28 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            maxLength={2000}
            onChange={(event) => setSourceText(event.target.value)}
            placeholder="Describe one or more income or expense transactions"
            value={sourceText}
          />
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium text-slate-700">
            Language
            <select
              className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
              onChange={(event) =>
                setLanguage(event.target.value === 'fr' ? 'fr' : 'en')
              }
              value={language}
            >
              <option value="en">English</option>
              <option value="fr">French</option>
            </select>
          </label>
          <button
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled || !sourceText.trim()}
            type="submit"
          >
            {isRunning ? 'Extracting…' : 'Extract on this device'}
          </button>
          <span className="text-xs text-slate-500">
            On-device status: {deviceStatus}
          </span>
        </div>
        {inputError && (
          <p className="text-sm text-rose-800" role="alert">
            {inputError}
          </p>
        )}
      </form>
    </section>
  )
}
