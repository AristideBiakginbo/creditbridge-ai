import { useState } from 'react'
import { useAuth } from '../../app/providers/useAuth'
import { useLanguage } from '../../app/providers/useLanguage'
import { AccountTransactionRepository } from '../../lib/db/transactionRepository'
import { PageMeta } from '../../components/common/PageMeta'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/ui/Card'
import { Dialog } from '../../components/common/Dialog'
import { Button } from '../../components/ui/Button'

export function PrivacyCenterPage() {
  const { uid, profile } = useAuth()
  const { language } = useLanguage()
  const french = language === 'fr'
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState('')
  const [deleted, setDeleted] = useState(false)

  async function removeLocalData() {
    if (!uid || !profile?.activeBusinessId) return
    setError('')
    try {
      await new AccountTransactionRepository(uid, profile.activeBusinessId).clearLocalData()
      setDeleted(true)
      setConfirm(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : (french ? 'Suppression impossible.' : 'Could not delete local data.'))
      setConfirm(false)
    }
  }

  return (
    <>
      <PageMeta description={french ? 'Confidentialité et stockage local.' : 'Privacy and local storage.'} title={french ? 'Confidentialité' : 'Privacy'} />
      <PageHeader description={french ? 'Comprenez où vos données sont conservées.' : 'Understand where your data is stored.'} eyebrow={french ? 'Protection' : 'Privacy'} title={french ? 'Centre de confidentialité' : 'Privacy center'} />
      <div className="grid max-w-3xl gap-4">
        <Card className="p-5"><h2 className="font-bold">{french ? 'Stockage financier local' : 'Local financial storage'}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{french ? 'Les transactions sont conservées dans IndexedDB sur cet appareil. Le stockage du navigateur n’est pas chiffré par défaut.' : 'Transactions are stored in IndexedDB on this device. Browser storage is not encrypted by default.'}</p></Card>
        <Card className="p-5"><h2 className="font-bold">{french ? 'Profil cloud' : 'Cloud profile'}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{french ? 'Le nom, l’e-mail et les métadonnées professionnelles sont enregistrés dans Firestore. Aucun historique financier n’est synchronisé.' : 'Your name, email, and business metadata are stored in Firestore. No financial history is synchronized.'}</p></Card>
        <Card className="p-5"><h2 className="font-bold">{french ? 'Synchronisation financière' : 'Financial synchronization'}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{french ? 'Désactivée. Cette application n’effectue aucune synchronisation financière cloud.' : 'Disabled. This application does not perform cloud financial synchronization.'}</p></Card>
        <Card className="border-destructive/25 p-5"><h2 className="font-bold">{french ? 'Supprimer les données locales' : 'Delete local data'}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{french ? 'Cette action supprime les transactions locales et les métadonnées locales de ce compte sur cet appareil. Elle ne supprime pas les documents Firestore.' : 'This removes local transactions and local account metadata on this device. It does not delete Firestore documents.'}</p><Button className="mt-4" onClick={() => setConfirm(true)} variant="outline">{french ? 'Supprimer les données locales' : 'Delete local data'}</Button>{error && <p className="mt-3 text-xs text-destructive" role="alert">{error}</p>}{deleted && <p className="mt-3 text-xs text-success" role="status">{french ? 'Données locales supprimées.' : 'Local data deleted.'}</p>}</Card>
      </div>
      <Dialog description={french ? 'Les données locales non synchronisées seront perdues. Firestore ne sera pas modifié.' : 'Unsynchronized local data will be lost. Firestore will not be changed.'} open={confirm} title={french ? 'Confirmer la suppression locale ?' : 'Confirm local deletion?'} onClose={() => setConfirm(false)}><Button onClick={removeLocalData} variant="outline">{french ? 'Supprimer définitivement' : 'Delete permanently'}</Button></Dialog>
    </>
  )
}
