'use client'

import { useState, useRef } from 'react'
import { SetupPanel } from '@/components/setup-panel'
import { ChatPanel } from '@/components/chat-panel'
import { PreviewPanel } from '@/components/preview-panel'
import { ProgressModal } from '@/components/progress-modal'

export interface AppConfig {
  apiKey: string
  openaiApiKey: string
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
  const [generatedData, setGeneratedData] = useState<GeneratedData | null>(null)
  const [showProgress, setShowProgress] = useState(false)
  const [previewPage, setPreviewPage] = useState<{ title: string; content: string } | null>(null)
  const sessionDataRef = useRef(sessionData)
  sessionDataRef.current = sessionData

  if (!config) {
    return <SetupPanel onConfigured={setConfig} />
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left: Chat Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatPanel
          config={config}
          sessionData={sessionDataRef}
          onSessionDataChange={setSessionData}
          onGenerated={setGeneratedData}
          onCreateNotes={() => setShowProgress(true)}
          onPreviewPage={setPreviewPage}
          generatedData={generatedData}
        />
      </div>

      {/* Right: Preview Panel */}
      <div className="w-[480px] border-l border-gray-200 bg-white flex-shrink-0 hidden lg:flex flex-col">
        <PreviewPanel
          generatedData={generatedData}
          previewPage={previewPage}
          onSelectPage={setPreviewPage}
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
