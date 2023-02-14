import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios'
import { User, Note, Team, CreateNoteOptions, GetMe, GetUserHistory, GetUserNotes, GetUserNote, CreateUserNote, GetUserTeams, GetTeamNotes, CreateTeamNote, SingleNote } from './type'
import * as HackMDErrors from './error'

export type RequestOptions = {
  unwrapData?: boolean
}

const defaultOption: RequestOptions = {
  unwrapData: true,
}

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

  async getMe (option = defaultOption) {
    if (option.unwrapData) {
      return this.axios.get<User>("me").then(response => response.data) as Promise<GetMe>
    } else {
      return this.axios.get<GetMe>("me")
    }
  }

  async getHistory (options = defaultOption) {
    if (options.unwrapData) {
      return this.axios.get<Note[]>("history").then(response => response.data) as Promise<GetUserHistory>
    } else {
      return this.axios.get<GetUserHistory>("history")
    }
  }

  async getNoteList (options = defaultOption) {
    if (options.unwrapData) {
      return this.axios.get<Note[]>("notes").then(response => response.data) as Promise<GetUserNotes>
    } else {
      return this.axios.get<GetUserNotes>("notes")
    }
  }

  async getNote (noteId: string, options = defaultOption) {
    if (options.unwrapData) {
      return this.axios.get<SingleNote>(`notes/${noteId}`).then(response => response.data) as Promise<GetUserNote>
    } else {
      return this.axios.get<GetUserNote>(`notes/${noteId}`)
    }
  }

  async createNote (payload: CreateNoteOptions, options = defaultOption) {
    if (options.unwrapData) {
      return this.axios.post<SingleNote>("notes", payload).then(response => response.data) as Promise<CreateUserNote>
    } else {
      return this.axios.post<CreateUserNote>("notes", payload)
    }
  }

  async updateNoteContent (noteId: string, content?: string, options = defaultOption) {
    if (options.unwrapData) {
      return this.axios.patch<SingleNote>(`notes/${noteId}`, { content }).then(response => response.data)
    } else {
      return this.axios.patch<SingleNote>(`notes/${noteId}`, { content })
    }
  }

  async updateNote (noteId: string, payload: Partial<Pick<SingleNote, 'content' | 'readPermission' | 'writePermission' | 'permalink'>>, options = defaultOption) {
    if (options.unwrapData) {
      return this.axios.patch<SingleNote>(`notes/${noteId}`, payload).then(response => response.data)
    } else {
      return this.axios.patch<SingleNote>(`notes/${noteId}`, payload)
    }
  }

  async deleteNote (noteId: string, options = defaultOption) {
    if (options.unwrapData) {
      return this.axios.delete<SingleNote>(`notes/${noteId}`).then(response => response.data)
    } else {
      return this.axios.delete<SingleNote>(`notes/${noteId}`)
    }
  }

  async getTeams (options = defaultOption) {
    if (options.unwrapData) {
      return this.axios.get<Team[]>("teams").then(response => response.data) as Promise<GetUserTeams>
    } else {
      return this.axios.get<GetUserTeams>("teams")
    }
  }

  async getTeamNotes (teamPath: string, options = defaultOption) {
    if (options.unwrapData) {
      return this.axios.get<Note[]>(`teams/${teamPath}/notes`).then(response => response.data) as Promise<GetTeamNotes>
    } else {
      return this.axios.get<GetTeamNotes>(`teams/${teamPath}/notes`)
    }
  }

  async createTeamNote (teamPath: string, payload: CreateNoteOptions, options = defaultOption) {
    if (options.unwrapData) {
      return this.axios.post<SingleNote>(`teams/${teamPath}/notes`, payload).then(response => response.data) as Promise<CreateTeamNote>
    } else {
      return this.axios.post<CreateTeamNote>(`teams/${teamPath}/notes`, payload)
    }
  }

  async updateTeamNoteContent (teamPath: string, noteId: string, content?: string): Promise<AxiosResponse> {
    return this.axios.patch<AxiosResponse>(`teams/${teamPath}/notes/${noteId}`, { content })
  }

  async updateTeamNote (teamPath: string, noteId: string, options: Partial<Pick<SingleNote, 'content' | 'readPermission' | 'writePermission' | 'permalink'>>): Promise<AxiosResponse> {
    return this.axios.patch<AxiosResponse>(`teams/${teamPath}/notes/${noteId}`, options)
  }

  async deleteTeamNote (teamPath: string, noteId: string): Promise<AxiosResponse> {
    return this.axios.delete<AxiosResponse>(`teams/${teamPath}/notes/${noteId}`)
  }
}

export default API
