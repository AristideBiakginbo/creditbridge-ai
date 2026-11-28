import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent } from 'react'
import { ArrowLeft, BrainCircuit, Camera, FileImage, LoaderCircle, ShieldCheck, X } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth } from '../../app/providers/useAuth'
import { useLanguage } from '../../app/providers/useLanguage'
import { PageHeader } from '../../components/common/PageHeader'
import { PageMeta } from '../../components/common/PageMeta'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { textareaClasses } from '../../components/ui/fields'
import {
  extractPrivateReceipt,
  extractPrivateTransactions,
  getDeviceModelAvailability,
  prepareOnDeviceModel,
  type DeviceModelAvailability,
  type DeviceModelInput,
} from '../../lib/ai'
import { AIServiceError } from '../../lib/ai/errors'
import { creditBridgeDatabase } from '../../lib/db/database'
import {
  AccountTransactionRepository,
  createId,
} from '../../lib/db/transactionRepository'
import type { LocalTransactionInput } from '../../lib/db/schema'
import { findPotentialDuplicates } from '../../lib/finance/transactionDuplicates'
import { normalizeBusinessTimeZone } from '../../lib/time/timezone'
import { TransactionProposalReview } from './TransactionProposalReview'
import {
  createManualTransactionDraft,
  createTransactionDraft,
  validateTransactionDraft,
  type TransactionDraft,
} from './transactionDrafts'

type CaptureMode = 'text' | 'receipt'
type Scope = { ownerId: string | null; businessId: string | null }

const initialAvailability: DeviceModelAvailability = {
  status: 'unknown',
  message: 'Checking on-device model availability.',
}

function availabilityMessage(
  status: DeviceModelAvailability['status'],
  language: 'en' | 'fr',
  inputType: DeviceModelInput,
): string {
  const french = language === 'fr'
  if (status === 'available') {
    return french
      ? 'Le navigateur indique que le modèle sur appareil est disponible.'
      : 'The browser reports that the on-device model is available.'
  }
  if (status === 'downloadable') {
    return french
      ? 'Le modèle nécessite une préparation à la demande. Celle-ci peut nécessiter Internet et du stockage.'
      : 'The model needs user-initiated preparation, which may require internet access and storage.'
  }
  if (status === 'downloading') {
    return french
      ? 'Le navigateur indique que le modèle est en cours de téléchargement.'
      : 'The browser reports that the model is downloading.'
  }
  if (status === 'unavailable' || status === 'unsupported') {
    return inputType === 'image'
      ? french
        ? 'La lecture locale d’images n’est pas disponible. Aucune image ne sera envoyée au cloud ; utilisez la transcription manuelle.'
        : 'Local image reading is unavailable. The image will not be sent to cloud AI; use manual transcription.'
      : french
        ? 'L’extraction sur appareil n’est pas disponible dans ce navigateur ou sur cet appareil.'
        : 'On-device extraction is unavailable in this browser or on this device.'
  }
  return french
    ? 'La disponibilité du modèle n’a pas pu être confirmée. Une tentative restera limitée au mode sur appareil.'
    : 'Model availability could not be confirmed. Any attempt remains restricted to on-device mode.'
}

