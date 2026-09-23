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

async function exploreFolderReads (client: API): Promise<string[]> {
  const personalFolder = await client.getFolder('FOLDER_ID')
  const teamFolder = await client.getTeamFolder('TEAM_PATH', 'FOLDER_ID')
  const personalOrder = await client.getFolderOrder()
  const teamOrder = await client.getTeamFolderOrder('TEAM_PATH')
  return [personalFolder.id, teamFolder.id, ...personalOrder.root, ...teamOrder.root]
}

async function exploreFolderWrites (client: API): Promise<void> {
  const folder = await client.createFolder({ name: 'Research' })
  const teamFolder = await client.createTeamFolder('TEAM_PATH', { name: 'Research' })
  const updated: void = await client.updateFolder(folder.id, { name: 'Updated' })
  const teamUpdated: void = await client.updateTeamFolder('TEAM_PATH', teamFolder.id, { name: 'Updated' })
  const ordered: void = await client.updateFolderOrder({ order: { root: [folder.id] } })
  const teamOrdered: void = await client.updateTeamFolderOrder('TEAM_PATH', { order: { root: [teamFolder.id] } })
  const raw = await client.deleteFolder(folder.id, { unwrapData: false })
  const status: number = raw.status
  void updated
  void teamUpdated
  void ordered
  void teamOrdered
  void status
}

async function exploreNoteMutations (client: API): Promise<void> {
  const updated = await client.updateNote('NOTE_ID', { description: 'Updated', parentFolderId: null })
  const status: 202 = updated.status
  const raw = await client.updateNoteContent('NOTE_ID', 'Updated', { unwrapData: false })
  const rawStatus: 202 = raw.status
  const deleted: void = await client.deleteNote('NOTE_ID')
  void status
  void rawStatus
  void deleted
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
void exploreFolderReads
void exploreFolderWrites
void exploreNoteMutations
void exploreRawNote
