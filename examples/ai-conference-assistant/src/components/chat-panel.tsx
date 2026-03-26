'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  type MutableRefObject,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import type { AppConfig, GeneratedData } from '@/app/page'
import { AppSettingsBar } from '@/components/app-settings-bar'
import { useI18n } from '@/i18n/context'

/** AI SDK v6 tool parts use `tool-${name}` or `dynamic-tool` + `toolName`; states are `output-available`, not `result`. */
function getToolPartName(part: { type: string; toolName?: string }): string {
  if (part.type === 'dynamic-tool' && typeof part.toolName === 'string') {
    return part.toolName
  }
  if (part.type.startsWith('tool-')) {
    return part.type.slice('tool-'.length)
  }
  return ''
}

function isToolPart(part: { type: string }): boolean {
  return part.type.startsWith('tool-') || part.type === 'dynamic-tool'
}

interface ChatPanelProps {
  config: AppConfig
  sessionData: MutableRefObject<string>
  onSessionDataChange: (data: string) => void
  onGenerated: (data: GeneratedData) => void
  onCreateNotes: () => void
  onPreviewPage: (page: { title: string; content: string }) => void
  generatedData: GeneratedData | null
  /** Required before HackMD creation (mobile / narrow layout). */
  previewConfirmed: boolean
}

