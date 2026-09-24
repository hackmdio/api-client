import type {
  ApiComment as GeneratedApiComment,
  ApiCommentDetail as GeneratedApiCommentDetail,
  ApiCommentResolutionResponse as GeneratedApiCommentResolutionResponse,
  ApiFolder as GeneratedApiFolder,
  ApiWebhook as GeneratedApiWebhook,
  ApiWebhookDelivery as GeneratedApiWebhookDelivery,
  ApiTrashNote as GeneratedApiTrashNote,
  BatchRestoreTrashBody as GeneratedBatchRestoreTrashBody,
  CompareNoteVersions as GeneratedCompareNoteVersions,
  CompareVersionsData as GeneratedCompareVersionsData,
  CommentPermissionType as GeneratedCommentPermissionType,
  CreateNoteVersionBody as GeneratedCreateNoteVersionBody,
  CreateApiWebhookBody as GeneratedCreateApiWebhookBody,
  CreateNoteData as GeneratedCreateNoteData,
  CreateNoteMultiStatusResponse as GeneratedCreateNoteMultiStatusResponse,
  CreateWebhookResponse as GeneratedCreateWebhookResponse,
  FolderPath as GeneratedFolderPath,
  GetNoteComments as GeneratedGetNoteComments,
  GetUserHistory as GeneratedUserHistory,
  GetNoteVersions as GeneratedGetNoteVersions,
  ListVersionsData as GeneratedListVersionsData,
  ListNoteCommentsData as GeneratedListNoteCommentsData,
  NoteVersion as GeneratedNoteVersion,
  NoteVersionMetadata as GeneratedNoteVersionMetadata,
  NoteType as GeneratedNote,
  NotePermissionRole as GeneratedNotePermissionRole,
  NotePublishType as GeneratedNotePublishType,
  NoteImageUploadResponse as GeneratedNoteImageUploadResponse,
  PaginatedResponseApiWebhookDelivery as GeneratedWebhookDeliveryPage,
  SimpleUserProfile as GeneratedSimpleUserProfile,
  SingleNote as GeneratedSingleNote,
  Team as GeneratedTeam,
  TeamVisibilityType as GeneratedTeamVisibilityType,
  TrashBatchOperationResponse as GeneratedTrashBatchOperationResponse,
  UpdateNoteData as GeneratedUpdateNoteData,
  UpdateNoteVersionBody as GeneratedUpdateNoteVersionBody,
  UpdateWebhookData as GeneratedUpdateWebhookData,
  User as GeneratedUser,
} from './generated/types.gen.js'

/** Preserve the runtime enum-like values while deriving their types from OpenAPI. */
export const TeamVisibilityType = {
  PUBLIC: 'public',
  PRIVATE: 'private',
} as const satisfies Record<Uppercase<GeneratedTeamVisibilityType>, GeneratedTeamVisibilityType>
export type TeamVisibilityType = GeneratedTeamVisibilityType

export const NotePublishType = {
  EDIT: 'edit',
  VIEW: 'view',
  SLIDE: 'slide',
  BOOK: 'book',
} as const satisfies Record<Uppercase<GeneratedNotePublishType>, GeneratedNotePublishType>
export type NotePublishType = GeneratedNotePublishType

export const CommentPermissionType = {
  DISABLED: 'disabled',
  FORBIDDEN: 'forbidden',
  OWNERS: 'owners',
  SIGNED_IN_USERS: 'signed_in_users',
  EVERYONE: 'everyone',
} as const satisfies Record<Uppercase<GeneratedCommentPermissionType>, GeneratedCommentPermissionType>
export type CommentPermissionType = GeneratedCommentPermissionType

export type CreateNoteOptions = Exclude<NonNullable<GeneratedCreateNoteData['body']>, string>
export type CreateNoteMultiStatusResponse = GeneratedCreateNoteMultiStatusResponse

export type Team = GeneratedTeam
export type User = GeneratedUser

export type SimpleUserProfile = GeneratedSimpleUserProfile

