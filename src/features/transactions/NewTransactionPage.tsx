import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  BrainCircuit,
  CircleAlert,
  Download,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useDemoData } from '../../app/providers/useDemoData'
import { useLanguage } from '../../app/providers/useLanguage'
import { PageHeader } from '../../components/common/PageHeader'
import { PageMeta } from '../../components/common/PageMeta'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { Card } from '../../components/ui/Card'
import { textareaClasses } from '../../components/ui/fields'
import type { DemoTransactionInput } from '../../demo/repository'
import {
  extractPrivateTransactions,
  getDeviceModelAvailability,
  prepareOnDeviceModel,
  type DeviceModelAvailability,
} from '../../lib/ai'
import { AIServiceError } from '../../lib/ai/errors'
import type { ExtractedTransaction } from '../../lib/ai/schemas'
import { TransactionReview } from '../ai-playground/TransactionReview'
import { TransactionForm } from './TransactionForm'

export function NewTransactionPage() {
  const { createTransaction, createTransactions } = useDemoData()
  const { language } = useLanguage()
  const navigate = useNavigate()
  const french = language === 'fr'
  const [sourceText, setSourceText] = useState('')
  const [availability, setAvailability] = useState<DeviceModelAvailability>({
    status: 'unknown',
    message: french ? 'Vérification de la disponibilité du modèle…' : 'Checking device model availability…',
  })
  const [availabilityVersion, setAvailabilityVersion] = useState(0)
  const [isPreparing, setIsPreparing] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [progress, setProgress] = useState<number>()
  const [result, setResult] = useState<ExtractedTransaction[]>()
  const [resultId, setResultId] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true
    void getDeviceModelAvailability(language).then((nextAvailability) => {
      if (active) setAvailability(nextAvailability)
    })
    return () => {
      active = false
    }
  }, [language, availabilityVersion])

  const deviceUnavailable = availability.status === 'unsupported'
    || availability.status === 'unavailable'
  const canPrepare = availability.status === 'downloadable'
    || availability.status === 'unknown'

  function onProgress(fraction: number) {
    const percent = Math.min(100, Math.max(0, Math.round(fraction * 100)))
    setProgress(percent)
    setAvailability({
      status: 'downloading',
      message: french ? 'Le modèle sur appareil est en cours de préparation.' : 'The on-device model is being prepared.',
    })
  }

  async function prepareModel() {
    setErrorMessage('')
    setIsPreparing(true)
    setProgress(0)
    try {
      await prepareOnDeviceModel(language, onProgress)
      setProgress(100)
      setAvailability({
        status: 'available',
        message: french ? 'Le SDK a terminé la préparation du modèle sur appareil.' : 'The SDK completed on-device model preparation.',
      })
    } catch (error) {
      setErrorMessage(error instanceof AIServiceError
        ? error.details.message
        : (french ? 'La préparation du modèle a échoué.' : 'Model preparation failed.'))
      setAvailabilityVersion((current) => current + 1)
    } finally {
      setIsPreparing(false)
    }
  }

  async function extractTransactions() {
    if (!sourceText.trim()) {
      setErrorMessage(french ? 'Saisissez une description à analyser.' : 'Enter a description to analyze.')
      return
    }
    setErrorMessage('')
    setResult(undefined)
    setIsExtracting(true)
    setProgress(undefined)
    try {
      const response = await extractPrivateTransactions(sourceText, language, onProgress)
      if (response.kind !== 'transactions' || response.metadata.source !== 'on-device') {
        throw new Error(french
          ? 'La réponse n’a pas été vérifiée comme provenant du traitement sur appareil.'
          : 'The response was not verified as on-device inference.')
      }
      setResult(response.transactions)
      setResultId((current) => current + 1)
      setAvailability({
        status: 'available',
        message: french
          ? 'Le SDK a signalé un traitement sur appareil pour cette réponse.'
          : 'The SDK reported on-device inference for this response.',
      })
    } catch (error) {
      setErrorMessage(error instanceof AIServiceError
        ? error.details.message
        : error instanceof Error
          ? error.message
          : (french ? 'L’extraction sur appareil a échoué.' : 'On-device extraction failed.'))
      setAvailabilityVersion((current) => current + 1)
    } finally {
      setIsExtracting(false)
    }
  }

  function addReviewedTransactions(transactions: ExtractedTransaction[]): string | null {
    const inputs: DemoTransactionInput[] = []
    for (const transaction of transactions) {
      if (!transaction.date) {
        return french
          ? 'Ajoutez une date à chaque transaction avant de continuer.'
          : 'Add a date to every transaction before continuing.'
      }
      if (transaction.currency !== 'MAD') {
        return french
          ? 'L’espace de démonstration accepte uniquement MAD. Aucune conversion de devise n’est effectuée.'
          : 'The demonstration workspace accepts MAD only. No currency conversion is performed.'
      }
      inputs.push({
        date: transaction.date,
        type: transaction.type,
        description: transaction.description,
        category: transaction.category,
        amount: transaction.amount,
        currency: transaction.currency,
      })
    }
    try {
      createTransactions(inputs)
      return null
    } catch (error) {
      return error instanceof Error
        ? error.message
        : (french ? 'Les transactions n’ont pas pu être ajoutées.' : 'The transactions could not be added.')
    }
  }

  function addManualTransaction(input: DemoTransactionInput) {
    createTransaction(input)
    navigate('/app/transactions')
  }

  return (
    <>
      <PageMeta
        description={french ? 'Ajoutez un enregistrement synthétique ou essayez une extraction privée sur appareil.' : 'Add a synthetic record or try private on-device extraction.'}
        title={french ? 'Nouvelle transaction' : 'New transaction'}
      />
      <PageHeader
        description={french ? 'Ajoutez des données synthétiques à cet espace local de démonstration.' : 'Add synthetic records to this local demonstration workspace.'}
        eyebrow={french ? 'Données synthétiques uniquement' : 'Synthetic data only'}
        title={french ? 'Nouvelle transaction' : 'New transaction'}
      >
        <Link className={buttonClasses('outline')} to="/app/transactions">
          <ArrowLeft aria-hidden="true" size={16} /> {french ? 'Retour aux transactions' : 'Back to transactions'}
        </Link>
      </PageHeader>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="font-display text-lg font-extrabold text-foreground">{french ? 'Saisie manuelle' : 'Manual entry'}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {french ? 'Cette transaction de démonstration reste dans le stockage local du navigateur.' : 'This demonstration transaction stays in browser-local storage.'}
            </p>
          </div>
          <TransactionForm onSubmit={addManualTransaction} />
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <BrainCircuit aria-hidden="true" size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-lg font-extrabold text-foreground">{french ? 'Extraction IA sur appareil' : 'On-device AI extraction'}</h2>
                <Badge tone={availability.status === 'available' ? 'success' : deviceUnavailable ? 'warning' : 'neutral'}>
                  {availability.status.replaceAll('-', ' ')}
                </Badge>
              </div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{availability.message}</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="flex items-start gap-2 text-xs leading-5 text-foreground">
              <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-primary" size={16} />
              <span>
                {french
                  ? 'Les textes saisis pour cette fonction utilisent uniquement le mode ONLY_ON_DEVICE. Aucun basculement cloud n’est autorisé. Vérifiez la source d’inférence déclarée avant de confirmer.'
                  : 'Text entered here uses ONLY_ON_DEVICE mode. Cloud fallback is not permitted. Review the reported inference source before confirming.'}
              </span>
            </p>
          </div>

          {canPrepare && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
              <p className="text-xs leading-5 text-muted-foreground">
                {french ? 'Le modèle peut nécessiter un téléchargement initial.' : 'The model may need an initial download.'}
              </p>
              <Button disabled={isPreparing || isExtracting} onClick={() => void prepareModel()} variant="outline">
                {isPreparing ? <LoaderCircle aria-hidden="true" className="animate-spin" size={15} /> : <Download aria-hidden="true" size={15} />}
                {isPreparing ? (french ? 'Préparation…' : 'Preparing…') : (french ? 'Préparer le modèle' : 'Prepare model')}
              </Button>
            </div>
          )}

          <label className="mt-5 grid gap-2 text-xs font-semibold text-foreground">
            {french ? 'Décrivez des transactions fictives' : 'Describe fictional transactions'}
            <textarea
              className={textareaClasses}
              maxLength={2000}
              onChange={(event) => { setSourceText(event.target.value); setErrorMessage('') }}
              placeholder={french ? 'Ex. Vente fictive de 250 MAD au marché, hier.' : 'E.g. Fictional sale of 250 MAD at the market yesterday.'}
              value={sourceText}
            />
            <span className="text-right font-normal text-muted-foreground">{sourceText.length}/2000</span>
          </label>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {french ? 'Aucun texte n’est ajouté aux données démo sans votre confirmation.' : 'No text is added to demo records until you confirm.'}
            </p>
            <Button
              disabled={deviceUnavailable || isExtracting || isPreparing || sourceText.trim().length === 0}
              onClick={() => void extractTransactions()}
            >
              {isExtracting ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <BrainCircuit aria-hidden="true" size={16} />}
              {isExtracting ? (french ? 'Analyse sur appareil…' : 'Analyzing on device…') : (french ? 'Analyser sur appareil' : 'Extract on device')}
            </Button>
          </div>

          {progress !== undefined && (
            <div className="mt-4" aria-live="polite">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{french ? 'Préparation du modèle' : 'Model preparation'}</span><span>{progress}%</span>
              </div>
              <div aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress} className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar">
                <div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {deviceUnavailable && (
            <p className="mt-4 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs leading-5 text-foreground">
              <CircleAlert aria-hidden="true" className="mt-0.5 shrink-0 text-warning" size={15} />
              {french ? 'Cette combinaison navigateur/appareil ne signale pas de modèle compatible. Utilisez la saisie manuelle.' : 'This browser/device does not report a compatible model. Use manual entry instead.'}
            </p>
          )}
          {errorMessage && (
            <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          )}
          {availability.status === 'unknown' && (
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <LoaderCircle aria-hidden="true" className="animate-spin" size={14} />
              {french ? 'Vérification de la disponibilité…' : 'Checking device availability…'}
            </p>
          )}
        </Card>
      </div>

      {result && result.length > 0 && (
        <div className="mt-5">
          <TransactionReview
            key={resultId}
            onConfirm={addReviewedTransactions}
            saveToDemo
            transactions={result}
          />
        </div>
      )}
    </>
  )
}
