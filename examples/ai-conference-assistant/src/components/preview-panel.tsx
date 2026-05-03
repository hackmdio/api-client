'use client'

import type { GeneratedData } from '@/app/page'
import { useI18n } from '@/i18n/context'

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
  const { t } = useI18n()

  if (!generatedData && !previewPage) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-zinc-500 dark:text-zinc-400">
        <div className="mb-4 text-4xl opacity-90">📄</div>
        <p className="max-w-sm text-sm leading-relaxed">{t('preview.empty')}</p>
      </div>
    )
  }

  const currentPage = previewPage || generatedData?.homepage

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t('preview.panelTitle')}</h3>
        {generatedData && (
          <div className="mt-2 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => onSelectPage(generatedData.homepage)}
              className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                currentPage?.title === generatedData.homepage.title
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              📚 {t('preview.homepage')}
            </button>
            {generatedData.pages.slice(0, 10).map((page, i) => (
              <button
                type="button"
                key={i}
                onClick={() => onSelectPage(page)}
                className={`max-w-[120px] truncate rounded-md px-2 py-1 text-xs font-medium transition ${
                  currentPage?.title === page.title
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                }`}
                title={page.title}
              >
                {page.title.substring(0, 20)}...
              </button>
            ))}
            {generatedData.pages.length > 10 && (
              <span className="px-2 py-1 text-xs text-zinc-400 dark:text-zinc-500">
                {t('preview.morePages', { count: generatedData.pages.length - 10 })}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {currentPage && (
          <div>
            <h4 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">{currentPage.title}</h4>
            <pre className="whitespace-pre-wrap rounded-xl border border-zinc-200/80 bg-zinc-50 p-4 font-mono text-sm leading-relaxed text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-200">
              {currentPage.content}
            </pre>
          </div>
        )}
      </div>

      {generatedData && (
        <div className="shrink-0 space-y-3 border-t border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              className="mt-1 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 dark:border-zinc-600 dark:bg-zinc-900"
              checked={previewConfirmed}
              onChange={e => onPreviewConfirmedChange(e.target.checked)}
            />
            <span>{t('preview.confirmLabel')}</span>
          </label>
          <button
            type="button"
            onClick={onCreateNotes}
            disabled={!previewConfirmed}
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('preview.createButton', { count: generatedData.pages.length + 1 })}
          </button>
        </div>
      )}
    </div>
  )
}
