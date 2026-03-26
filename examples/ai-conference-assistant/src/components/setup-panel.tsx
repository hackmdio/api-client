'use client'

import { useState, type FormEvent } from 'react'
import type { AppConfig } from '@/app/page'
import { AppSettingsBar } from '@/components/app-settings-bar'
import { useI18n } from '@/i18n/context'

interface SetupPanelProps {
  onConfigured: (config: AppConfig) => void
}

export function SetupPanel({ onConfigured }: SetupPanelProps) {
  const { t } = useI18n()
  const [apiKey, setApiKey] = useState('')
  const [apiEndpoint, setApiEndpoint] = useState('https://api.hackmd.io/v1')
  const [teamPath, setTeamPath] = useState('')
  const [webDomain, setWebDomain] = useState('https://hackmd.io')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setVerifying(true)

    try {
      const res = await fetch('/api/verify-hackmd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, apiEndpoint, teamPath }),
      })
      const data = (await res.json()) as { error?: string; teamPath?: string }
      if (!res.ok) {
        throw new Error(data.error || t('setup.verifyFailed'))
      }

      onConfigured({
        apiKey,
        apiEndpoint,
        teamPath: data.teamPath ?? '',
        webDomain,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('setup.verifyFailed'))
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-50 via-white to-indigo-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.12),_transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.12),_transparent_55%)]" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-400/15 blur-3xl dark:bg-indigo-500/10" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/10" />

      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <AppSettingsBar />
      </div>

      <div className="relative flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-zinc-200/80 bg-white/90 p-8 shadow-xl shadow-zinc-900/5 backdrop-blur dark:border-zinc-700/80 dark:bg-zinc-900/85 dark:shadow-black/40">
          <div className="mb-8 text-center">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-2xl shadow-lg shadow-indigo-500/25">
              📚
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
              {t('setup.title')}
            </h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{t('setup.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t('setup.apiKey')} <span className="text-red-500">{t('setup.required')}</span>
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={t('setup.apiKeyPlaceholder')}
                required
                autoComplete="off"
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-zinc-900 shadow-sm transition placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-600 dark:bg-zinc-950/50 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                {t('setup.apiKeyHint')}{' '}
                <a
                  href="https://hackmd.io/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:underline dark:text-sky-400"
                >
                  hackmd.io/settings/api
                </a>
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t('setup.teamPath')} <span className="text-red-500">{t('setup.required')}</span>
              </label>
              <input
                type="text"
                value={teamPath}
                onChange={e => setTeamPath(e.target.value)}
                placeholder={t('setup.teamPlaceholder')}
                required
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-zinc-900 shadow-sm transition placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-600 dark:bg-zinc-950/50 dark:text-zinc-100"
              />
            </div>

            <details className="group">
              <summary className="cursor-pointer text-sm text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200">
                {t('setup.advancedToggle')}
              </summary>
              <div className="mt-3 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t('setup.apiEndpoint')}
                  </label>
                  <input
                    type="url"
                    value={apiEndpoint}
                    onChange={e => setApiEndpoint(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-zinc-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-600 dark:bg-zinc-950/50 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t('setup.webDomain')}
                  </label>
                  <input
                    type="url"
                    value={webDomain}
                    onChange={e => setWebDomain(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-zinc-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-600 dark:bg-zinc-950/50 dark:text-zinc-100"
                  />
                </div>
              </div>
            </details>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={verifying || !apiKey}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 font-medium text-white shadow-md shadow-blue-600/25 transition hover:from-blue-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-indigo-900/40"
            >
              {verifying ? t('common.verifying') : t('setup.start')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
