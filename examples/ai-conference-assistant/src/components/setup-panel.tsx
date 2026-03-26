'use client'

import { useState, type FormEvent } from 'react'
import type { AppConfig } from '@/app/page'

interface SetupPanelProps {
  onConfigured: (config: AppConfig) => void
}

export function SetupPanel({ onConfigured }: SetupPanelProps) {
  const [apiKey, setApiKey] = useState('')
  const [openaiApiKey, setOpenaiApiKey] = useState('')
  const [apiEndpoint, setApiEndpoint] = useState('https://api.hackmd.io/v1')
  const [teamPath, setTeamPath] = useState('')
  const [webDomain, setWebDomain] = useState('https://hackmd.io')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setVerifying(true)

    try {
      // Verify HackMD credentials
      const res = await fetch(`${apiEndpoint}/me`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (!res.ok) {
        throw new Error(`HackMD API returned ${res.status}: ${res.statusText}`)
      }
      const user = await res.json()
      const teams = user.teams || []
      const hasTeam = !teamPath || teams.some((t: { path: string }) => t.path === teamPath)

      if (teamPath && !hasTeam) {
        const teamNames = teams.map((t: { path: string }) => t.path).join(', ')
        throw new Error(
          `Team "${teamPath}" not found. Available teams: ${teamNames || 'none'}`,
        )
      }

      onConfigured({
        apiKey,
        openaiApiKey,
        apiEndpoint,
        teamPath: teamPath || teams[0]?.path || '',
        webDomain,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📚 HackMD Conference Assistant</h1>
          <p className="text-gray-500 mt-2">
            AI-powered collaborative note generator for conferences
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              HackMD API Key <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Your HackMD access token"
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-gray-900"
            />
            <p className="text-xs text-gray-400 mt-1">
              Get from{' '}
              <a
                href="https://hackmd.io/settings/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                hackmd.io/settings/api
              </a>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              OpenAI API Key <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={openaiApiKey}
              onChange={e => setOpenaiApiKey(e.target.value)}
              placeholder="sk-..."
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team Path <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={teamPath}
              onChange={e => setTeamPath(e.target.value)}
              placeholder="e.g. my-team"
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-gray-900"
            />
          </div>

          <details className="group">
            <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
              Advanced settings ▸
            </summary>
            <div className="mt-3 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Endpoint
                </label>
                <input
                  type="url"
                  value={apiEndpoint}
                  onChange={e => setApiEndpoint(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Web Domain
                </label>
                <input
                  type="url"
                  value={webDomain}
                  onChange={e => setWebDomain(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-gray-900"
                />
              </div>
            </div>
          </details>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={verifying || !apiKey || !openaiApiKey}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {verifying ? 'Verifying...' : 'Start →'}
          </button>
        </form>
      </div>
    </div>
  )
}
