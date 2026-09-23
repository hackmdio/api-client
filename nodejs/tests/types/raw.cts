import { createClient, getNote } from '@hackmd/api/raw'
import { API } from '@hackmd/api'

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

export async function readLegacyConditionalNote (legacy: API): Promise<string | undefined> {
  const response = await legacy.getNote('note-id', { etag: 'W/"cached"', unwrapData: false })
  if (response.status === 304) {
    // @ts-expect-error A 304 response does not promise note data.
    response.data.content
    return undefined
  }
  return response.data.content
}
