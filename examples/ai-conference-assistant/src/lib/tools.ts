/**
 * AI SDK tool definitions for the conference assistant agent.
 *
 * Session JSON stays server-side: **session_jq** and **generate_preview_pages** read the
 * uploaded file from tool context — the model never pastes full JSON into chat.
 */

import { tool } from 'ai'
import { z } from 'zod'
import { createHackMDApi } from './create-hackmd-api'

export interface SessionToolsOptions {
  /** Uploaded sessions JSON; only available to tools, not injected into the system prompt. */
  sessionDataJson?: string | null
}

/**
 * Create all read-only tools the AI agent can use during conversation.
 * HackMD note **creation** is not a tool — it runs from the UI after explicit confirmation.
 */
export function createTools(
  apiKey: string,
  apiEndpoint: string,
  options?: SessionToolsOptions,
) {
  const client = createHackMDApi(apiKey, apiEndpoint)
  const sessionJson = options?.sessionDataJson?.trim() ?? ''

  return {
    hackmd_get_me: tool({
      description: 'Get the current HackMD user info and list of teams. Use this to verify credentials and discover available teams.',
      inputSchema: z.object({}),
      execute: async () => {
        const user = await client.getMe()
        return {
          name: user.name,
          email: user.email,
          userPath: user.userPath,
          teams: user.teams.map((t: (typeof user.teams)[number]) => ({
            name: t.name,
            path: t.path,
            description: t.description,
          })),
        }
      },
    }),

    hackmd_get_note: tool({
      description: 'Fetch a single HackMD note by its ID or shortId. Returns the full content. Useful for reading reference/template notes from previous conferences.',
      inputSchema: z.object({
        noteId: z.string().describe('The note ID or shortId to fetch'),
      }),
      execute: async ({ noteId }) => {
        const note = await client.getNote(noteId)
        return {
          id: note.id,
          title: note.title,
          shortId: note.shortId,
          content: note.content,
          tags: note.tags,
          publishType: note.publishType,
        }
      },
    }),

    hackmd_get_team_notes: tool({
      description: 'List all notes in a team workspace. Returns note metadata (no content). Use to discover existing notes or find reference templates.',
      inputSchema: z.object({
        teamPath: z.string().describe('The team path (e.g. "my-team")'),
      }),
      execute: async ({ teamPath }) => {
        const notes = await client.getTeamNotes(teamPath)
        return notes.map((n: (typeof notes)[number]) => ({
          id: n.id,
          title: n.title,
          shortId: n.shortId,
          tags: n.tags,
          publishType: n.publishType,
          lastChangedAt: n.lastChangedAt,
        }))
      },
    }),

    session_jq: tool({
      description: `Run a jq-like query on the **uploaded session JSON** stored on the server. Do not paste raw session JSON in chat — use this tool to explore the data. **Always analyze first** before generating previews: start with \`length\`, then \`keys\`, then \`first 3\` or \`map\` a few fields.

Supported operations:
- "length" — count items
- "keys" — field names from first item (+ sample)
- "unique <field>" — unique values
- "group_by <field>" — group counts
- "select <field> <op> <value>" — filter (==, !=, contains)
- "map <field1> <field2> ..." — project fields
- "first [n]" — first n items
- "sort_by <field> [desc]" — sort
- "flat_map <field>" — flatten nested arrays`,
      inputSchema: z.object({
        query: z.string().describe('jq-like query string'),
      }),
      execute: async ({ query }) => {
        if (!sessionJson) {
          return {
            error:
              'No session file loaded. Ask the user to upload sessions.json using the paperclip control in the chat composer.',
          }
        }
        return executeJqQuery(query, sessionJson)
      },
    }),

    generate_preview_pages: tool({
      description: `Build **preview-only** markdown (book-mode style homepage + session pages) from the uploaded session data. Uses server-side JSON — you do not pass sessionsJson. Call after session_jq shows the shape and the user confirmed conference name / preferences. Does **not** create HackMD notes; the user reviews the preview in the UI, confirms, then starts real creation from the preview panel.`,
      inputSchema: z.object({
        conferenceName: z.string().describe('Conference display name'),
        teamPath: z.string().describe('HackMD team path (from app setup or user)'),
        announcementNote: z
          .string()
          .optional()
          .describe('HackMD announcement embed (e.g. "@team/note-id")'),
        excludeTypes: z
          .array(z.string())
          .optional()
          .describe('Session titles/types to skip, e.g. Break, Lunch'),
        pageTemplate: z
          .string()
          .optional()
          .describe('Optional markdown template with {title}, {time}, {room}, {announcement}, {tags}, {speakers}, …'),
        webDomain: z.string().optional().describe('For links in copy; creation uses app web domain'),
      }),
      execute: async ({
        conferenceName,
        announcementNote,
        excludeTypes,
        pageTemplate,
      }) => {
        if (!sessionJson) {
          return {
            error:
              'No session file loaded. Ask the user to upload sessions.json before generating a preview.',
          }
        }
        return {
          ...generateAllPages({
            conferenceName,
            sessionsJson: sessionJson,
            announcementNote: announcementNote || '',
            excludeTypes: excludeTypes || [],
            pageTemplate,
          }),
          preview: true as const,
        }
      },
    }),
  }
}

