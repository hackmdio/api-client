import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios'
import { User, Note, Team, CreateNoteOptions, GetMe, GetUserHistory, GetUserNotes, GetUserNote, CreateUserNote, GetUserTeams, GetTeamNotes, CreateTeamNote, DeleteUserNote, DeleteTeamNote, UpdateUserNote, SingleNote, UpdateTeamNote } from './type'
import * as HackMDErrors from './error'

export default class API {
  private axios: AxiosInstance

  constructor (readonly accessToken: string, public hackmdAPIEndpointURL: string = "https://api.hackmd.io/v1") {
    if (!accessToken) {
      throw new HackMDErrors.MissingRequiredArgument('Missing access token when creating HackMD client')
    }

    this.axios = axios.create({
      baseURL: hackmdAPIEndpointURL,
      headers:{
        "Content-Type": "application/json",
      }
    })

    this.axios.interceptors.request.use(
      (config: AxiosRequestConfig) =>{
        config.headers!.Authorization = `Bearer ${accessToken}`
        return config
      },
      (err: AxiosError) => {
        return Promise.reject(err)
      }
    )

    this.axios.interceptors.response.use(
      (response: AxiosResponse) => {
        return response
      },
      async (err: AxiosError) => {
        if (!err.response) {
          return Promise.reject(err)
        }

        if (err.response.status >= 500) {
          throw new HackMDErrors.InternalServerError(
            `HackMD internal error (${err.response.status} ${err.response.statusText})`,
            err.response.status,
            err.response.statusText,
          )
        } else {
          throw new HackMDErrors.HttpResponseError(
            `Received an error response (${err.response.status} ${err.response.statusText}) from HackMD`,
            err.response.status,
            err.response.statusText,
          )
        }
      }
    )
  }

  async getMe (): Promise<GetMe> {
    const { data } = await this.axios.get<User>("me")
    return data
  }

  async getHistory (): Promise<GetUserHistory> {
    const { data } = await this.axios.get<Note[]>("history")
    return data
  }

  async getNoteList (): Promise<GetUserNotes> {
    const { data } = await this.axios.get<Note[]>("notes")
    return data
  }

  async getNote (noteId: string): Promise<GetUserNote> {
    const { data } = await this.axios.get<SingleNote>(`notes/${noteId}`)
    return data
  }

  async createNote (options: CreateNoteOptions): Promise<CreateUserNote> {
    const { data } = await this.axios.post<SingleNote>("notes", options)
    return data
  }

  async updateNoteContent (noteId: string, content?: string): Promise<UpdateUserNote> {
   await this.axios.patch<AxiosResponse>(`notes/${noteId}`, { content })
  }

  async updateNote (noteId: string, options: Partial<Pick<SingleNote, 'content' | 'readPermission' | 'writePermission' | 'permalink'>>): Promise<AxiosResponse> {
    return await this.axios.patch<AxiosResponse>(`notes/${noteId}`, options)
  }

  async deleteNote (noteId: string): Promise<DeleteUserNote> {
    await this.axios.delete<AxiosResponse>(`notes/${noteId}`)
  }

  async getTeams (): Promise<GetUserTeams> {
    const { data } = await this.axios.get<Team[]>("teams")
    return data
  }

  async getTeamNotes (teamPath: string): Promise<GetTeamNotes> {
    const { data } = await this.axios.get<Note[]>(`teams/${teamPath}/notes`)
    return data
  }

  async createTeamNote (teamPath: string, options: CreateNoteOptions): Promise<CreateTeamNote> {
    const { data } = await this.axios.post<SingleNote>(`teams/${teamPath}/notes`, options)
    return data
  }

  async updateTeamNoteContent (teamPath: string, noteId: string, content?: string): Promise<UpdateTeamNote> {
    await this.axios.patch<AxiosResponse>(`teams/${teamPath}/notes/${noteId}`, { content })
  }

  async updateTeamNote (teamPath: string, noteId: string, options: Partial<Pick<SingleNote, 'content' | 'readPermission' | 'writePermission' | 'permalink'>>): Promise<AxiosResponse> {
    return await this.axios.patch<AxiosResponse>(`teams/${teamPath}/notes/${noteId}`, options)
  }

  async deleteTeamNote (teamPath: string, noteId: string): Promise<DeleteTeamNote> {
    await this.axios.delete<AxiosResponse>(`teams/${teamPath}/notes/${noteId}`)
  }
}
