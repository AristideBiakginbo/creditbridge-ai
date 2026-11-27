import { Moon, Sun, Monitor } from 'lucide-react'
import { useLanguage } from '../../app/providers/useLanguage'
import { useTheme } from '../../app/providers/useTheme'
import type { ThemePreference } from '../../app/providers/themeContext'
import { selectClasses } from '../ui/fields'

export function ThemeControl() {
  const { preference, setPreference, resolvedTheme } = useTheme()
  const { t } = useLanguage()
  const themeOptions: Array<{ value: ThemePreference; label: string }> = [
    { value: 'light', label: t('common.light') },
    { value: 'dark', label: t('common.dark') },
    { value: 'system', label: t('common.system') },
  ]

  const ThemeIcon = preference === 'system'
    ? Monitor
    : resolvedTheme === 'dark'
      ? Moon
      : Sun

  return (
    <label className="flex items-center gap-2">
      <ThemeIcon aria-hidden="true" className="text-muted-foreground" size={16} />
      <span className="sr-only">{t('common.theme')}</span>
      <select
        aria-label={t('common.theme')}
        className={`${selectClasses} min-h-9 w-auto min-w-24 rounded-lg px-2.5 py-1.5 text-xs`}
        onChange={(event) => {
          const value = event.target.value
          if (value === 'light' || value === 'dark' || value === 'system') {
            setPreference(value)
          }
        }}
        value={preference}
      >
        {themeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function LanguageControl() {
  const { language, setLanguage, t } = useLanguage()

  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">{t('common.language')}</span>
      <select
        aria-label={t('common.language')}
        className={`${selectClasses} min-h-9 w-auto min-w-20 rounded-lg px-2.5 py-1.5 text-xs`}
        onChange={(event) => {
          if (event.target.value === 'en' || event.target.value === 'fr') {
            setLanguage(event.target.value)
          }
        }}
        value={language}
      >
        <option value="en">EN</option>
        <option value="fr">FR</option>
      </select>
    </label>
  )
}
