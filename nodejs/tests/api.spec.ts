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
  const raw = await client.getNoteList({ unwrapData: false })
  expect(raw.status).toBe(200)
  expect(raw.data).toEqual([note])
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
  const raw = await client.getTeamNotes('test-team', { unwrapData: false })
  expect(raw.status).toBe(200)
  expect(raw.data).toEqual(notes)
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

  expect(folders).toHaveLength(1)
  expect(folders[0]).toMatchObject({ id: 'folder-1', name: 'Research' })
  const raw = await client.getFolderList({ unwrapData: false })
  expect(raw.status).toBe(200)
  expect(raw.data).toEqual(folders)
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
  const raw = await client.getTeamFolderList('test-team', { unwrapData: false })
  expect(raw.status).toBe(200)
  expect(raw.data).toEqual(folders)
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

test('updateFolderOrder sends order payload', async () => {
  let requestBody: unknown

  server.use(
    http.put('https://api.hackmd.io/v1/folders/folder-order', async ({ request }) => {
      requestBody = await request.json()

      return HttpResponse.json({})
    }),
  )

  await client.updateFolderOrder({
    order: { root: ['a', 'b'], parent: ['c'] },
  })

  expect(requestBody).toEqual({
    order: { root: ['a', 'b'], parent: ['c'] },
  })
})

test('uploadNoteImage sends image as multipart form data', async () => {
  let uploaded: FormDataEntryValue | null = null
  let contentType: string | null = null

  server.use(
    http.post('https://api.hackmd.io/v1/notes/test-note-id/images', async ({ request }) => {
      contentType = request.headers.get('content-type')
      const formData = await request.formData()
      uploaded = formData.get('image')

      return HttpResponse.json({
        data: {
          link: 'https://hackmd.io/_uploads/test-image.png',
        },
      })
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
  expect(response).toEqual({
    data: {
      link: 'https://hackmd.io/_uploads/test-image.png',
    },
  })
})

test('should support updating team note title and tags metadata', async () => {
  const updatedTags = ['team', 'metadata']
  let requestBody: unknown

  server.use(
    http.patch('https://api.hackmd.io/v1/teams/test-team/notes/test-note-id', async ({ request }) => {
      requestBody = await request.json()

      return HttpResponse.json(
        {
          id: 'test-note-id',
          title: 'Updated Team Note',
          tags: updatedTags
        }
      )
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
  expect(response).toHaveProperty('status', 200)
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
