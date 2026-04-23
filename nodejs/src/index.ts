import axios, { AxiosInstance, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import {
  CreateNoteOptions,
  CreateTeamFolderBody,
  CreateUserFolderBody,
  GetMe,
  GetUserHistory,
  GetUserNotes,
  GetUserNote,
  CreateUserNote,
  GetUserTeams,
  GetTeamNotes,
  CreateTeamNote,
  SingleNote,
  UpdateNoteOptions,
  GetFolders,
  GetFolder,
  GetFolderOrder,
  CreateFolderResult,
  UpdateFolderResult,
  GetTeamFolders,
  GetTeamFolder,
  GetTeamFolderOrder,
  CreateTeamFolderResult,
  UpdateTeamFolderResult,
  UpdateFolderOrderBody,
  UpdateTeamFolderBody,
  UpdateUserFolderBody,
} from './type'
import * as HackMDErrors from './error'

export type RequestOptions = {
  unwrapData?: boolean;
  etag?: string | undefined;
}

const defaultOption: RequestOptions = {
  unwrapData: true,
}

type OptionReturnType<Opt, T> = Opt extends { unwrapData: false } ? AxiosResponse<T> : Opt extends { unwrapData: true } ? T : T

export type APIClientOptions = {
  wrapResponseErrors: boolean;
  timeout?: number;
  retryConfig?: {
    maxRetries: number;
    baseDelay: number;
  };
}

export class API {
  private axios: AxiosInstance

  constructor (
    readonly accessToken: string,
    public hackmdAPIEndpointURL: string = "https://api.hackmd.io/v1",
    public options: APIClientOptions = {
      wrapResponseErrors: true,
      timeout: 30000,
      retryConfig: {
        maxRetries: 3,
        baseDelay: 100,
      },
    }
  ) {
    if (!accessToken) {
      throw new HackMDErrors.MissingRequiredArgument('Missing access token when creating HackMD client')
    }

    this.axios = axios.create({
      baseURL: hackmdAPIEndpointURL,
      headers:{
        "Content-Type": "application/json",
      },
      timeout: options.timeout
    })

    this.axios.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        config.headers.set('Authorization', `Bearer ${accessToken}`)
        return config
      },
      (err: AxiosError) => {
        return Promise.reject(err)
      }
    )

    if (options.retryConfig) {
      this.createRetryInterceptor(this.axios, options.retryConfig.maxRetries, options.retryConfig.baseDelay)
    }

    if (options.wrapResponseErrors) {
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
          } else if (err.response.status === 429) {
            throw new HackMDErrors.TooManyRequestsError(
              `Too many requests (${err.response.status} ${err.response.statusText})`,
              err.response.status,
              err.response.statusText,
              parseInt(err.response.headers['x-ratelimit-userlimit'], 10),
              parseInt(err.response.headers['x-ratelimit-userremaining'], 10),
              parseInt(err.response.headers['x-ratelimit-userreset'], 10),
            )
          } else  {
            throw new HackMDErrors.HttpResponseError(
              `Received an error response (${err.response.status} ${err.response.statusText}) from HackMD`,
              err.response.status,
              err.response.statusText,
            )
          }
        }
      )
    }
  }

  private exponentialBackoff (retries: number, baseDelay: number): number {
    return Math.pow(2, retries) * baseDelay
  }

  private isRetryableMethod (method?: string): boolean {
    if (!method) return false
    const normalized = method.toLowerCase()
    return ['get', 'head', 'options', 'put', 'delete'].includes(normalized)
  }

  private isRetryableError (error: unknown): boolean {
    if (!axios.isAxiosError(error)) return false
    if (!this.isRetryableMethod(error.config?.method)) return false
    return (
      !error.response ||
      (error.response.status >= 500 && error.response.status < 600) ||
      error.response.status === 429
    )
  }

  private createRetryInterceptor (axiosInstance: AxiosInstance, maxRetries: number, baseDelay: number): void {
    let retryCount = 0

    axiosInstance.interceptors.response.use(
      response => response,
      async error => {
        if (retryCount < maxRetries && this.isRetryableError(error)) {
          const remainingCredits = parseInt(error.response?.headers['x-ratelimit-userremaining'], 10)

          if (isNaN(remainingCredits) || remainingCredits > 0) {
            retryCount++
            const delay = this.exponentialBackoff(retryCount, baseDelay)
            console.warn(`Retrying request... attempt #${retryCount} after delay of ${delay}ms`)
            await new Promise(resolve => setTimeout(resolve, delay))
            return axiosInstance(error.config)
          }
        }

        retryCount = 0 // Reset retry count after a successful request or when not retrying
        return Promise.reject(error)
      }
    )
  }
  async getMe<Opt extends RequestOptions> (options = defaultOption as Opt): Promise<OptionReturnType<Opt, GetMe>> {
    return this.unwrapData(this.axios.get<GetMe>("me"), options.unwrapData) as unknown as OptionReturnType<Opt, GetMe>
  }

  async getHistory<Opt extends RequestOptions> (options = defaultOption as Opt): Promise<OptionReturnType<Opt, GetUserHistory>> {
    return this.unwrapData(this.axios.get<GetUserHistory>("history"), options.unwrapData) as unknown as OptionReturnType<Opt, GetUserHistory>
  }

  async getNoteList<Opt extends RequestOptions> (options = defaultOption as Opt): Promise<OptionReturnType<Opt, GetUserNotes>> {
    return this.unwrapData(this.axios.get<GetUserNotes>("notes"), options.unwrapData) as unknown as OptionReturnType<Opt, GetUserNotes>
  }

  async getNote<Opt extends RequestOptions> (noteId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, GetUserNote>> {
    // Prepare request config with etag if provided in options
    const config = options.etag ? {
      headers: { 'If-None-Match': options.etag },
      // Consider 304 responses as successful
      validateStatus: (status: number) => (status >= 200 && status < 300) || status === 304
    } : undefined
    const request = this.axios.get<GetUserNote>(`notes/${noteId}`, config)
    return this.unwrapData(request, options.unwrapData, true) as unknown as OptionReturnType<Opt, GetUserNote>
  }

  async createNote<Opt extends RequestOptions> (payload: CreateNoteOptions, options = defaultOption as Opt): Promise<OptionReturnType<Opt, CreateUserNote>> {
    return this.unwrapData(this.axios.post<CreateUserNote>("notes", payload), options.unwrapData, true) as unknown as OptionReturnType<Opt, CreateUserNote>
  }

  async updateNoteContent<Opt extends RequestOptions> (noteId: string, content?: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, SingleNote>> {
    return this.unwrapData(this.axios.patch<SingleNote>(`notes/${noteId}`, { content }), options.unwrapData, true) as unknown as OptionReturnType<Opt, SingleNote>
  }

  async updateNote<Opt extends RequestOptions> (noteId: string, payload: UpdateNoteOptions, options = defaultOption as Opt): Promise<OptionReturnType<Opt, SingleNote>> {
    return this.unwrapData(this.axios.patch<SingleNote>(`notes/${noteId}`, payload), options.unwrapData, true) as unknown as OptionReturnType<Opt, SingleNote>
  }

  async deleteNote<Opt extends RequestOptions> (noteId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, SingleNote>> {
    return this.unwrapData(this.axios.delete<SingleNote>(`notes/${noteId}`), options.unwrapData) as unknown as OptionReturnType<Opt, SingleNote>
  }

  async getTeams<Opt extends RequestOptions> (options = defaultOption as Opt): Promise<OptionReturnType<Opt, GetUserTeams>> {
    return this.unwrapData(this.axios.get<GetUserTeams>("teams"), options.unwrapData) as unknown as OptionReturnType<Opt, GetUserTeams>
  }

  async getTeamNotes<Opt extends RequestOptions> (teamPath: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, GetTeamNotes>> {
    return this.unwrapData(this.axios.get<GetTeamNotes>(`teams/${teamPath}/notes`), options.unwrapData) as unknown as OptionReturnType<Opt, GetTeamNotes>
  }

  async createTeamNote<Opt extends RequestOptions> (teamPath: string, payload: CreateNoteOptions, options = defaultOption as Opt): Promise<OptionReturnType<Opt, CreateTeamNote>> {
    return this.unwrapData(this.axios.post<CreateTeamNote>(`teams/${teamPath}/notes`, payload), options.unwrapData) as unknown as OptionReturnType<Opt, CreateTeamNote>
  }

  async updateTeamNoteContent (teamPath: string, noteId: string, content?: string): Promise<AxiosResponse> {
    return this.axios.patch<AxiosResponse>(`teams/${teamPath}/notes/${noteId}`, { content })
  }

  async updateTeamNote (teamPath: string, noteId: string, options: UpdateNoteOptions): Promise<AxiosResponse> {
    return this.axios.patch<AxiosResponse>(`teams/${teamPath}/notes/${noteId}`, options)
  }

  async deleteTeamNote (teamPath: string, noteId: string): Promise<AxiosResponse> {
    return this.axios.delete<AxiosResponse>(`teams/${teamPath}/notes/${noteId}`)
  }

  async getFolderList<Opt extends RequestOptions> (options = defaultOption as Opt): Promise<OptionReturnType<Opt, GetFolders>> {
    return this.unwrapData(this.axios.get<GetFolders>('folders'), options.unwrapData) as unknown as OptionReturnType<Opt, GetFolders>
  }

  async createFolder<Opt extends RequestOptions> (payload: CreateUserFolderBody, options = defaultOption as Opt): Promise<OptionReturnType<Opt, CreateFolderResult>> {
    return this.unwrapData(this.axios.post<CreateFolderResult>('folders', payload), options.unwrapData) as unknown as OptionReturnType<Opt, CreateFolderResult>
  }

  async getFolder<Opt extends RequestOptions> (folderId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, GetFolder>> {
    return this.unwrapData(this.axios.get<GetFolder>(`folders/${folderId}`), options.unwrapData) as unknown as OptionReturnType<Opt, GetFolder>
  }

  async updateFolder<Opt extends RequestOptions> (folderId: string, payload: UpdateUserFolderBody, options = defaultOption as Opt): Promise<OptionReturnType<Opt, UpdateFolderResult>> {
    return this.unwrapData(this.axios.patch<UpdateFolderResult>(`folders/${folderId}`, payload), options.unwrapData) as unknown as OptionReturnType<Opt, UpdateFolderResult>
  }

  async deleteFolder<Opt extends RequestOptions> (folderId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, void>> {
    return this.unwrapData(this.axios.delete(`folders/${folderId}`), options.unwrapData) as unknown as OptionReturnType<Opt, void>
  }

  async getFolderOrder<Opt extends RequestOptions> (options = defaultOption as Opt): Promise<OptionReturnType<Opt, GetFolderOrder>> {
    return this.unwrapData(this.axios.get<GetFolderOrder>('folders/folder-order'), options.unwrapData) as unknown as OptionReturnType<Opt, GetFolderOrder>
  }

  async updateFolderOrder<Opt extends RequestOptions> (payload: UpdateFolderOrderBody, options = defaultOption as Opt): Promise<OptionReturnType<Opt, UpdateFolderResult>> {
    return this.unwrapData(this.axios.put<UpdateFolderResult>('folders/folder-order', payload), options.unwrapData) as unknown as OptionReturnType<Opt, UpdateFolderResult>
  }

  async getTeamFolderList<Opt extends RequestOptions> (teamPath: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, GetTeamFolders>> {
    return this.unwrapData(this.axios.get<GetTeamFolders>(`teams/${teamPath}/folders`), options.unwrapData) as unknown as OptionReturnType<Opt, GetTeamFolders>
  }

  async createTeamFolder<Opt extends RequestOptions> (teamPath: string, payload: CreateTeamFolderBody, options = defaultOption as Opt): Promise<OptionReturnType<Opt, CreateTeamFolderResult>> {
    return this.unwrapData(this.axios.post<CreateTeamFolderResult>(`teams/${teamPath}/folders`, payload), options.unwrapData) as unknown as OptionReturnType<Opt, CreateTeamFolderResult>
  }

  async getTeamFolder<Opt extends RequestOptions> (teamPath: string, folderId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, GetTeamFolder>> {
    return this.unwrapData(this.axios.get<GetTeamFolder>(`teams/${teamPath}/folders/${folderId}`), options.unwrapData) as unknown as OptionReturnType<Opt, GetTeamFolder>
  }

  async updateTeamFolder<Opt extends RequestOptions> (teamPath: string, folderId: string, payload: UpdateTeamFolderBody, options = defaultOption as Opt): Promise<OptionReturnType<Opt, UpdateTeamFolderResult>> {
    return this.unwrapData(this.axios.patch<UpdateTeamFolderResult>(`teams/${teamPath}/folders/${folderId}`, payload), options.unwrapData) as unknown as OptionReturnType<Opt, UpdateTeamFolderResult>
  }

  async deleteTeamFolder<Opt extends RequestOptions> (teamPath: string, folderId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, void>> {
    return this.unwrapData(this.axios.delete(`teams/${teamPath}/folders/${folderId}`), options.unwrapData) as unknown as OptionReturnType<Opt, void>
  }

  async getTeamFolderOrder<Opt extends RequestOptions> (teamPath: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, GetTeamFolderOrder>> {
    return this.unwrapData(this.axios.get<GetTeamFolderOrder>(`teams/${teamPath}/folders/folder-order`), options.unwrapData) as unknown as OptionReturnType<Opt, GetTeamFolderOrder>
  }

  async updateTeamFolderOrder<Opt extends RequestOptions> (teamPath: string, payload: UpdateFolderOrderBody, options = defaultOption as Opt): Promise<OptionReturnType<Opt, UpdateTeamFolderResult>> {
    return this.unwrapData(this.axios.put<UpdateTeamFolderResult>(`teams/${teamPath}/folders/folder-order`, payload), options.unwrapData) as unknown as OptionReturnType<Opt, UpdateTeamFolderResult>
  }

  private unwrapData<T> (reqP: Promise<AxiosResponse<T>>, unwrap = true, includeEtag = false) {
    if (!unwrap) {
      // For raw responses, etag is available via response.headers
      return reqP
    }
    return reqP.then(response => {
      const data = response.data
      if (!includeEtag) return data
      const etag = response.headers.etag || response.headers['ETag']
      return { ...data, status: response.status, etag }
    })
  }
}

export * from './type'

export default API
