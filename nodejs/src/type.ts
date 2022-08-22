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
  readPermission?: NotePermissionRole,
  writePermission?: NotePermissionRole,
  commentPermission?: CommentPermissionType,
  permalink?: string
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
}

export type SingleNote = Note & {
  content: string
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

// Teams
export type GetUserTeams = Team[]

// Team notes
export type GetTeamNotes = Note[]
export type CreateTeamNote = SingleNote
export type UpdateTeamNote = void
export type DeleteTeamNote = void


