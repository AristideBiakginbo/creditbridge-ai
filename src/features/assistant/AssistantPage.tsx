import { useState } from 'react'
import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowRight, Bot, Cloud, Cpu, LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../app/providers/useLanguage'
import { PageHeader } from '../../components/common/PageHeader'
import { PageMeta } from '../../components/common/PageMeta'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { playgroundScenarios } from '../../lib/ai/scenarios'
import { runPlaygroundScenario } from '../../lib/ai/hybridAI'
import { AIServiceError } from '../../lib/ai/errors'
import type { InferenceMode, InferenceMetadata, PlaygroundResult } from '../../lib/ai/types'

export function AssistantPage() {
  const { language, t } = useLanguage()
  const french = language === 'fr'
  const [scenarioId, setScenarioId] = useState<string>(
    french ? 'cloud-education-fr' : 'cloud-education',
  )
  const [mode, setMode] = useState<InferenceMode>('only_on_device')
  const [cloudConsent, setCloudConsent] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<PlaygroundResult>()
  const [resultLanguage, setResultLanguage] = useState(language)
  const [errorMessage, setErrorMessage] = useState('')

  const scenarios = playgroundScenarios.filter((scenario) =>
    scenario.kind === 'education' && scenario.language === language,
  )
  const activeScenario = scenarios.find((scenario) => scenario.id === scenarioId) ?? scenarios[0]
  const mayUseCloud = mode === 'only_in_cloud'
  const resultMetadata: InferenceMetadata | undefined =
    resultLanguage === language && result && result.kind === 'text'
      ? result.metadata
      : undefined

  function chooseScenario(id: string) {
    setScenarioId(id)
    setCloudConsent(false)
    setResult(undefined)
    setErrorMessage('')
  }

  function chooseMode(nextMode: InferenceMode) {
    setMode(nextMode)
    setCloudConsent(false)
    setResult(undefined)
    setErrorMessage('')
  }

  async function ask() {
    if (!activeScenario) {
      setErrorMessage(french ? 'Aucune question prédéfinie n’est disponible.' : 'No predefined question is available.')
      return
    }
    if (mayUseCloud && !cloudConsent) {
      setErrorMessage(french
        ? 'Confirmez votre consentement cloud pour cette requête.'
        : 'Confirm cloud consent for this request.')
      return
    }
    setErrorMessage('')
    setResult(undefined)
    setIsRunning(true)
    const requestConsent = mayUseCloud && cloudConsent
    setCloudConsent(false)
    try {
      const response = await runPlaygroundScenario(
        activeScenario.id,
        mode,
        requestConsent,
      )
      if (response.kind !== 'text') {
        throw new Error(french
          ? 'La réponse ne correspond pas à une question éducative.'
          : 'The response did not match a financial education question.')
      }
      setResult(response)
      setResultLanguage(language)
    } catch (error) {
      setErrorMessage(error instanceof AIServiceError
        ? error.details.message
        : error instanceof Error
          ? error.message
          : (french ? 'La requête éducative a échoué.' : 'The education request failed.'))
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <>
      <PageMeta
        description={french ? 'Questions éducatives prédéfinies avec des contrôles d’inférence visibles.' : 'Predefined financial education questions with visible inference controls.'}
        title={t('nav.assistant')}
      />
      <PageHeader
        description={french ? 'Explorez des conseils financiers généraux. Aucun dossier personnel ni texte libre n’est envoyé.' : 'Explore general financial education. No personal records or free-text prompts are sent.'}
        eyebrow={french ? 'Éducation financière · aperçu' : 'Financial education · preview'}
        title={t('nav.assistant')}
      >
        <Badge tone="primary"><ShieldCheck aria-hidden="true" size={14} /> {french ? 'Questions prédéfinies' : 'Predefined prompts'}</Badge>
      </PageHeader>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Bot aria-hidden="true" size={20} />
            </span>
            <div>
              <h2 className="font-display text-lg font-extrabold text-foreground">{french ? 'Choisissez une question' : 'Choose a question'}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {french ? 'Les exemples sont généraux et ne demandent aucune information sur votre entreprise.' : 'These are general examples and do not ask for details about your business.'}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-2">
            {scenarios.map((scenario) => {
              const selected = scenario.id === activeScenario?.id
              return (
                <button
                  aria-pressed={selected}
                  className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${selected ? 'border-primary/40 bg-primary/5' : 'border-border bg-surface hover:bg-muted/40'}`}
                  key={scenario.id}
                  onClick={() => chooseScenario(scenario.id)}
                  type="button"
                >
                  <span className="block text-sm font-bold text-foreground">{scenario.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">{scenario.description}</span>
                  <span className="mt-2 block text-xs leading-5 text-foreground">{scenario.prompt}</span>
                </button>
              )
            })}
          </div>

          <fieldset className="mt-5">
            <legend className="text-xs font-bold text-foreground">{french ? 'Mode de traitement' : 'Inference mode'}</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <ModeChoice
                description={french ? 'Aucune requête cloud ni repli.' : 'No cloud request or fallback.'}
                icon={<Cpu aria-hidden="true" size={17} />}
                label={french ? 'Sur appareil uniquement' : 'On-device only'}
                onClick={() => chooseMode('only_on_device')}
                selected={mode === 'only_on_device'}
              />
              <ModeChoice
                description={french ? 'Envoi cloud pour cette requête uniquement.' : 'Cloud request for this question only.'}
                icon={<Cloud aria-hidden="true" size={17} />}
                label={french ? 'Cloud uniquement' : 'Cloud only'}
                onClick={() => chooseMode('only_in_cloud')}
                selected={mode === 'only_in_cloud'}
              />
            </div>
          </fieldset>

          {mayUseCloud && (
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
              <input
                checked={cloudConsent}
                className="mt-0.5 size-4 accent-primary"
                onChange={(event) => { setCloudConsent(event.target.checked); setErrorMessage('') }}
                type="checkbox"
              />
              <span>
                <span className="block text-sm font-bold text-foreground">
                  {french ? 'J’accepte l’envoi de cette question prédéfinie au service IA cloud.' : 'I consent to sending this predefined question to the cloud AI service.'}
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {french ? 'Ce choix s’applique à une seule requête et n’est pas enregistré.' : 'This applies to one request only and is not saved.'}
                </span>
              </span>
            </label>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <LockKeyhole aria-hidden="true" size={14} />
              {french ? 'Aucun champ de saisie libre · aucun historique conservé' : 'No free-text input · no history retained'}
            </p>
            <Button disabled={isRunning || !activeScenario || (mayUseCloud && !cloudConsent)} onClick={() => void ask()}>
              {isRunning && <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />}
              {isRunning ? (french ? 'Traitement…' : 'Working…') : (french ? 'Poser la question' : 'Ask question')}
            </Button>
          </div>
          {errorMessage && (
            <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          )}
        </Card>

        <Card className="min-h-72 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h2 className="text-sm font-bold text-foreground">{french ? 'Réponse' : 'Response'}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{french ? 'Résultat réel du service, si la requête aboutit.' : 'Actual service result, if the request succeeds.'}</p>
            </div>
            {resultMetadata && (
              <Badge tone={resultMetadata.source === 'cloud' ? 'warning' : 'primary'}>
                {resultMetadata.source === 'on-device'
                  ? (french ? 'Appareil · SDK' : 'On-device · SDK')
                  : resultMetadata.source === 'cloud'
                    ? (french ? 'Cloud · SDK' : 'Cloud · SDK')
                    : (french ? 'Source inconnue' : 'Source unknown')}
              </Badge>
            )}
          </div>
          {!resultMetadata && !isRunning && (
            <div className="grid min-h-52 place-items-center px-4 text-center">
              <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                {french ? 'Choisissez un exemple pour voir une réponse ici. Aucune réponse fictive n’est affichée.' : 'Choose a prompt to see a response here. No sample AI response is fabricated.'}
              </p>
            </div>
          )}
          {isRunning && (
            <div className="grid min-h-52 place-items-center text-center">
              <div>
                <LoaderCircle aria-hidden="true" className="mx-auto animate-spin text-primary" size={24} />
                <p className="mt-3 text-sm text-muted-foreground">{french ? 'En attente du service IA…' : 'Waiting for the AI service…'}</p>
              </div>
            </div>
          )}
          {resultMetadata && result?.kind === 'text' && (
            <article className="prose prose-sm mt-4 max-w-none text-foreground dark:prose-invert prose-headings:font-display prose-a:text-primary prose-li:marker:text-secondary">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.text}</ReactMarkdown>
            </article>
          )}
          {resultMetadata && (
            <p className="mt-5 border-t border-border pt-3 text-xs text-muted-foreground">
              {french ? 'Source signalée par le SDK · durée' : 'SDK-reported source · duration'}: {resultMetadata.durationMs} ms
            </p>
          )}
        </Card>
      </div>

      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        {french
          ? 'Les réponses sont fournies à titre éducatif et ne constituent pas un conseil financier, juridique ou de crédit.'
          : 'Responses are for education and are not financial, legal, or credit advice.'}
        {' '}
        <Link className="font-semibold text-primary hover:underline" to="/privacy">
          {french ? 'En savoir plus sur la confidentialité' : 'Read about privacy'}
          <ArrowRight aria-hidden="true" className="ml-1 inline" size={12} />
        </Link>
      </p>
    </>
  )
}

function ModeChoice({
  description,
  icon,
  label,
  onClick,
  selected,
}: {
  description: string
  icon: ReactNode
  label: string
  onClick: () => void
  selected: boolean
}) {
  return (
    <button
      aria-pressed={selected}
      className={`flex min-h-16 items-start gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${selected ? 'border-primary/40 bg-primary/5' : 'border-border bg-surface hover:bg-muted/40'}`}
      onClick={onClick}
      type="button"
    >
      <span className={`mt-0.5 ${selected ? 'text-primary' : 'text-muted-foreground'}`}>{icon}</span>
      <span>
        <span className="block text-xs font-bold text-foreground">{label}</span>
        <span className="mt-1 block text-[0.68rem] leading-4 text-muted-foreground">{description}</span>
      </span>
    </button>
  )
}
