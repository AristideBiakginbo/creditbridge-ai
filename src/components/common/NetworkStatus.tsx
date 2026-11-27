import { useEffect, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { useLanguage } from '../../app/providers/useLanguage'
import { Badge } from '../ui/Badge'

export function NetworkStatus() {
  const [online, setOnline] = useState(() => navigator.onLine)
  const { t } = useLanguage()

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  const Icon = online ? Wifi : WifiOff

  return (
    <Badge
      aria-live="polite"
      className="gap-1.5 px-2 py-1.5"
      title={online
        ? 'Browser reports online; service reachability is not verified.'
        : 'Browser reports offline; local model readiness is not verified.'}
      tone={online ? 'success' : 'warning'}
    >
      <Icon aria-hidden="true" size={13} />
      <span>{online ? t('common.online') : t('common.offline')}</span>
    </Badge>
  )
}
