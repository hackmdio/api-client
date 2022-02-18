import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios'
import { User, Note, Team, CreateNoteOptions } from './type'
import * as HackMDErrors from './error'

export class API {
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

  async getMe () {
    const { data } = await this.axios.get<User>("me")
    return data
  }

  async getHistory () {
    const { data } = await this.axios.get<Note[]>("history")
    return data
  }

  async getNoteList () {
    const { data } = await this.axios.get<Note[]>("notes")
    return data
  }

  async getNote (noteId: string) {
    const { data } = await this.axios.get<Note>(`notes/${noteId}`)
    return data
  }

  async createNote (options: CreateNoteOptions) {
    const { data } = await this.axios.post<Note>("notes", options)
    return data
  }

  async updateNoteContent (noteId: string, content?: string) {
    const { data } = await this.axios.patch<string>(`notes/${noteId}`, { content })
    return data
  }

  async deleteNote (noteId: string) {
    const { data } = await this.axios.delete<void>(`notes/${noteId}`)
    return data
  }

  async getTeams () {
    const { data } = await this.axios.get<Team[]>("teams")
    return data
  }

  async getTeamNotes (teamPath: string) {
    const {data} = await this.axios.get<Note[]>(`teams/${teamPath}/notes`)
    return data
  }

  async createTeamNote (teamPath: string, options: CreateNoteOptions) {
    const { data } = await this.axios.post<Note>(`teams/${teamPath}/notes`, options)
    return data
  }

  async updateTeamNoteContent (teamPath: string, noteId: string, content?: string) {
    const { data } = await this.axios.patch<string>(`teams/${teamPath}/notes/${noteId}`, { content })
    return data
  }

  async deleteTeamNote (teamPath: string, noteId: string) {
    const { data } = await this.axios.delete<void>(`teams/${teamPath}/notes/${noteId}`)
    return data
  }
}