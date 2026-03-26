'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { en, zhTW, type Locale, type Messages } from './dictionaries'

const locales: Record<Locale, Messages> = {
  en: en as unknown as Messages,
  'zh-TW': zhTW,
}

const LOCALE_EVENT = 'app-locale-change'

function readLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  try {
    const saved = localStorage.getItem('locale') as Locale | null
    if (saved === 'en' || saved === 'zh-TW') return saved
  } catch {
    /* ignore */
  }
  if (navigator.language.toLowerCase().startsWith('zh')) return 'zh-TW'
  return 'en'
}

function subscribeLocale(onChange: () => void) {
  if (typeof window === 'undefined') return () => {}
  const handler = () => onChange()
  window.addEventListener('storage', handler)
  window.addEventListener(LOCALE_EVENT, handler)
  return () => {
    window.removeEventListener('storage', handler)
    window.removeEventListener(LOCALE_EVENT, handler)
  }
}

function getLocaleSnapshot(): Locale {
  if (typeof window === 'undefined') return 'en'
  return readLocale()
}

function getServerLocaleSnapshot(): Locale {
  return 'en'
}

function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str
  return str.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`))
}

function getMessage(dict: Messages, key: string): string | undefined {
  const parts = key.split('.')
  let cur: unknown = dict
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p]
    } else {
      return undefined
    }
  }
  return typeof cur === 'string' ? cur : undefined
}

type I18nContextValue = {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribeLocale, getLocaleSnapshot, getServerLocaleSnapshot)

  const setLocale = useCallback((l: Locale) => {
    try {
      localStorage.setItem('locale', l)
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(LOCALE_EVENT))
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale === 'zh-TW' ? 'zh-Hant' : 'en'
  }, [locale])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = locales[locale]
      const raw = getMessage(dict, key) ?? getMessage(en, key) ?? key
      return interpolate(raw, vars)
    },
    [locale],
  )

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return ctx
}
