import { server } from './mock'
import { API } from '../src'
import { http, HttpResponse } from 'msw'
import { HttpResponseError, InternalServerError, TooManyRequestsError } from '../src/error'

let client: API

beforeAll(() => {
  client = new API(process.env.HACKMD_ACCESS_TOKEN!)

  return server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
  // Add explicit cleanup to ensure Jest exits properly
  return new Promise(resolve => setTimeout(resolve, 100))
})

test('getMe', async () => {
  const response = await client.getMe({ unwrapData: false })

  expect(response).toHaveProperty('status', 200)
  expect(response).toHaveProperty('headers')
})

test('getMe unwrapped', async () => {
  const response = await client.getMe()

  expect(typeof response).toBe('object')
  expect(response).toHaveProperty('id')
  expect(response).toHaveProperty('name')
  expect(response).toHaveProperty('email')
  expect(response).toHaveProperty('userPath')
  expect(response).toHaveProperty('photo')
  expect(response).toHaveProperty('upgraded', false)
})

test('getMe keeps the generated profile shape and authorization', async () => {
  const team = {
    id: 'team-1', ownerId: 'user-1', name: 'Research', logo: '', path: 'research',
    description: null, visibility: 'private', upgraded: false, createdAt: 1700000000000,
  }
  const profile = {
    id: 'user-1', email: null, name: 'Researcher', userPath: 'researcher',
    photo: '', teams: [team], upgraded: true,
  }
  let authorization: string | null = null
  server.use(http.get('https://api.hackmd.io/v1/me', ({ request }) => {
    authorization = request.headers.get('Authorization')
    return HttpResponse.json(profile)
  }))

  expect(await client.getMe()).toEqual(profile)
  const raw = await client.getMe({ unwrapData: false })
  expect(raw.status).toBe(200)
  expect(raw.data).toEqual(profile)
  expect(authorization).toBe(`Bearer ${process.env.HACKMD_ACCESS_TOKEN}`)
})

test('getTeams keeps the generated team shape and legacy response forms', async () => {
  const teams = [{
    id: 'team-1', ownerId: 'user-1', name: 'Research', logo: '', path: 'research',
    description: null, visibility: 'private', upgraded: false, createdAt: 1700000000000,
  }]
  let authorization: string | null = null
  server.use(http.get('https://api.hackmd.io/v1/teams', ({ request }) => {
    authorization = request.headers.get('Authorization')
    return HttpResponse.json(teams)
  }))

  expect(await client.getTeams()).toEqual(teams)
  expect(await client.listTeams()).toEqual(teams)
  const raw = await client.getTeams({ unwrapData: false })
  expect(raw.status).toBe(200)
  expect(raw.data).toEqual(teams)
  expect((await client.listTeams({ unwrapData: false })).data).toEqual(teams)
  expect(authorization).toBe(`Bearer ${process.env.HACKMD_ACCESS_TOKEN}`)
})

test('getTeams keeps legacy error wrapping', async () => {
  server.use(http.get('https://api.hackmd.io/v1/teams', () =>
    HttpResponse.json({ error: 'Forbidden' }, { status: 403 })
  ))
  const customClient = new API('custom-token', undefined, {
    wrapResponseErrors: true,
    retryConfig: undefined,
  })

  await expect(customClient.getTeams()).rejects.toBeInstanceOf(HttpResponseError)
})

test('getNoteList keeps the legacy response shapes and authorization', async () => {
  const note = { id: 'note-1', title: 'A note', createdAt: 1700000000000 }
  let authorization: string | null = null
  server.use(
    http.get('https://api.hackmd.io/v1/notes', ({ request }) => {
      authorization = request.headers.get('Authorization')
      return HttpResponse.json([note])
    })
  )

  expect(await client.getNoteList()).toEqual([note])
  expect(await client.listNotes()).toEqual([note])
  const raw = await client.getNoteList({ unwrapData: false })
  expect(raw.status).toBe(200)
  expect(raw.data).toEqual([note])
  expect((await client.listNotes({ unwrapData: false })).data).toEqual([note])
  expect(authorization).toBe(`Bearer ${process.env.HACKMD_ACCESS_TOKEN}`)
})

