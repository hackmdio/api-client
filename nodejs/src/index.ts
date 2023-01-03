import ky from 'ky-universal'

import { CreateNoteOptions, GetMe, GetUserHistory, GetUserNotes, GetUserNote, CreateUserNote, GetUserTeams, GetTeamNotes, CreateTeamNote, DeleteUserNote, DeleteTeamNote, UpdateUserNote, SingleNote, UpdateTeamNote } from './type'
import * as HackMDErrors from './error'

export default class API {
  private ky: ReturnType<typeof ky.create>

  constructor (readonly accessToken: string, public hackmdAPIEndpointURL: string = "https://api.hackmd.io/v1") {
    if (!accessToken) {
      throw new HackMDErrors.MissingRequiredArgument('Missing access token when creating HackMD client')
    }

    this.ky = ky.create({
      prefixUrl: hackmdAPIEndpointURL,
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      hooks: {
        afterResponse: [
          async (request, options, response) => {
            if (!response.ok) {
              if (response.status >= 500) {
                throw new HackMDErrors.InternalServerError(
                  `HackMD internal error (${response.status} ${response.statusText})`,
                  response.status,
                  response.statusText,
                )
              } else {
                throw new HackMDErrors.HttpResponseError(
                  `Received an error response (${response.status} ${response.statusText}) from HackMD`,
                  response.status,
                  response.statusText,
                )
              }
            }
          }
        ]
      }
    })
  }

  async getMe (): Promise<GetMe> {
    return this.ky.get("me").json()
  }

  async getHistory (): Promise<GetUserHistory> {
    return this.ky.get("history").json()
  }

  async getNoteList (): Promise<GetUserNotes> {
    return ky.get("notes").json()
  }

  async getNote (noteId: string): Promise<GetUserNote> {
    return ky.get(`notes/${noteId}`).json()
  }

  async createNote (options: CreateNoteOptions): Promise<CreateUserNote> {
    return ky.post("notes", {
      json: options
    }).json()
  }

  async updateNoteContent (noteId: string, content?: string): Promise<UpdateUserNote> {
   await this.ky.patch(`notes/${noteId}`, { json: { content } })
  }

  async updateNote (noteId: string, options: Partial<Pick<SingleNote, 'content' | 'readPermission' | 'writePermission' | 'permalink'>>) {
    return await this.ky.patch(`notes/${noteId}`, {
      json: options
    }).json()
  }

  async deleteNote (noteId: string): Promise<DeleteUserNote> {
    await this.ky.delete(`notes/${noteId}`)
  }

  async getTeams (): Promise<GetUserTeams> {
    return await this.ky("teams").json()
  }

  async getTeamNotes (teamPath: string): Promise<GetTeamNotes> {
    return this.ky.get(`teams/${teamPath}/notes`).json()
  }

  async createTeamNote (teamPath: string, options: CreateNoteOptions): Promise<CreateTeamNote> {
    return await this.ky.post(`teams/${teamPath}/notes`, {
      json: options
    }).json()
  }

  async updateTeamNoteContent (teamPath: string, noteId: string, content?: string): Promise<UpdateTeamNote> {
    await this.ky.patch(`teams/${teamPath}/notes/${noteId}`, { json: { content } }).json()
  }

  async updateTeamNote (teamPath: string, noteId: string, options: Partial<Pick<SingleNote, 'content' | 'readPermission' | 'writePermission' | 'permalink'>>) {
    return await this.ky.patch(`teams/${teamPath}/notes/${noteId}`, {
      json: options
    }).json()
  }

  async deleteTeamNote (teamPath: string, noteId: string): Promise<DeleteTeamNote> {
    await this.ky.delete(`teams/${teamPath}/notes/${noteId}`)
  }
}
