'use client'

import type { GeneratedData } from '@/app/page'

interface PreviewPanelProps {
  generatedData: GeneratedData | null
  previewPage: { title: string; content: string } | null
  onSelectPage: (page: { title: string; content: string }) => void
}

export function PreviewPanel({ generatedData, previewPage, onSelectPage }: PreviewPanelProps) {
  if (!generatedData && !previewPage) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
        <div className="text-4xl mb-4">📄</div>
        <p className="text-center">
          Markdown preview will appear here after the AI generates your conference notes.
        </p>
      </div>
    )
  }

  const currentPage = previewPage || generatedData?.homepage

  return (
    <div className="flex flex-col h-full">
      {/* Header with page selector */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 text-sm">Preview</h3>
        {generatedData && (
          <div className="mt-2 flex gap-1 flex-wrap">
            <button
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

      {/* Markdown content */}
      <div className="flex-1 overflow-y-auto p-4">
        {currentPage && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-3">{currentPage.title}</h4>
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono bg-gray-50 rounded-lg p-4 border border-gray-200 leading-relaxed">
              {currentPage.content}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
