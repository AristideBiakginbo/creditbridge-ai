import { ArrowLeft, Clock3, ShieldCheck } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useLanguage } from '../../app/providers/useLanguage'
import { PageHeader } from '../../components/common/PageHeader'
import { PageMeta } from '../../components/common/PageMeta'
import { Badge } from '../../components/ui/Badge'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { Card } from '../../components/ui/Card'

const labels: Record<string, { en: string; fr: string; descriptionEn: string; descriptionFr: string }> = {
  analytics: { en: 'Analytics', fr: 'Analyses', descriptionEn: 'Interactive financial analysis will be added in a later phase.', descriptionFr: 'Les analyses financières interactives seront ajoutées dans une phase ultérieure.' },
  passport: { en: 'Financial Passport', fr: 'Passeport financier', descriptionEn: 'A user-controlled document preview is planned. It is not a credit score or certified statement.', descriptionFr: 'Un aperçu documentaire contrôlé par l’utilisateur est prévu. Ce n’est ni un score de crédit ni un relevé certifié.' },
  loans: { en: 'Loan simulator', fr: 'Simulateur de prêt', descriptionEn: 'A repayment calculator is planned. It will not make or recommend credit eligibility decisions.', descriptionFr: 'Un calculateur de remboursement est prévu. Il ne décidera ni ne recommandera une admissibilité au crédit.' },
  budgets: { en: 'Budgets & goals', fr: 'Budgets et objectifs', descriptionEn: 'Budget planning is a future feature and does not currently store any targets.', descriptionFr: 'La planification budgétaire est une fonction future et aucun objectif n’est enregistré actuellement.' },
  goals: { en: 'Goals', fr: 'Objectifs', descriptionEn: 'Goal tracking is a future feature and does not currently store any targets.', descriptionFr: 'Le suivi des objectifs est une fonction future et aucun objectif n’est enregistré actuellement.' },
  debts: { en: 'Receivables & debts', fr: 'Créances et dettes', descriptionEn: 'A dedicated local record workflow has not been implemented yet.', descriptionFr: 'Le flux local dédié aux créances et dettes n’est pas encore implémenté.' },
  notifications: { en: 'Notifications', fr: 'Notifications', descriptionEn: 'No notifications or reminders are currently created or delivered.', descriptionFr: 'Aucune notification ni aucun rappel n’est actuellement créé ou envoyé.' },
  privacy: { en: 'Privacy controls', fr: 'Contrôles de confidentialité', descriptionEn: 'Consent details are shown at the point of use; persistent account-level preferences are not implemented.', descriptionFr: 'Les détails de consentement sont présentés au moment de l’usage ; les préférences de compte persistantes ne sont pas implémentées.' },
  settings: { en: 'Settings', fr: 'Paramètres', descriptionEn: 'Theme and language preferences work locally. Account, sync, and data-export settings are not connected.', descriptionFr: 'Les préférences de thème et de langue fonctionnent localement. Le compte, la synchronisation et l’export ne sont pas connectés.' },
  help: { en: 'Help center', fr: 'Centre d’aide', descriptionEn: 'Product help content is still being prepared.', descriptionFr: 'Le contenu d’aide est en préparation.' },
}

export function UpcomingPage() {
  const { pathname } = useLocation()
  const { language, t } = useLanguage()
  const slug = pathname.split('/').filter(Boolean).at(-1) ?? 'analytics'
  const page = labels[slug] ?? labels.analytics
  const title = language === 'fr' ? page.fr : page.en
  const description = language === 'fr' ? page.descriptionFr : page.descriptionEn

  return (
    <>
      <PageMeta description={description} title={title} />
      <PageHeader
        description={description}
        eyebrow={t('upcoming.badge')}
        title={title}
      >
        <Badge tone="neutral"><Clock3 aria-hidden="true" size={13} /> {t('upcoming.badge')}</Badge>
      </PageHeader>
      <Card className="mx-auto max-w-3xl p-6 sm:p-8">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck aria-hidden="true" size={23} />
        </span>
        <h2 className="mt-5 font-display text-xl font-extrabold text-foreground">
          {language === 'fr' ? 'Cette fonction n’est pas encore active' : 'This feature is not active yet'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('upcoming.body')}</p>
        <p className="mt-3 rounded-xl border border-warning/25 bg-warning/5 p-3 text-xs leading-5 text-foreground">{description}</p>
        <Link className={`${buttonClasses('outline')} mt-5`} to="/app/dashboard">
          <ArrowLeft aria-hidden="true" size={15} /> {language === 'fr' ? 'Retour au tableau de bord' : 'Back to dashboard'}
        </Link>
      </Card>
    </>
  )
}
