'use client'

import type { GeneratedData } from '@/app/page'

interface PreviewPanelProps {
  generatedData: GeneratedData | null
  previewPage: { title: string; content: string } | null
  onSelectPage: (page: { title: string; content: string }) => void
  previewConfirmed: boolean
  onPreviewConfirmedChange: (confirmed: boolean) => void
  onCreateNotes: () => void
}

export function PreviewPanel({
  generatedData,
  previewPage,
  onSelectPage,
  previewConfirmed,
  onPreviewConfirmedChange,
  onCreateNotes,
}: PreviewPanelProps) {
  if (!generatedData && !previewPage) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
        <div className="text-4xl mb-4">📄</div>
        <p className="text-center">
          After the assistant runs <strong>generate_preview_pages</strong>, homepage and session pages appear here.
          Session data is analyzed with <strong>session_jq</strong> on the server — nothing huge is pasted in chat.
        </p>
      </div>
    )
  }

  const currentPage = previewPage || generatedData?.homepage

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-3 border-b border-gray-200 shrink-0">
        <h3 className="font-semibold text-gray-900 text-sm">Preview (book mode)</h3>
        {generatedData && (
          <div className="mt-2 flex gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => onSelectPage(generatedData.homepage)}
              className={`text-xs px-2 py-1 rounded ${
                currentPage?.title === generatedData.homepage.title
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              📚 Homepage
            </button>
            {generatedData.pages.slice(0, 10).map((page, i) => (
              <button
                type="button"
                key={i}
                onClick={() => onSelectPage(page)}
                className={`text-xs px-2 py-1 rounded truncate max-w-[120px] ${
                  currentPage?.title === page.title
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={page.title}
              >
                {page.title.substring(0, 20)}...
              </button>
            ))}
            {generatedData.pages.length > 10 && (
              <span className="text-xs text-gray-400 px-2 py-1">
                +{generatedData.pages.length - 10} more
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {currentPage && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-3">{currentPage.title}</h4>
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono bg-gray-50 rounded-lg p-4 border border-gray-200 leading-relaxed">
              {currentPage.content}
            </pre>
          </div>
        )}
      </div>

      {generatedData && (
        <div className="border-t border-gray-200 p-4 bg-gray-50 shrink-0 space-y-3">
          <label className="flex items-start gap-2 cursor-pointer text-sm text-gray-700">
            <input
              type="checkbox"
              className="mt-1 rounded border-gray-300"
              checked={previewConfirmed}
              onChange={e => onPreviewConfirmedChange(e.target.checked)}
            />
            <span>
              I confirm this preview matches what I want on HackMD. Real notes are created only after I click
              the button below.
            </span>
          </label>
          <button
            type="button"
            onClick={onCreateNotes}
            disabled={!previewConfirmed}
            className="w-full px-4 py-3 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Create {generatedData.pages.length + 1} notes on HackMD
          </button>
        </div>
      )}
    </div>
  )
}
