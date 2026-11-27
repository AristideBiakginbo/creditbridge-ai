import {
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { messages } from '../../i18n/messages'
import type { MessageKey } from '../../i18n/messages'
import {
  LanguageContext,
  type Language,
} from './languageContext'

const STORAGE_KEY = 'creditbridge-language'

function getStoredLanguage(): Language {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'fr' ? 'fr' : 'en'
  } catch {
    return 'en'
  }
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguage] = useState<Language>(getStoredLanguage)

  useEffect(() => {
    document.documentElement.lang = language
    try {
      window.localStorage.setItem(STORAGE_KEY, language)
    } catch {
      return
    }
  }, [language])

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key: MessageKey) => messages[language][key],
    }),
    [language],
  )

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}