function captureErrorMessage(error: unknown, language: 'en' | 'fr'): string {
  const french = language === 'fr'
  if (error instanceof AIServiceError) {
    if (error.details.code === 'business-timezone-invalid') {
      return french
        ? 'Le fuseau horaire de l’entreprise est invalide. Corrigez-le dans les paramètres de l’entreprise, puis réessayez. La saisie manuelle reste disponible.'
        : 'The business timezone is invalid. Correct it in business settings, then retry. Manual entry remains available.'
    }
    switch (error.details.category) {
      case 'privacy':
        return french
          ? 'La source sur appareil n’a pas pu être confirmée. Le résultat a été écarté et rien n’a été enregistré.'
          : 'On-device inference could not be confirmed. The result was discarded and nothing was saved.'
      case 'app-check':
        return french
          ? 'La vérification App Check ou l’initialisation du service a échoué. Aucune solution de repli cloud n’a été utilisée.'
          : 'App Check or service initialization failed. No cloud fallback was used.'
      case 'validation':
        return french
          ? 'La réponse n’a pas passé la validation. Vérifiez les informations manuellement.'
          : 'The response did not pass validation. Please review the information manually.'
      case 'model':
        return french
          ? 'Le modèle local n’est pas disponible pour cette demande. Vous pouvez saisir les informations manuellement.'
          : 'The local model is unavailable for this request. You can enter the information manually.'
      default:
        return french
          ? 'L’extraction locale a échoué. Aucun résultat n’a été enregistré.'
          : 'Local extraction failed. No result was saved.'
    }
  }
  if (error instanceof Error && error.message.includes('active account changed')) {
    return french
      ? 'Le compte ou l’entreprise active a changé. Aucun résultat n’a été enregistré.'
      : 'The active account or business changed. No result was saved.'
  }
  return french
    ? 'Une erreur est survenue. Aucun résultat n’a été enregistré.'
    : 'Something went wrong. No result was saved.'
}

async function validateReceiptImage(file: File, language: 'en' | 'fr'): Promise<void> {
  const french = language === 'fr'
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    throw new Error(french
      ? 'Choisissez une image JPEG ou PNG.'
      : 'Choose a JPEG or PNG image.')
  }
  if (file.size === 0 || file.size > 5 * 1024 * 1024) {
    throw new Error(french
      ? 'La taille de l’image doit être comprise entre 1 octet et 5 Mo.'
      : 'The image must be between 1 byte and 5 MB.')
  }
  const header = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  const isPng = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    .every((byte, index) => header[index] === byte)
  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff
  if ((file.type === 'image/png' && !isPng) || (file.type === 'image/jpeg' && !isJpeg)) {
    throw new Error(french
      ? 'Le contenu du fichier ne correspond pas au format annoncé.'
      : 'The file contents do not match the declared image format.')
  }

  const objectUrl = URL.createObjectURL(file)
  let width: number
  let height: number
  try {
    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(file)
        width = bitmap.width
        height = bitmap.height
        bitmap.close()
      } catch {
        const image = new Image()
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve()
          image.onerror = () => reject(new Error(french
            ? 'Le fichier image ne peut pas être décodé.'
            : 'The image file could not be decoded.'))
          image.src = objectUrl
        })
        width = image.naturalWidth
        height = image.naturalHeight
      }
    } else {
      const image = new Image()
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error(french
          ? 'Le fichier image ne peut pas être décodé.'
          : 'The image file could not be decoded.'))
        image.src = objectUrl
      })
      width = image.naturalWidth
      height = image.naturalHeight
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
  if (
    width < 1
    || height < 1
    || width > 6000
    || height > 6000
    || width * height > 12_000_000
  ) {
    throw new Error(french
      ? 'Les dimensions de l’image dépassent la limite autorisée.'
      : 'The image dimensions exceed the supported limit.')
  }
}

export function SmartCapturePage() {
  const { uid, profile } = useAuth()
  const location = useLocation()
  const businessId = profile?.activeBusinessId ?? null
  const scopeRef = useRef<Scope>({ ownerId: uid, businessId })
  const scopeKey = `${uid ?? 'signed-out'}:${businessId ?? 'no-business'}`
  const initialMode: CaptureMode = location.pathname.endsWith('/receipt')
    ? 'receipt'
    : 'text'
  useLayoutEffect(() => {
    scopeRef.current = { ownerId: uid, businessId }
  }, [uid, businessId])
  return <SmartCaptureWorkspace
    initialMode={initialMode}
    key={scopeKey}
    scopeRef={scopeRef}
  />
}

