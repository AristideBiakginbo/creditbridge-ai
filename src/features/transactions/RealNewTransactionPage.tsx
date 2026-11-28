import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth } from '../../app/providers/useAuth'
import { useLanguage } from '../../app/providers/useLanguage'
import { PageMeta } from '../../components/common/PageMeta'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/ui/Card'
import { creditBridgeDatabase } from '../../lib/db/database'
import { AccountTransactionRepository } from '../../lib/db/transactionRepository'
import { LocalTransactionForm } from './LocalTransactionForm'

export function RealNewTransactionPage() {
  const { uid, profile } = useAuth()
  const { language } = useLanguage()
  const french = language === 'fr'
  const navigate = useNavigate()
  const businessId = profile?.activeBusinessId
  const business = useLiveQuery(async () => {
    if (!uid || !businessId) return undefined
    const record = await creditBridgeDatabase.businesses.get(businessId)
    return record?.ownerId === uid ? record : undefined
  }, [uid, businessId])

  async function createTransaction(input: Parameters<AccountTransactionRepository['create']>[0]) {
    if (!uid || !businessId) {
      throw new Error(french
        ? 'Aucun espace professionnel actif.'
        : 'There is no active business workspace.')
    }
    await new AccountTransactionRepository(uid, businessId).create(input)
    navigate('/app/transactions')
  }

  return (
    <>
      <PageMeta
        description={french ? 'Enregistrer une transaction locale.' : 'Record a local transaction.'}
        title={french ? 'Nouvelle transaction' : 'New transaction'}
      />
      <PageHeader
        description={french
          ? 'Cette transaction reste dans le stockage local de cet appareil.'
          : 'This transaction stays in local storage on this device.'}
        eyebrow={french ? 'Stockage local' : 'Local storage'}
        title={french ? 'Nouvelle transaction' : 'New transaction'}
      />
      <Card className="max-w-2xl p-5 sm:p-7">
        <LocalTransactionForm
          currency={business?.currency ?? 'MAD'}
          onSubmit={createTransaction}
        />
      </Card>
    </>
  )
}
