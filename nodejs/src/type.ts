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

export type CreateNoteOptions = {
  title?: string
  content?: string
  description?: string
  tags?: string[]
  readPermission?: NotePermissionRole,
  writePermission?: NotePermissionRole,
  commentPermission?: CommentPermissionType,
  permalink?: string
  parentFolderId?: string
}

export type Team = {
  id: string
  ownerId: string
  name: string
  logo: string
  path: string
  description: string
  hardBreaks: boolean
  visibility: TeamVisibilityType
  createdAt: Date
}

export type User = {
  id: string
  email: string | null
  name: string
  userPath: string
  photo: string
  teams: Team[]
}

export type SimpleUserProfile = {
  name: string,
  userPath: string
  photo: string
  biography: string | null
  createdAt: Date
}

export enum NotePermissionRole {
  OWNER = 'owner',
  SIGNED_IN = 'signed_in',
  GUEST = 'guest'
}

/** Folder breadcrumb segment as returned on notes (OpenAPI `FolderPath`). */
export type FolderPath = {
  id: string
  name: string
  icon: string | null
  color: string | null
  parentId: string | null
  clientId: string
}

export type Note = {
  id: string
  title: string
  tags: string[]
  lastChangedAt: string
  createdAt: string
  lastChangeUser: SimpleUserProfile | null
  publishType: NotePublishType
  publishedAt: string | null
  userPath: string | null
  teamPath: string | null
  permalink: string | null
  shortId: string
  publishLink: string

  readPermission: NotePermissionRole
  writePermission: NotePermissionRole
  folderPaths?: FolderPath[]
}

export type SingleNote = Note & {
  content: string
}

export type UpdateNoteOptions = Partial<Pick<SingleNote, 'content' | 'title' | 'tags' | 'readPermission' | 'writePermission' | 'permalink'>> & {
  parentFolderId?: string
}

// User
export type GetMe = User

// User notes
export type GetUserNotes = Note[]
export type GetUserNote = SingleNote
export type GetUserHistory = Note[]
export type CreateUserNote = SingleNote
export type UpdateUserNote = void
export type DeleteUserNote = void

export type UploadNoteImageResponse = {
  data: {
    link: string
  }
}

export type UploadNoteImageOptions = {
  unwrapData?: boolean
  filename?: string
}

// Teams
export type GetUserTeams = Team[]

// Team notes
export type GetTeamNotes = Note[]
export type CreateTeamNote = SingleNote
export type UpdateTeamNote = void
export type DeleteTeamNote = void

// Folders (user & team workspaces)
export type ApiFolder = {
  id: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  parentFolderId: string | null
  createdAt: number
  updatedAt: number
}

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
export type UpdateFolderResult = ApiFolder
export type UpdateTeamFolderResult = ApiFolder
export type DeleteFolderResult = void
export type DeleteTeamFolderResult = void
export type GetFolderOrder = ApiFolderOrder
export type GetTeamFolderOrder = ApiFolderOrder

