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

async function exploreConditionalTeamNote (client: API): Promise<string | undefined> {
  const response = await client.getTeamNote('TEAM_PATH', 'NOTE_ID', { etag: 'W/"cached"' })
  if (response.status === 304) {
    // @ts-expect-error A 304 response has no note content.
    response.content
    return undefined
  }
  const content: string = response.content
  const raw = await client.getTeamNote('TEAM_PATH', 'NOTE_ID', { etag: 'W/"cached"', unwrapData: false })
  const status: 200 | 304 = raw.status
  void status
  return content
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

async function exploreNoteCreation (client: API): Promise<string> {
  const personal = await client.createNote({ title: 'New note' })
  const personalId = personal.status === 201 ? personal.id : personal.note.id
  const raw = await client.createNote({ title: 'New note' }, { unwrapData: false })
  const rawId = raw.status === 201 ? raw.data.id : raw.data.note.id
  const team = await client.createTeamNote('TEAM_PATH', { title: 'New note' })
  const teamId = 'note' in team ? team.note.id : team.id
  return [personalId, rawId, teamId].join(',')
}

async function exploreProfileAndTeams (client: API): Promise<number> {
  const profile = await client.getMe()
  const teams = await client.getTeams()
  const createdAt: number = teams[0].createdAt
  const description: string | null = profile.teams[0].description
  const upgraded: boolean = profile.upgraded
  void description
  void upgraded
  return createdAt
}

async function exploreImageUpload (client: API): Promise<string> {
  const image = new Blob(['image'], { type: 'image/png' })
  const uploaded = await client.uploadNoteImage('NOTE_ID', image, { filename: 'image.png' })
  const raw = await client.uploadNoteImage('NOTE_ID', image, { unwrapData: false })
  const status: number = raw.status
  void status
  return uploaded.data.link
}

async function exploreWebhooks (client: API): Promise<string> {
  const personal = await client.listWebhooks()
  const team = await client.listTeamWebhooks('TEAM_PATH')
  const created = await client.createWebhook({
    scope: { type: 'workspace' },
    url: 'https://example.test/webhook',
  })
  const secret: string = created.secret
  const updated = await client.updateTeamWebhook('TEAM_PATH', team[0].id, { active: false })
  const raw = await client.deleteWebhook(personal[0].id, { unwrapData: false })
  const status: number = raw.status
  void secret
  void status
  return updated.id
}

async function exploreWebhookDeliveries (client: API): Promise<string> {
  const page = await client.listWebhookDeliveries('HOOK_ID', { page: 2, limit: 5 })
  const delivery = await client.getTeamWebhookDelivery('TEAM_PATH', 'HOOK_ID', page.data[0].id)
  const jsonl: string = await client.exportWebhookDeliveries('HOOK_ID')
  const raw = await client.exportTeamWebhookDeliveries('TEAM_PATH', 'HOOK_ID', { unwrapData: false })
  const rawJsonl: string = raw.data
  const pinged: void = await client.pingWebhook('HOOK_ID')
  void jsonl
  void rawJsonl
  void pinged
  return delivery.id
}

async function exploreTrash (client: API): Promise<string> {
  const personal = await client.listTrash()
  const team = await client.listTeamTrash('TEAM_PATH')
  const results = await client.batchRestore({ noteIds: [personal[0].id] })
  const outcome: 'success' | 'failure' = results[personal[0].id].status
  const raw = await client.batchRestore({ noteIds: [personal[0].id] }, { unwrapData: false })
  const status: number = raw.status
  const restored: void = await client.restoreNote(team[0].id)
  void outcome
  void status
  void restored
  return personal[0].id
}

function exploreRawNote (note: RawNote): string {
  return note.content
}

void exploreClient
void exploreConditionalNote
void exploreConditionalTeamNote
void exploreNoteList
void exploreHistory
void exploreTeamNotes
void exploreFolders
void exploreTeamFolders
void exploreFolderReads
void exploreFolderWrites
void exploreNoteMutations
void exploreNoteCreation
void exploreProfileAndTeams
void exploreImageUpload
void exploreWebhooks
void exploreWebhookDeliveries
void exploreTrash
void exploreRawNote
