/**
 * Shared types for the AI Conference Assistant
 */

export interface SessionData {
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

export interface GeneratedPage {
  sessionId: string
  title: string
  content: string
}

export interface CreatedNote {
  sessionId: string
  noteId: string
  shortId: string
  url: string
  title: string
}

export interface ProgressState {
  total: number
  completed: number
  current: string
  createdNotes: CreatedNote[]
  errors: Array<{ sessionId: string; title: string; error: string }>
  phase: 'idle' | 'creating-sessions' | 'creating-book' | 'done' | 'error'
  mainBookUrl?: string
}
