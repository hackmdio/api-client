import { http, HttpResponse } from 'msw'

import { API } from '../src'
import { HttpResponseError } from '../src/error'
import { server } from './mock'

const trashNote = {
  id: 'note-1', title: 'Deleted note', tags: [], deletedAt: 1700000000000,
  ownerId: 'user-1', teamId: null, shortId: 'short-1', publishType: 'view',
  permanentDeletedAt: null,
}
const restored = { 'note-1': { status: 'success' } }
const partial = { ...restored, 'note-2': { status: 'failure', reason: 'NOT_FOUND' } }

const cases = [
  { name: 'listTrash', method: 'GET', path: '/trash', status: 200, body: undefined, result: [trashNote], run: (api: API, raw: boolean) => api.listTrash({ unwrapData: !raw }) },
  { name: 'batchRestore 200', method: 'PUT', path: '/trash/batch-restore', status: 200, body: { noteIds: ['note-1'] }, result: restored, run: (api: API, raw: boolean) => api.batchRestore({ noteIds: ['note-1'] }, { unwrapData: !raw }) },
  { name: 'batchRestore 207', method: 'PUT', path: '/trash/batch-restore', status: 207, body: { noteIds: ['note-1', 'note-2'] }, result: partial, run: (api: API, raw: boolean) => api.batchRestore({ noteIds: ['note-1', 'note-2'] }, { unwrapData: !raw }) },
  { name: 'restoreNote', method: 'PUT', path: '/trash/note-1/restore', status: 204, body: undefined, result: undefined, run: (api: API, raw: boolean) => api.restoreNote('note-1', { unwrapData: !raw }) },
  { name: 'listTeamTrash', method: 'GET', path: '/teams/my-team/trash', status: 200, body: undefined, result: [{ ...trashNote, teamId: 'team-1' }], run: (api: API, raw: boolean) => api.listTeamTrash('my-team', { unwrapData: !raw }) },
]

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test.each(cases)('$name keeps the path, body, status and response shape', async ({ method, path, status, body, result, run }) => {
  const requests: Array<{ method: string, body: string, authorization: string | null }> = []
  server.use(http.all(`https://api.hackmd.io/v1${path}`, async ({ request }) => {
    requests.push({
      method: request.method,
      body: await request.text(),
      authorization: request.headers.get('Authorization'),
    })
    return status === 204 ? new HttpResponse(null, { status }) : HttpResponse.json(result, { status })
  }))

  const api = new API('test-token', undefined, { wrapResponseErrors: true, retryConfig: undefined })
  const unwrapped = await run(api, false)
  const raw = await run(api, true)
  if (typeof raw !== 'object' || raw === null || !('status' in raw) || !('data' in raw)) {
    throw new Error('Expected a raw Axios response')
  }

  expect(raw.status).toBe(status)
  if (status === 204) {
    expect([undefined, '']).toContain(unwrapped)
    expect([undefined, '']).toContain(raw.data)
  } else {
    expect(unwrapped).toEqual(result)
    expect(raw.data).toEqual(result)
  }
  expect(requests).toEqual([1, 2].map(() => ({
    method,
    body: body === undefined ? '' : JSON.stringify(body),
    authorization: 'Bearer test-token',
  })))
})

test('batch restore keeps legacy error wrapping for 404', async () => {
  server.use(http.put('https://api.hackmd.io/v1/trash/batch-restore', () =>
    HttpResponse.json({ error: 'No trashed notes found' }, { status: 404 })
  ))
  const api = new API('test-token', undefined, { wrapResponseErrors: true, retryConfig: undefined })
  await expect(api.batchRestore({ noteIds: ['missing'] })).rejects.toBeInstanceOf(HttpResponseError)
})

test('team trash keeps legacy error wrapping for plain-text middleware errors', async () => {
  server.use(http.get('https://api.hackmd.io/v1/teams/my-team/trash', () =>
    HttpResponse.text('Forbidden', { status: 403 })
  ))
  const api = new API('test-token', undefined, { wrapResponseErrors: true, retryConfig: undefined })
  await expect(api.listTeamTrash('my-team')).rejects.toBeInstanceOf(HttpResponseError)
})

test('restoreNote uses a custom base URL and authorization', async () => {
  let authorization: string | null = null
  server.use(http.put('https://custom.hackmd.test/v1/trash/note-1/restore', ({ request }) => {
    authorization = request.headers.get('Authorization')
    return new HttpResponse(null, { status: 204 })
  }))
  const api = new API('custom-token', 'https://custom.hackmd.test/v1/')
  const response = await api.restoreNote('note-1', { unwrapData: false })
  expect(response.status).toBe(204)
  expect(authorization).toBe('Bearer custom-token')
})
