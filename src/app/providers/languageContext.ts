import { createContext } from 'react'
import type { MessageKey } from '../../i18n/messages'

export type Language = 'en' | 'fr'

export interface LanguageContextValue {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: MessageKey) => string
}

export const LanguageContext = createContext<LanguageContextValue | null>(null)
