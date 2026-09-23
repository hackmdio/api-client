import { createClient, getNote } from '@hackmd/api/raw'

const client = createClient({
  auth: 'test-token',
  baseURL: 'https://api.hackmd.io/v1',
})

export async function readNoteContent (): Promise<string> {
  const response = await getNote({
    client,
    path: { noteId: 'note-id' },
    throwOnError: true,
  })
  return response.data.content
}
