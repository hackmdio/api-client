/** @module @hackmd/api */

import axios, { AxiosInstance, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { createClient, type Client } from './generated/client/index.js'
import {
  batchRestore as generatedBatchRestore,
  createFolder as generatedCreateFolder,
  createNote as generatedCreateNote,
  createVersion as generatedCreateVersion,
  createTeamFolder as generatedCreateTeamFolder,
  createTeamNote as generatedCreateTeamNote,
  createTeamWebhook as generatedCreateTeamWebhook,
  createWebhook as generatedCreateWebhook,
  deleteFolder as generatedDeleteFolder,
  deleteNote as generatedDeleteNote,
  deleteTeamFolder as generatedDeleteTeamFolder,
  deleteTeamNote as generatedDeleteTeamNote,
  deleteTeamWebhook as generatedDeleteTeamWebhook,
  deleteWebhook as generatedDeleteWebhook,
  exportTeamWebhookDeliveries as generatedExportTeamWebhookDeliveries,
  exportWebhookDeliveries as generatedExportWebhookDeliveries,
  getCurrentUser,
  getFolder as generatedGetFolder,
  getFolderOrder as generatedGetFolderOrder,
  getHistory as generatedGetHistory,
  getNote as generatedGetNote,
  getNoteComment as generatedGetNoteComment,
  getVersion as generatedGetVersion,
  getTeamNote as generatedGetTeamNote,
  getTeamFolder as generatedGetTeamFolder,
  getTeamFolderOrder as generatedGetTeamFolderOrder,
  getTeamWebhook as generatedGetTeamWebhook,
  getTeamWebhookDelivery as generatedGetTeamWebhookDelivery,
  getWebhook as generatedGetWebhook,
  getWebhookDelivery as generatedGetWebhookDelivery,
  listFolders,
  listNotes,
  listNoteComments as generatedListNoteComments,
  listVersions as generatedListVersions,
  listTrash as generatedListTrash,
  listTeams,
  listTeamFolders,
  listTeamNotes,
  listTeamTrash as generatedListTeamTrash,
  listTeamWebhooks as generatedListTeamWebhooks,
  listTeamWebhookDeliveries as generatedListTeamWebhookDeliveries,
  listWebhooks as generatedListWebhooks,
  listWebhookDeliveries as generatedListWebhookDeliveries,
  pingTeamWebhook as generatedPingTeamWebhook,
  pingWebhook as generatedPingWebhook,
  restoreNote as generatedRestoreNote,
  resolveNoteComment as generatedResolveNoteComment,
  compareVersions as generatedCompareVersions,
  updateFolder as generatedUpdateFolder,
  updateFolderOrder as generatedUpdateFolderOrder,
  updateNote as generatedUpdateNote,
  updateVersion as generatedUpdateVersion,
  updateTeamFolder as generatedUpdateTeamFolder,
  updateTeamFolderOrder as generatedUpdateTeamFolderOrder,
  updateTeamNote as generatedUpdateTeamNote,
  updateTeamWebhook as generatedUpdateTeamWebhook,
  updateWebhook as generatedUpdateWebhook,
  unresolveNoteComment as generatedUnresolveNoteComment,
  uploadNoteImage as generatedUploadNoteImage,
} from './generated/sdk.gen.js'
import {
  CreateNoteOptions,
  CreateNoteMultiStatusResponse,
  CreateTeamFolderBody,
  CreateUserFolderBody,
  GetMe,
  GetUserHistory,
  GetUserNotes,
  GetUserNote,
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
  UploadNoteImageOptions,
  UploadNoteImageResponse,
  ApiWebhook,
  CreateWebhookBody,
  CreateWebhookResult,
  UpdateWebhookBody,
  ApiWebhookDelivery,
  WebhookDeliveryPage,
  ApiTrashNote,
  BatchRestoreTrashBody,
  TrashBatchOperationResponse,
  CompareNoteVersions,
  CompareVersionsQuery,
  CreateNoteVersionBody,
  GetNoteVersions,
  ListVersionsQuery,
  NoteVersion,
  NoteVersionMetadata,
  UpdateNoteVersionBody,
  ApiCommentDetail,
  ApiCommentResolutionResponse,
  GetNoteComments,
  ListNoteCommentsQuery,
} from './type.js'
import * as HackMDErrors from './error'

export type RequestOptions = {
  unwrapData?: boolean;
  etag?: string | undefined;
}

export type GetHistoryOptions = RequestOptions & { limit?: number }
export type WebhookDeliveryListOptions = RequestOptions & { page?: number; limit?: number }
export type ListVersionsOptions = RequestOptions & ListVersionsQuery
export type ListNoteCommentsOptions = RequestOptions & ListNoteCommentsQuery

const defaultOption: RequestOptions = {
  unwrapData: true,
}

type OptionReturnType<Opt, T> = Opt extends { unwrapData: false } ? AxiosResponse<T> : Opt extends { unwrapData: true } ? T : T
type UpdateNoteReturnType<Opt extends RequestOptions> = Opt extends { unwrapData: false }
  ? AxiosResponse<void> & { status: 202 }
  : UpdateNoteResult
type CreateNoteReturnType<Opt extends RequestOptions> = Opt extends { unwrapData: false }
  ? CreateNoteRawResult
  : CreateNoteResult
type CreateTeamNoteReturnType<Opt extends RequestOptions> = Opt extends { unwrapData: false }
  ? CreateNoteRawResult
  : CreateTeamNote

export type UpdateNoteResult = { status: 202; etag?: string }
export type CreateNoteResult =
  | (SingleNote & { status: 201; etag?: string })
  | (CreateNoteMultiStatusResponse & { status: 207; etag?: string })
export type CreateNoteRawResult =
  | (AxiosResponse<SingleNote> & { status: 201 })
  | (AxiosResponse<CreateNoteMultiStatusResponse> & { status: 207 })

export type GetNoteSuccess = GetUserNote & { status: 200; etag?: string }
export type GetNoteNotModified = { status: 304; etag?: string }
export type GetNoteResult = GetNoteSuccess | GetNoteNotModified
export type GetNoteRawResult =
  | (AxiosResponse<GetUserNote> & { status: 200 })
  | (AxiosResponse<unknown> & { status: 304 })

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
  private generatedClient: Client

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
      timeout: options.timeout
    })
    this.generatedClient = createClient({
      axios: this.axios,
      baseURL: hackmdAPIEndpointURL.replace(/\/+$/, ''),
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
    return this.unwrapData(getCurrentUser({ client: this.generatedClient, throwOnError: true }), options.unwrapData) as unknown as OptionReturnType<Opt, GetMe>
  }

  async getHistory<Opt extends GetHistoryOptions> (options = defaultOption as Opt): Promise<OptionReturnType<Opt, GetUserHistory>> {
    return this.unwrapData(generatedGetHistory({
      client: this.generatedClient,
      query: options.limit === undefined ? undefined : { limit: options.limit },
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, GetUserHistory>
  }

  async getNoteList<Opt extends RequestOptions> (options = defaultOption as Opt): Promise<OptionReturnType<Opt, GetUserNotes>> {
    return this.unwrapData(listNotes({ client: this.generatedClient, throwOnError: true }), options.unwrapData) as unknown as OptionReturnType<Opt, GetUserNotes>
  }

  async getNote (noteId: string): Promise<GetNoteSuccess>
  async getNote (noteId: string, options: { unwrapData: false; etag?: undefined }): Promise<AxiosResponse<GetUserNote> & { status: 200 }>
  async getNote (noteId: string, options: { unwrapData: false; etag: string }): Promise<GetNoteRawResult>
  async getNote (noteId: string, options: { unwrapData?: true; etag: string }): Promise<GetNoteResult>
  async getNote (noteId: string, options: { unwrapData?: true; etag?: undefined }): Promise<GetNoteSuccess>
  async getNote (noteId: string, options: RequestOptions): Promise<GetNoteResult | GetNoteRawResult>
  async getNote (noteId: string, options: RequestOptions = defaultOption): Promise<GetNoteResult | GetNoteRawResult> {
    const request = generatedGetNote({
      client: this.generatedClient,
      path: { noteId },
      headers: options.etag ? { 'If-None-Match': options.etag } : undefined,
      validateStatus: (status: number) =>
        (status >= 200 && status < 300) || Boolean(options.etag && status === 304),
      throwOnError: true,
    })
    return this.unwrapData(request, options.unwrapData, true) as unknown as Promise<GetNoteResult | GetNoteRawResult>
  }

  async createNote<Opt extends RequestOptions> (payload: CreateNoteOptions, options = defaultOption as Opt): Promise<CreateNoteReturnType<Opt>> {
    return this.unwrapData(generatedCreateNote({ client: this.generatedClient, body: payload, throwOnError: true }), options.unwrapData, true) as unknown as CreateNoteReturnType<Opt>
  }

  async updateNoteContent<Opt extends RequestOptions> (noteId: string, content?: string, options = defaultOption as Opt): Promise<UpdateNoteReturnType<Opt>> {
    return this.unwrapData(generatedUpdateNote({
      client: this.generatedClient,
      path: { noteId },
      body: { content },
      throwOnError: true,
    }), options.unwrapData, true) as unknown as UpdateNoteReturnType<Opt>
  }

  async updateNote<Opt extends RequestOptions> (noteId: string, payload: UpdateNoteOptions, options = defaultOption as Opt): Promise<UpdateNoteReturnType<Opt>> {
    return this.unwrapData(generatedUpdateNote({
      client: this.generatedClient,
      path: { noteId },
      body: payload,
      throwOnError: true,
    }), options.unwrapData, true) as unknown as UpdateNoteReturnType<Opt>
  }

  async deleteNote<Opt extends RequestOptions> (noteId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, void>> {
    return this.unwrapData(generatedDeleteNote({
      client: this.generatedClient,
      path: { noteId },
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, void>
  }

  async uploadNoteImage<Opt extends UploadNoteImageOptions> (noteId: string, image: Blob, options = defaultOption as Opt): Promise<OptionReturnType<Opt, UploadNoteImageResponse>> {
    const formData = new FormData()
    formData.append('image', image, options.filename ?? undefined)

    return this.unwrapData(
      generatedUploadNoteImage({
        client: this.generatedClient,
        path: { noteId },
        body: { image },
        bodySerializer: () => formData,
        throwOnError: true,
      }),
      options.unwrapData,
    ) as unknown as OptionReturnType<Opt, UploadNoteImageResponse>
  }

  async getTeams<Opt extends RequestOptions> (options = defaultOption as Opt): Promise<OptionReturnType<Opt, GetUserTeams>> {
    return this.unwrapData(listTeams({ client: this.generatedClient, throwOnError: true }), options.unwrapData) as unknown as OptionReturnType<Opt, GetUserTeams>
  }

  async getTeamNote (teamPath: string, noteId: string): Promise<GetNoteSuccess>
  async getTeamNote (teamPath: string, noteId: string, options: { unwrapData: false; etag?: undefined }): Promise<AxiosResponse<GetUserNote> & { status: 200 }>
  async getTeamNote (teamPath: string, noteId: string, options: { unwrapData: false; etag: string }): Promise<GetNoteRawResult>
  async getTeamNote (teamPath: string, noteId: string, options: { unwrapData?: true; etag: string }): Promise<GetNoteResult>
  async getTeamNote (teamPath: string, noteId: string, options: { unwrapData?: true; etag?: undefined }): Promise<GetNoteSuccess>
  async getTeamNote (teamPath: string, noteId: string, options: RequestOptions): Promise<GetNoteResult | GetNoteRawResult>
  async getTeamNote (teamPath: string, noteId: string, options: RequestOptions = defaultOption): Promise<GetNoteResult | GetNoteRawResult> {
    const request = generatedGetTeamNote({
      client: this.generatedClient,
      path: { teampath: teamPath, noteId },
      headers: options.etag ? { 'If-None-Match': options.etag } : undefined,
      validateStatus: (status: number) =>
        (status >= 200 && status < 300) || Boolean(options.etag && status === 304),
      throwOnError: true,
    })
    return this.unwrapData(request, options.unwrapData, true) as unknown as Promise<GetNoteResult | GetNoteRawResult>
  }

  async getTeamNotes<Opt extends RequestOptions> (teamPath: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, GetTeamNotes>> {
    return this.unwrapData(listTeamNotes({
      client: this.generatedClient,
      path: { teampath: teamPath },
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, GetTeamNotes>
  }

  async createTeamNote<Opt extends RequestOptions> (teamPath: string, payload: CreateNoteOptions, options = defaultOption as Opt): Promise<CreateTeamNoteReturnType<Opt>> {
    return this.unwrapData(generatedCreateTeamNote({
      client: this.generatedClient,
      path: { teampath: teamPath },
      body: payload,
      throwOnError: true,
    }), options.unwrapData) as unknown as CreateTeamNoteReturnType<Opt>
  }

  async updateTeamNoteContent (teamPath: string, noteId: string, content?: string): Promise<AxiosResponse> {
    return generatedUpdateTeamNote({
      client: this.generatedClient,
      path: { teampath: teamPath, noteId },
      body: { content },
      throwOnError: true,
    })
  }

  async updateTeamNote (teamPath: string, noteId: string, options: UpdateNoteOptions): Promise<AxiosResponse> {
    return generatedUpdateTeamNote({
      client: this.generatedClient,
      path: { teampath: teamPath, noteId },
      body: options,
      throwOnError: true,
    })
  }

  async deleteTeamNote (teamPath: string, noteId: string): Promise<AxiosResponse> {
    return generatedDeleteTeamNote({
      client: this.generatedClient,
      path: { teampath: teamPath, noteId },
      throwOnError: true,
    })
  }

  async getFolderList<Opt extends RequestOptions> (options = defaultOption as Opt): Promise<OptionReturnType<Opt, GetFolders>> {
    return this.unwrapData(listFolders({ client: this.generatedClient, throwOnError: true }), options.unwrapData) as unknown as OptionReturnType<Opt, GetFolders>
  }

  async createFolder<Opt extends RequestOptions> (payload: CreateUserFolderBody, options = defaultOption as Opt): Promise<OptionReturnType<Opt, CreateFolderResult>> {
    return this.unwrapData(generatedCreateFolder({ client: this.generatedClient, body: payload, throwOnError: true }), options.unwrapData) as unknown as OptionReturnType<Opt, CreateFolderResult>
  }

  async getFolder<Opt extends RequestOptions> (folderId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, GetFolder>> {
    return this.unwrapData(generatedGetFolder({
      client: this.generatedClient,
      path: { folderId },
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, GetFolder>
  }

  async updateFolder<Opt extends RequestOptions> (folderId: string, payload: UpdateUserFolderBody, options = defaultOption as Opt): Promise<OptionReturnType<Opt, UpdateFolderResult>> {
    return this.unwrapData(generatedUpdateFolder({
      client: this.generatedClient,
      path: { folderId },
      body: payload,
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, UpdateFolderResult>
  }

  async deleteFolder<Opt extends RequestOptions> (folderId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, void>> {
    return this.unwrapData(generatedDeleteFolder({
      client: this.generatedClient,
      path: { folderId },
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, void>
  }

  async getFolderOrder<Opt extends RequestOptions> (options = defaultOption as Opt): Promise<OptionReturnType<Opt, GetFolderOrder>> {
    return this.unwrapData(generatedGetFolderOrder({ client: this.generatedClient, throwOnError: true }), options.unwrapData) as unknown as OptionReturnType<Opt, GetFolderOrder>
  }

  async updateFolderOrder<Opt extends RequestOptions> (payload: UpdateFolderOrderBody, options = defaultOption as Opt): Promise<OptionReturnType<Opt, UpdateFolderResult>> {
    return this.unwrapData(generatedUpdateFolderOrder({ client: this.generatedClient, body: payload, throwOnError: true }), options.unwrapData) as unknown as OptionReturnType<Opt, UpdateFolderResult>
  }

  async getTeamFolderList<Opt extends RequestOptions> (teamPath: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, GetTeamFolders>> {
    return this.unwrapData(listTeamFolders({
      client: this.generatedClient,
      path: { teampath: teamPath },
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, GetTeamFolders>
  }

  async createTeamFolder<Opt extends RequestOptions> (teamPath: string, payload: CreateTeamFolderBody, options = defaultOption as Opt): Promise<OptionReturnType<Opt, CreateTeamFolderResult>> {
    return this.unwrapData(generatedCreateTeamFolder({
      client: this.generatedClient,
      path: { teampath: teamPath },
      body: payload,
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, CreateTeamFolderResult>
  }

  async getTeamFolder<Opt extends RequestOptions> (teamPath: string, folderId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, GetTeamFolder>> {
    return this.unwrapData(generatedGetTeamFolder({
      client: this.generatedClient,
      path: { teampath: teamPath, folderId },
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, GetTeamFolder>
  }

  async updateTeamFolder<Opt extends RequestOptions> (teamPath: string, folderId: string, payload: UpdateTeamFolderBody, options = defaultOption as Opt): Promise<OptionReturnType<Opt, UpdateTeamFolderResult>> {
    return this.unwrapData(generatedUpdateTeamFolder({
      client: this.generatedClient,
      path: { teampath: teamPath, folderId },
      body: payload,
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, UpdateTeamFolderResult>
  }

  async deleteTeamFolder<Opt extends RequestOptions> (teamPath: string, folderId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, void>> {
    return this.unwrapData(generatedDeleteTeamFolder({
      client: this.generatedClient,
      path: { teampath: teamPath, folderId },
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, void>
  }

  async getTeamFolderOrder<Opt extends RequestOptions> (teamPath: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, GetTeamFolderOrder>> {
    return this.unwrapData(generatedGetTeamFolderOrder({
      client: this.generatedClient,
      path: { teampath: teamPath },
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, GetTeamFolderOrder>
  }

  async updateTeamFolderOrder<Opt extends RequestOptions> (teamPath: string, payload: UpdateFolderOrderBody, options = defaultOption as Opt): Promise<OptionReturnType<Opt, UpdateTeamFolderResult>> {
    return this.unwrapData(generatedUpdateTeamFolderOrder({
      client: this.generatedClient,
      path: { teampath: teamPath },
      body: payload,
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, UpdateTeamFolderResult>
  }

  async listWebhooks<Opt extends RequestOptions> (options = defaultOption as Opt): Promise<OptionReturnType<Opt, ApiWebhook[]>> {
    return this.unwrapData(generatedListWebhooks({ client: this.generatedClient, throwOnError: true }), options.unwrapData) as unknown as OptionReturnType<Opt, ApiWebhook[]>
  }

  async getWebhook<Opt extends RequestOptions> (hookId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, ApiWebhook>> {
    return this.unwrapData(generatedGetWebhook({
      client: this.generatedClient,
      path: { hookId },
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, ApiWebhook>
  }

  async createWebhook<Opt extends RequestOptions> (body: CreateWebhookBody, options = defaultOption as Opt): Promise<OptionReturnType<Opt, CreateWebhookResult>> {
    return this.unwrapData(generatedCreateWebhook({
      client: this.generatedClient,
      body,
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, CreateWebhookResult>
  }

  async updateWebhook<Opt extends RequestOptions> (hookId: string, body: UpdateWebhookBody, options = defaultOption as Opt): Promise<OptionReturnType<Opt, ApiWebhook>> {
    return this.unwrapData(generatedUpdateWebhook({
      client: this.generatedClient,
      path: { hookId },
      body,
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, ApiWebhook>
  }

  async deleteWebhook<Opt extends RequestOptions> (hookId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, void>> {
    return this.unwrapData(generatedDeleteWebhook({
      client: this.generatedClient,
      path: { hookId },
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, void>
  }

  async listTeamWebhooks<Opt extends RequestOptions> (teamPath: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, ApiWebhook[]>> {
    return this.unwrapData(generatedListTeamWebhooks({
      client: this.generatedClient,
      path: { teampath: teamPath },
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, ApiWebhook[]>
  }

  async getTeamWebhook<Opt extends RequestOptions> (teamPath: string, hookId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, ApiWebhook>> {
    return this.unwrapData(generatedGetTeamWebhook({
      client: this.generatedClient,
      path: { teampath: teamPath, hookId },
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, ApiWebhook>
  }

  async createTeamWebhook<Opt extends RequestOptions> (teamPath: string, body: CreateWebhookBody, options = defaultOption as Opt): Promise<OptionReturnType<Opt, CreateWebhookResult>> {
    return this.unwrapData(generatedCreateTeamWebhook({
      client: this.generatedClient,
      path: { teampath: teamPath },
      body,
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, CreateWebhookResult>
  }

  async updateTeamWebhook<Opt extends RequestOptions> (teamPath: string, hookId: string, body: UpdateWebhookBody, options = defaultOption as Opt): Promise<OptionReturnType<Opt, ApiWebhook>> {
    return this.unwrapData(generatedUpdateTeamWebhook({
      client: this.generatedClient,
      path: { teampath: teamPath, hookId },
      body,
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, ApiWebhook>
  }

  async deleteTeamWebhook<Opt extends RequestOptions> (teamPath: string, hookId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, void>> {
    return this.unwrapData(generatedDeleteTeamWebhook({
      client: this.generatedClient,
      path: { teampath: teamPath, hookId },
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, void>
  }

  async pingWebhook<Opt extends RequestOptions> (hookId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, void>> {
    return this.unwrapData(generatedPingWebhook({
      client: this.generatedClient,
      path: { hookId },
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, void>
  }

  async listWebhookDeliveries<Opt extends WebhookDeliveryListOptions> (hookId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, WebhookDeliveryPage>> {
    return this.unwrapData(generatedListWebhookDeliveries({
      client: this.generatedClient,
      path: { hookId },
      query: { page: options.page, limit: options.limit },
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, WebhookDeliveryPage>
  }

  async getWebhookDelivery<Opt extends RequestOptions> (hookId: string, deliveryId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, ApiWebhookDelivery>> {
    return this.unwrapData(generatedGetWebhookDelivery({
      client: this.generatedClient,
      path: { hookId, deliveryId },
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, ApiWebhookDelivery>
  }

  async exportWebhookDeliveries<Opt extends RequestOptions> (hookId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, string>> {
    return this.unwrapData(generatedExportWebhookDeliveries({
      client: this.generatedClient,
      path: { hookId },
      responseType: 'text',
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, string>
  }

  async pingTeamWebhook<Opt extends RequestOptions> (teamPath: string, hookId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, void>> {
    return this.unwrapData(generatedPingTeamWebhook({
      client: this.generatedClient,
      path: { teampath: teamPath, hookId },
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, void>
  }

  async listTeamWebhookDeliveries<Opt extends WebhookDeliveryListOptions> (teamPath: string, hookId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, WebhookDeliveryPage>> {
    return this.unwrapData(generatedListTeamWebhookDeliveries({
      client: this.generatedClient,
      path: { teampath: teamPath, hookId },
      query: { page: options.page, limit: options.limit },
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, WebhookDeliveryPage>
  }

  async getTeamWebhookDelivery<Opt extends RequestOptions> (teamPath: string, hookId: string, deliveryId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, ApiWebhookDelivery>> {
    return this.unwrapData(generatedGetTeamWebhookDelivery({
      client: this.generatedClient,
      path: { teampath: teamPath, hookId, deliveryId },
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, ApiWebhookDelivery>
  }

  async exportTeamWebhookDeliveries<Opt extends RequestOptions> (teamPath: string, hookId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, string>> {
    return this.unwrapData(generatedExportTeamWebhookDeliveries({
      client: this.generatedClient,
      path: { teampath: teamPath, hookId },
      responseType: 'text',
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, string>
  }

  async listTrash<Opt extends RequestOptions> (options = defaultOption as Opt): Promise<OptionReturnType<Opt, ApiTrashNote[]>> {
    return this.unwrapData(generatedListTrash({ client: this.generatedClient, throwOnError: true }), options.unwrapData) as unknown as OptionReturnType<Opt, ApiTrashNote[]>
  }

  async batchRestore<Opt extends RequestOptions> (body: BatchRestoreTrashBody, options = defaultOption as Opt): Promise<OptionReturnType<Opt, TrashBatchOperationResponse>> {
    return this.unwrapData(generatedBatchRestore({
      client: this.generatedClient,
      body,
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, TrashBatchOperationResponse>
  }

  async restoreNote<Opt extends RequestOptions> (noteId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, void>> {
    return this.unwrapData(generatedRestoreNote({
      client: this.generatedClient,
      path: { noteId },
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, void>
  }

  async listTeamTrash<Opt extends RequestOptions> (teamPath: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, ApiTrashNote[]>> {
    return this.unwrapData(generatedListTeamTrash({
      client: this.generatedClient,
      path: { teampath: teamPath },
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, ApiTrashNote[]>
  }

  async listVersions<Opt extends ListVersionsOptions> (noteId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, GetNoteVersions>> {
    const { named_only, q, created_by, created_after, created_before, page, limit } = options
    return this.unwrapData(generatedListVersions({
      client: this.generatedClient,
      path: { noteId },
      query: { named_only, q, created_by, created_after, created_before, page, limit },
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, GetNoteVersions>
  }

  async getVersion<Opt extends RequestOptions> (noteId: string, versionId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, NoteVersion>> {
    return this.unwrapData(generatedGetVersion({
      client: this.generatedClient,
      path: { noteId, versionId },
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, NoteVersion>
  }

  async createVersion<Opt extends RequestOptions> (noteId: string, body: CreateNoteVersionBody, options = defaultOption as Opt): Promise<OptionReturnType<Opt, NoteVersionMetadata>> {
    return this.unwrapData(generatedCreateVersion({
      client: this.generatedClient,
      path: { noteId },
      body,
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, NoteVersionMetadata>
  }

  async updateVersion<Opt extends RequestOptions> (noteId: string, body: UpdateNoteVersionBody, options = defaultOption as Opt): Promise<OptionReturnType<Opt, NoteVersionMetadata>> {
    return this.unwrapData(generatedUpdateVersion({
      client: this.generatedClient,
      path: { noteId },
      body,
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, NoteVersionMetadata>
  }

  async compareVersions<Opt extends RequestOptions> (noteId: string, query: CompareVersionsQuery, options = defaultOption as Opt): Promise<OptionReturnType<Opt, CompareNoteVersions>> {
    return this.unwrapData(generatedCompareVersions({
      client: this.generatedClient,
      path: { noteId },
      query,
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, CompareNoteVersions>
  }

  async listNoteComments<Opt extends ListNoteCommentsOptions> (noteId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, GetNoteComments>> {
    const { page, limit, sort, threadId, commentStatus, threadStatus, isThreadHead } = options
    return this.unwrapData(generatedListNoteComments({
      client: this.generatedClient,
      path: { noteId },
      query: { page, limit, sort, threadId, commentStatus, threadStatus, isThreadHead },
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, GetNoteComments>
  }

  async getNoteComment<Opt extends RequestOptions> (noteId: string, commentId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, ApiCommentDetail>> {
    return this.unwrapData(generatedGetNoteComment({
      client: this.generatedClient,
      path: { noteId, commentId },
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, ApiCommentDetail>
  }

  async resolveNoteComment<Opt extends RequestOptions> (noteId: string, commentId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, ApiCommentResolutionResponse>> {
    return this.unwrapData(generatedResolveNoteComment({
      client: this.generatedClient,
      path: { noteId, commentId },
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, ApiCommentResolutionResponse>
  }

  async unresolveNoteComment<Opt extends RequestOptions> (noteId: string, commentId: string, options = defaultOption as Opt): Promise<OptionReturnType<Opt, ApiCommentResolutionResponse>> {
    return this.unwrapData(generatedUnresolveNoteComment({
      client: this.generatedClient,
      path: { noteId, commentId },
      throwOnError: true,
    }), options.unwrapData) as unknown as OptionReturnType<Opt, ApiCommentResolutionResponse>
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

export * from './type.js'

export default API
