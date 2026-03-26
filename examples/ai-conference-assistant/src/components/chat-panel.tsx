'use client'

import { useChat } from '@ai-sdk/react'
import { TextStreamChatTransport } from 'ai'
import { useState, useRef, useEffect, type MutableRefObject, type FormEvent } from 'react'
import type { AppConfig, GeneratedData } from '@/app/page'

interface ChatPanelProps {
  config: AppConfig
  sessionData: MutableRefObject<string>
  onSessionDataChange: (data: string) => void
  onGenerated: (data: GeneratedData) => void
  onCreateNotes: () => void
  onPreviewPage: (page: { title: string; content: string }) => void
  generatedData: GeneratedData | null
}

export function ChatPanel({
  config,
  sessionData,
  onSessionDataChange,
  onGenerated,
  onCreateNotes,
  onPreviewPage,
  generatedData,
}: ChatPanelProps) {
  const [fileUploaded, setFileUploaded] = useState(false)
  const [sessionDataSent, setSessionDataSent] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { messages, sendMessage, status, error } = useChat({
    transport: new TextStreamChatTransport({
      api: '/api/chat',
      body: {
        config: {
          apiKey: config.apiKey,
          apiEndpoint: config.apiEndpoint,
          teamPath: config.teamPath,
          openaiApiKey: config.openaiApiKey,
        },
      },
    }),
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      try {
        JSON.parse(text) // Validate JSON
        onSessionDataChange(text)
        setFileUploaded(true)
      } catch {
        alert('Invalid JSON file. Please upload a valid JSON file.')
      }
    }
    reader.readAsText(file)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    // If session data is available and hasn't been sent yet, include it
    let text = inputValue
    if (
      fileUploaded &&
      sessionData.current &&
      !sessionDataSent
    ) {
      const count = JSON.parse(sessionData.current).length
      text = `${inputValue}\n\n[Session data uploaded - ${count} sessions]\n<session_data>\n${sessionData.current}\n</session_data>`
      setSessionDataSent(true)
    }

    sendMessage({ text })
    setInputValue('')
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
              onClick={onCreateNotes}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
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
              {fileUploaded && (
                <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm">
                  ✅ {JSON.parse(sessionData.current).length} sessions loaded
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
                // Tool parts have type like 'tool-hackmd_get_me', 'tool-generate_pages', etc.
                if (part.type.startsWith('tool-')) {
                  const toolPart = part as { type: string; state: string; toolCallId: string; output?: unknown; title?: string }
                  const toolName = part.type.replace('tool-', '')

                  if (toolPart.state === 'call' || toolPart.state === 'input-streaming') {
                    return (
                      <div key={i} className="text-xs text-gray-400 italic my-1">
                        🔧 Calling {toolName}...
                      </div>
                    )
                  }

                  if (toolPart.state === 'result') {
                    // For generate_pages, show a compact summary with preview button
                    if (toolName === 'generate_pages' && toolPart.output) {
                      const result = toolPart.output as {
                        homepage?: { title: string; content: string }
                        pages?: Array<{ sessionId: string; title: string; content: string }>
                        summary?: string
                      }

                      // Capture generated data for preview panel
                      if (result.homepage && result.pages) {
                        queueMicrotask(() => {
                          onGenerated(result as GeneratedData)
                        })
                      }

                      return (
                        <div
                          key={i}
                          className="my-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm"
                        >
                          <p className="font-medium text-green-800">
                            ✅ {result.summary || 'Pages generated'}
                          </p>
                          {result.homepage && (
                            <button
                              onClick={() => onPreviewPage(result.homepage!)}
                              className="mt-1 text-xs text-green-600 hover:underline"
                            >
                              Preview homepage →
                            </button>
                          )}
                          {result.pages && result.pages.length > 0 && (
                            <button
                              onClick={() => onPreviewPage(result.pages![0])}
                              className="mt-1 ml-3 text-xs text-green-600 hover:underline"
                            >
                              Preview first session →
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
        <form onSubmit={onSubmit} className="flex gap-3">
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
            className="px-3 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-600"
            title="Upload sessions JSON"
          >
            📁
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder={
              fileUploaded
                ? 'Tell me about your conference...'
                : 'Upload session data first, or ask me anything...'
            }
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-gray-900"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Send
          </button>
        </form>
        {fileUploaded && (
          <p className="text-xs text-green-600 mt-2">
            ✅ {JSON.parse(sessionData.current).length} sessions loaded from file
          </p>
        )}
      </div>
    </div>
  )
}
