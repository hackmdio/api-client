#!/usr/bin/env tsx
/**
 * Book Mode Conference Note Generator
 * 
 * This script generates a "book mode" conference note system using HackMD API.
 * It creates individual notes for each session and a main book note that links to all sessions.
 * 
 * Book mode is a Markdown note that contains organized links to each session note page,
 * making it easy for conference attendees to navigate between different session notes.
 * 
 * Prerequisites:
 * - HackMD access token (set in HACKMD_ACCESS_TOKEN environment variable)
 * - Team path where notes will be created
 * - Session data in JSON format
 */

'use strict'

// Load environment variables from .env file in project root
import dotenv from 'dotenv'
dotenv.config()

import _ from 'lodash'
import moment from 'moment'
import { API } from '@hackmd/api'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Get the current directory for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ==========================================
// CONFIGURATION CONSTANTS
// ==========================================

/**
 * HackMD announcement note short ID to be embedded in each session note
 * This note typically contains conference-wide announcements or information
 */
const ANNOUNCEMENT_NOTE = '@DevOpsDay/rkO2jyLMlg'

/**
 * Team path where all notes will be created
 * This should be your HackMD team's unique identifier
 */
const TEAM_PATH = 'DevOpsDay'

/**
 * Conference details for the main book note
 */
const CONFERENCE_CONFIG = {
  name: 'DevOpsDays Taipei 2025',
  website: 'https://devopsdays.tw/',
  community: 'https://www.facebook.com/groups/DevOpsTaiwan/',
  tags: 'DevOpsDays Taipei 2025'
}

/**
 * Session note template configuration
 */
const SESSION_NOTE_CONFIG = {
  // Default content sections for each session note
  sections: {
    notes: '筆記區',
    notesDescription: '從這開始記錄你的筆記',
    discussion: '討論區', 
    discussionDescription: '歡迎在此進行討論',
    links: '相關連結'
  }
}

/**
 * Main book note configuration
 */
const BOOK_NOTE_CONFIG = {
  welcomeNote: '/@DevOpsDay/ry9DnJIfel',
  hackmdQuickStart: 'https://hackmd.io/s/BJvtP4zGX',
  hackmdMeetingFeatures: 'https://hackmd.io/s/BJHWlNQMX'
}

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
 * Extracts the HackMD host URL from the API endpoint
 * This is used to generate correct note URLs for display
 * 
 * @returns The HackMD host URL
 */
function getHackMDHost(): string {
  const apiEndpoint = process.env.HACKMD_API_ENDPOINT || 'https://hackmd.io'
  try {
    const url = new URL(apiEndpoint)
    return `${url.protocol}//${url.host}`
  } catch (error) {
    console.warn('Failed to parse HACKMD_API_ENDPOINT, falling back to https://hackmd.io')
    return 'https://hackmd.io'
  }
}

/**
 * Loads and processes session data from JSON file
 * Filters out sessions with null session types and enriches data
 * 
 * @returns Array of processed session data
 */
function loadAndProcessSessions(): ProcessedSession[] {
  const sessionsPath = path.join(__dirname, 'sessions.json')
  
  if (!fs.existsSync(sessionsPath)) {
    throw new Error(`Sessions file not found: ${sessionsPath}`)
  }
  
  const rawSessions: RawSession[] = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'))
  
  return rawSessions
    .filter(s => s.session_type && s.session_type !== null) // Filter out null session types
    .map(s => {
      // Combine speaker names with ampersand separator
      const speakers = s.speaker.map(speaker => {
        return speaker.speaker.public_name
      }).join(' & ')

      return {
        id: s.id,
        title: s.title + (speakers ? " - " + speakers : ""),
        tags: s.tags || [],
        startDate: moment(s.started_at).valueOf(),
        day: moment(s.started_at).format('MM/DD'),
        startTime: moment(s.started_at).format('HH:mm'),
        endTime: moment(s.finished_at).format('HH:mm'),
        sessionType: s.session_type!, // We already filtered out null values above
        classroom: s.classroom?.tw_name || s.classroom?.en_name || 'TBD',
        language: s.language || 'en',
        difficulty: s.difficulty || 'General'
      }
    })
    .sort((a, b) => (a.startDate - b.startDate)) // Sort by start time
}

/**
 * Generates the content for a session note
 * 
 * @param session - The session data
 * @returns Formatted markdown content for the session note
 */
