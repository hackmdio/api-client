/**
 * AI Chat API Route
 *
 * Handles streaming chat with the AI agent. The agent has access to tools
 * for reading HackMD notes, querying session data, and generating pages.
 * Note creation is handled separately via /api/create-notes.
 */

import { streamText, stepCountIs, type ModelMessage } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
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
2. Ask about: conference name, team path, session data (user uploads JSON)
3. Use jq_query to analyze the session data shape and summarize it for the user
4. If user mentions a reference note, fetch it with hackmd_get_note
5. Use generate_pages to create all pages, show preview
6. User confirms → they click "Create Notes" button in the UI

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
  const { messages, config } = body as {
    messages: ModelMessage[]
    config: {
      apiKey: string
      apiEndpoint: string
      teamPath: string
      openaiApiKey: string
    }
  }

  if (!config?.apiKey) {
    return new Response(JSON.stringify({ error: 'HackMD API key is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!config?.openaiApiKey) {
    return new Response(JSON.stringify({ error: 'OpenAI API key is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const tools = createTools(config.apiKey, config.apiEndpoint)

  const openai = createOpenAI({ apiKey: config.openaiApiKey })

  const result = streamText({
    model: openai('gpt-4o'),
    system: SYSTEM_PROMPT,
    messages,
    tools,
    stopWhen: stepCountIs(10),
  })

  return result.toTextStreamResponse()
}
