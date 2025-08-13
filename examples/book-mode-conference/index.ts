#!/usr/bin/env tsx
/**
 * Production-Ready Book Mode Conference Note Generator
 *
 * This script generates a "book mode" conference note system using HackMD API with
 * production-ready features including resume functionality, progress tracking, and
 * comprehensive error handling.
 *
 * Based on proven patterns from large-scale conference implementations.
 *
 * Features:
 * - Resume interrupted executions (--resume flag)
 * - Progress tracking with automatic backups
 * - Rate limiting and request delay controls
 * - Comprehensive CLI help and configuration
 * - Production-ready error handling
 * - Test mode for safe development
 *
 * Prerequisites:
 * - HackMD access token (set in HACKMD_ACCESS_TOKEN environment variable)
 * - Team path where notes will be created
 * - Session data in JSON format
 */

'use strict'

// Load environment variables from .env file
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

// Get the current directory for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env file from the same directory as this script
dotenv.config({ path: path.join(__dirname, '.env') })

import _ from 'lodash'
import moment from 'moment'
import { API } from '@hackmd/api'
import fs from 'fs'

// ==========================================
// CLI HELP AND ARGUMENT PARSING
// ==========================================

if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
🎯 Production-Ready Conference Note Generator

Usage: npx tsx index.ts [options]

Options:
  --test                 Test mode - create only first 3 sessions
  --resume               Resume from previous interrupted execution
  --delay-ms <number>    Add a fixed delay (ms) between API requests
  --help, -h             Show this help message

Environment Variables:
  TEST_MODE=true|false        Same as --test
  RESUME_MODE=true|false      Same as --resume
  REQUEST_DELAY_MS=number     Same as --delay-ms
  HACKMD_ACCESS_TOKEN=token   HackMD API token (required)
  HACKMD_API_ENDPOINT=url     HackMD API endpoint (optional)
  HACKMD_WEB_DOMAIN=url       HackMD web domain (optional)

Resume Feature (Production Critical):
  If the script fails during execution, it saves progress to progress.json.
  Use --resume to continue from where it left off.

  Example production workflow:
    1. npx tsx index.ts --delay-ms 500     # Start with 500ms delay
    2. Script fails after 50 notes         # Due to limits or network issues
    3. Wait 5-10 minutes                   # Let rate limits reset
    4. npx tsx index.ts --resume           # Continue from note 51

Production Tips:
  - Always use --delay-ms in production (recommend 200-500ms)
  - Monitor API rate limits and adjust delays accordingly
  - Keep progress.json file until completion for recovery
  - Use --test first to validate configuration

Examples:
  npx tsx index.ts --test                 # Test with 3 sessions
  npx tsx index.ts --delay-ms 300         # Production run with 300ms delay
  npx tsx index.ts --resume --delay-ms 500 # Resume with 500ms delay
