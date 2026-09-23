/** Type-only playground: these functions are not called and send no requests. */
import type { API, GetUserNote } from '@hackmd/api'
import type { SingleNote as RawNote } from '@hackmd/api/raw'

async function exploreClient (client: API): Promise<GetUserNote> {
  return client.getNote('NOTE_ID')
}

async function exploreConditionalNote (client: API): Promise<string | undefined> {
  const response = await client.getNote('NOTE_ID', { etag: 'W/"cached"' })
  if (response.status === 304) {
    // @ts-expect-error A 304 response has no note content.
    response.content
    return undefined
  }
  const lastChangedAt: number = response.lastChangedAt
  void lastChangedAt
  return response.content
}

async function exploreNoteList (client: API): Promise<number> {
  const notes = await client.getNoteList()
  return notes[0].createdAt
}

async function exploreHistory (client: API): Promise<number> {
  const notes = await client.getHistory({ limit: 5 })
  return notes[0].lastChangedAt
}

async function exploreTeamNotes (client: API): Promise<number> {
  const notes = await client.getTeamNotes('TEAM_PATH')
  return notes[0].createdAt
}

async function exploreFolders (client: API): Promise<number> {
  const folders = await client.getFolderList()
  return folders[0].createdAt
}

async function exploreTeamFolders (client: API): Promise<number> {
  const folders = await client.getTeamFolderList('TEAM_PATH')
  return folders[0].updatedAt
}

function exploreRawNote (note: RawNote): string {
  return note.content
}

void exploreClient
void exploreConditionalNote
void exploreNoteList
void exploreHistory
void exploreTeamNotes
void exploreFolders
void exploreTeamFolders
void exploreRawNote