export const NotePermissionRole = {
  OWNER: 'owner',
  SIGNED_IN: 'signed_in',
  GUEST: 'guest',
} as const satisfies Record<Uppercase<GeneratedNotePermissionRole>, GeneratedNotePermissionRole>
export type NotePermissionRole = GeneratedNotePermissionRole

/** Note response types are generated from the v1 OpenAPI contract. */
export type FolderPath = GeneratedFolderPath
export type Note = GeneratedNote
export type SingleNote = GeneratedSingleNote

export type UpdateNoteOptions = GeneratedUpdateNoteData['body']

// User
export type GetMe = User

// User notes
export type GetUserNotes = Note[]
export type GetUserNote = SingleNote
export type GetUserHistory = GeneratedUserHistory
export type CreateUserNote = SingleNote | CreateNoteMultiStatusResponse
export type UpdateUserNote = void
export type DeleteUserNote = void

export type UploadNoteImageResponse = GeneratedNoteImageUploadResponse

export type UploadNoteImageOptions = {
  unwrapData?: boolean
  filename?: string
}

// Teams
export type GetUserTeams = Team[]

// Team notes
export type GetTeamNotes = Note[]
export type CreateTeamNote = SingleNote | CreateNoteMultiStatusResponse
export type UpdateTeamNote = void
export type DeleteTeamNote = void

// Folders (user & team workspaces)
export type ApiFolder = GeneratedApiFolder

/** Maps each parent folder id or the literal `root` to ordered child folder ids. */
export type ApiFolderOrder = Record<string, string[]>

export type CreateUserFolderBody = {
  name?: string
  description?: string
  icon?: string
  color?: string
  parentFolderId?: string
}

export type UpdateUserFolderBody = {
  name?: string
  description?: string | null
  icon?: string | null
  color?: string | null
  parentFolderId?: string | null
}

export type CreateTeamFolderBody = CreateUserFolderBody

export type UpdateTeamFolderBody = UpdateUserFolderBody

export type UpdateFolderOrderBody = {
  order: ApiFolderOrder
}

export type GetFolders = ApiFolder[]
export type GetTeamFolders = ApiFolder[]
export type GetFolder = ApiFolder
export type GetTeamFolder = ApiFolder
export type CreateFolderResult = ApiFolder
export type CreateTeamFolderResult = ApiFolder
export type UpdateFolderResult = void
export type UpdateTeamFolderResult = void
export type DeleteFolderResult = void
export type DeleteTeamFolderResult = void
export type GetFolderOrder = ApiFolderOrder
export type GetTeamFolderOrder = ApiFolderOrder

// Webhooks (personal & team workspaces)
export type ApiWebhook = GeneratedApiWebhook
export type CreateWebhookBody = GeneratedCreateApiWebhookBody
export type CreateWebhookResult = GeneratedCreateWebhookResponse
export type UpdateWebhookBody = GeneratedUpdateWebhookData
export type ApiWebhookDelivery = GeneratedApiWebhookDelivery
export type WebhookDeliveryPage = GeneratedWebhookDeliveryPage

// Trash (personal & team workspaces)
export type ApiTrashNote = GeneratedApiTrashNote
export type BatchRestoreTrashBody = GeneratedBatchRestoreTrashBody
export type TrashBatchOperationResponse = GeneratedTrashBatchOperationResponse

// Versions
export type NoteVersion = GeneratedNoteVersion
export type NoteVersionMetadata = GeneratedNoteVersionMetadata
export type GetNoteVersions = GeneratedGetNoteVersions
export type CreateNoteVersionBody = GeneratedCreateNoteVersionBody
export type UpdateNoteVersionBody = GeneratedUpdateNoteVersionBody
export type CompareNoteVersions = GeneratedCompareNoteVersions
export type CompareVersionsQuery = GeneratedCompareVersionsData['query']
export type ListVersionsQuery = NonNullable<GeneratedListVersionsData['query']>

// Comments
export type ApiComment = GeneratedApiComment
export type ApiCommentDetail = GeneratedApiCommentDetail
export type ApiCommentResolutionResponse = GeneratedApiCommentResolutionResponse
export type GetNoteComments = GeneratedGetNoteComments
export type ListNoteCommentsQuery = NonNullable<GeneratedListNoteCommentsData['query']>
