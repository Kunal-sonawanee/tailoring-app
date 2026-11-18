import { useCallback, useEffect, useState } from 'react'
import { LANGS, useI18n, type TKey } from './i18n'
import { formatDate, todayIST } from './lib/dates'

type Health = { ok: boolean; db: boolean; files: boolean }
type CheckState = 'checking' | 'ok' | 'fail'

// Phase 0 screen: proves the app, API, database and photo storage all work on the phone.
// Replaced by Login / Home in Phase 1.
export default function App() {
  const { t, lang, setLang } = useI18n()
  const [health, setHealth] = useState<Health | null>(null)
  const [loading, setLoading] = useState(true)

  const check = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/health', { cache: 'no-store' })
      setHealth(res.ok ? ((await res.json()) as Health) : { ok: false, db: false, files: false })
    } catch {
      setHealth({ ok: false, db: false, files: false })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void check()
  }, [check])

  const state = (v: boolean | undefined): CheckState => (loading ? 'checking' : v ? 'ok' : 'fail')

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="bg-primary px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 text-white">
        <h1 className="text-2xl font-bold">{t('app.name')}</h1>
      </header>

      <main className="flex flex-1 flex-col gap-4 p-4">
        <p className="text-base text-muted">{t('phase0.note')}</p>

        <section className="rounded-2xl bg-card p-4 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold">{t('status.title')}</h2>
          <ul className="divide-y divide-gray-100">
            <StatusRow label={t('status.app')} state="ok" />
            <StatusRow label={t('status.database')} state={state(health?.db)} />
            <StatusRow label={t('status.files')} state={state(health?.files)} />
          </ul>
          <button
            type="button"
            onClick={check}
            disabled={loading}
            className="mt-3 h-13 w-full rounded-xl border-2 border-primary text-lg font-semibold text-primary active:bg-primary/10 disabled:opacity-50"
          >
            {t('status.retry')}
          </button>
        </section>

        <section className="rounded-2xl bg-card p-4 shadow-sm">
          <div className="text-lg text-muted">{t('today.label')}</div>
          <div className="text-2xl font-semibold">{formatDate(todayIST())}</div>
        </section>

        <section className="rounded-2xl bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">{t('language.title')}</h2>
          <div className="grid grid-cols-3 gap-2">
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={`h-13 rounded-xl text-lg font-semibold ${
                  lang === l ? 'bg-primary text-white' : 'bg-page text-ink active:bg-gray-200'
                }`}
              >
                {t(`language.${l}` as TKey)}
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

const STATE_STYLE: Record<CheckState, { dot: string; key: TKey }> = {
  checking: { dot: 'bg-gray-300 animate-pulse', key: 'status.checking' },
  ok: { dot: 'bg-st-ready', key: 'status.ok' },
  fail: { dot: 'bg-due-today', key: 'status.fail' },
}

function StatusRow({ label, state }: { label: string; state: CheckState }) {
  const { t } = useI18n()
  const s = STATE_STYLE[state]
  return (
    <li className="flex min-h-12 items-center justify-between py-2 text-lg">
      <span>{label}</span>
      <span className="flex items-center gap-2 text-base text-muted">
        <span className={`inline-block h-3 w-3 rounded-full ${s.dot}`} aria-hidden />
        {t(s.key)}
      </span>
    </li>
  )
}