test('getNoteList keeps legacy error wrapping', async () => {
  server.use(
    http.get('https://api.hackmd.io/v1/notes', () =>
      HttpResponse.json({ error: 'Forbidden' }, { status: 403 })
    )
  )
  const customClient = new API('custom-token', undefined, {
    wrapResponseErrors: true,
    retryConfig: undefined,
  })

  await expect(customClient.getNoteList()).rejects.toBeInstanceOf(HttpResponseError)
})

test('getHistory keeps the legacy response shapes and authorization', async () => {
  const history = [{ id: 'note-1', title: 'Recent note', createdAt: 1700000000000 }]
  let authorization: string | null = null
  const limits: Array<string | null> = []
  server.use(
    http.get('https://api.hackmd.io/v1/history', ({ request }) => {
      authorization = request.headers.get('Authorization')
      limits.push(new URL(request.url).searchParams.get('limit'))
      return HttpResponse.json(history)
    })
  )

  expect(await client.getHistory()).toEqual(history)
  const raw = await client.getHistory({ unwrapData: false, limit: 5 })
  expect(raw.status).toBe(200)
  expect(raw.data).toEqual(history)
  expect(authorization).toBe(`Bearer ${process.env.HACKMD_ACCESS_TOKEN}`)
  expect(limits).toEqual([null, '5'])
})

test('getHistory keeps legacy error wrapping', async () => {
  server.use(
    http.get('https://api.hackmd.io/v1/history', () =>
      HttpResponse.json({ error: 'Forbidden' }, { status: 403 })
    )
  )
  const customClient = new API('custom-token', undefined, {
    wrapResponseErrors: true,
    retryConfig: undefined,
  })

  await expect(customClient.getHistory()).rejects.toBeInstanceOf(HttpResponseError)
})

test('getTeamNotes keeps the legacy response shapes and team path', async () => {
  const notes = [{ id: 'team-note-1', title: 'Team note', createdAt: 1700000000000 }]
  let authorization: string | null = null
  server.use(
    http.get('https://api.hackmd.io/v1/teams/test-team/notes', ({ request }) => {
      authorization = request.headers.get('Authorization')
      return HttpResponse.json(notes)
    })
  )

  expect(await client.getTeamNotes('test-team')).toEqual(notes)
  expect(await client.listTeamNotes('test-team')).toEqual(notes)
  const raw = await client.getTeamNotes('test-team', { unwrapData: false })
  expect(raw.status).toBe(200)
  expect(raw.data).toEqual(notes)
  expect((await client.listTeamNotes('test-team', { unwrapData: false })).data).toEqual(notes)
  expect(authorization).toBe(`Bearer ${process.env.HACKMD_ACCESS_TOKEN}`)
})

test('getTeamNotes keeps legacy error wrapping', async () => {
  server.use(
    http.get('https://api.hackmd.io/v1/teams/missing-team/notes', () =>
      HttpResponse.json({ error: 'Team not found' }, { status: 404 })
    )
  )
  const customClient = new API('custom-token', undefined, {
    wrapResponseErrors: true,
    retryConfig: undefined,
  })

  await expect(customClient.getTeamNotes('missing-team')).rejects.toBeInstanceOf(HttpResponseError)
})

test('should throw axios error object if set wrapResponseErrors to false', async () => {
  const customCilent = new API(process.env.HACKMD_ACCESS_TOKEN!, undefined, {
    wrapResponseErrors: false,
  })

  server.use(
    http.get('https://api.hackmd.io/v1/me', () => {
      return new HttpResponse(null, {
        status: 429
      })
    })
  )

  try {
    await customCilent.getMe()
  } catch (error: any) {
    expect(error).toHaveProperty('response')
    expect(error.response).toHaveProperty('status', 429)
  }
})