export function ChatPanel({
  config,
  sessionData,
  onSessionDataChange,
  onGenerated,
  onCreateNotes,
  onPreviewPage,
  generatedData,
  previewConfirmed,
}: ChatPanelProps) {
  const { t } = useI18n()
  const [fileUploaded, setFileUploaded] = useState(false)
  /** Set when a file parses successfully; avoids JSON.parse on ref before parent syncs sessionDataRef. */
  const [uploadedSessionCount, setUploadedSessionCount] = useState<number | null>(null)
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  /** Same JSON as parent ref, set synchronously on file read so the first send cannot race useEffect. */
  const localSessionJsonRef = useRef('')
  const fileUploadedRef = useRef(false)
  useEffect(() => {
    fileUploadedRef.current = fileUploaded
  }, [fileUploaded])

  const prepareSendMessagesRequest = useCallback(
    ({ body, messages }: { body: unknown; messages: unknown }) => {
      const merged: Record<string, unknown> = {
        ...(body as Record<string, unknown>),
        messages,
      }
      const json = localSessionJsonRef.current.trim() || sessionData.current.trim()
      if (fileUploadedRef.current && json) {
        merged.sessionDataJson = json
      }
      return { body: merged }
    },
    [sessionData],
  )

  const transport = useMemo(() => {
    // prepareSendMessagesRequest reads session refs only when sending; ESLint flags the ref in its closure.
    /* eslint-disable-next-line react-hooks/refs */
    return new DefaultChatTransport({
      api: '/api/chat',
      body: {
        config: {
          apiKey: config.apiKey,
          apiEndpoint: config.apiEndpoint,
          teamPath: config.teamPath,
        },
      },
      prepareSendMessagesRequest,
    })
  }, [config.apiKey, config.apiEndpoint, config.teamPath, prepareSendMessagesRequest])

  const { messages, sendMessage, status, error } = useChat({
    transport,
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /** Sync preview when tool output lands (covers render + stream edge cases). */
  const previewAppliedRef = useRef<string | null>(null)
  useEffect(() => {
    for (const m of messages) {
      if (m.role !== 'assistant') continue
      for (const part of m.parts ?? []) {
        if (!isToolPart(part as { type: string })) continue
        const p = part as {
          type: string
          toolName?: string
          state?: string
          output?: unknown
          errorText?: string
          toolCallId?: string
        }
        if (
          p.output === undefined ||
          (p.state !== 'output-available' && p.state !== 'result')
        )
          continue
        if (getToolPartName(p) !== 'generate_preview_pages') continue
        const key = `${m.id}:${p.toolCallId ?? 'no-id'}`
        if (previewAppliedRef.current === key) continue
        const result = p.output as {
          homepage?: { title: string; content: string }
          pages?: Array<{ sessionId: string; title: string; content: string }>
          error?: string
        }
        if (result.error || !result.homepage || !result.pages) continue
        previewAppliedRef.current = key
        onGenerated(result as GeneratedData)
        break
      }
    }
  }, [messages, onGenerated])

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      try {
        const parsed = JSON.parse(text) as unknown
        const count = Array.isArray(parsed) ? parsed.length : 0
        localSessionJsonRef.current = text
        onSessionDataChange(text)
        setUploadedSessionCount(count)
        setFileUploaded(true)
      } catch {
        alert(t('chat.invalidJson'))
      }
    }
    reader.readAsText(file)
  }

  function sendCurrentMessage() {
    if (!inputValue.trim() || isLoading) return
    void sendMessage({ text: inputValue })
    setInputValue('')
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    sendCurrentMessage()
  }

  function onComposerKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      sendCurrentMessage()
    }
  }

  return (
    <div className="flex h-full flex-col bg-zinc-50/80 dark:bg-zinc-950/50">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200/80 bg-white/90 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <h2 className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
            📚 {t('chat.title')}
          </h2>
          <span className="hidden max-w-[10rem] truncate rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-500/20 dark:text-blue-200 sm:inline">
            {config.teamPath}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <AppSettingsBar className="hidden sm:inline-flex" />
          {generatedData && (
            <button
              type="button"
              onClick={onCreateNotes}
              disabled={!previewConfirmed}
              title={
                previewConfirmed ? t('chat.createNotesTitle') : t('chat.createNotesDisabledTitle')
              }
              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
            >
              🚀 {t('chat.createNotes', { count: generatedData.pages.length + 1 })}
            </button>
          )}
        </div>
      </div>
      <div className="flex justify-end border-b border-zinc-200/60 px-4 py-2 dark:border-zinc-800 sm:hidden">
        <AppSettingsBar />
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
        {/* Welcome message */}
        {messages.length === 0 && (
          <div className="py-10 text-center sm:py-12">
            <h3 className="mb-2 text-xl font-semibold text-zinc-800 dark:text-zinc-100">
              👋 {t('chat.welcomeTitle')}
            </h3>
            <p className="mx-auto mb-6 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
              {t('chat.welcomeBody')}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl bg-blue-100 px-4 py-2 text-sm font-medium text-blue-800 transition hover:bg-blue-200 dark:bg-blue-500/20 dark:text-blue-200 dark:hover:bg-blue-500/30"
              >
                📁 {t('chat.uploadSessions')}
              </button>
              {fileUploaded && uploadedSessionCount !== null && (
                <span className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
                  ✅ {t('chat.sessionsLoaded', { count: uploadedSessionCount })}
                </span>
              )}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[min(80%,42rem)] rounded-2xl px-4 py-3 shadow-sm ${
                message.role === 'user'
                  ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
                  : 'border border-zinc-200/80 bg-white text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'
              }`}
            >
              {message.parts?.map((part, i) => {
                if (isToolPart(part as { type: string })) {
                  const toolPart = part as {
                    type: string
                    toolName?: string
                    state?: string
                    toolCallId?: string
                    output?: unknown
                    errorText?: string
                    title?: string
                  }
                  const toolName = getToolPartName(toolPart)

                  if (
                    toolPart.state === 'input-streaming' ||
                    toolPart.state === 'input-available' ||
                    toolPart.state === 'approval-requested'
                  ) {
                    return (
                      <div key={i} className="my-1 text-xs italic text-zinc-400 dark:text-zinc-500">
                        🔧 {t('chat.callingTool', { tool: toolName })}
                      </div>
                    )
                  }

                  if (toolPart.state === 'output-error') {
                    return (
                      <div
                        key={i}
                        className="my-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
                      >
                        {toolName}: {toolPart.errorText ?? t('chat.toolError')}
                      </div>
                    )
                  }

                  if (
                    (toolPart.state === 'output-available' ||
                      (toolPart as { state?: string }).state === 'result') &&
                    toolPart.output !== undefined
                  ) {
                    if (toolName === 'generate_preview_pages') {
                      const result = toolPart.output as {
                        homepage?: { title: string; content: string }
                        pages?: Array<{ sessionId: string; title: string; content: string }>
                        summary?: string
                        error?: string
                        preview?: boolean
                      }

                      if (result.error) {
                        return (
                          <div
                            key={i}
                            className="my-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
                          >
                            {result.error}
                          </div>
                        )
                      }

                      return (
                        <div
                          key={i}
                          className="my-2 rounded-lg border border-emerald-200/80 bg-emerald-50/90 p-3 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/30"
                        >
                          <p className="font-medium text-emerald-900 dark:text-emerald-100">
                            ✅ {t('chat.previewHeading')}{' '}
                            {result.summary || t('chat.previewSummaryFallback')}
                          </p>
                          <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-200/90">
                            {t('chat.previewHint')}
                          </p>
                          {result.homepage && (
                            <button
                              type="button"
                              onClick={() => onPreviewPage(result.homepage!)}
                              className="mt-1 text-xs font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300"
                            >
                              {t('chat.openHomepage')}
                            </button>
                          )}
                          {result.pages && result.pages.length > 0 && (
                            <button
                              type="button"
                              onClick={() => onPreviewPage(result.pages![0])}
                              className="mt-1 ml-3 text-xs font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300"
                            >
                              {t('chat.firstSession')}
                            </button>
                          )}
                        </div>
                      )
                    }

                    return (
                      <div key={i} className="my-1 text-xs italic text-zinc-400 dark:text-zinc-500">
                        ✅ {t('chat.toolCompleted', { tool: toolName })}
                      </div>
                    )
                  }
                }

                if (part.type === 'text' && part.text) {
                  return (
                    <div key={i} className="whitespace-pre-wrap">
                      {part.text}
                    </div>
                  )
                }

                return null
              })}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-zinc-200/80 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
              <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500">
                <div className="animate-pulse">●</div>
                <div className="animate-pulse" style={{ animationDelay: '0.2s' }}>●</div>
                <div className="animate-pulse" style={{ animationDelay: '0.4s' }}>●</div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {t('chat.errorPrefix')} {error.message}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-zinc-200/80 bg-white/95 px-4 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 sm:px-6">
        <form onSubmit={onSubmit} className="flex items-end gap-2 sm:gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 self-end rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            title={t('chat.uploadFileTitle')}
          >
            📁
          </button>
          <textarea
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={onComposerKeyDown}
            rows={3}
            placeholder={
              fileUploaded ? t('chat.placeholderWithFile') : t('chat.placeholderNoFile')
            }
            className="min-h-[2.75rem] max-h-40 flex-1 resize-y rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-zinc-900 shadow-sm transition placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-600 dark:bg-zinc-950/50 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
          >
            {t('common.send')}
          </button>
        </form>
        {fileUploaded && uploadedSessionCount !== null && (
          <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            ✅ {t('chat.sessionsLoadedFromFile', { count: uploadedSessionCount })}
          </p>
        )}
      </div>
    </div>
  )
}
