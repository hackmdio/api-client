/**
 * AI Chat API Route
 *
 * Handles streaming chat with the AI agent. The agent has access to tools
 * for reading HackMD notes, querying session data, and generating pages.
 * Note creation is handled separately via /api/create-notes.
 */

import { convertToModelMessages, createGateway, streamText, stepCountIs, type UIMessage } from 'ai'
import { createTools } from '@/lib/tools'

export const maxDuration = 60

const SYSTEM_PROMPT = `You are a HackMD Conference Note Assistant (共筆小幫手). You help users create book-mode collaborative note systems for conferences.

## Your Capabilities
You have tools to:
1. **hackmd_get_me** — Verify API credentials and discover available teams
2. **hackmd_get_note** — Read existing notes for reference/templates
3. **hackmd_get_team_notes** — List notes in a team workspace
4. **jq_query** — Analyze session data efficiently (counts, grouping, field extraction)
5. **generate_pages** — Generate all conference note pages for preview

## Workflow
1. First, if the user hasn't verified their setup, call hackmd_get_me to check credentials
2. Ask about conference name and preferences. **Only** if there is no \`<session_data>\` block in your instructions for this request, ask them to upload session JSON in the UI. If \`<session_data>\` is present, session data is already loaded — do not ask for upload or paste.
3. Use jq_query to analyze the session data shape and summarize it for the user
4. If user mentions a reference note, fetch it with hackmd_get_note
5. Use generate_pages to create all pages, show preview
6. User confirms → they click "Create Notes" button in the UI

## When session data is already provided
If this request includes an \`<session_data>\` section below, the user has already uploaded sessions in the app. **Do not** ask them to upload or paste JSON again. Start with jq_query or answer their question using that data.

## Important Notes
- Always use jq_query first to understand data shape before generating pages — this saves tokens
- When showing previews, show the homepage and 1-2 sample session pages
- The actual note creation is handled by the frontend UI with progress tracking
- Respond in the same language the user uses (Chinese or English)
- Be concise but helpful

## Session Data Format
The expected session data format follows the conference session JSON pattern:
\`\`\`json
{
  "id": "session-001",
  "title": "Talk Title",
  "speaker": [{ "speaker": { "public_name": "Name" } }],
  "session_type": "talk",
  "started_at": "2025-03-15T09:00:00Z",
  "finished_at": "2025-03-15T09:30:00Z",
  "tags": ["tag1"],
  "classroom": { "tw_name": "教室A", "en_name": "Room A" }
}
\`\`\`
But you should use jq_query to discover the actual shape of uploaded data and adapt accordingly.`

export async function POST(req: Request) {
  const body = await req.json()
  const { messages, config, sessionDataJson } = body as {
    messages: UIMessage[]
    config: {
      apiKey: string
      apiEndpoint: string
      teamPath: string
    }
    /** Raw session JSON; sent out-of-band so the chat UI does not embed huge payloads. */
    sessionDataJson?: string
  }

  if (!config?.apiKey) {
    return new Response(JSON.stringify({ error: 'HackMD API key is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const aiGatewayApiKey = process.env.AI_GATEWAY_API_KEY
  if (!aiGatewayApiKey) {
    return new Response(
      JSON.stringify({
        error: 'Server misconfiguration: AI_GATEWAY_API_KEY is not set',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  const tools = createTools(config.apiKey, config.apiEndpoint)
  const uiMessages = Array.isArray(messages) ? messages : []
  const modelMessages = await convertToModelMessages(uiMessages, { tools })

  let system = SYSTEM_PROMPT
  if (sessionDataJson?.trim()) {
    try {
      const parsed = JSON.parse(sessionDataJson) as unknown
      const n = Array.isArray(parsed) ? parsed.length : 0
      system += `\n\n## Uploaded session data (${n} sessions) — attached by the app on every request while a file is loaded\n**You must not ask the user to upload or paste session JSON** — it is already in \`<session_data>\`. Use jq_query on this JSON. Use generate_pages with sessionsJson from this data when generating pages.\n\n<session_data>\n${sessionDataJson}\n</session_data>`
    } catch {
      system += `\n\n## Uploaded session data — attached by the app; do not ask for upload/paste\n<session_data>\n${sessionDataJson}\n</session_data>`
    }
  }

  const gateway = createGateway({
    apiKey: aiGatewayApiKey,
    ...(process.env.AI_GATEWAY_BASE_URL && { baseURL: process.env.AI_GATEWAY_BASE_URL }),
  })

  const result = streamText({
    model: gateway('openai/gpt-5.4-mini'),
    system,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(10),
  })

  return result.toTextStreamResponse()
}