// ============================================================
// jq-like query engine (token-efficient data analysis)
// ============================================================

function executeJqQuery(query: string, dataStr: string): unknown {
  let data: unknown
  try {
    data = JSON.parse(dataStr)
  } catch {
    return { error: 'Invalid JSON data' }
  }

  const arr = Array.isArray(data) ? data : [data]
  const parts = query.trim().split(/\s+/)
  const cmd = parts[0]

  switch (cmd) {
    case 'length':
      return { count: arr.length }

    case 'keys': {
      if (arr.length === 0) return { keys: [] }
      return { keys: Object.keys(arr[0] as Record<string, unknown>), sample: arr[0] }
    }

    case 'unique': {
      const field = parts[1]
      if (!field) return { error: 'Usage: unique <field>' }
      const values = [...new Set(arr.map(item => getNestedValue(item, field)))]
      return { field, uniqueValues: values, count: values.length }
    }

    case 'group_by': {
      const field = parts[1]
      if (!field) return { error: 'Usage: group_by <field>' }
      const groups: Record<string, number> = {}
      for (const item of arr) {
        const val = String(getNestedValue(item, field) ?? 'null')
        groups[val] = (groups[val] || 0) + 1
      }
      return { field, groups, totalGroups: Object.keys(groups).length }
    }

    case 'select': {
      const field = parts[1]
      const op = parts[2]
      const value = parts.slice(3).join(' ')
      if (!field || !op) return { error: 'Usage: select <field> <op> <value>' }
      const filtered = arr.filter(item => {
        const v = getNestedValue(item, field)
        switch (op) {
          case '==': return String(v) === value
          case '!=': return String(v) !== value
          case 'contains': return String(v).includes(value)
          default: return false
        }
      })
      return { count: filtered.length, results: filtered }
    }

    case 'map': {
      const fields = parts.slice(1)
      if (fields.length === 0) return { error: 'Usage: map <field1> <field2> ...' }
      const mapped = arr.map(item => {
        const result: Record<string, unknown> = {}
        for (const f of fields) {
          result[f] = getNestedValue(item, f)
        }
        return result
      })
      return mapped
    }

    case 'first': {
      const n = parseInt(parts[1] || '1', 10)
      return arr.slice(0, n)
    }

    case 'sort_by': {
      const field = parts[1]
      const desc = parts[2] === 'desc'
      if (!field) return { error: 'Usage: sort_by <field> [desc]' }
      const sorted = [...arr].sort((a, b) => {
        const va = String(getNestedValue(a, field) ?? '')
        const vb = String(getNestedValue(b, field) ?? '')
        return desc ? vb.localeCompare(va) : va.localeCompare(vb)
      })
      return sorted
    }

    case 'flat_map': {
      const field = parts[1]
      if (!field) return { error: 'Usage: flat_map <field>' }
      const results: unknown[] = []
      for (const item of arr) {
        const val = getNestedValue(item, field)
        if (Array.isArray(val)) {
          results.push(...val)
        } else {
          results.push(val)
        }
      }
      return { count: results.length, results }
    }

    default:
      return {
        error: `Unknown command: ${cmd}`,
        help: 'Supported: length, keys, unique <field>, group_by <field>, select <field> <op> <value>, map <fields...>, first [n], sort_by <field> [desc], flat_map <field>',
      }
  }
}

function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

// ============================================================
// Page generation
// ============================================================

interface GenerateOptions {
  conferenceName: string
  sessionsJson: string
  announcementNote: string
  excludeTypes: string[]
  pageTemplate?: string
}

interface ProcessedSession {
  id: string
  title: string
  speakers: string
  startDate: string
  day: string
  startTime: string
  endTime: string
  sessionType: string
  classroom: string
  language: string
  difficulty: string
  tags: string[]
}

/** Default session titles to exclude from note generation (non-content sessions) */
const DEFAULT_EXCLUDE_TYPES = ['報到時間', '開幕', '閉幕', 'Opening', 'Closing', 'Break', 'Lunch', '休息時間', '午餐']

