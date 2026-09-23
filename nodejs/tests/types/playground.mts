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

function exploreRawNote (note: RawNote): string {
  return note.content
}

void exploreClient
void exploreConditionalNote
void exploreRawNote
