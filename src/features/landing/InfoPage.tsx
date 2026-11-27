import { ArrowRight, CircleHelp, LockKeyhole, Sparkles } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useLanguage } from '../../app/providers/useLanguage'
import { PageHeader } from '../../components/common/PageHeader'
import { PageMeta } from '../../components/common/PageMeta'
import { Badge } from '../../components/ui/Badge'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { Card } from '../../components/ui/Card'

const englishContent = {
  features: {
    title: 'Useful tools for everyday business',
    description: 'A practical product foundation for recording activity, seeing patterns and preparing financial documentation.',
    sections: [
      ['Smart transaction capture', 'An existing Firebase AI Logic service can structure short notes on-device. Review is required; the preview does not save until explicitly added to the synthetic demo workspace.'],
      ['Financial overview', 'The interactive dashboard calculates income, expenses and cash-flow summaries from a single labeled synthetic dataset.'],
      ['Financial Passport', 'A planned user-generated document concept. It is not a certified bank statement, credit score or creditworthiness report.'],
      ['Financial education', 'A user-facing assistant starts only from predefined, non-sensitive education prompts. Cloud-capable requests require fresh consent.'],
    ],
  },
  'how-it-works': {
    title: 'A clear process, with you in control',
    description: 'CreditBridge AI is being built around practical records and transparent choices—not automated financial decisions.',
    sections: [
      ['Record business activity', 'Enter a demonstration record manually or try private extraction when a supported local model is available.'],
      ['Review every detail', 'Check amounts, dates and currency before any reviewed transaction is added to the local demonstration workspace.'],
      ['Understand the overview', 'Dashboard values are calculated from the same synthetic demo records and are not accounting or lending advice.'],
      ['Prepare documentation', 'The Financial Passport is a future concept for portable user-generated documentation.'],
    ],
  },
  privacy: {
    title: 'Privacy choices are part of the product',
    description: 'The current prototype demonstrates explicit inference boundaries and does not connect real account storage.',
    sections: [
      ['Sensitive transaction extraction', 'The service pins financial transaction input to ONLY_ON_DEVICE and discards results if Firebase AI Logic does not report on-device inference. There is no cloud fallback.'],
      ['Cloud education', 'Only predefined, non-sensitive prompts may use cloud-capable inference. Consent is requested for the current request and is not retained.'],
      ['App Check', 'The client initializes Firebase App Check. A successful SDK initialization or token does not prove that enforcement is enabled in the Firebase project.'],
      ['Demo records', 'Demonstration transactions are synthetic and kept in a dedicated browser-local repository. They are not written to Firestore or synced.'],
    ],
  },
  about: {
    title: 'Financial clarity, designed for small business',
    description: 'CreditBridge AI is an independent prototype exploring practical financial tools and privacy-aware Hybrid AI.',
    sections: [
      ['Who it is for', 'Microentrepreneurs, small business owners, informal merchants and independent workers—especially those working with intermittent connectivity.'],
      ['What it does not do', 'It does not issue loans, approve applications, rank creditworthiness or guarantee access to financing.'],
      ['Technology', 'The prototype uses React, TypeScript, Firebase AI Logic and App Check. On-device model availability depends on the browser and device.'],
      ['Project disclosure', 'An independent project prepared for the Google Firebase #BuildHybridAI hackathon. It is not endorsed by Google.'],
    ],
  },
} as const