test('should throw HackMD error object', async () => {
  // Create a client with retry disabled to avoid conflicts with error handling test
  const clientWithoutRetry = new API(process.env.HACKMD_ACCESS_TOKEN!, undefined, {
    wrapResponseErrors: true,
    retryConfig: undefined // Disable retry logic for this test
  })

  server.use(
    http.get('https://api.hackmd.io/v1/me', () => {
      return HttpResponse.json(
        {},
        {
          status: 429,
          headers: {
            'X-RateLimit-UserLimit': '100',
            'x-RateLimit-UserRemaining': '0',
            'x-RateLimit-UserReset': String(
              new Date().getTime() + 1000 * 60 * 60 * 24,
            ),
          },
        }
      )
    })
  )

  try {
    await clientWithoutRetry.getMe()
    // If we get here, the test should fail because an error wasn't thrown
    expect('no error thrown').toBe('error should have been thrown')
  } catch (error: any) {
    expect(error).toBeInstanceOf(TooManyRequestsError)
    expect(error).toHaveProperty('code', 429)
    expect(error).toHaveProperty('statusText', 'Too Many Requests')
    expect(error).toHaveProperty('userLimit', 100)
    expect(error).toHaveProperty('userRemaining', 0)
    expect(error).toHaveProperty('resetAfter')
  }
})

test('getFolderList returns folders from /folders', async () => {
  let authorization: string | null = null
  server.use(
    http.get('https://api.hackmd.io/v1/folders', ({ request }) => {
      authorization = request.headers.get('Authorization')
      return HttpResponse.json([
        {
          id: 'folder-1',
          name: 'Research',
          description: null,
          icon: null,
          color: null,
          parentFolderId: null,
          createdAt: 1700000000,
          updatedAt: 1700000001,
        },
      ])
    }),
  )

  const folders = await client.getFolderList()
  expect(await client.listFolders()).toEqual(folders)

  expect(folders).toHaveLength(1)
  expect(folders[0]).toMatchObject({ id: 'folder-1', name: 'Research' })
  const raw = await client.getFolderList({ unwrapData: false })
  expect(raw.status).toBe(200)
  expect(raw.data).toEqual(folders)
  expect((await client.listFolders({ unwrapData: false })).data).toEqual(folders)
  expect(authorization).toBe(`Bearer ${process.env.HACKMD_ACCESS_TOKEN}`)
})

test('getFolderList keeps legacy error wrapping', async () => {
  server.use(
    http.get('https://api.hackmd.io/v1/folders', () =>
      HttpResponse.json({ error: 'Forbidden' }, { status: 403 })
    )
  )
  const customClient = new API('custom-token', undefined, {
    wrapResponseErrors: true,
    retryConfig: undefined,
  })

  await expect(customClient.getFolderList()).rejects.toBeInstanceOf(HttpResponseError)
})

test('getTeamFolderList keeps the legacy response shapes and team path', async () => {
  const folders = [{
    id: 'folder-1',
    name: 'Team Research',
    description: null,
    icon: null,
    color: null,
    parentFolderId: null,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  }]
  let authorization: string | null = null
  server.use(
    http.get('https://api.hackmd.io/v1/teams/test-team/folders', ({ request }) => {
      authorization = request.headers.get('Authorization')
      return HttpResponse.json(folders)
    })
  )

  expect(await client.getTeamFolderList('test-team')).toEqual(folders)
  expect(await client.listTeamFolders('test-team')).toEqual(folders)
  const raw = await client.getTeamFolderList('test-team', { unwrapData: false })
  expect(raw.status).toBe(200)
  expect(raw.data).toEqual(folders)
  expect((await client.listTeamFolders('test-team', { unwrapData: false })).data).toEqual(folders)
  expect(authorization).toBe(`Bearer ${process.env.HACKMD_ACCESS_TOKEN}`)
})