function SmartCaptureWorkspace({
  initialMode,
  scopeRef,
}: {
  initialMode: CaptureMode
  scopeRef: { current: Scope }
}) {
  const { uid, profile } = useAuth()
  const { language } = useLanguage()
  const french = language === 'fr'
  const businessId = profile?.activeBusinessId ?? null
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<CaptureMode>(
    searchParams.get('mode') === 'receipt' || initialMode === 'receipt'
      ? 'receipt'
      : 'text',
  )
  const [sourceText, setSourceText] = useState('')
  const [receiptTranscription, setReceiptTranscription] = useState('')
  const [imageFile, setImageFile] = useState<File>()
  const [previewUrl, setPreviewUrl] = useState('')
  const previewUrlRef = useRef('')
  const [drafts, setDrafts] = useState<TransactionDraft[]>([])
  const [batchId, setBatchId] = useState(createId)
  const [availability, setAvailability] = useState(initialAvailability)
  const [isPreparing, setIsPreparing] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [progress, setProgress] = useState<number>()
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [inferenceVerified, setInferenceVerified] = useState(false)
  const requestId = useRef(0)
  const savingRef = useRef(false)

  const business = useLiveQuery(async () => {
    if (!uid || !businessId) return undefined
    const record = await creditBridgeDatabase.businesses.get(businessId)
    return record?.ownerId === uid
      ? {
          ...record,
          timezone: normalizeBusinessTimeZone(record.timezone, record.country),
        }
      : undefined
  }, [uid, businessId])

  const existingTransactions = useLiveQuery(
    () => uid && businessId
      ? creditBridgeDatabase.transactions
        .where('[ownerId+businessId]')
        .equals([uid, businessId])
        .toArray()
      : [],
    [uid, businessId],
  ) ?? []

  const inputType: DeviceModelInput = mode === 'receipt' ? 'image' : 'text'

  useEffect(() => {
    let active = true
    void getDeviceModelAvailability(language, inputType).then((nextAvailability) => {
      if (active) {
        setAvailability({
          ...nextAvailability,
          message: availabilityMessage(nextAvailability.status, language, inputType),
        })
      }
    })
    return () => {
      active = false
    }
  }, [inputType, language])

  useEffect(() => {
    return () => {
      requestId.current += 1
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  const unsupported = availability.status === 'unsupported'
    || availability.status === 'unavailable'
  const canPrepare = availability.status === 'downloadable'
    || availability.status === 'unknown'

  function updateDraft(id: string, changes: Partial<TransactionDraft>) {
    setDrafts((current) => current.map((draft) =>
      draft.id === id ? { ...draft, ...changes } : draft,
    ))
    setSuccessMessage('')
  }

  function changeMode(nextMode: CaptureMode) {
    setAvailability({
      status: 'unknown',
      message: availabilityMessage('unknown', language, nextMode === 'receipt' ? 'image' : 'text'),
    })
    setMode(nextMode)
    setErrorMessage('')
  }

  function addManualDraft() {
    const currency = business?.ownerId === uid ? business.currency : 'MAD'
    setBatchId(createId())
    setDrafts((current) => [...current, createManualTransactionDraft(currency)])
    setSuccessMessage('')
  }

  async function prepareModel() {
    setErrorMessage('')
    setIsPreparing(true)
    setProgress(0)
    try {
      await prepareOnDeviceModel(
        language,
        (fraction) => setProgress(Math.round(Math.min(1, Math.max(0, fraction)) * 100)),
        inputType,
      )
      setAvailability({
        status: 'available',
        message: availabilityMessage('available', language, inputType),
      })
      setProgress(100)
    } catch (error) {
      setErrorMessage(captureErrorMessage(error, language))
      const currentAvailability = await getDeviceModelAvailability(language, inputType)
      setAvailability({
        ...currentAvailability,
        message: availabilityMessage(currentAvailability.status, language, inputType),
      })
    } finally {
      setIsPreparing(false)
    }
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setErrorMessage('')
    setSuccessMessage('')
    try {
      await validateReceiptImage(file, language)
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = URL.createObjectURL(file)
      setPreviewUrl(previewUrlRef.current)
      setImageFile(file)
    } catch (error) {
      setErrorMessage(error instanceof Error
        ? error.message
        : french ? 'L’image n’est pas valide.' : 'The image is invalid.')
    }
  }

  function removeImage() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = ''
    setPreviewUrl('')
    setImageFile(undefined)
  }

  async function extract(inputText?: string, useReceiptImage = false) {
    const text = inputText ?? sourceText
    const file = useReceiptImage ? imageFile : undefined
    if (!uid || !businessId) {
      setErrorMessage(french
        ? 'Aucun espace professionnel actif.'
        : 'There is no active business workspace.')
      return
    }
    if (file && unsupported) {
      setErrorMessage(french
        ? 'La lecture locale des images n’est pas disponible. Aucune image n’a été envoyée.'
        : 'Local image reading is unavailable. No image was sent.')
      return
    }
    if (!file && !text.trim()) {
      setErrorMessage(french
        ? mode === 'receipt' ? 'Ajoutez une image ou saisissez une transcription.' : 'Saisissez une description à analyser.'
        : mode === 'receipt' ? 'Add an image or enter a transcription.' : 'Enter a description to analyze.')
      return
    }

    const expectedScope = { ownerId: uid, businessId }
    const currentRequestId = ++requestId.current
    setErrorMessage('')
    setSuccessMessage('')
    setDrafts([])
    setInferenceVerified(false)
    setIsExtracting(true)
    setProgress(undefined)
    try {
      const options = {
        businessCurrency: business?.ownerId === uid ? business.currency : undefined,
        timeZone: business?.ownerId === uid ? business.timezone : undefined,
        country: business?.ownerId === uid ? business.country : undefined,
      }
      const response = file
        ? await extractPrivateReceipt(file, language, {
            ...options,
            onDownloadProgress: (fraction) => {
              if (requestId.current === currentRequestId) {
                setProgress(Math.round(Math.min(1, Math.max(0, fraction)) * 100))
              }
            },
          })
        : await extractPrivateTransactions(text, language, (fraction) => {
            if (requestId.current === currentRequestId) {
              setProgress(Math.round(Math.min(1, Math.max(0, fraction)) * 100))
            }
          }, options)

      if (
        requestId.current !== currentRequestId
        || scopeRef.current.ownerId !== expectedScope.ownerId
        || scopeRef.current.businessId !== expectedScope.businessId
      ) return
      if (response.kind !== 'transactions' || response.metadata.source !== 'on-device') {
        throw new Error('Inference source was not verified.')
      }
      if (file && response.transactions.length !== 1) {
        throw new Error('A receipt must produce one transaction.')
      }
      setDrafts(response.transactions.map((transaction) =>
        createTransactionDraft(
          mode === 'receipt'
            ? {
                ...transaction,
                currency: null,
                missingInformation: [
                  ...transaction.missingInformation,
                  french
                    ? 'Confirmez manuellement la devise affichée sur le reçu.'
                    : 'Confirm the currency shown on the receipt manually.',
                ],
              }
            : transaction,
          language,
        ),
      ))
      setBatchId(createId())
      setInferenceVerified(response.metadata.source === 'on-device')
      setAvailability({
        status: 'available',
        message: french
          ? 'Le SDK a signalé un traitement sur appareil pour cette réponse.'
          : 'The SDK reported on-device inference for this response.',
      })
      setSuccessMessage(french
        ? 'Proposition prête. Vérifiez tous les champs avant de confirmer.'
        : 'Proposal ready. Review every field before confirming.')
    } catch (error) {
      if (
        requestId.current === currentRequestId
        && scopeRef.current.ownerId === expectedScope.ownerId
        && scopeRef.current.businessId === expectedScope.businessId
      ) {
        setErrorMessage(captureErrorMessage(error, language))
      }
    } finally {
      if (requestId.current === currentRequestId) setIsExtracting(false)
    }
  }

  function cancelExtraction() {
    requestId.current += 1
    setIsExtracting(false)
    setProgress(undefined)
    setErrorMessage('')
  }

  const preparedProposals = drafts
    .filter((draft) => draft.selected)
    .map((draft) => ({
      id: draft.id,
      result: validateTransactionDraft(draft),
    }))
    .filter((item): item is { id: string; result: ReturnType<typeof validateTransactionDraft> & { input: LocalTransactionInput } } => Boolean(item.result.input))
    .map(({ id, result }) => ({ id, input: result.input }))
  const duplicateIds = uid && businessId
    ? findPotentialDuplicates(preparedProposals, existingTransactions, uid, businessId)
    : new Set<string>()

  async function saveTransactions(inputs: LocalTransactionInput[]) {
    if (savingRef.current || !uid || !businessId) return
    savingRef.current = true
    const expectedScope = { ownerId: uid, businessId }
    const saveRequestId = requestId.current
    setIsSaving(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      if (
        scopeRef.current.ownerId !== expectedScope.ownerId
        || scopeRef.current.businessId !== expectedScope.businessId
        || requestId.current !== saveRequestId
      ) {
        throw new Error('The active account changed before these transactions could be saved.')
      }
      const result = await new AccountTransactionRepository(uid, businessId).createMany(
        inputs,
        batchId,
        () =>
          scopeRef.current.ownerId === expectedScope.ownerId
          && scopeRef.current.businessId === expectedScope.businessId
          && requestId.current === saveRequestId,
      )
      if (
        scopeRef.current.ownerId !== expectedScope.ownerId
        || scopeRef.current.businessId !== expectedScope.businessId
        || requestId.current !== saveRequestId
      ) return
      setDrafts([])
      removeImage()
      setSourceText('')
      setReceiptTranscription('')
      setInferenceVerified(false)
      setSuccessMessage(result.alreadyCommitted
        ? french
          ? 'Cette sélection avait déjà été enregistrée. Aucun doublon n’a été ajouté.'
          : 'This selection was already saved. No duplicate records were added.'
        : french
          ? `${result.records.length} transaction${result.records.length > 1 ? 's' : ''} enregistrée${result.records.length > 1 ? 's' : ''} localement.`
          : `${result.records.length} transaction${result.records.length > 1 ? 's' : ''} saved locally.`)
    } catch (error) {
      if (
        scopeRef.current.ownerId === expectedScope.ownerId
        && scopeRef.current.businessId === expectedScope.businessId
      ) {
        setErrorMessage(captureErrorMessage(error, language))
      }
    } finally {
      if (requestId.current === saveRequestId) {
        savingRef.current = false
        setIsSaving(false)
      }
    }
  }

  return (
    <>
      <PageMeta
        description={french
          ? 'Saisie privée de transactions avec vérification humaine avant stockage local.'
          : 'Private transaction capture with human review before local storage.'}
        title={french ? 'Saisie intelligente' : 'Smart Capture'}
      />
      <PageHeader
        description={french
          ? 'Transformez une note ou un reçu en propositions modifiables. Rien n’est enregistré sans votre confirmation.'
          : 'Turn a note or receipt into editable proposals. Nothing is saved without your confirmation.'}
        eyebrow={french ? 'Traitement local' : 'Local processing'}
        title={french ? 'Saisie intelligente' : 'Smart Capture'}
      >
        <Link className={buttonClasses('outline')} to="/app/transactions">
          <ArrowLeft aria-hidden="true" size={16} />
          {french ? 'Transactions' : 'Transactions'}
        </Link>
      </PageHeader>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)]">
        <Card className="min-w-0 p-4 sm:p-6">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label={french ? 'Mode de saisie' : 'Capture mode'}>
            <button
              aria-selected={mode === 'text'}
              className={`min-h-10 rounded-xl px-4 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${mode === 'text' ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'}`}
              onClick={() => changeMode('text')}
              role="tab"
              type="button"
            >
              <BrainCircuit aria-hidden="true" className="mr-2 inline" size={16} />
              {french ? 'Texte' : 'Text'}
            </button>
            <button
              aria-selected={mode === 'receipt'}
              className={`min-h-10 rounded-xl px-4 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${mode === 'receipt' ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'}`}
              onClick={() => changeMode('receipt')}
              role="tab"
              type="button"
            >
              <FileImage aria-hidden="true" className="mr-2 inline" size={16} />
              {french ? 'Reçu' : 'Receipt'}
            </button>
          </div>

          <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="flex items-start gap-2 text-xs leading-5">
              <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-primary" size={16} />
              <span>
                {french
                  ? 'Les notes financières et les images de reçus utilisent ONLY_ON_DEVICE. La source doit être confirmée par le SDK ; aucun repli cloud n’est permis. Les images ne sont pas conservées.'
                  : 'Financial notes and receipt images use ONLY_ON_DEVICE. The SDK must confirm the source; cloud fallback is not permitted. Images are not stored.'}
              </span>
            </p>
          </div>

          {mode === 'text' ? (
            <label className="mt-5 grid gap-2 text-sm font-semibold">
              {french ? 'Décrivez les transactions' : 'Describe the transactions'}
              <textarea
                className={`${textareaClasses} min-h-36`}
                maxLength={2000}
                onChange={(event) => setSourceText(event.target.value)}
                placeholder={french
                  ? 'Ex. : Ventes de 450 MAD au marché hier, puis transport 30 MAD.'
                  : 'Example: Sold 450 MAD at the market yesterday, then paid 30 MAD for transport.'}
                value={sourceText}
              />
              <span className="text-right text-xs font-normal text-muted-foreground">
                {sourceText.length}/2,000
              </span>
            </label>
          ) : (
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm font-semibold">
                {french ? 'Importer ou prendre une photo du reçu' : 'Upload or capture a receipt'}
                <input
                  accept="image/jpeg,image/png"
                  className="sr-only"
                  onChange={handleImageChange}
                  type="file"
                  capture="environment"
                />
                <span className={`${buttonClasses('outline')} w-fit cursor-pointer`}>
                  <Camera aria-hidden="true" size={16} />
                  {imageFile
                    ? french ? 'Remplacer l’image' : 'Replace image'
                    : french ? 'Choisir une image' : 'Choose image'}
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {french
                    ? 'JPEG ou PNG · 5 Mo maximum · dimensions limitées à 12 mégapixels. L’image reste en mémoire uniquement.'
                    : 'JPEG or PNG · 5 MB maximum · dimensions limited to 12 megapixels. The image remains in memory only.'}
                </span>
              </label>
              {previewUrl && imageFile && (
                <div className="relative w-fit max-w-full rounded-xl border border-border p-2">
                  <img
                    alt={french ? 'Aperçu du reçu, conservé uniquement en mémoire' : 'Receipt preview, kept in memory only'}
                    className="max-h-72 max-w-full rounded-lg object-contain"
                    src={previewUrl}
                  />
                  <button
                    aria-label={french ? 'Retirer l’image' : 'Remove image'}
                    className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-surface shadow"
                    onClick={removeImage}
                    type="button"
                  >
                    <X aria-hidden="true" size={16} />
                  </button>
                </div>
              )}
              {unsupported && (
                <p className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs leading-5 text-muted-foreground">
                  {french
                    ? 'La lecture d’image sur appareil nécessite Chrome sur ordinateur (version 139+) et la fonctionnalité multimodale activée. Aucune image ne sera téléversée. Vous pouvez transcrire manuellement ci-dessous.'
                    : 'On-device image reading requires desktop Chrome (version 139+) with multimodal input enabled. Images will not be uploaded. You can transcribe the receipt manually below.'}
                </p>
              )}
              <label className="grid gap-2 text-sm font-semibold">
                {french ? 'Transcription manuelle (facultative)' : 'Manual transcription (optional)'}
                <textarea
                  className={`${textareaClasses} min-h-28`}
                  maxLength={2000}
                  onChange={(event) => setReceiptTranscription(event.target.value)}
                  placeholder={french
                    ? 'Saisissez le montant total, la date et la devise affichés sur le reçu.'
                    : 'Enter the total, date, and currency shown on the receipt.'}
                  value={receiptTranscription}
                />
              </label>
            </div>
          )}

          {availability.status !== 'unknown' && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone={availability.status === 'available' ? 'success' : unsupported ? 'warning' : 'neutral'}>
                {availability.status.replaceAll('-', ' ')}
              </Badge>
              <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                {availabilityMessage(availability.status, language, inputType)}
              </p>
            </div>
          )}

          {progress !== undefined && (isPreparing || isExtracting) && (
            <div className="mt-4" aria-live="polite">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>{french ? 'Préparation du modèle sur appareil' : 'Preparing on-device model'}</span>
                <span>{progress}%</span>
              </div>
              <progress aria-label={french ? 'Progression du modèle' : 'Model progress'} className="w-full accent-primary" max="100" value={progress} />
            </div>
          )}

          {errorMessage && (
            <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <p className="mt-4 rounded-xl border border-secondary/30 bg-secondary/5 p-3 text-sm text-foreground" role="status">
              {successMessage}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {canPrepare && !isPreparing && !isExtracting && (
              <Button onClick={prepareModel} type="button" variant="outline">
                {french ? 'Préparer le modèle local' : 'Prepare local model'}
              </Button>
            )}
            {isExtracting ? (
              <Button onClick={cancelExtraction} type="button" variant="outline">
                {french ? 'Annuler' : 'Cancel'}
              </Button>
            ) : (
              <Button
                disabled={
                  isPreparing
                  || (mode === 'receipt'
                    && (unsupported ? !receiptTranscription.trim() : !imageFile && !receiptTranscription.trim()))
                }
                onClick={() => {
                  if (mode === 'receipt' && imageFile && !unsupported) {
                    void extract(undefined, true)
                  } else {
                    void extract(mode === 'receipt' ? receiptTranscription : undefined)
                  }
                }}
                type="button"
              >
                {isPreparing
                  ? french ? 'Préparation…' : 'Preparing…'
                  : french ? 'Analyser sur cet appareil' : 'Analyze on this device'}
              </Button>
            )}
            <Link className={buttonClasses('outline')} to="/app/transactions/new">
              {french ? 'Saisie manuelle' : 'Manual entry'}
            </Link>
          </div>
          {(isPreparing || isExtracting) && (
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
              <LoaderCircle aria-hidden="true" className="animate-spin" size={14} />
              {isPreparing
                ? french ? 'Préparation du modèle…' : 'Preparing the model…'
                : french ? 'Analyse locale en cours…' : 'Local analysis in progress…'}
            </p>
          )}
        </Card>

        <div className="grid min-w-0 gap-4">
          {inferenceVerified && (
            <Card className="flex items-center gap-3 p-4">
              <ShieldCheck aria-hidden="true" className="shrink-0 text-primary" size={20} />
              <div>
                <p className="text-sm font-bold">
                  {french ? 'Source déclarée par le SDK : sur appareil' : 'SDK-reported source: on-device'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {french ? 'Les propositions ne sont pas encore enregistrées.' : 'The proposals have not been saved yet.'}
                </p>
              </div>
            </Card>
          )}
          <TransactionProposalReview
            drafts={drafts}
            duplicateIds={duplicateIds}
            language={language}
            onAddManual={addManualDraft}
            onChange={updateDraft}
            onRemove={(id) => setDrafts((current) => current.filter((draft) => draft.id !== id))}
            onSave={(inputs) => void saveTransactions(inputs)}
            saving={isSaving}
          />
        </div>
      </div>
    </>
  )
}
