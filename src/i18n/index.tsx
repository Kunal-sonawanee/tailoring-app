import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import mr from './mr.json'
import hi from './hi.json'
import en from './en.json'

// Marathi is the source of truth for keys; scripts/check-i18n.mjs keeps hi/en in sync.
export type TKey = keyof typeof mr
export type Lang = 'mr' | 'hi' | 'en'
export const LANGS: Lang[] = ['mr', 'hi', 'en']
export const DEFAULT_LANG: Lang = 'mr'

const dictionaries: Record<Lang, Record<TKey, string>> = { mr, hi, en }
const STORAGE_KEY = 'lang'

function readStoredLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v && (LANGS as string[]).includes(v)) return v as Lang
  } catch {
    /* private mode etc. — fall back to default */
  }
  return DEFAULT_LANG
}

type I18n = {
  lang: Lang
  setLang: (l: Lang) => void
  /** Translate a key. `{name}` placeholders are replaced from `vars`. */
  t: (key: TKey, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18n | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* ignore */
    }
  }, [])

  const t = useCallback<I18n['t']>(
    (key, vars) => {
      let s = dictionaries[lang][key] ?? dictionaries[DEFAULT_LANG][key] ?? key
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
      return s
    },
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}
