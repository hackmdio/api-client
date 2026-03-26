/**
 * Server-side HackMD API client wrapper.
 * This file wraps the raw HackMD REST API using fetch so we avoid bundling
 * the full @hackmd/api (which depends on axios and Node-only modules) into
 * the Next.js edge/serverless runtime.
 */

export interface HackMDClientOptions {
  accessToken: string
  apiEndpoint?: string
}

export interface HackMDNote {
  id: string
  title: string
  tags: string[]
  shortId: string
  publishLink: string
  content?: string
  publishType?: string
  readPermission?: string
  writePermission?: string
  teamPath?: string | null
  userPath?: string | null
  lastChangedAt?: string
  createdAt?: string
}

export interface HackMDUser {
  id: string
  name: string
  email: string | null
  userPath: string
  photo: string
  teams: Array<{
    id: string
    name: string
    path: string
    logo: string
    description: string
    visibility: string
  }>
}

export interface CreateNotePayload {
  title?: string
  content?: string
  readPermission?: 'owner' | 'signed_in' | 'guest'
  writePermission?: 'owner' | 'signed_in' | 'guest'
  commentPermission?: string
  permalink?: string
}

class HackMDAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
  ) {
    super(message)
    this.name = 'HackMDAPIError'
  }
}

export class HackMDClient {
  private baseURL: string
  private accessToken: string

  constructor(options: HackMDClientOptions) {
    this.accessToken = options.accessToken
    this.baseURL = options.apiEndpoint || 'https://api.hackmd.io/v1'
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}/${path}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new HackMDAPIError(
        `HackMD API error: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`,
        response.status,
        response.statusText,
      )
    }

    return response.json() as Promise<T>
  }

  async getMe(): Promise<HackMDUser> {
    return this.request<HackMDUser>('me')
  }

  async getNote(noteId: string): Promise<HackMDNote> {
    return this.request<HackMDNote>(`notes/${noteId}`)
  }

  async getTeamNotes(teamPath: string): Promise<HackMDNote[]> {
    return this.request<HackMDNote[]>(`teams/${teamPath}/notes`)
  }

  async createTeamNote(teamPath: string, payload: CreateNotePayload): Promise<HackMDNote> {
    return this.request<HackMDNote>(`teams/${teamPath}/notes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async createNote(payload: CreateNotePayload): Promise<HackMDNote> {
    return this.request<HackMDNote>('notes', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }
}