function processSessions(raw: string, excludeTypes: string[], conferenceName: string): ProcessedSession[] {
  const sessions = JSON.parse(raw)
  if (!Array.isArray(sessions)) throw new Error('Session data must be an array')

  const allExclude = [...DEFAULT_EXCLUDE_TYPES, ...excludeTypes]

  return sessions
    .filter((s: Record<string, unknown>) => {
      if (!s.session_type) return false
      const title = String(s.title || '').trim()
      return !allExclude.includes(title)
    })
    .map((s: Record<string, unknown>) => {
      const speakers = Array.isArray(s.speaker)
        ? (s.speaker as Array<{ speaker: { public_name: string } }>)
            .map(sp => sp.speaker.public_name)
            .join('、')
        : ''

      const startedAt = new Date(s.started_at as string)
      const finishedAt = new Date(s.finished_at as string)
      const classroom = s.classroom as { tw_name?: string; en_name?: string } | undefined

      return {
        id: String(s.id),
        title: String(s.title) + (speakers ? ` - ${speakers}` : ''),
        speakers,
        startDate: startedAt.toISOString(),
        day: `${String(startedAt.getMonth() + 1).padStart(2, '0')}/${String(startedAt.getDate()).padStart(2, '0')}`,
        startTime: `${String(startedAt.getHours()).padStart(2, '0')}:${String(startedAt.getMinutes()).padStart(2, '0')}`,
        endTime: `${String(finishedAt.getHours()).padStart(2, '0')}:${String(finishedAt.getMinutes()).padStart(2, '0')}`,
        sessionType: String(s.session_type || ''),
        classroom: classroom?.tw_name || classroom?.en_name || 'TBD',
        language: String(s.language || 'en'),
        difficulty: String(s.difficulty || 'General'),
        tags: [conferenceName, ...((s.tags || []) as string[])],
      }
    })
    .sort((a: ProcessedSession, b: ProcessedSession) => a.startDate.localeCompare(b.startDate))
}

function generateSessionPage(session: ProcessedSession, announcementNote: string, conferenceName: string, customTemplate?: string): string {
  if (customTemplate) {
    return customTemplate
      .replace(/\{title\}/g, session.title)
      .replace(/\{time\}/g, `${session.startTime} ~ ${session.endTime}`)
      .replace(/\{room\}/g, session.classroom)
      .replace(/\{announcement\}/g, announcementNote ? `{%hackmd ${announcementNote} %}` : '')
      .replace(/\{tags\}/g, conferenceName)
      .replace(/\{speakers\}/g, session.speakers)
      .replace(/\{difficulty\}/g, session.difficulty)
      .replace(/\{language\}/g, session.language)
  }

  return `# ${session.title}

**Time:** ${session.startTime} ~ ${session.endTime} | **Room:** ${session.classroom}
${announcementNote ? `\n{%hackmd ${announcementNote} %}\n` : ''}
> ==投影片==
> （講者請在此放置投影片連結）

> ==Q & A==
> （講者 Q&A 相關連結）

## 📝 筆記區
> 請從這裡開始記錄你的筆記



## ❓ Q&A 區域
> 講者問答與現場互動



## 💬 討論區
> 歡迎在此進行討論與交流



###### tags: \`${conferenceName}\`
`
}

function generateHomepage(sessions: ProcessedSession[], conferenceName: string): string {
  // Group by day, then by start time
  const byDay: Record<string, ProcessedSession[]> = {}
  for (const s of sessions) {
    if (!byDay[s.day]) byDay[s.day] = []
    byDay[s.day].push(s)
  }

  let bookContent = ''
  const sortedDays = Object.keys(byDay).sort()
  for (const day of sortedDays) {
    bookContent += `## ${day}\n\n`
    const daySessions = byDay[day].sort((a, b) => a.startTime.localeCompare(b.startTime))
    for (const s of daySessions) {
      // Placeholder links — will be replaced with actual shortIds after creation
      bookContent += `- ${s.startTime} ~ ${s.endTime} [${s.title}](/{noteUrl:${s.id}}) (${s.classroom})\n`
    }
    bookContent += '\n'
  }

  return `${conferenceName} 共同筆記
===

## 歡迎來到 ${conferenceName}！

- [HackMD 快速入門](https://hackmd.io/s/BJvtP4zGX)
- [HackMD 會議功能介紹](https://hackmd.io/s/BJHWlNQMX)

## 議程筆記

${bookContent}
###### tags: \`${conferenceName}\`
`
}

function generateAllPages(options: GenerateOptions) {
  const sessions = processSessions(options.sessionsJson, options.excludeTypes, options.conferenceName)

  const pages = sessions.map(s => ({
    sessionId: s.id,
    title: s.title,
    content: generateSessionPage(s, options.announcementNote, options.conferenceName, options.pageTemplate),
  }))

  const homepage = {
    title: `${options.conferenceName} 共同筆記`,
    content: generateHomepage(sessions, options.conferenceName),
  }

  return {
    homepage,
    pages,
    totalPages: pages.length + 1,
    summary: `Generated ${pages.length} session pages + 1 homepage for ${options.conferenceName}`,
  }
}
