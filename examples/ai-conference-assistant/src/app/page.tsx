'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { SetupPanel } from '@/components/setup-panel'
import { ChatPanel } from '@/components/chat-panel'
import { PreviewPanel } from '@/components/preview-panel'
import { ProgressModal } from '@/components/progress-modal'

export interface AppConfig {
  apiKey: string
  apiEndpoint: string
  teamPath: string
  webDomain: string
}

export interface GeneratedData {
  homepage: { title: string; content: string }
  pages: Array<{ sessionId: string; title: string; content: string }>
}

export default function Home() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [sessionData, setSessionData] = useState<string>('')
  const [generatedData, setGeneratedDataState] = useState<GeneratedData | null>(null)
  /** User explicitly confirms the preview before HackMD creation is allowed. */
  const [previewConfirmed, setPreviewConfirmed] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [previewPage, setPreviewPage] = useState<{ title: string; content: string } | null>(null)
  const sessionDataRef = useRef(sessionData)
  useEffect(() => { sessionDataRef.current = sessionData }, [sessionData])

  const setGeneratedData = useCallback((data: GeneratedData | null) => {
    setGeneratedDataState(data)
    setPreviewConfirmed(false)
  }, [])

  if (!config) {
    return <SetupPanel onConfigured={setConfig} />
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen min-h-0 bg-zinc-50 dark:bg-zinc-950">
      {/* Chat */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 lg:max-w-[calc(100%-480px)]">
        <ChatPanel
          config={config}
          sessionData={sessionDataRef}
          onSessionDataChange={setSessionData}
          onGenerated={setGeneratedData}
          onCreateNotes={() => setShowProgress(true)}
          onPreviewPage={setPreviewPage}
          generatedData={generatedData}
          previewConfirmed={previewConfirmed}
        />
      </div>

      {/* Preview + confirm + create (always mounted so narrow screens can confirm before HackMD) */}
      <div className="h-[min(42vh,420px)] lg:h-auto lg:w-[480px] flex-shrink-0 flex flex-col min-h-0 border-t border-zinc-200/80 bg-white shadow-[inset_0_1px_0_0_rgba(0,0,0,0.03)] dark:border-zinc-800 dark:bg-zinc-900 lg:border-t-0 lg:border-l">
        <PreviewPanel
          generatedData={generatedData}
          previewPage={previewPage}
          onSelectPage={setPreviewPage}
          previewConfirmed={previewConfirmed}
          onPreviewConfirmedChange={setPreviewConfirmed}
          onCreateNotes={() => setShowProgress(true)}
        />
      </div>

      {/* Progress Modal */}
      {showProgress && generatedData && (
        <ProgressModal
          config={config}
          generatedData={generatedData}
          onClose={() => setShowProgress(false)}
        />
      )}
    </div>
  )
}