`)
    process.exit(0)
}

// Parse CLI arguments
const TEST_MODE = process.env.TEST_MODE === 'true' || process.argv.includes('--test')
const RESUME_MODE = process.env.RESUME_MODE === 'true' || process.argv.includes('--resume')
const PROGRESS_FILE = path.join(__dirname, 'progress.json')

// Parse request delay
const ENV_REQUEST_DELAY_MS = parseInt(process.env.REQUEST_DELAY_MS || '0', 10)
let CLI_REQUEST_DELAY_MS = ENV_REQUEST_DELAY_MS
const delayFlagIndex = process.argv.indexOf('--delay-ms')
if (delayFlagIndex !== -1 && process.argv[delayFlagIndex + 1]) {
    const parsed = parseInt(process.argv[delayFlagIndex + 1], 10)
    if (!Number.isNaN(parsed)) CLI_REQUEST_DELAY_MS = parsed
}

// ==========================================
// CONFIGURATION CONSTANTS
// ==========================================

// ==========================================
// CONFIGURATION - CUSTOMIZE THESE VALUES
// ==========================================

// HackMD announcement note to embed in each session note
const ANNOUNCEMENT_NOTE = '@TechConf/announcement-note-id'

// Team path where notes will be created
const TEAM_PATH = 'TechConf'

// Conference name for titles and content
const CONFERENCE_NAME = 'TechConf 2025'

// Sessions to exclude from note generation (customize as needed)
const EXCLUDE_SESSIONS = [
  '報到時間', '開幕', '閉幕', 'Opening', 'Closing', 'Break', 'Lunch', '休息時間', '午餐'
]

// ==========================================
// TYPE DEFINITIONS
// ==========================================

/**
 * Define permission constants (equivalent to the API enums)
 * These mirror the NotePermissionRole enum from the API
 */
const NotePermissionRole = {
  OWNER: 'owner',
  SIGNED_IN: 'signed_in',
  GUEST: 'guest'
} as const

type NotePermissionRoleType = typeof NotePermissionRole[keyof typeof NotePermissionRole]

/**
 * Raw session data structure from JSON file
 */
interface RawSession {
  id: string
  title: string
  speaker: Array<{
    speaker: {
      public_name: string
    }
  }>
  session_type: string | null
  started_at: string
  finished_at: string
  tags?: string[]
  classroom?: {
    tw_name?: string
    en_name?: string
  }
  language?: string
  difficulty?: string
}

/**
 * Processed session data structure
 */
interface ProcessedSession {
  id: string
  title: string
  tags: string[]
  startDate: number
  day: string
  startTime: string
  endTime: string
  sessionType: string
  classroom: string
  language: string
  difficulty: string
  noteUrl?: string
}

/**
 * Session URL reference for output
 */
interface SessionUrl {
  id: string
  url: string
  title: string
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Creates a nested object structure from an array using specified keys
 * This is used to organize sessions by day and time for the book structure
 *
 * @param seq - Array of items to nest
 * @param keys - Array of property names to use for nesting levels
 * @returns Nested object structure
 */
function nest(seq: any[], keys: string[]): any {
  if (!keys.length) return seq

  const [first, ...rest] = keys
  return _.mapValues(_.groupBy(seq, first), function (value) {
    return nest(value, rest)
  })
}

/**
 * Load and process session data from JSON file
 */
function loadAndProcessSessions(): ProcessedSession[] {
  const sessionsPath = path.join(__dirname, 'sessions.json')

  if (!fs.existsSync(sessionsPath)) {
    throw new Error(`Sessions file not found: ${sessionsPath}`)
  }

  const rawSessions: RawSession[] = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'))

  return rawSessions
    .filter(s => {
      if (!s.session_type) return false
      const title = (s.title || '').trim()
      return !EXCLUDE_SESSIONS.includes(title)
    })
    .map(s => {
      const speakers = s.speaker.map(speaker => speaker.speaker.public_name).join('、')

      return {
        id: s.id,
        title: s.title + (speakers ? ` - ${speakers}` : ""),
        tags: [CONFERENCE_NAME, ...(s.tags || [])],
        startDate: moment(s.started_at).valueOf(),
        day: moment(s.started_at).format('MM/DD'),
        startTime: moment(s.started_at).format('HH:mm'),
        endTime: moment(s.finished_at).format('HH:mm'),
        sessionType: s.session_type,
        classroom: s.classroom?.tw_name || s.classroom?.en_name || 'TBD',
        language: s.language || 'en',
        difficulty: s.difficulty || 'General'
      }
    })
    .sort((a, b) => (a.startDate - b.startDate))
}

/**
 * Generate content for a session note
 */
function generateSessionNoteContent(session: ProcessedSession): string {
  return `# ${session.title}

**Time:** ${session.startTime} ~ ${session.endTime} | **Room:** ${session.classroom}

{%hackmd ${ANNOUNCEMENT_NOTE} %}

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



