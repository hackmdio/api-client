/** Type-only playground: these functions are not called and send no requests. */
import type { API, GetUserNote } from '@hackmd/api'
import type { SingleNote as RawNote } from '@hackmd/api/raw'

async function exploreClient (client: API): Promise<GetUserNote> {
  return client.getNote('NOTE_ID')
}

function exploreRawNote (note: RawNote): string {
  return note.content
}

void exploreClient
void exploreRawNote
