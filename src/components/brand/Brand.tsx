import { useLanguage } from '../../app/providers/useLanguage'

interface BrandProps {
  compact?: boolean
  inverse?: boolean
  className?: string
}

export function Brand({
  compact = false,
  inverse = false,
  className = '',
}: BrandProps) {
  const { t } = useLanguage()

  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <img
        alt={compact ? 'CreditBridge AI' : ''}
        className="size-10 shrink-0"
        height="40"
        src="/brand/mark.svg"
        width="40"
      />
      {!compact && (
        <span className="min-w-0">
          <img
            alt="CreditBridge AI"
            className="h-6 w-auto"
            height="24"
            src={inverse ? '/brand/logo-dark.svg' : '/brand/logo-light.svg'}
            width="178"
          />
          <span className="mt-0.5 block text-[0.68rem] font-medium leading-tight text-muted-foreground">
            {t('brand.tagline')}
          </span>
        </span>
      )}
    </span>
  )
}
