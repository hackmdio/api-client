'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AppConfig, GeneratedData } from '@/app/page'

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
    setLogs([{ type: 'info', text: '🚀 Starting note creation...' }])

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
                text: `✅ ${created.title} → ${created.url}`,
              },
            ])
          }

          if (event.error) {
            const err = event.error
            setLogs(prev => [
              ...prev,
              {
                type: 'error',
                text: `❌ ${err.title || 'Error'}: ${err.message}`,
              },
            ])
          }

          if (event.mainBookUrl) {
            setMainBookUrl(event.mainBookUrl)
            setLogs(prev => [
              ...prev,
              { type: 'success', text: `📚 Main book: ${event.mainBookUrl}` },
            ])
          }

          if (event.phase === 'done') {
            setLogs(prev => [
              ...prev,
              { type: 'info', text: `🎉 All done! ${event.completed}/${event.total} notes created.` },
            ])
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setPhase('error')
      setLogs(prev => [...prev, { type: 'error', text: `💥 ${message}` }])
    }
  }, [config, generatedData, delayMs])

  // Auto-scroll logs
  useEffect(() => {
    const el = document.getElementById('progress-logs')
    if (el) el.scrollTop = el.scrollHeight
  }, [logs])

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
  const isDone = phase === 'done' || phase === 'error'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-lg">
            {isDone ? '🎉 Notes Created' : '📝 Creating Notes...'}
          </h3>
          {isDone && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ✕
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col p-6">
          {/* Pre-start config */}
          {!started && (
            <div className="space-y-4">
              <p className="text-gray-600">
                Ready to create <strong>{generatedData.pages.length + 1}</strong> notes in
                team <strong>{config.teamPath}</strong>.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delay between requests (ms)
                </label>
                <input
                  type="number"
                  value={delayMs}
                  onChange={e => setDelayMs(parseInt(e.target.value) || 0)}
                  min={0}
                  max={5000}
                  step={100}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Recommended: 200-500ms to avoid rate limits
                </p>
              </div>

              <button
                onClick={startCreation}
                className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition"
              >
                🚀 Start Creating Notes
              </button>
            </div>
          )}

          {/* Progress bar */}
          {started && (
            <>
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>
                    {phase === 'creating-sessions'
                      ? 'Creating session notes...'
                      : phase === 'creating-book'
                        ? 'Creating homepage...'
                        : phase === 'done'
                          ? 'Complete!'
                          : phase === 'error'
                            ? 'Error occurred'
                            : 'Starting...'}
                  </span>
                  <span>
                    {completed}/{total} ({percent}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${
                      phase === 'error' ? 'bg-red-500' : phase === 'done' ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                {current && phase !== 'done' && (
                  <p className="text-xs text-gray-400 mt-1 truncate">Current: {current}</p>
                )}
              </div>

              {/* Log output */}
              <div
                id="progress-logs"
                className="flex-1 overflow-y-auto bg-gray-50 rounded-lg border border-gray-200 p-3 font-mono text-xs space-y-1 min-h-[200px]"
              >
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className={
                      log.type === 'error'
                        ? 'text-red-600'
                        : log.type === 'success'
                          ? 'text-green-700'
                          : 'text-gray-500'
                    }
                  >
                    {log.text}
                  </div>
                ))}
              </div>

              {/* Main book link */}
              {mainBookUrl && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">📚 Main Book Created:</p>
                  <a
                    href={mainBookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-green-600 hover:underline break-all"
                  >
                    {mainBookUrl}
                  </a>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {isDone && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