###### tags: \`${CONFERENCE_NAME}\`
`
}

/**
 * Generates the hierarchical book content from nested session data
 *
 * @param sessions - Nested session data organized by day/time
 * @param layer - Current nesting level (for header depth)
 * @returns Formatted markdown content for the book section
 */
function generateBookContent(sessions: any, layer: number): string {
  const days = Object.keys(sessions).sort()
  let content = ""

  if (Array.isArray(sessions[days[0]])) {
    // This is the leaf level (sessions) - flatten all sessions and sort chronologically
    let allSessions: ProcessedSession[] = []
    for (let timeSlot of days) {
      allSessions = allSessions.concat(sessions[timeSlot])
    }
    // Sort all sessions by start time
    const sortedSessions = _.sortBy(allSessions, ['startTime'])

    for (let session of sortedSessions) {
      if (session.noteUrl && session.noteUrl !== 'error') {
        content += `- ${session.startTime} ~ ${session.endTime} [${session.title}](/${session.noteUrl}) (${session.classroom})\n`
      }
    }
    return content
  } else {
    // This is a grouping level
    for (let day of days) {
      content += `${new Array(layer).fill("#").join("")} ${day}\n\n`
      content += generateBookContent(sessions[day], layer + 1)
    }
    return content
  }
}

/**
 * Generate the main conference book content
 */
function generateMainBookContent(bookContent: string): string {
  return `${CONFERENCE_NAME} 共同筆記
===

## 歡迎來到 ${CONFERENCE_NAME}！