test('getTeamFolderList keeps legacy error wrapping', async () => {
  server.use(
    http.get('https://api.hackmd.io/v1/teams/missing-team/folders', () =>
      HttpResponse.json({ error: 'Team not found' }, { status: 404 })
    )
  )
  const customClient = new API('custom-token', undefined, {
    wrapResponseErrors: true,
    retryConfig: undefined,
  })

  await expect(customClient.getTeamFolderList('missing-team')).rejects.toBeInstanceOf(HttpResponseError)
})

const folder = {
  id: 'folder-1',
  name: 'Research',
  description: null,
  icon: null,
  color: null,
  parentFolderId: null,
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
}
const folderOrder = { root: ['folder-1'] }

test.each([
  {
    name: 'getFolder',
    path: '/folders/folder-1',
    body: folder,
    get: (api: API) => api.getFolder('folder-1'),
    getRaw: (api: API) => api.getFolder('folder-1', { unwrapData: false }),
  },
  {
    name: 'getTeamFolder',
    path: '/teams/test-team/folders/folder-1',
    body: folder,
    get: (api: API) => api.getTeamFolder('test-team', 'folder-1'),
    getRaw: (api: API) => api.getTeamFolder('test-team', 'folder-1', { unwrapData: false }),
  },
  {
    name: 'getFolderOrder',
    path: '/folders/folder-order',
    body: folderOrder,
    get: (api: API) => api.getFolderOrder(),
    getRaw: (api: API) => api.getFolderOrder({ unwrapData: false }),
  },
  {
    name: 'getTeamFolderOrder',
    path: '/teams/test-team/folders/folder-order',
    body: folderOrder,
    get: (api: API) => api.getTeamFolderOrder('test-team'),
    getRaw: (api: API) => api.getTeamFolderOrder('test-team', { unwrapData: false }),
  },
])('$name keeps legacy response shapes and authorization', async ({ path, body, get, getRaw }) => {
  let authorization: string | null = null
  server.use(
    http.get(`https://api.hackmd.io/v1${path}`, ({ request }) => {
      authorization = request.headers.get('Authorization')
      return HttpResponse.json(body)
    })
  )

  expect(await get(client)).toEqual(body)
  const raw = await getRaw(client)
  expect(raw.status).toBe(200)
  expect(raw.data).toEqual(body)
  expect(authorization).toBe(`Bearer ${process.env.HACKMD_ACCESS_TOKEN}`)
})

test.each([
  ['getFolder', '/folders/missing', (api: API) => api.getFolder('missing')],
  ['getTeamFolder', '/teams/test-team/folders/missing', (api: API) => api.getTeamFolder('test-team', 'missing')],
] as const)('%s keeps legacy error wrapping', async (_name, path, get) => {
  server.use(
    http.get(`https://api.hackmd.io/v1${path}`, () =>
      HttpResponse.json({ error: 'Folder not found' }, { status: 404 })
    )
  )
  const customClient = new API('custom-token', undefined, {
    wrapResponseErrors: true,
    retryConfig: undefined,
  })

  await expect(get(customClient)).rejects.toBeInstanceOf(HttpResponseError)
})

