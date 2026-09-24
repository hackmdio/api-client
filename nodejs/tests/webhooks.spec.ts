import { http, HttpResponse } from 'msw'

import { API } from '../src'
import { HttpResponseError } from '../src/error'
import { server } from './mock'

const webhook = {
  id: 'hook-1',
  name: 'Updates',
  url: 'https://example.test/webhook',
  scope: { type: 'workspace' as const },
  configuredStatus: 'active' as const,
  configuredStatusReason: null,
  deliveryPolicyStatus: 'normal' as const,
  deliveryPolicyReason: null,
  eventDeliveryMode: 'all_supported_events' as const,
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
}
const createBody = { scope: { type: 'workspace' as const }, url: webhook.url, name: webhook.name }
const updateBody = { name: 'Renamed' }

const cases = [
  { name: 'listWebhooks', method: 'GET', path: '/webhooks', status: 200, body: undefined, result: [webhook], run: (api: API, raw: boolean) => api.listWebhooks({ unwrapData: !raw }) },
  { name: 'getWebhook', method: 'GET', path: '/webhooks/hook-1', status: 200, body: undefined, result: webhook, run: (api: API, raw: boolean) => api.getWebhook('hook-1', { unwrapData: !raw }) },
  { name: 'createWebhook', method: 'POST', path: '/webhooks', status: 201, body: createBody, result: { ...webhook, secret: 'one-time-secret' }, run: (api: API, raw: boolean) => api.createWebhook(createBody, { unwrapData: !raw }) },
  { name: 'updateWebhook', method: 'PATCH', path: '/webhooks/hook-1', status: 200, body: updateBody, result: { ...webhook, name: 'Renamed' }, run: (api: API, raw: boolean) => api.updateWebhook('hook-1', updateBody, { unwrapData: !raw }) },
  { name: 'deleteWebhook', method: 'DELETE', path: '/webhooks/hook-1', status: 204, body: undefined, result: undefined, run: (api: API, raw: boolean) => api.deleteWebhook('hook-1', { unwrapData: !raw }) },
  { name: 'listTeamWebhooks', method: 'GET', path: '/teams/my-team/webhooks', status: 200, body: undefined, result: [webhook], run: (api: API, raw: boolean) => api.listTeamWebhooks('my-team', { unwrapData: !raw }) },
  { name: 'getTeamWebhook', method: 'GET', path: '/teams/my-team/webhooks/hook-1', status: 200, body: undefined, result: webhook, run: (api: API, raw: boolean) => api.getTeamWebhook('my-team', 'hook-1', { unwrapData: !raw }) },
  { name: 'createTeamWebhook', method: 'POST', path: '/teams/my-team/webhooks', status: 201, body: createBody, result: { ...webhook, secret: 'one-time-secret' }, run: (api: API, raw: boolean) => api.createTeamWebhook('my-team', createBody, { unwrapData: !raw }) },
  { name: 'updateTeamWebhook', method: 'PATCH', path: '/teams/my-team/webhooks/hook-1', status: 200, body: updateBody, result: { ...webhook, name: 'Renamed' }, run: (api: API, raw: boolean) => api.updateTeamWebhook('my-team', 'hook-1', updateBody, { unwrapData: !raw }) },
  { name: 'deleteTeamWebhook', method: 'DELETE', path: '/teams/my-team/webhooks/hook-1', status: 204, body: undefined, result: undefined, run: (api: API, raw: boolean) => api.deleteTeamWebhook('my-team', 'hook-1', { unwrapData: !raw }) },
]

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test.each(cases)('$name preserves path, method, body, authentication and response shape', async ({ method, path, status, body, result, run }) => {
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

test('uses a custom base URL and keeps legacy error wrapping', async () => {
  server.use(http.get('https://custom.hackmd.test/v1/webhooks/missing', () =>
    HttpResponse.json({ error: { code: 'WEBHOOK_NOT_FOUND', message: 'Webhook not found' } }, { status: 404 })
  ))
  const api = new API('test-token', 'https://custom.hackmd.test/v1/', {
    wrapResponseErrors: true,
    retryConfig: undefined,
  })
  await expect(api.getWebhook('missing')).rejects.toBeInstanceOf(HttpResponseError)
})

test.each(['createWebhook', 'createTeamWebhook'] as const)('%s keeps validation errors', async name => {
  const path = name === 'createWebhook' ? '/webhooks' : '/teams/my-team/webhooks'
  server.use(http.post(`https://api.hackmd.io/v1${path}`, () =>
    HttpResponse.json({ message: 'Validation Failed', details: {} }, { status: 422 })
  ))
  const api = new API('test-token', undefined, { wrapResponseErrors: true, retryConfig: undefined })
  const request = name === 'createWebhook'
    ? api.createWebhook(createBody)
    : api.createTeamWebhook('my-team', createBody)
  await expect(request).rejects.toBeInstanceOf(HttpResponseError)
})
