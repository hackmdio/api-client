import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios'
import { User, Note, Team, CreateNoteOptions, NotePermissionRole, CommentPermissionType } from './type'

export class API {
  private axios: AxiosInstance

  constructor(public hackmdAPIEndpointURL: string, readonly accessToken: string) {
    this.axios = axios.create({
      baseURL: this.hackmdAPIEndpointURL,
      headers:{
        "Content-Type": "application/json",
      }
    })

    this.axios.interceptors.request.use(
      (config: AxiosRequestConfig) =>{
        if (accessToken) {
          config.headers!.Authorization = `Bearer ${this.accessToken}`;
        }
        return config
      },
      (err: AxiosError) => {
        console.log('request error')
        return Promise.reject(err)
      }
    )
  }

  getMe = async () => {
    const { data } = await this.axios.get<User>("me")
    return data
  }

  getHistory = async () => {
    const { data } = await this.axios.get<Note[]>("history")
    return data
  }

  getNoteList = async () => {
    const { data } = await this.axios.get<Note[]>("notes")
    return data
  }

  getNote = async (noteId: string) => {
    try {
      const { data } = await this.axios.get<Note>(`notes/${noteId}`)
      return data
    } catch (e) {
      console.log(e)
    }
  }

  createNote = async (options: CreateNoteOptions) => {
    const { data } = await this.axios.post<Note>("notes", options)
    console.log(data)
    return data
  }

  updateNoteContent =async (noteId: string, content?: string) => {
    const { data } = await this.axios.patch<string>(`notes/${noteId}`, { content })
    return data
  }

  deleteNote = async (noteId: string) => {
    try {
      const { data } = await this.axios.delete<void>(`notes/${noteId}`)
      return data
    } catch(e) {
    }
  }

  getTeams = async () => {
    const { data } = await this.axios.get<Team[]>("teams")
    return data
  }

  getTeamNotes = async (teamPath: string) => {
    const {data} = await this.axios.get<Note[]>(`teams/${teamPath}/notes`)
    return data
  }

  createTeamNote = async (teamPath: string, options: CreateNoteOptions) => {
    const { data } = await this.axios.post<Note>(`teams/${teamPath}/notes`, options)
    return data
  }
  
  updateTeamNoteContent =async (teamPath: string, noteId: string, content?: string) => {
    const { data } = await this.axios.patch<string>(`teams/${teamPath}/notes/${noteId}`, { content })
    return data
  }

  deleteTeamNote = async (teamPath: string, noteId: string) => {
    try {
      const { data } = await this.axios.delete<void>(`teams/${teamPath}/notes/${noteId}`)
      console.log(data)
      return data
    } catch(e) {
    }
  }
}