const folderWriteCases = [
  {
    name: 'createFolder', path: '/folders', method: 'POST', status: 201,
    payload: { name: 'Research' },
    run: (api: API) => api.createFolder({ name: 'Research' }),
    runRaw: (api: API) => api.createFolder({ name: 'Research' }, { unwrapData: false }),
  },
  {
    name: 'createTeamFolder', path: '/teams/test-team/folders', method: 'POST', status: 201,
    payload: { name: 'Research' },
    run: (api: API) => api.createTeamFolder('test-team', { name: 'Research' }),
    runRaw: (api: API) => api.createTeamFolder('test-team', { name: 'Research' }, { unwrapData: false }),
  },
  {
    name: 'updateFolder', path: '/folders/folder-1', method: 'PATCH', status: 202,
    payload: { name: 'Updated' },
    run: (api: API) => api.updateFolder('folder-1', { name: 'Updated' }),
    runRaw: (api: API) => api.updateFolder('folder-1', { name: 'Updated' }, { unwrapData: false }),
  },
  {
    name: 'updateTeamFolder', path: '/teams/test-team/folders/folder-1', method: 'PATCH', status: 202,
    payload: { name: 'Updated' },
    run: (api: API) => api.updateTeamFolder('test-team', 'folder-1', { name: 'Updated' }),
    runRaw: (api: API) => api.updateTeamFolder('test-team', 'folder-1', { name: 'Updated' }, { unwrapData: false }),
  },
  {
    name: 'deleteFolder', path: '/folders/folder-1', method: 'DELETE', status: 204,
    payload: undefined,
    run: (api: API) => api.deleteFolder('folder-1'),
    runRaw: (api: API) => api.deleteFolder('folder-1', { unwrapData: false }),
  },
  {
    name: 'deleteTeamFolder', path: '/teams/test-team/folders/folder-1', method: 'DELETE', status: 204,
    payload: undefined,
    run: (api: API) => api.deleteTeamFolder('test-team', 'folder-1'),
    runRaw: (api: API) => api.deleteTeamFolder('test-team', 'folder-1', { unwrapData: false }),
  },
  {
    name: 'updateFolderOrder', path: '/folders/folder-order', method: 'PUT', status: 204,
    payload: { order: { root: ['folder-1'] } },
    run: (api: API) => api.updateFolderOrder({ order: { root: ['folder-1'] } }),
    runRaw: (api: API) => api.updateFolderOrder({ order: { root: ['folder-1'] } }, { unwrapData: false }),
  },
  {
    name: 'updateTeamFolderOrder', path: '/teams/test-team/folders/folder-order', method: 'PUT', status: 204,
    payload: { order: { root: ['folder-1'] } },
    run: (api: API) => api.updateTeamFolderOrder('test-team', { order: { root: ['folder-1'] } }),
    runRaw: (api: API) => api.updateTeamFolderOrder('test-team', { order: { root: ['folder-1'] } }, { unwrapData: false }),
  },
]

test.each(folderWriteCases)('$name keeps the path, payload, status, and response shape', async ({ path, method, payload, status, run, runRaw }) => {
  const requests: Array<{ method: string; body: string; authorization: string | null }> = []
  server.use(
    http.all(`https://api.hackmd.io/v1${path}`, async ({ request }) => {
      requests.push({
        method: request.method,
        body: await request.text(),
        authorization: request.headers.get('Authorization'),
      })
      return status === 201 ? HttpResponse.json(folder, { status }) : new HttpResponse(null, { status })
    })
  )

  const unwrapped = await run(client)
  const raw = await runRaw(client)
  expect(raw.status).toBe(status)
  if (status === 201) {
    expect(unwrapped).toEqual(folder)
    expect(raw.data).toEqual(folder)
  } else {
    expect([undefined, '']).toContain(unwrapped)
    expect([undefined, '']).toContain(raw.data)
  }
  expect(requests).toEqual([1, 2].map(() => ({
    method,
    body: payload ? JSON.stringify(payload) : '',
    authorization: `Bearer ${process.env.HACKMD_ACCESS_TOKEN}`,
  })))
})

test('folder writes keep legacy error wrapping', async () => {
  server.use(
    http.patch('https://api.hackmd.io/v1/folders/missing', () =>
      HttpResponse.json({ error: 'Folder not found' }, { status: 404 })
    )
  )
  const customClient = new API('custom-token', undefined, {
    wrapResponseErrors: true,
    retryConfig: undefined,
  })

  await expect(customClient.updateFolder('missing', { name: 'Updated' })).rejects.toBeInstanceOf(HttpResponseError)
})

