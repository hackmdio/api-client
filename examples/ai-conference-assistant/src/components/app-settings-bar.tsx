'use client'

import { useTheme } from 'next-themes'
import type { Locale } from '@/i18n/dictionaries'
import { useI18n } from '@/i18n/context'

export function AppSettingsBar({ className = '' }: { className?: string }) {
  const { locale, setLocale, t } = useI18n()
  const { theme, setTheme } = useTheme()

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-xl border border-zinc-200/80 bg-white/80 p-1 shadow-sm backdrop-blur-sm dark:border-zinc-700/80 dark:bg-zinc-900/80 ${className}`}
      role="toolbar"
      aria-label={t('settings.language')}
    >
      <div className="flex rounded-lg bg-zinc-100/90 p-0.5 dark:bg-zinc-800/90">
        {(['light', 'dark', 'system'] as const).map(key => (
          <button
            key={key}
            type="button"
            onClick={() => setTheme(key)}
            className={`rounded-md px-2 py-1 text-xs font-medium transition ${
              theme === key
                ? 'bg-white text-zinc-900 shadow dark:bg-zinc-700 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
            title={
              key === 'light'
                ? t('settings.themeLight')
                : key === 'dark'
                  ? t('settings.themeDark')
                  : t('settings.themeSystem')
            }
          >
            {key === 'light' ? '☀' : key === 'dark' ? '☾' : '◐'}
          </button>
        ))}
      </div>
      <span className="hidden h-4 w-px bg-zinc-200 dark:bg-zinc-700 sm:inline" aria-hidden />
      <label className="sr-only" htmlFor="app-locale">
        {t('settings.language')}
      </label>
      <select
        id="app-locale"
        value={locale}
        onChange={e => setLocale(e.target.value as Locale)}
        className="max-w-[8.5rem] rounded-lg border-0 bg-transparent py-1 pl-1 pr-6 text-xs font-medium text-zinc-700 outline-none ring-0 focus:ring-2 focus:ring-blue-500/40 dark:text-zinc-200"
      >
        <option value="en">{t('settings.english')}</option>
        <option value="zh-TW">{t('settings.traditionalChinese')}</option>
      </select>
    </div>
  )
}
