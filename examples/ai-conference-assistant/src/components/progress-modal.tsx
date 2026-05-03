'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AppConfig, GeneratedData } from '@/app/page'
import { useI18n } from '@/i18n/context'

interface ProgressModalProps {
  config: AppConfig
  generatedData: GeneratedData
  onClose: () => void
}

interface ProgressEvent {
  phase: string
  total: number
  completed: number
  current: string
  mainBookUrl?: string
  noteCreated?: {
    sessionId: string
    title: string
    shortId: string
    url: string
  }
  error?: {
    sessionId?: string
    title?: string
    message: string
  }
  createdNotes?: Array<{
    sessionId: string
    shortId: string
    url: string
  }>
  errors?: Array<{
    sessionId: string
    title: string
    error: string
  }>
}

export function ProgressModal({ config, generatedData, onClose }: ProgressModalProps) {
  const { t } = useI18n()
  const [phase, setPhase] = useState<string>('idle')
  const [total, setTotal] = useState(0)
  const [completed, setCompleted] = useState(0)
  const [current, setCurrent] = useState('')
  const [logs, setLogs] = useState<Array<{ type: 'success' | 'error' | 'info'; text: string }>>([])
  const [mainBookUrl, setMainBookUrl] = useState<string | null>(null)
  const [delayMs, setDelayMs] = useState(300)
  const [started, setStarted] = useState(false)

  const startCreation = useCallback(async () => {
    setStarted(true)
    setPhase('creating-sessions')
    setLogs([{ type: 'info', text: t('progress.logStarting') }])

    try {
      const response = await fetch('/api/create-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            apiKey: config.apiKey,
            apiEndpoint: config.apiEndpoint,
            teamPath: config.teamPath,
            webDomain: config.webDomain,
            conferenceName: generatedData.homepage.title,
            delayMs,
          },
          homepage: generatedData.homepage,
          pages: generatedData.pages,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.slice(6)
          let event: ProgressEvent
          try {
            event = JSON.parse(jsonStr)
          } catch {
            continue
          }

          setPhase(event.phase)
          setTotal(event.total)
          setCompleted(event.completed)
          setCurrent(event.current)

          if (event.noteCreated) {
            const created = event.noteCreated
            setLogs(prev => [
              ...prev,
              {
                type: 'success',
                text: t('progress.logNoteCreated', { title: created.title, url: created.url }),
              },
            ])
          }

          if (event.error) {
            const err = event.error
            setLogs(prev => [
              ...prev,
              {
                type: 'error',
                text: t('progress.logError', {
                  title: err.title || 'Error',
                  message: err.message,
                }),
              },
            ])
          }

          if (event.mainBookUrl) {
            setMainBookUrl(event.mainBookUrl)
            setLogs(prev => [
              ...prev,
              { type: 'success', text: t('progress.logMainBook', { url: event.mainBookUrl! }) },
            ])
          }

          if (event.phase === 'done') {
            setLogs(prev => [
              ...prev,
              {
                type: 'info',
                text: t('progress.logAllDone', { completed: event.completed, total: event.total }),
              },
            ])
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setPhase('error')
      setLogs(prev => [...prev, { type: 'error', text: t('progress.logFatal', { message }) }])
    }
  }, [config, generatedData, delayMs, t])

  useEffect(() => {
    const el = document.getElementById('progress-logs')
    if (el) el.scrollTop = el.scrollHeight
  }, [logs])

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
  const isDone = phase === 'done' || phase === 'error'

  const phaseLabel =
    phase === 'creating-sessions'
      ? t('progress.phaseCreatingSessions')
      : phase === 'creating-book'
        ? t('progress.phaseCreatingBook')
        : phase === 'done'
          ? t('progress.phaseDone')
          : phase === 'error'
            ? t('progress.phaseError')
            : t('progress.phaseStarting')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm dark:bg-black/60">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {isDone ? t('progress.titleDone') : t('progress.titleCreating')}
          </h3>
          {isDone && (
            <button
              type="button"
              onClick={onClose}
              className="text-xl text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col overflow-hidden p-6">
          {!started && (
            <div className="space-y-4">
              <p className="text-zinc-600 dark:text-zinc-300">
                {t('progress.readyBody', {
                  count: generatedData.pages.length + 1,
                  team: config.teamPath,
                })}
              </p>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t('progress.delayLabel')}
                </label>
                <input
                  type="number"
                  value={delayMs}
                  onChange={e => setDelayMs(parseInt(e.target.value, 10) || 0)}
                  min={0}
                  max={5000}
                  step={100}
                  className="w-32 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                />
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{t('progress.delayHint')}</p>
              </div>

              <button
                type="button"
                onClick={startCreation}
                className="rounded-xl bg-emerald-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-emerald-500"
              >
                🚀 {t('progress.startButton')}
              </button>
            </div>
          )}

          {started && (
            <>
              <div className="mb-4">
                <div className="mb-1 flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
                  <span>{phaseLabel}</span>
                  <span>
                    {completed}/{total} ({percent}%)
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${
                      phase === 'error'
                        ? 'bg-red-500'
                        : phase === 'done'
                          ? 'bg-emerald-500'
                          : 'bg-blue-500'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                {current && phase !== 'done' && (
                  <p className="mt-1 truncate text-xs text-zinc-400 dark:text-zinc-500">
                    {t('progress.currentLabel')} {current}
                  </p>
                )}
              </div>

              <div
                id="progress-logs"
                className="min-h-[200px] flex-1 space-y-1 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950/50"
              >
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className={
                      log.type === 'error'
                        ? 'text-red-600 dark:text-red-400'
                        : log.type === 'success'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-zinc-500 dark:text-zinc-400'
                    }
                  >
                    {log.text}
                  </div>
                ))}
              </div>

              {mainBookUrl && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/40">
                  <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                    {t('progress.mainBookLabel')}
                  </p>
                  <a
                    href={mainBookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-sm text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
                  >
                    {mainBookUrl}
                  </a>
                </div>
              )}
            </>
          )}
        </div>

        {isDone && (
          <div className="flex justify-end border-t border-zinc-200 px-6 py-4 dark:border-zinc-700">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-zinc-100 px-4 py-2 text-zinc-800 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            >
              {t('common.close')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