test('uploadNoteImage sends image as multipart form data', async () => {
  let uploaded: FormDataEntryValue | null = null
  let contentType: string | null = null
  let authorization: string | null = null

  server.use(
    http.post('https://api.hackmd.io/v1/notes/test-note-id/images', async ({ request }) => {
      contentType = request.headers.get('content-type')
      authorization = request.headers.get('Authorization')
      const formData = await request.formData()
      uploaded = formData.get('image')

      return HttpResponse.json({
        data: {
          link: 'https://hackmd.io/_uploads/test-image.png',
        },
      }, { status: 201 })
    }),
  )

  const response = await client.uploadNoteImage(
    'test-note-id',
    new Blob(['test image'], { type: 'image/png' }),
    { filename: 'test-image.png' },
  )

  expect(contentType).toContain('multipart/form-data')
  expect(uploaded).toBeInstanceOf(Blob)
  const uploadedBlob = uploaded as unknown as Blob
  expect(uploadedBlob.type).toBe('image/png')
  expect((uploaded as unknown as File).name).toBe('test-image.png')
  expect(authorization).toBe(`Bearer ${process.env.HACKMD_ACCESS_TOKEN}`)
  expect(response).toEqual({
    data: {
      link: 'https://hackmd.io/_uploads/test-image.png',
    },
  })

  const raw = await client.uploadNoteImage('test-note-id', new Blob(['test image'], { type: 'image/png' }), {
    filename: 'test-image.png',
    unwrapData: false,
  })
  expect(raw.status).toBe(201)
  expect(raw.data).toEqual(response)
})

test('uploadNoteImage keeps legacy error wrapping', async () => {
  server.use(http.post('https://api.hackmd.io/v1/notes/missing/images', () =>
    HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
  ))
  const customClient = new API('custom-token', undefined, {
    wrapResponseErrors: true,
    retryConfig: undefined,
  })

  await expect(customClient.uploadNoteImage('missing', new Blob(['image'], { type: 'image/png' }))).rejects.toBeInstanceOf(HttpResponseError)
})

test('should support updating team note title and tags metadata', async () => {
  const updatedTags = ['team', 'metadata']
  let requestBody: unknown

  server.use(
    http.patch('https://api.hackmd.io/v1/teams/test-team/notes/test-note-id', async ({ request }) => {
      requestBody = await request.json()
      return new HttpResponse(null, { status: 202 })
    })
  )

  const response = await client.updateTeamNote('test-team', 'test-note-id', {
    title: 'Updated Team Note',
    tags: updatedTags
  })

  expect(requestBody).toEqual({
    title: 'Updated Team Note',
    tags: updatedTags
  })
  expect(response.status).toBe(202)
  expect([undefined, '']).toContain(response.data)
})

test('updateNote keeps the legacy status/etag wrapper and raw response', async () => {
  const payload = { description: 'Updated', parentFolderId: null }
  const requests: string[] = []
  server.use(
    http.patch('https://api.hackmd.io/v1/notes/test-note-id', async ({ request }) => {
      requests.push(await request.text())
      return new HttpResponse(null, { status: 202, headers: { ETag: 'W/"updated"' } })
    })
  )

  expect(await client.updateNote('test-note-id', payload)).toEqual({ status: 202, etag: 'W/"updated"' })
  const raw = await client.updateNote('test-note-id', payload, { unwrapData: false })
  expect(raw.status).toBe(202)
  expect([undefined, '']).toContain(raw.data)
  expect(requests).toEqual([JSON.stringify(payload), JSON.stringify(payload)])
})

test('updateTeamNoteContent keeps the team path and raw response', async () => {
  let requestBody: unknown
  server.use(
    http.patch('https://api.hackmd.io/v1/teams/test-team/notes/test-note-id', async ({ request }) => {
      requestBody = await request.json()
      return new HttpResponse(null, { status: 202 })
    })
  )

  const response = await client.updateTeamNoteContent('test-team', 'test-note-id', 'Updated content')
  expect(requestBody).toEqual({ content: 'Updated content' })
  expect(response.status).toBe(202)
})

