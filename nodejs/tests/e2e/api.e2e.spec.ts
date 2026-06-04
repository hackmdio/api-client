import { readFileSync } from 'fs'
import type { ApiFolderOrder } from '../../src'
import { API } from '../../src'
import { HttpResponseError } from '../../src/error'

const mutationsEnabled = process.env.HACKMD_E2E_MUTATIONS === '1'
/** Set to `0` to skip folder CRUD (e.g. host without `/folders`). */
const folderCrudEnabled = process.env.HACKMD_E2E_FOLDERS !== '0'

function assertToken (token: string | undefined): asserts token is string {
  if (!token?.trim()) {
    throw new Error(
      'E2E tests require HACKMD_ACCESS_TOKEN (see nodejs/README.md — "E2E tests").',
    )
  }
}

function isNotFound (err: unknown): boolean {
  return err instanceof HttpResponseError && err.code === 404
}

describe('HackMD API (live e2e)', () => {
  let client: API

  beforeAll(() => {
    const token = process.env.HACKMD_ACCESS_TOKEN
    assertToken(token)
    const endpoint =
      process.env.HACKMD_API_ENDPOINT?.trim() || 'https://api.hackmd.io/v1'
    client = new API(token.trim(), endpoint, {
      wrapResponseErrors: true,
      retryConfig: { maxRetries: 2, baseDelay: 250 },
    })
  })

  describe('read-only', () => {
    it('getMe returns the current user profile', async () => {
      const me = await client.getMe()

      expect(me).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        userPath: expect.any(String),
      })
      expect(Array.isArray(me.teams)).toBe(true)
    })

    it('getNoteList returns an array', async () => {
      const notes = await client.getNoteList()
      expect(Array.isArray(notes)).toBe(true)
      if (notes.length > 0) {
        expect(notes[0]).toMatchObject({
          id: expect.any(String),
          title: expect.any(String),
        })
      }
    })

    it('getTeams returns an array', async () => {
      const teams = await client.getTeams()
      expect(Array.isArray(teams)).toBe(true)
    })

    it('getHistory accepts limit and returns an array', async () => {
      const history = await client.getHistory()
      expect(Array.isArray(history)).toBe(true)
    })

    it('getFolderList returns folders when the server exposes /folders', async () => {
      try {
        const folders = await client.getFolderList()
        expect(Array.isArray(folders)).toBe(true)
        if (folders.length > 0) {
          expect(folders[0]).toMatchObject({
            id: expect.any(String),
            name: expect.any(String),
          })
        }
      } catch (err) {
        if (isNotFound(err)) {
          // Host may not expose /folders yet (e.g. production before rollout).
          return
        }
        throw err
      }
    })
  })

  describe('mutations (optional)', () => {
    const describeMutations = mutationsEnabled ? describe : describe.skip

    describeMutations('notes CRUD when HACKMD_E2E_MUTATIONS=1', () => {
      const stamp = Date.now()
      let noteId: string

      afterAll(async () => {
        if (!noteId) return
        try {
          await client.deleteNote(noteId)
        } catch {
          /* already removed */
        }
      })

      it('createNote creates a note', async () => {
        const title = `e2e-note-${stamp}`
        const created = await client.createNote({
          title,
          content: '# initial\n',
          tags: ['e2e'],
        })

        expect(created.id).toEqual(expect.any(String))
        expect(created.title).toBe(title)
        expect(created.tags).toContain('e2e')
        noteId = created.id
      })

      it('getNote returns the note', async () => {
        const n = await client.getNote(noteId)
        expect(n.id).toBe(noteId)
        expect(n.title).toBe(`e2e-note-${stamp}`)
        expect(n.content).toContain('initial')
      })

      it('updateNote updates title, content, and tags', async () => {
        const title = `e2e-note-${stamp}-patched`
        const patch = await client.updateNote(noteId, {
          title,
          content: '# patched\n\nbody',
          tags: ['e2e', 'updated'],
        }, { unwrapData: false })

        expect([200, 202]).toContain(patch.status)
        const patchedBody = patch.data as { content?: string }
        if (typeof patchedBody.content === 'string' && patchedBody.content.length > 0) {
          expect(patchedBody.content).toContain('patched')
        }

        const n = await client.getNote(noteId)
        expect(n.title).toBe(title)
        expect(n.tags).toEqual(expect.arrayContaining(['e2e', 'updated']))
        if (typeof n.content === 'string' && n.content.length > 0) {
          expect(n.content).toContain('patched')
        }
      })

      it('uploadNoteImage uploads an image to the note', async () => {
        const image = readFileSync('tests/fixtures/hackmd-cute-logo.png')

        try {
          const uploaded = await client.uploadNoteImage(
            noteId,
            new Blob([new Uint8Array(image)], { type: 'image/png' }),
            { filename: `hackmd-cute-logo-${stamp}.png` },
          )

          expect(uploaded.data.link).toEqual(expect.any(String))
          expect(uploaded.data.link.length).toBeGreaterThan(0)
        } catch (err) {
          if (isNotFound(err)) {
            console.warn(
              '[e2e] POST /notes/{noteId}/images returned 404 (image upload not on this host). ' +
                'Use https://api-stage.hackmd.io/v1 to test image uploads.',
            )
            expect(isNotFound(err)).toBe(true)
            return
          }
          throw err
        }
      })

      it('getNoteList includes the note', async () => {
        const list = await client.getNoteList()
        const found = list.find(n => n.id === noteId)
        expect(found).toBeDefined()
        expect(found!.title).toBe(`e2e-note-${stamp}-patched`)
      })

      it('deleteNote removes the note', async () => {
        await client.deleteNote(noteId)
        const list = await client.getNoteList()
        expect(list.find(n => n.id === noteId)).toBeUndefined()
        noteId = ''
      })
    })

    const describeFolderMutations =
      mutationsEnabled && folderCrudEnabled ? describe : describe.skip

    describeFolderMutations('folders CRUD when HACKMD_E2E_MUTATIONS=1', () => {
      it('folders: create → get → update → nested folder → list → order round-trip → delete', async () => {
        let parentFolderId = ''
        let childFolderId = ''
        let orderBeforeMutation: ApiFolderOrder | null = null

        const t0 = Date.now()
        let created
        try {
          created = await client.createFolder({
            name: `e2e-parent-${t0}`,
            description: 'e2e parent',
          })
        } catch (err) {
          if (isNotFound(err)) {
            console.warn(
              '[e2e] POST /folders returned 404 (folder writes not on this host). ' +
                'Use https://api-stage.hackmd.io/v1 or set HACKMD_E2E_FOLDERS=0.',
            )
            expect(isNotFound(err)).toBe(true)
            return
          }
          throw err
        }

        expect(created.id).toEqual(expect.any(String))
        expect(created.name).toContain('e2e-parent')
        parentFolderId = created.id

        try {
          const folder = await client.getFolder(parentFolderId)
          expect(folder.id).toBe(parentFolderId)
          expect(folder.name).toContain('e2e-parent')
          expect(folder.description).toBe('e2e parent')

          const renamed = `e2e-parent-renamed-${Date.now()}`
          await client.updateFolder(parentFolderId, {
            name: renamed,
            description: 'renamed',
          })
          const updated = await client.getFolder(parentFolderId)
          expect(updated.name).toBe(renamed)
          expect(updated.description).toBe('renamed')

          const child = await client.createFolder({
            name: `e2e-child-${Date.now()}`,
            parentFolderId: parentFolderId,
          })
          expect(child.id).toEqual(expect.any(String))
          childFolderId = child.id
          const fetchedChild = await client.getFolder(childFolderId)
          expect(fetchedChild.parentFolderId).toBe(parentFolderId)

          const list = await client.getFolderList()
          const ids = new Set(list.map(f => f.id))
          expect(ids.has(parentFolderId)).toBe(true)
          expect(ids.has(childFolderId)).toBe(true)

          try {
            orderBeforeMutation = await client.getFolderOrder()
            const root = [
              ...new Set([...(orderBeforeMutation.root ?? []), parentFolderId]),
            ]
            const next: ApiFolderOrder = {
              ...orderBeforeMutation,
              root,
            }
            await client.updateFolderOrder({ order: next })
            const mid = await client.getFolderOrder()
            expect(mid.root).toContain(parentFolderId)
            await client.updateFolderOrder({ order: orderBeforeMutation })
            const after = await client.getFolderOrder()
            expect(after).toEqual(orderBeforeMutation)
          } catch (err) {
            if (!isNotFound(err)) throw err
            console.warn(
              '[e2e] folder-order API not available; skipped order round-trip.',
            )
            expect(isNotFound(err)).toBe(true)
          }

          await client.deleteFolder(childFolderId)
          const listAfterChild = await client.getFolderList()
          expect(listAfterChild.find(f => f.id === childFolderId)).toBeUndefined()
          childFolderId = ''

          await client.deleteFolder(parentFolderId)
          const listAfterParent = await client.getFolderList()
          expect(listAfterParent.find(f => f.id === parentFolderId)).toBeUndefined()
          parentFolderId = ''
        } catch (err) {
          for (const id of [childFolderId, parentFolderId]) {
            if (!id) continue
            try {
              await client.deleteFolder(id)
            } catch {
              /* ignore */
            }
          }
          if (orderBeforeMutation) {
            try {
              await client.updateFolderOrder({ order: orderBeforeMutation })
            } catch {
              /* ignore */
            }
          }
          throw err
        }
      })
    })
  })
})