const frenchContent = {
  features: {
    title: 'Des outils utiles au quotidien',
    description: 'Une base pratique pour enregistrer l’activité, observer les tendances et préparer des documents financiers.',
    sections: [
      ['Saisie intelligente', 'Un service Firebase AI Logic peut structurer de courtes notes sur l’appareil. Une vérification humaine est requise et rien n’est enregistré avant confirmation dans la démo.'],
      ['Aperçu financier', 'Le tableau de bord calcule revenus, dépenses et flux de trésorerie à partir d’un seul jeu synthétique clairement signalé.'],
      ['Passeport financier', 'Un concept futur de document généré par l’utilisateur. Ce n’est ni un relevé bancaire certifié, ni un score de crédit.'],
      ['Éducation financière', 'L’assistant commence avec des questions éducatives prédéfinies et non sensibles. Les requêtes cloud nécessitent un consentement distinct.'],
    ],
  },
  'how-it-works': {
    title: 'Un parcours clair, sous votre contrôle',
    description: 'CreditBridge AI privilégie les registres pratiques et les choix transparents, sans décision financière automatisée.',
    sections: [
      ['Enregistrer l’activité', 'Saisissez une entrée de démonstration ou essayez l’extraction privée si un modèle local compatible est disponible.'],
      ['Vérifier chaque détail', 'Contrôlez montants, dates et devises avant d’ajouter une transaction à l’espace de démonstration local.'],
      ['Comprendre l’aperçu', 'Les valeurs sont calculées à partir des mêmes données synthétiques et ne constituent pas un conseil comptable ou financier.'],
      ['Préparer des documents', 'Le passeport financier est un concept futur de documentation portable générée par l’utilisateur.'],
    ],
  },
  privacy: {
    title: 'La confidentialité fait partie du produit',
    description: 'Le prototype démontre des limites d’inférence explicites et ne connecte pas de stockage de compte réel.',
    sections: [
      ['Transactions sensibles', 'L’extraction financière est limitée à ONLY_ON_DEVICE et le résultat est écarté si Firebase AI Logic ne confirme pas le traitement local. Aucun repli cloud.'],
      ['Éducation cloud', 'Seules des questions prédéfinies et non sensibles peuvent utiliser le cloud, avec un consentement pour cette requête.'],
      ['App Check', 'Le client initialise Firebase App Check. L’initialisation ou l’obtention d’un jeton ne prouve pas l’activation de l’application de règles dans Firebase.'],
      ['Données démo', 'Les transactions de démonstration sont synthétiques et conservées dans un espace local séparé. Elles ne sont ni synchronisées ni envoyées à Firestore.'],
    ],
  },
  about: {
    title: 'La clarté financière pour les petites entreprises',
    description: 'CreditBridge AI est un prototype indépendant autour d’outils financiers pratiques et d’une IA hybride respectueuse de la vie privée.',
    sections: [
      ['Public concerné', 'Microentrepreneurs, petites entreprises, commerçants informels et travailleurs indépendants, notamment avec une connexion intermittente.'],
      ['Ce que l’application ne fait pas', 'Elle n’accorde pas de prêt, ne décide pas d’une demande de crédit et ne garantit aucun financement.'],
      ['Technologie', 'Le prototype utilise React, TypeScript, Firebase AI Logic et App Check. La disponibilité locale dépend du navigateur et de l’appareil.'],
      ['Transparence', 'Projet indépendant préparé pour le hackathon Google Firebase #BuildHybridAI. Il n’est pas approuvé par Google.'],
    ],
  },
} as const

export function InfoPage() {
  const { pathname } = useLocation()
  const { language } = useLanguage()
  const sectionKey = pathname.split('/').filter(Boolean).at(-1) as keyof typeof englishContent
  const content = language === 'fr'
    ? frenchContent[sectionKey] ?? frenchContent.about
    : englishContent[sectionKey] ?? englishContent.about
  const icon = sectionKey === 'privacy' ? LockKeyhole : sectionKey === 'features' ? Sparkles : CircleHelp

  return (
    <main className="mx-auto min-h-[65vh] max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8" id="main-content">
      <PageMeta description={content.description} title={content.title} />
      <PageHeader
        description={content.description}
        eyebrow={language === 'fr' ? 'CreditBridge AI' : 'CreditBridge AI'}
        title={content.title}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {content.sections.map(([title, description], index) => {
          const Icon = icon
          return (
            <Card className="p-5 sm:p-6" key={title}>
              <div className="flex items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon aria-hidden="true" size={19} />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-bold text-foreground">{title}</h2>
                    {sectionKey === 'features' && index < 2 && (
                      <Badge tone="primary">{language === 'fr' ? 'Aperçu' : 'Preview'}</Badge>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link className={buttonClasses('primary')} to="/demo">
          {language === 'fr' ? 'Explorer la démo' : 'Explore the demo'}
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
        {sectionKey !== 'privacy' && (
          <Link className={buttonClasses('outline')} to="/privacy">
            {language === 'fr' ? 'Lire notre approche de confidentialité' : 'Read the privacy approach'}
          </Link>
        )}
      </div>
    </main>
  )
}
