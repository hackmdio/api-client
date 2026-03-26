# HackMD Conference Assistant (AI-Powered)

A web-based AI assistant that helps you create book-mode collaborative note systems for conferences using the HackMD API. Built with Next.js, Vercel AI SDK, and the `@hackmd/api` client.

## Features

- **Chat Interface**: Conversational AI that guides you through conference note creation
- **Session Data Analysis**: Upload your conference session JSON; the AI uses a jq-like tool to efficiently analyze the data shape without consuming excessive tokens
- **Reference Note Fetching**: Point the AI to an existing HackMD note (e.g., last year's conference) and it will analyze the format
- **Markdown Preview**: Preview the generated homepage and all session pages before creating
- **Rate-Limit-Aware Creation**: Batch note creation with configurable delay and real-time progress tracking via SSE
- **Frontend API Key Entry**: No server-side secrets needed — provide your HackMD and OpenAI API keys from the browser

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Browser (React)                 │
│                                                  │
│  ┌──────────────┐  ┌──────────┐  ┌───────────┐  │
│  │  Setup Panel  │  │  Chat UI │  │  Preview   │  │
│  │  (API keys)   │  │  (useChat)│  │  (Markdown)│  │
│  └──────┬───────┘  └────┬─────┘  └───────────┘  │
│         │               │                        │
└─────────┼───────────────┼────────────────────────┘
          │               │
          ▼               ▼
┌──────────────────────────────────────────────────┐
│              Next.js API Routes                   │
│                                                   │
│  POST /api/chat          POST /api/create-notes   │
│  ├─ AI SDK streamText    ├─ SSE progress stream   │
│  ├─ hackmd_get_me        ├─ createTeamNote loop   │
│  ├─ hackmd_get_note      ├─ Rate limit delay      │
│  ├─ hackmd_get_team_notes└─ Homepage with links   │
│  ├─ jq_query                                      │
│  └─ generate_pages                                │
└──────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- A [HackMD API token](https://hackmd.io/settings/api)
- An [OpenAI API key](https://platform.openai.com/api-keys)

### Setup

```bash
# From the repository root
cd examples/ai-conference-assistant

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Usage

1. **Enter your credentials** — HackMD API key, OpenAI API key, and team path
2. **Upload session data** — Click the 📁 button to upload your `sessions.json`
3. **Chat with the AI** — Tell it about your conference, reference notes, customizations
4. **Preview** — The AI generates pages; preview them in the right panel
5. **Create Notes** — Click "Create Notes", configure the delay, and watch progress

### Sample Session Data

A sample `sessions.json` is included at `public/sample-sessions.json`. The expected format:

```json
[
  {
    "id": "session-001",
    "title": "Opening Keynote",
    "speaker": [{ "speaker": { "public_name": "John Doe" } }],
    "session_type": "keynote",
    "started_at": "2025-03-15T09:00:00Z",
    "finished_at": "2025-03-15T09:30:00Z",
    "tags": ["keynote"],
    "classroom": { "tw_name": "主舞台", "en_name": "Main Stage" },
    "language": "en",
    "difficulty": "General"
  }
]
```

## AI Tools

The AI agent has access to these tools during conversation:

| Tool | Purpose |
|------|---------|
| `hackmd_get_me` | Verify credentials, discover teams |
| `hackmd_get_note` | Read existing notes for reference |
| `hackmd_get_team_notes` | List team workspace notes |
| `jq_query` | Token-efficient session data analysis (length, keys, group_by, select, map, sort_by, unique, etc.) |
| `generate_pages` | Generate homepage + all session pages for preview |

## Rate Limiting

When creating notes, the tool includes:
- Configurable delay between API requests (default: 300ms, recommended: 200-500ms)
- Automatic 10-second pause on 429 (rate limit) errors
- Real-time progress streaming via Server-Sent Events
- Per-note error tracking with continuation

## Tech Stack

- **Next.js 16** — React framework with App Router
- **Vercel AI SDK** — Streaming AI chat with tool use
- **Tailwind CSS** — Styling
- **HackMD REST API** — Note creation (via fetch wrapper)
