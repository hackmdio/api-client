import type {
  ApiFolder as GeneratedApiFolder,
  ApiWebhook as GeneratedApiWebhook,
  CreateApiWebhookBody as GeneratedCreateApiWebhookBody,
  CreateNoteData as GeneratedCreateNoteData,
  CreateNoteMultiStatusResponse as GeneratedCreateNoteMultiStatusResponse,
  CreateWebhookResponse as GeneratedCreateWebhookResponse,
  FolderPath as GeneratedFolderPath,
  GetUserHistory as GeneratedUserHistory,
  NoteType as GeneratedNote,
  NoteImageUploadResponse as GeneratedNoteImageUploadResponse,
  SimpleUserProfile as GeneratedSimpleUserProfile,
  SingleNote as GeneratedSingleNote,
  Team as GeneratedTeam,
  UpdateNoteData as GeneratedUpdateNoteData,
  UpdateWebhookData as GeneratedUpdateWebhookData,
  User as GeneratedUser,
} from './generated/types.gen.js'

export enum TeamVisibilityType {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export enum NotePublishType {
  EDIT = 'edit',
  VIEW = 'view',
  SLIDE = 'slide',
  BOOK = 'book'
}

export enum CommentPermissionType {
  DISABLED = 'disabled',
  FORBIDDEN = 'forbidden',
  OWNERS = 'owners',
  SIGNED_IN_USERS = 'signed_in_users',
  EVERYONE = 'everyone'
}

export type CreateNoteOptions = Exclude<NonNullable<GeneratedCreateNoteData['body']>, string>
export type CreateNoteMultiStatusResponse = GeneratedCreateNoteMultiStatusResponse

export type Team = GeneratedTeam
export type User = GeneratedUser

export type SimpleUserProfile = GeneratedSimpleUserProfile

export enum NotePermissionRole {
  OWNER = 'owner',
  SIGNED_IN = 'signed_in',
  GUEST = 'guest'
}

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
