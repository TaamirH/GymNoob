import { createContext, useContext, type ReactNode } from 'react'
import { en, type Dict } from './en'
import { he } from './he'
import type { Language } from '@/db/types'

const dicts: Record<Language, Dict> = { en, he }

interface I18n {
  t: Dict
  lang: Language
  dir: 'ltr' | 'rtl'
}

const I18nContext = createContext<I18n>({ t: en, lang: 'en', dir: 'ltr' })

export function I18nProvider({ lang, children }: { lang: Language; children: ReactNode }) {
  const value: I18n = { t: dicts[lang], lang, dir: lang === 'he' ? 'rtl' : 'ltr' }
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useT(): Dict {
  return useContext(I18nContext).t
}

export function useI18n(): I18n {
  return useContext(I18nContext)
}
