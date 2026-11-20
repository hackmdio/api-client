import { http, HttpResponse } from 'msw'

import { API } from '../src'
import { HttpResponseError } from '../src/error'
import { server } from './mock'

const comment = {
  id: 'comment-1', threadId: 'thread-1',
  actor: { kind: 'user', userId: 'user-1', displayName: 'Alice' },
  body: 'Hello', contentType: 'plain_text',
  commentState: { status: 'open', reason: null, actedBy: null, actedAt: null },
  isPinned: false, anchor: null, currentAnchor: null, excerpt: null,
  reactions: [], createdAt: 1700000000000, updatedAt: 1700000000000,
  isThreadHead: true, replyCount: 0,
  threadState: { status: 'open', reason: null, actedBy: null, actedAt: null, sourceCommentId: 'comment-1' },
}
const page = { comments: [comment], pagination: { page: 2, limit: 10, hasNext: false } }
const resolved = { comment: { ...comment, threadState: { ...comment.threadState, status: 'hidden', reason: 'resolved' } }, cascade: { threadId: 'thread-1' } }
const reopened = { comment, cascade: null }
const query = { page: '2', limit: '10', sort: 'desc', threadId: '00000000-0000-4000-8000-000000000001', commentStatus: 'open', threadStatus: 'hidden', isThreadHead: 'true' }

const cases = [
  { name: 'listNoteComments', method: 'GET', path: '/notes/note-1/comments', query, result: page, run: (api: API, raw: boolean) => api.listNoteComments('note-1', { page: 2, limit: 10, sort: 'desc', threadId: query.threadId, commentStatus: 'open', threadStatus: 'hidden', isThreadHead: true, unwrapData: !raw }) },
  { name: 'getNoteComment', method: 'GET', path: '/notes/note-1/comments/comment-1', query: {}, result: comment, run: (api: API, raw: boolean) => api.getNoteComment('note-1', 'comment-1', { unwrapData: !raw }) },
  { name: 'resolveNoteComment', method: 'PUT', path: '/notes/note-1/comments/comment-1/resolution', query: {}, result: resolved, run: (api: API, raw: boolean) => api.resolveNoteComment('note-1', 'comment-1', { unwrapData: !raw }) },
  { name: 'unresolveNoteComment', method: 'DELETE', path: '/notes/note-1/comments/comment-1/resolution', query: {}, result: reopened, run: (api: API, raw: boolean) => api.unresolveNoteComment('note-1', 'comment-1', { unwrapData: !raw }) },
]

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test.each(cases)('$name preserves the method, path, query, authentication and response', async ({ method, path, query, result, run }) => {
  const requests: Array<{ method: string, query: Record<string, string>, body: string, authorization: string | null }> = []
  server.use(http.all(`https://api.hackmd.io/v1${path}`, async ({ request }) => {
    requests.push({
      method: request.method,
      query: Object.fromEntries(new URL(request.url).searchParams),
      body: await request.text(),
      authorization: request.headers.get('Authorization'),
    })
    return HttpResponse.json(result)
  }))

  const api = new API('test-token', undefined, { wrapResponseErrors: true, retryConfig: undefined })
  const unwrapped = await run(api, false)
  const raw = await run(api, true)
  if (typeof raw !== 'object' || raw === null || !('status' in raw) || !('data' in raw)) {
    throw new Error('Expected a raw Axios response')
  }

  expect(unwrapped).toEqual(result)
  expect(raw.status).toBe(200)
  expect(raw.data).toEqual(result)
  expect(requests).toEqual([1, 2].map(() => ({ method, query, body: '', authorization: 'Bearer test-token' })))
})

test('uses a custom base URL and keeps legacy error wrapping', async () => {
  server.use(http.get('https://custom.hackmd.test/v1/notes/note-1/comments/missing', () =>
    HttpResponse.json({ errorCode: 'not_found', message: 'Comment not found' }, { status: 404 })
  ))
  const api = new API('test-token', 'https://custom.hackmd.test/v1/', {
    wrapResponseErrors: true,
    retryConfig: undefined,
  })
  await expect(api.getNoteComment('note-1', 'missing')).rejects.toBeInstanceOf(HttpResponseError)
})

test('keeps resolution conflict errors wrapped', async () => {
  server.use(http.put('https://api.hackmd.io/v1/notes/note-1/comments/comment-1/resolution', () =>
    HttpResponse.json({ errorCode: 'resolution_conflict', message: 'Conflict', commentState: comment.commentState }, { status: 409 })
  ))
  const api = new API('test-token', undefined, { wrapResponseErrors: true, retryConfig: undefined })
  await expect(api.resolveNoteComment('note-1', 'comment-1')).rejects.toBeInstanceOf(HttpResponseError)
})
