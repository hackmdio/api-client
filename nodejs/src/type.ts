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

export interface Team {
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

export interface User {
  id: string
  email: string | null
  name: string
  userPath: string
  photo: string
  teams: Team[]
}

export interface SimpleUserProfile {
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

export interface Note {
  id: string
  title: string
  content: string
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

  readPermission: NotePermissionRole
  writePermission: NotePermissionRole
}

export interface SingleNote extends Note {
  content: string
}

export type GetMe = User

export type GetUserNotes = Note[]
export type GetUserNote = SingleNote
export type CreateUserNote = SingleNote
export type UpdateUserNote = SingleNote

// !Use status code to indicate wether the request is successful or not
// export type DeleteUserNote = Note

export type GetUserHistory = Note[]

export type GetUserTeams = Team[]

export type GetTeamNotes = Note[]
export type CreateTeamNote = SingleNote
export type UpdateTeamNote = SingleNote


// !Use status code to indicate wether the request is successful or not
// export type DeleteTeamNote = Note
