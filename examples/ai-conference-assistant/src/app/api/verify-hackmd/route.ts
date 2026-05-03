/**
 * Verifies HackMD credentials server-side. The HackMD API does not allow
 * browser origins (CORS), so /me must be called from the backend.
 */

import { createHackMDApi } from '@/lib/create-hackmd-api'

function httpStatusFromError(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null) return undefined
  const e = err as { response?: { status?: number }; code?: number }
  if (e.response?.status != null) return e.response.status
  if (typeof e.code === 'number') return e.code
  return undefined
}

export async function POST(req: Request) {
  const body = await req.json()
  const { apiKey, apiEndpoint, teamPath } = body as {
    apiKey?: string
    apiEndpoint?: string
    teamPath?: string
  }

  if (!apiKey?.trim()) {
    return Response.json({ error: 'HackMD API key is required' }, { status: 400 })
  }

  const client = createHackMDApi(apiKey, apiEndpoint)

  let user: { teams?: Array<{ path: string }> }
  try {
    user = await client.getMe()
  } catch (err) {
    const status = httpStatusFromError(err)
    if (status === undefined) {
      return Response.json(
        { error: 'Failed to reach HackMD API. Check the API endpoint URL.' },
        { status: 502 },
      )
    }
    return Response.json(
      { error: `HackMD API returned ${status}` },
      { status: status === 401 ? 401 : 502 },
    )
  }

  const teams = user.teams || []
  const trimmedTeam = teamPath?.trim()

  if (trimmedTeam && !teams.some((t) => t.path === trimmedTeam)) {
    const teamNames = teams.map((t) => t.path).join(', ')
    return Response.json(
      {
        error: `Team "${trimmedTeam}" not found. Available teams: ${teamNames || 'none'}`,
      },
      { status: 400 },
    )
  }

  return Response.json({
    teamPath: trimmedTeam || teams[0]?.path || '',
  })
}
