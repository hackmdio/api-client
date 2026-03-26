'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import {
  useState,
  useRef,
  useEffect,
  useMemo,
  type MutableRefObject,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import type { AppConfig, GeneratedData } from '@/app/page'

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

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: {
          config: {
            apiKey: config.apiKey,
            apiEndpoint: config.apiEndpoint,
            teamPath: config.teamPath,
          },
        },
        prepareSendMessagesRequest: ({ body, messages }) => {
          // `body` is only the static `config` from transport init; `messages` is passed separately and must be merged in.
          const merged: Record<string, unknown> = {
            ...(body as Record<string, unknown>),
            messages,
          }
          const json =
            localSessionJsonRef.current.trim() || sessionData.current.trim()
          // Server injects session JSON into tools only (session_jq / generate_preview_pages), not the system prompt.
          if (fileUploadedRef.current && json) {
            merged.sessionDataJson = json
          }
          return { body: merged }
        },
      }),
    [config.apiKey, config.apiEndpoint, config.teamPath],
  )

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
        alert('Invalid JSON file. Please upload a valid JSON file.')
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-gray-900">📚 Conference Assistant</h2>
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
            {config.teamPath}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {generatedData && (
            <button
              type="button"
              onClick={onCreateNotes}
              disabled={!previewConfirmed}
              title={
                previewConfirmed
                  ? 'Create notes on HackMD'
                  : 'Confirm preview in the preview column first'
              }
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              🚀 Create {generatedData.pages.length + 1} Notes
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Welcome message */}
        {messages.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              👋 Welcome! Let&apos;s create conference notes
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Upload your session data JSON, tell me about your conference, and I&apos;ll
              generate all the collaborative notes for you.
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm font-medium"
              >
                📁 Upload sessions.json
              </button>
              {fileUploaded && uploadedSessionCount !== null && (
                <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm">
                  ✅ {uploadedSessionCount} sessions loaded
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
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-800'
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
                      <div key={i} className="text-xs text-gray-400 italic my-1">
                        🔧 Calling {toolName}...
                      </div>
                    )
                  }

                  if (toolPart.state === 'output-error') {
                    return (
                      <div key={i} className="my-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                        {toolName}: {toolPart.errorText ?? 'Tool error'}
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
                          <div key={i} className="my-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
                            {result.error}
                          </div>
                        )
                      }

                      return (
                        <div
                          key={i}
                          className="my-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm"
                        >
                          <p className="font-medium text-green-800">
                            ✅ Preview: {result.summary || 'Pages ready — check the preview panel'}
                          </p>
                          <p className="text-xs text-green-700 mt-1">
                            Confirm the preview there, then use Create to publish to HackMD.
                          </p>
                          {result.homepage && (
                            <button
                              type="button"
                              onClick={() => onPreviewPage(result.homepage!)}
                              className="mt-1 text-xs text-green-600 hover:underline"
                            >
                              Open homepage in preview →
                            </button>
                          )}
                          {result.pages && result.pages.length > 0 && (
                            <button
                              type="button"
                              onClick={() => onPreviewPage(result.pages![0])}
                              className="mt-1 ml-3 text-xs text-green-600 hover:underline"
                            >
                              First session →
                            </button>
                          )}
                        </div>
                      )
                    }

                    return (
                      <div key={i} className="text-xs text-gray-400 italic my-1">
                        ✅ {toolName} completed
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
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-gray-400">
                <div className="animate-pulse">●</div>
                <div className="animate-pulse" style={{ animationDelay: '0.2s' }}>●</div>
                <div className="animate-pulse" style={{ animationDelay: '0.4s' }}>●</div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            Error: {error.message}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="px-6 py-4 bg-white border-t border-gray-200">
        <form onSubmit={onSubmit} className="flex gap-3 items-end">
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
            className="px-3 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-600 shrink-0 self-end"
            title="Upload sessions JSON"
          >
            📁
          </button>
          <textarea
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={onComposerKeyDown}
            rows={3}
            placeholder={
              fileUploaded
                ? 'Message… (Shift+Enter for new line, Enter to send)'
                : 'Upload session data or ask anything… (Shift+Enter for new line)'
            }
            className="flex-1 min-h-[2.75rem] max-h-40 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-gray-900 resize-y"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shrink-0"
          >
            Send
          </button>
        </form>
        {fileUploaded && uploadedSessionCount !== null && (
          <p className="text-xs text-green-600 mt-2">
            ✅ {uploadedSessionCount} sessions loaded from file
          </p>
        )}
      </div>
    </div>
  )
}
