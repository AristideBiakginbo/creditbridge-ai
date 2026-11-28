import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth } from '../../app/providers/useAuth'
import { useLanguage } from '../../app/providers/useLanguage'
import { PageMeta } from '../../components/common/PageMeta'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { inputClasses, selectClasses } from '../../components/ui/fields'
import { AccountTransactionRepository, amountToMinor } from '../../lib/db/transactionRepository'
import { localTransactionSchema } from '../../lib/db/schema'
import { creditBridgeDatabase } from '../../lib/db/database'

export function RealNewTransactionPage() {
  const { uid, profile } = useAuth()
  const { language } = useLanguage()
  const french = language === 'fr'
  const navigate = useNavigate()
  const [date, setDate] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const business = useLiveQuery(
    () => profile?.activeBusinessId
      ? creditBridgeDatabase.businesses.get(profile.activeBusinessId)
      : undefined,
    [profile?.activeBusinessId],
  )
  const currency = business?.currency ?? 'MAD'

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!uid || !profile?.activeBusinessId) {
      setError(french ? 'Aucun espace professionnel actif.' : 'There is no active business workspace.')
      return
    }
    try {
      const parsed = localTransactionSchema.omit({
        id: true, ownerId: true, businessId: true, createdAt: true, updatedAt: true, schemaVersion: true,
      }).safeParse({
        type,
        amountMinor: amountToMinor(Number(amount), currency),
        currency,
        category: category.trim(),
        description: description.trim(),
        transactionDate: date,
        source: 'manual',
      })
      if (!parsed.success) {
        setError(french ? 'Saisissez une transaction valide.' : 'Enter a valid transaction.')
        return
      }
      await new AccountTransactionRepository(uid, profile.activeBusinessId).create(parsed.data)
      navigate('/app/transactions')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : (french ? 'Impossible d’enregistrer la transaction.' : 'Could not save the transaction.'))
    }
  }

  const label = 'grid gap-1.5 text-xs font-semibold'
  return (
    <>
      <PageMeta description={french ? 'Enregistrer une transaction locale.' : 'Record a local transaction.'} title={french ? 'Nouvelle transaction' : 'New transaction'} />
      <PageHeader description={french ? 'Cette transaction reste sur cet appareil.' : 'This transaction stays on this device.'} eyebrow={french ? 'Stockage local' : 'Local storage'} title={french ? 'Nouvelle transaction' : 'New transaction'} />
      <Card className="max-w-2xl p-5 sm:p-7"><form className="grid gap-4" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2"><label className={label}>{french ? 'Type' : 'Type'}<select className={selectClasses} onChange={(event) => setType(event.target.value as typeof type)} value={type}><option value="income">{french ? 'Revenu' : 'Income'}</option><option value="expense">{french ? 'Dépense' : 'Expense'}</option></select></label><label className={label}>{french ? 'Date' : 'Date'}<input className={inputClasses} onChange={(event) => setDate(event.target.value)} required type="date" value={date} /></label></div>
        <label className={label}>{french ? 'Description' : 'Description'}<input className={inputClasses} maxLength={140} onChange={(event) => setDescription(event.target.value)} required value={description} /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className={label}>{french ? 'Catégorie' : 'Category'}<input className={inputClasses} maxLength={48} onChange={(event) => setCategory(event.target.value)} required value={category} /></label><label className={label}>{french ? 'Montant' : 'Amount'} ({currency})<input className={inputClasses} inputMode="decimal" min={currency === 'XAF' || currency === 'XOF' ? '1' : '0.01'} onChange={(event) => setAmount(event.target.value)} required step={currency === 'XAF' || currency === 'XOF' ? '1' : '0.01'} type="number" value={amount} /></label></div>
        {error && <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive" role="alert">{error}</p>}
        <Button type="submit">{french ? 'Enregistrer localement' : 'Save locally'}</Button>
      </form></Card>
    </>
  )
}
