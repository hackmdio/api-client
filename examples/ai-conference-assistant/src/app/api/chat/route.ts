/**
 * AI Chat API Route
 *
 * Session JSON is passed only into tool context (session_jq, generate_preview_pages),
 * not embedded in the system prompt. The model analyzes shape via session_jq first.
 */

import { convertToModelMessages, createGateway, streamText, stepCountIs, type UIMessage } from 'ai'
import { createTools } from '@/lib/tools'

export const maxDuration = 60

const SYSTEM_PROMPT = `You are a HackMD Conference Note Assistant (共筆小幫手). You help users design book-mode collaborative note systems for conferences.

## Tools (read the descriptions carefully)
1. **hackmd_get_me** — Verify API credentials and list teams
2. **hackmd_get_note** / **hackmd_get_team_notes** — Optional reference notes
3. **session_jq** — Query the **uploaded** session JSON on the server (jq-like). **Always use this first** to understand schema: \`length\` → \`keys\` → \`first 3\` or \`map\` a few fields. Never ask the user to paste full session JSON.
4. **generate_preview_pages** — Build **preview markdown only** (homepage + session pages) from server-side session data. You pass conference name, team path, options — **not** raw JSON. After preview, the user confirms in the UI; **you do not create HackMD notes**.

## Staged workflow
1. If needed, **hackmd_get_me** to align team path with the user.
2. If the app has session data loaded, **session_jq** repeatedly until you understand fields (types, time fields, rooms, speakers).
3. Ask only for **conference name**, **announcement embed**, exclusions, or template preferences — not for raw JSON.
4. Call **generate_preview_pages** when ready. The right panel shows markdown preview.
5. Real HackMD creation happens **only** when the user confirms the preview in the UI and starts creation — not via chat tools.

## Rules
- Do not ask users to paste or upload JSON in chat if the app already loaded a file (they use 📁 in the composer).
- Prefer short tool outputs; summarize shape in natural language.
- Respond in the user’s language (Chinese or English).
- Be concise.

## Reference: typical session object shape (for your mental model — actual fields vary)
\`\`\`json
{ "id": 1, "title": "…", "session_type": "talk", "started_at": "…", "speaker": [], "classroom": { "tw_name": "…" } }
\`\`\`
`

export async function POST(req: Request) {
  const body = await req.json()
  const { messages, config, sessionDataJson } = body as {
    messages: UIMessage[]
    config: {
      apiKey: string
      apiEndpoint: string
      teamPath: string
    }
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

  const trimmedSession = sessionDataJson?.trim()
  let sessionMeta = ''
  if (trimmedSession) {
    try {
      const parsed = JSON.parse(trimmedSession) as unknown
      const n = Array.isArray(parsed) ? parsed.length : 0
      sessionMeta = `\n\n## Session file in app\n${n} session record(s) are loaded on the server for **session_jq** / **generate_preview_pages** only. Raw JSON is **not** included in this prompt.`
    } catch {
      sessionMeta =
        '\n\n## Session file in app\nA session file is loaded (parse warning). Use **session_jq** to inspect.'
    }
  } else {
    sessionMeta =
      '\n\n## Session file\nNo session file is loaded yet. Ask the user to upload **sessions.json** via 📁 in the chat composer before analysis or preview.'
  }

  const tools = createTools(config.apiKey, config.apiEndpoint, {
    sessionDataJson: trimmedSession || null,
  })
  const uiMessages = Array.isArray(messages) ? messages : []
  const modelMessages = await convertToModelMessages(uiMessages, { tools })

  const system = SYSTEM_PROMPT + sessionMeta

  const gateway = createGateway({
    apiKey: aiGatewayApiKey,
    ...(process.env.AI_GATEWAY_BASE_URL && { baseURL: process.env.AI_GATEWAY_BASE_URL }),
  })

  const result = streamText({
    model: gateway('openai/gpt-5.4-mini'),
    system,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(15),
  })

  // `toTextStreamResponse()` strips non-text events — tool calls/results never reach the client,
  // so preview stays blank. UI message stream is required for tool parts in `useChat`.
  return result.toUIMessageStreamResponse()
}
