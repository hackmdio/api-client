/**
 * Create Notes API Route
 *
 * Handles the actual creation of HackMD notes with rate-limit awareness
 * and progress streaming via Server-Sent Events.
 */

import { HackMDClient } from '@/lib/hackmd-client'

export const maxDuration = 300

interface CreateNotesRequest {
  config: {
    apiKey: string
    apiEndpoint: string
    teamPath: string
    webDomain: string
    conferenceName: string
    delayMs: number
  }
  homepage: {
    title: string
    content: string
  }
  pages: Array<{
    sessionId: string
    title: string
    content: string
  }>
}

export async function POST(req: Request) {
  const body = (await req.json()) as CreateNotesRequest
  const { config, homepage, pages } = body

  if (!config?.apiKey || !config?.teamPath) {
    return new Response(JSON.stringify({ error: 'Missing apiKey or teamPath' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const client = new HackMDClient({
    accessToken: config.apiKey,
    apiEndpoint: config.apiEndpoint,
  })

  const webDomain = config.webDomain || 'https://hackmd.io'
  const delayMs = Math.max(0, Math.min(config.delayMs || 300, 5000))

  // Stream progress via SSE
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const createdNotes: Record<string, string> = {} // sessionId -> shortId
      const errors: Array<{ sessionId: string; title: string; error: string }> = []
      let completed = 0
      const total = pages.length + 1 // +1 for homepage

      // Phase 1: Create individual session notes
      send({
        phase: 'creating-sessions',
        total,
        completed: 0,
        current: 'Starting...',
      })

      for (const page of pages) {
        try {
          send({
            phase: 'creating-sessions',
            total,
            completed,
            current: page.title,
          })

          const note = await client.createTeamNote(config.teamPath, {
            title: page.title,
            content: page.content,
            readPermission: 'guest',
            writePermission: 'signed_in',
          })

          createdNotes[page.sessionId] = note.shortId
          completed++

          send({
            phase: 'creating-sessions',
            total,
            completed,
            current: page.title,
            noteCreated: {
              sessionId: page.sessionId,
              title: page.title,
              shortId: note.shortId,
              url: `${webDomain}/${note.shortId}`,
            },
          })

          // Rate limit delay
          if (delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs))
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          errors.push({ sessionId: page.sessionId, title: page.title, error: message })
          completed++

          send({
            phase: 'creating-sessions',
            total,
            completed,
            current: page.title,
            error: { sessionId: page.sessionId, title: page.title, message },
          })

          // If it's a rate limit error, wait longer
          if (message.includes('429')) {
            await new Promise(resolve => setTimeout(resolve, 10000))
          } else if (delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs))
          }
        }
      }

      // Phase 2: Create homepage with actual note URLs
      send({
        phase: 'creating-book',
        total,
        completed,
        current: homepage.title,
      })

      try {
        // Replace placeholder URLs with actual shortIds
        let homepageContent = homepage.content
        for (const [sessionId, shortId] of Object.entries(createdNotes)) {
          homepageContent = homepageContent.replace(
            `/{noteUrl:${sessionId}}`,
            `/${shortId}`,
          )
        }
        // Remove lines with unresolved placeholders (failed sessions)
        homepageContent = homepageContent.replace(/^.*\/{noteUrl:[^}]+}.*\n?/gm, '')

        const mainNote = await client.createTeamNote(config.teamPath, {
          title: homepage.title,
          content: homepageContent,
          readPermission: 'guest',
          writePermission: 'signed_in',
        })

        completed++
        const mainBookUrl = `${webDomain}/${mainNote.shortId}`

        send({
          phase: 'done',
          total,
          completed,
          mainBookUrl,
          createdNotes: Object.entries(createdNotes).map(([sid, shortId]) => ({
            sessionId: sid,
            shortId,
            url: `${webDomain}/${shortId}`,
          })),
          errors,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        send({
          phase: 'error',
          total,
          completed,
          error: { message: `Failed to create homepage: ${message}` },
          createdNotes: Object.entries(createdNotes).map(([sid, shortId]) => ({
            sessionId: sid,
            shortId,
            url: `${webDomain}/${shortId}`,
          })),
          errors,
        })
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