test.each([
  {
    name: 'deleteNote', path: '/notes/test-note-id',
    run: (api: API) => api.deleteNote('test-note-id', { unwrapData: false }),
  },
  {
    name: 'deleteTeamNote', path: '/teams/test-team/notes/test-note-id',
    run: (api: API) => api.deleteTeamNote('test-team', 'test-note-id'),
  },
])('$name keeps the path and 204 response', async ({ path, run }) => {
  let authorization: string | null = null
  server.use(
    http.delete(`https://api.hackmd.io/v1${path}`, ({ request }) => {
      authorization = request.headers.get('Authorization')
      return new HttpResponse(null, { status: 204 })
    })
  )

  const response = await run(client)
  expect(response.status).toBe(204)
  expect([undefined, '']).toContain(response.data)
  expect(authorization).toBe(`Bearer ${process.env.HACKMD_ACCESS_TOKEN}`)
})

test('note mutations keep legacy error wrapping', async () => {
  server.use(
    http.patch('https://api.hackmd.io/v1/teams/test-team/notes/missing', () =>
      HttpResponse.json({ error: 'Note not found' }, { status: 404 })
    )
  )
  const customClient = new API('custom-token', undefined, {
    wrapResponseErrors: true,
    retryConfig: undefined,
  })

  await expect(customClient.updateTeamNote('test-team', 'missing', { title: 'Updated' })).rejects.toBeInstanceOf(HttpResponseError)
})

test.each([
  { scope: 'personal', path: '/notes', status: 201, body: { id: 'note-1', title: 'New note' } },
  { scope: 'personal', path: '/notes', status: 207, body: { note: { id: 'note-1', title: 'New note' }, error: 'Failed to add note to folder' } },
  { scope: 'team', path: '/teams/test-team/notes', status: 201, body: { id: 'note-1', title: 'New note' } },
  { scope: 'team', path: '/teams/test-team/notes', status: 207, body: { note: { id: 'note-1', title: 'New note' }, error: 'Failed to add note to folder' } },
])('createNote $scope $status preserves its request and legacy response wrapper', async ({ scope, path, status, body }) => {
  const requests: Array<{ body: unknown; authorization: string | null }> = []
  server.use(
    http.post(`https://api.hackmd.io/v1${path}`, async ({ request }) => {
      requests.push({ body: await request.json(), authorization: request.headers.get('Authorization') })
      return HttpResponse.json(body, { status, headers: { ETag: 'W/"created"' } })
    })
  )
  const payload = { title: 'New note', noteFeatures: { citation: 'signed_in_users' as const } }
  const result = scope === 'personal'
    ? await client.createNote(payload)
    : await client.createTeamNote('test-team', payload)
  const raw = scope === 'personal'
    ? await client.createNote(payload, { unwrapData: false })
    : await client.createTeamNote('test-team', payload, { unwrapData: false })

  expect(result).toEqual(scope === 'personal' ? { ...body, status, etag: 'W/"created"' } : body)
  expect(raw.status).toBe(status)
  expect(raw.data).toEqual(body)
  expect(requests).toEqual([1, 2].map(() => ({
    body: payload,
    authorization: `Bearer ${process.env.HACKMD_ACCESS_TOKEN}`,
  })))
})

test('should not retry non-idempotent requests when wrapping errors', async () => {
  let requestCount = 0
  const clientWithRetryAndWrap = new API(process.env.HACKMD_ACCESS_TOKEN!, undefined, {
    wrapResponseErrors: true,
    retryConfig: {
      maxRetries: 2,
      baseDelay: 1,
    },
  })

  server.use(
    http.post('https://api.hackmd.io/v1/folders', () => {
      requestCount += 1
      if (requestCount === 1) {
        return HttpResponse.json(
          { error: 'Folder created but could not be retrieved' },
          { status: 500 },
        )
      }

      return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    }),
  )

  await expect(
    clientWithRetryAndWrap.createFolder({ name: 'retry-safety-test' }),
  ).rejects.toBeInstanceOf(InternalServerError)
  expect(requestCount).toBe(1)
})
