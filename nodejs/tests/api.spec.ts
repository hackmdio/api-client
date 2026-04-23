import { server } from './mock'
import { API } from '../src'
import { http, HttpResponse } from 'msw'
import { InternalServerError, TooManyRequestsError } from '../src/error'

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
  server.use(
    http.get('https://api.hackmd.io/v1/folders', () => {
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
