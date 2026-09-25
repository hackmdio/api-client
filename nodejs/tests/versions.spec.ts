import { http, HttpResponse } from 'msw'

import { API } from '../src'
import { HttpResponseError } from '../src/error'
import { server } from './mock'

const metadata = {
  id: 'version-1', name: 'Milestone', name_source: 'user' as const,
  created_at: '2026-01-01T00:00:00.000Z', created_by: null, authorship: [],
  content_available: true,
}
const page = { data: [metadata], meta: { total_pages: 1, total: 1, limit: 20, page: 1 } }
const createBody = { base: 'note_content', name: 'Milestone' }
const updateBody = { base: 'version:version-1', name: 'Renamed' }
const comparison = { base: 'version:version-1', target: 'note_content' }

const cases = [
  { name: 'listVersions', method: 'GET', path: '/notes/note-1/versions', status: 200, query: { named_only: 'true', q: 'milestone', created_by: 'user-1', created_after: '2026-01-01T00:00:00Z', created_before: '2026-02-01T00:00:00Z', page: '1', limit: '20' }, body: undefined, result: page, run: (api: API, raw: boolean) => api.listVersions('note-1', { named_only: true, q: 'milestone', created_by: 'user-1', created_after: '2026-01-01T00:00:00Z', created_before: '2026-02-01T00:00:00Z', page: 1, limit: 20, unwrapData: !raw }) },
  { name: 'getVersion', method: 'GET', path: '/notes/note-1/versions/version-1', status: 200, query: {}, body: undefined, result: { ...metadata, content: '# Note' }, run: (api: API, raw: boolean) => api.getVersion('note-1', 'version-1', { unwrapData: !raw }) },
  { name: 'createVersion', method: 'POST', path: '/notes/note-1/versions', status: 201, query: {}, body: createBody, result: metadata, run: (api: API, raw: boolean) => api.createVersion('note-1', createBody, { unwrapData: !raw }) },
  { name: 'updateVersion', method: 'PATCH', path: '/notes/note-1/versions', status: 200, query: {}, body: updateBody, result: { ...metadata, name: 'Renamed' }, run: (api: API, raw: boolean) => api.updateVersion('note-1', updateBody, { unwrapData: !raw }) },
  { name: 'compareVersions', method: 'GET', path: '/notes/note-1/versions/compare', status: 200, query: comparison, body: undefined, result: { unified_diff: '@@ -1 +1 @@' }, run: (api: API, raw: boolean) => api.compareVersions('note-1', comparison, { unwrapData: !raw }) },
]

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test.each(cases)('$name preserves the method, path, query, body and response', async ({ method, path, status, query, body, result, run }) => {
  const requests: Array<{ method: string, query: Record<string, string>, body: string, authorization: string | null }> = []
  server.use(http.all(`https://api.hackmd.io/v1${path}`, async ({ request }) => {
    requests.push({
      method: request.method,
      query: Object.fromEntries(new URL(request.url).searchParams),
      body: await request.text(),
      authorization: request.headers.get('Authorization'),
    })
    return HttpResponse.json(result, { status })
  }))

  const api = new API('test-token', undefined, { wrapResponseErrors: true, retryConfig: undefined })
  const unwrapped = await run(api, false)
  const raw = await run(api, true)
  if (typeof raw !== 'object' || raw === null || !('status' in raw) || !('data' in raw)) {
    throw new Error('Expected a raw Axios response')
  }

  expect(unwrapped).toEqual(result)
  expect(raw.status).toBe(status)
  expect(raw.data).toEqual(result)
  expect(requests).toEqual([1, 2].map(() => ({
    method,
    query,
    body: body === undefined ? '' : JSON.stringify(body),
    authorization: 'Bearer test-token',
  })))
})

test('uses a custom base URL and keeps legacy error wrapping', async () => {
  server.use(http.get('https://custom.hackmd.test/v1/notes/note-1/versions/missing', () =>
    HttpResponse.json({ error_code: 'not_found', message: 'Version not found' }, { status: 404 })
  ))
  const api = new API('test-token', 'https://custom.hackmd.test/v1/', {
    wrapResponseErrors: true,
    retryConfig: undefined,
  })
  await expect(api.getVersion('note-1', 'missing')).rejects.toBeInstanceOf(HttpResponseError)
})