function generateSessionNoteContent(session: ProcessedSession): string {
  return `# ${session.title}

{%hackmd ${ANNOUNCEMENT_NOTE} %}

## ${SESSION_NOTE_CONFIG.sections.notes}
> ${SESSION_NOTE_CONFIG.sections.notesDescription}

## ${SESSION_NOTE_CONFIG.sections.discussion}
> ${SESSION_NOTE_CONFIG.sections.discussionDescription}

## ${SESSION_NOTE_CONFIG.sections.links}
- [${CONFERENCE_CONFIG.name} 官方網站](${CONFERENCE_CONFIG.website})

###### tags: \`${CONFERENCE_CONFIG.tags}\`
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
 * Generates the main conference book note content
 * 
 * @param bookContent - The hierarchical session content
 * @returns Formatted markdown content for the main book note
 */
function generateMainBookContent(bookContent: string): string {
  return `${CONFERENCE_CONFIG.name} 共同筆記
===

## 歡迎來到 ${CONFERENCE_CONFIG.name}！

- [歡迎來到 DevOpsDays！](${BOOK_NOTE_CONFIG.welcomeNote})
- [${CONFERENCE_CONFIG.name} 官方網站](${CONFERENCE_CONFIG.website}) [target=_blank]
- [HackMD 快速入門](${BOOK_NOTE_CONFIG.hackmdQuickStart})
- [HackMD 會議功能介紹](${BOOK_NOTE_CONFIG.hackmdMeetingFeatures})

## 議程筆記

${bookContent}

## 相關資源

- [DevOps Taiwan Community](${CONFERENCE_CONFIG.community})
- [活動照片分享區](#)
- [問題回饋](#)

###### tags: \`${CONFERENCE_CONFIG.tags}\`
`
}

// ==========================================
// MAIN EXECUTION LOGIC
// ==========================================

/**
 * Main function that orchestrates the entire book mode note creation process
 */
async function main(): Promise<void> {
  // Validate required environment variables
  if (!process.env.HACKMD_ACCESS_TOKEN) {
    console.error('Error: HACKMD_ACCESS_TOKEN environment variable is not set.')
    console.error('Please set your HackMD access token using one of these methods:')
    console.error('1. Create a .env file with HACKMD_ACCESS_TOKEN=your_token_here')
    console.error('2. Set the environment variable directly: export HACKMD_ACCESS_TOKEN=your_token_here')
    process.exit(1)
  }

  // Initialize API client
  const api = new API(process.env.HACKMD_ACCESS_TOKEN, process.env.HACKMD_API_ENDPOINT)
  
  // Load and process session data
  console.log('Loading session data...')
  const sessionList = loadAndProcessSessions()
  console.log(`Processing ${sessionList.length} sessions...`)

  // Create individual session notes
  console.log('\n=== Creating Individual Session Notes ===')
  for (let data of sessionList) {
    const noteContent = generateSessionNoteContent(data)
    
    const noteData = {
      title: data.title,
      content: noteContent,
      readPermission: NotePermissionRole.GUEST as any,
      writePermission: NotePermissionRole.SIGNED_IN as any
    }

    try {
      const note = await api.createTeamNote(TEAM_PATH, noteData)
      data.noteUrl = note.shortId
      console.log(`✓ Created note for: ${data.title}`)
    } catch (error: any) {
      console.error(`✗ Failed to create note for ${data.title}:`, error.message)
      data.noteUrl = 'error'
    }
  }

  // Output session URLs for reference
  const hackmdHost = getHackMDHost()
  const sessionUrls: SessionUrl[] = sessionList
    .filter(s => s.noteUrl !== 'error')
    .map(s => ({
      id: s.id,
      url: `${hackmdHost}/${s.noteUrl}`,
      title: s.title
    }))

  console.log('\n=== Session URLs ===')
  console.log(JSON.stringify(sessionUrls, null, 2))

  // Create nested structure for the main book
  const nestedSessions = nest(sessionList.filter(s => s.noteUrl !== 'error'), ['day', 'startTime'])
  const bookContent = generateBookContent(nestedSessions, 1)

  // Create main conference book
  console.log('\n=== Creating Main Conference Book ===')
  const mainBookContent = generateMainBookContent(bookContent)

  try {
    const mainBook = await api.createTeamNote(TEAM_PATH, {
      title: `${CONFERENCE_CONFIG.name} 共同筆記`,
      content: mainBookContent,
      readPermission: NotePermissionRole.GUEST as any,
      writePermission: NotePermissionRole.SIGNED_IN as any
    })

    console.log('\n=== Main Conference Book Created ===')
    console.log(`✓ Book URL: ${hackmdHost}/${mainBook.shortId}`)
    console.log('\n🎉 Book mode conference notes created successfully!')
    console.log(`📚 Main book contains links to ${sessionUrls.length} session notes`)
  } catch (error: any) {
    console.error('✗ Failed to create main book:', error.message)
  }
}

// ==========================================
// SCRIPT EXECUTION
// ==========================================

// Run the script when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

// Export functions for potential module usage
export { main, generateBookContent, loadAndProcessSessions, generateSessionNoteContent }