- [HackMD 快速入門](https://hackmd.io/s/BJvtP4zGX)
- [HackMD 會議功能介紹](https://hackmd.io/s/BJHWlNQMX)

## 議程筆記

${bookContent}

###### tags: \`${CONFERENCE_NAME}\`
`
}

// ==========================================
// MAIN EXECUTION LOGIC
// ==========================================

// Progress tracking for resume functionality
type ProgressState = {
  completedSessions: string[]
  sessionNotes: Record<string, string>
  mainBookCreated?: boolean
  mainBookUrl?: string
  startedAt?: string
  completedAt?: string
}

function createProgressManager(progressFilePath: string) {
  const resolvedPath = path.resolve(progressFilePath)

  function load(): ProgressState | null {
    if (!fs.existsSync(resolvedPath)) return null
    try {
      const data = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'))
      console.log(`📁 Loaded progress: ${data.completedSessions?.length || 0} sessions completed`)
      return data
    } catch (e: any) {
      console.warn(`⚠️  Failed to load progress: ${e.message}`)
      return null
    }
  }

  function initFresh(): ProgressState {
    return {
      completedSessions: [],
      sessionNotes: {},
      startedAt: new Date().toISOString(),
    }
  }

  function save(progress: ProgressState) {
    try {
      fs.writeFileSync(resolvedPath, JSON.stringify(progress, null, 2))
    } catch (e: any) {
      console.warn(`⚠️  Failed to save progress: ${e.message}`)
    }
  }

  function isSessionDone(id: string, p: ProgressState) {
    return p.completedSessions.includes(id)
  }

  function markSessionDone(id: string, noteUrl: string, p: ProgressState) {
    if (!p.completedSessions.includes(id)) p.completedSessions.push(id)
    p.sessionNotes[id] = noteUrl
  }

  function finalize(progress: ProgressState, options: { testMode?: boolean } = {}) {
    if (!fs.existsSync(resolvedPath)) return

    progress.completedAt = new Date().toISOString()
    save(progress)

    if (!options.testMode) {
      try {
        fs.unlinkSync(resolvedPath)
        console.log(`\n🧹 Cleaned up progress file`)
      } catch {}
    }
  }

  return {
    load,
    initFresh,
    save,
    isSessionDone,
    markSessionDone,
    finalize
  }
}

/**
 * Main function that orchestrates the entire book mode note creation process
 * Enhanced with production-ready features from proven conference implementations
 */
async function main(): Promise<void> {
  // Initialize API client configuration
  const apiEndpoint = process.env.HACKMD_API_ENDPOINT || 'https://api.hackmd.io/v1'
  const webDomain = process.env.HACKMD_WEB_DOMAIN || process.env.HACKMD_API_ENDPOINT || 'https://hackmd.io'

  console.log(`🚀 Starting ${CONFERENCE_NAME} note generation...`)
  console.log(`📊 Configuration:`)
  console.log(`   Team: ${TEAM_PATH}`)
  console.log(`   API Endpoint: ${apiEndpoint}`)
  console.log(`   Test Mode: ${TEST_MODE}`)
  console.log(`   Resume Mode: ${RESUME_MODE}`)
  console.log(`   Request Delay: ${CLI_REQUEST_DELAY_MS}ms`)

  // Validate required environment variables
  if (!process.env.HACKMD_ACCESS_TOKEN) {
    console.error('❌ Error: HACKMD_ACCESS_TOKEN environment variable is not set.')
    console.error('Please set your HackMD access token using one of these methods:')
    console.error('1. Create a .env file with HACKMD_ACCESS_TOKEN=your_token_here')
    console.error('2. Set the environment variable directly: export HACKMD_ACCESS_TOKEN=your_token_here')
    console.error('3. Get your token from: https://hackmd.io/@hackmd-api/developer-portal')
    process.exit(1)
  }

  const apiOptions: any = {
    wrapResponseErrors: true,
    timeout: 60000
  }

  if (CLI_REQUEST_DELAY_MS > 0) {
    apiOptions.retryConfig = {
      maxRetries: 3,
      baseDelay: CLI_REQUEST_DELAY_MS
    }
  }

  const api = new API(process.env.HACKMD_ACCESS_TOKEN!, apiEndpoint, apiOptions)

  // Verify authentication
  try {
    console.log('🔐 Verifying authentication...')
    await api.getMe()
    console.log(`✅ Authentication verified`)
  } catch (error: any) {
    console.error(`❌ Authentication failed: ${error.message}`)
    console.error('Please check:')
    console.error('1. Your HACKMD_ACCESS_TOKEN is correct')
    console.error('2. Your token has the required permissions')
    console.error('3. Your API endpoint is correct')
    console.error('4. Your network connection to HackMD')
    process.exit(1)
  }

  // Load and process session data
  console.log('📂 Loading session data...')
  const sessionList = loadAndProcessSessions()
  console.log(`📊 Found ${sessionList.length} content sessions to process`)

  // Apply test mode filtering
  if (TEST_MODE) {
    console.log(`⚠️  TEST MODE: Processing only first 3 sessions`)
    sessionList.splice(3)
  }

  // Progress/resume support
  const pm = createProgressManager(PROGRESS_FILE)
  let progress: ProgressState

  if (RESUME_MODE) {
    const loadedProgress = pm.load()
    if (!loadedProgress) {
      console.error('❌ No progress.json found. Start without --resume to create it.')
      process.exit(1)
    }
    progress = loadedProgress
    console.log(`🔄 Resume mode: ${progress.completedSessions.length} sessions already created`)
    if (progress.failedSessions?.length) {
      console.log(`⚠️  ${progress.failedSessions.length} sessions previously failed`)
    }
  } else {
    progress = pm.initFresh()
    progress.totalSessions = sessionList.length
    console.log('🚀 Fresh run: progress initialized')
  }

  // Create individual session notes
  console.log('\n📝 Creating individual session notes...')
  let processedCount = 0
  let skippedCount = 0

  for (const data of sessionList) {
    if (pm.isSessionDone(data.id, progress)) {
      // Restore URL from progress
      if (progress.sessionNotes[data.id]) {
        data.noteUrl = progress.sessionNotes[data.id].replace(`${webDomain}/`, '')
      }
      console.log(`✅ Session "${data.title}" already completed, skipping`)
      skippedCount++
      continue
    }

    const noteContent = generateSessionNoteContent(data)

    const noteData = {
      title: data.title,
      content: noteContent,
      readPermission: NotePermissionRole.GUEST as any,
      writePermission: NotePermissionRole.SIGNED_IN as any
    }

    try {
      console.log(`📝 Creating note for: ${data.title}`)
      const note = await api.createTeamNote(TEAM_PATH, noteData)
      data.noteUrl = note.shortId

      const noteUrl = `${webDomain}/${note.shortId}`
      pm.markSessionDone(data.id, noteUrl, progress)
      processedCount++

      // Save progress every 5 sessions
      if (processedCount % 5 === 0) {
        pm.save(progress)
        console.log(`💾 Progress saved (${processedCount} sessions processed)`)
      }

      console.log(`✅ Created: ${noteUrl}`)

      // Add delay between requests if configured
      if (CLI_REQUEST_DELAY_MS > 0) {
        await new Promise(resolve => setTimeout(resolve, CLI_REQUEST_DELAY_MS))
      }

    } catch (error: any) {
      console.error(`❌ Failed to create note for "${data.title}": ${error.message}`)
      data.noteUrl = 'error'
      pm.save(progress)
    }
  }

  // Final progress save
  pm.save(progress)
  console.log(`✅ Session notes creation completed (${processedCount} new notes, ${skippedCount} skipped)`)

  // Create main conference book if not already created
  if (progress.mainBookCreated) {
    console.log(`\n✅ Main book already created: ${progress.mainBookUrl}`)
  } else {
    console.log('\n📚 Creating main conference book...')

    // Filter successful sessions for the book
    const successfulSessions = sessionList.filter(s => s.noteUrl && s.noteUrl !== 'error')
    const nestedSessions = nest(successfulSessions, ['day', 'startTime'])
    const bookContent = generateBookContent(nestedSessions, 1)
    const mainBookContent = generateMainBookContent(bookContent)

    try {
      const mainBook = await api.createTeamNote(TEAM_PATH, {
        title: `${CONFERENCE_NAME} 共同筆記`,
        content: mainBookContent,
        readPermission: NotePermissionRole.GUEST as any,
        writePermission: NotePermissionRole.SIGNED_IN as any
      })

      const mainBookUrl = `${webDomain}/${mainBook.shortId}`
      progress.mainBookCreated = true
      progress.mainBookUrl = mainBookUrl
      pm.save(progress)

      console.log(`✅ Main book created: ${mainBookUrl}`)
    } catch (error: any) {
      console.error(`❌ Failed to create main book: ${error.message}`)
    }
  }

  // Final statistics and cleanup
  const successfulSessions = sessionList.filter(s => s.noteUrl && s.noteUrl !== 'error')
  const failedSessions = sessionList.filter(s => s.noteUrl === 'error')

  console.log(`\n🎉 Generation completed!`)
  console.log(`📚 Main book: ${progress.mainBookUrl || 'Failed to create'}`)
  console.log(`📊 Statistics:`)
  console.log(`   ✅ Successful sessions: ${successfulSessions.length}`)
  console.log(`   ❌ Failed sessions: ${failedSessions.length}`)
  console.log(`   📝 Total sessions processed: ${sessionList.length}`)

  if (failedSessions.length > 0) {
    console.log(`\n⚠️  Failed sessions:`)
    failedSessions.forEach(s => console.log(`   - ${s.title}`))
    console.log(`\nTo retry failed sessions, fix any issues and run with --resume flag.`)
  }

  // Output session URLs for reference
  if (successfulSessions.length > 0) {
    const sessionUrls: SessionUrl[] = successfulSessions.map(s => ({
      id: s.id,
      url: `${webDomain}/${s.noteUrl}`,
      title: s.title
    }))

    console.log('\n📋 Session URLs:')
    sessionUrls.forEach(s => console.log(`   ${s.title}: ${s.url}`))
  }

  // Finalize progress
  pm.finalize(progress, { testMode: TEST_MODE })
}

// ==========================================
// SCRIPT EXECUTION
// ==========================================

// Run the script when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('\n💥 Generation failed:', error)
    console.error('\nTroubleshooting:')
    console.error('1. Check your HACKMD_ACCESS_TOKEN is valid')
    console.error('2. Verify team permissions for note creation')
    console.error('3. Check network connectivity')
    console.error('4. Try running with --test first')
    console.error('5. Use --resume to continue from last successful point')
    console.error('\nFor production environments:')
    console.error('- Use --delay-ms to avoid rate limits')
    console.error('- Monitor progress.json for recovery')
    console.error('- Check API quota limits')
    process.exit(1)
  })
}

// Export functions for potential module usage
export { main, generateBookContent, loadAndProcessSessions, generateSessionNoteContent }
