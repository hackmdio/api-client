import { server } from './mock'
import { API } from '../src'
import { HttpResponseError } from '../src/error'
import { http, HttpResponse } from 'msw'

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

describe('Etag support', () => {
  // Helper to reset server between tests
  beforeEach(() => {
    server.resetHandlers()
  })
  
  describe('getNote', () => {
    test('should include etag property in response when unwrapData is true', async () => {
      // Setup mock server to return an etag
      const mockEtag = 'W/"123456789"'
      
      server.use(
        http.get('https://api.hackmd.io/v1/notes/test-note-id', () => {
          return HttpResponse.json(
            { 
              id: 'test-note-id',
              title: 'Test Note'
            },
            {
              headers: {
                'ETag': mockEtag
              }
            }
          )
        })
      )

      // Make request with default unwrapData: true
      const response = await client.getNote('test-note-id')

      // Verify response has etag property
      expect(response).toHaveProperty('etag', mockEtag)
      
      // Verify data properties still exist
      expect(response).toHaveProperty('id', 'test-note-id')
      expect(response).toHaveProperty('title', 'Test Note')
      expect(response.status).toBe(200)
    })
    
    test('should include etag in response headers when unwrapData is false', async () => {
      // Setup mock server to return an etag
      const mockEtag = 'W/"123456789"'
      
      server.use(
        http.get('https://api.hackmd.io/v1/notes/test-note-id', () => {
          return HttpResponse.json(
            { 
              id: 'test-note-id',
              title: 'Test Note'
            },
            {
              headers: {
                'ETag': mockEtag
              }
            }
          )
        })
      )

      // Make request with unwrapData: false
      const response = await client.getNote('test-note-id', { unwrapData: false })

      // Verify response headers contain etag
      expect(response.headers.etag).toBe(mockEtag)
      
      // Verify data is in response.data
      expect(response.data).toHaveProperty('id', 'test-note-id')
      expect(response.data).toHaveProperty('title', 'Test Note')
    })

    test('should send etag in If-None-Match header when provided in options', async () => {
      // Setup mock server to check for If-None-Match header
      let ifNoneMatchValue: string | null = null
      const mockEtag = 'W/"123456789"'
      
      server.use(
        http.get('https://api.hackmd.io/v1/notes/test-note-id', ({ request }) => {
          // Store the If-None-Match header value for verification
          ifNoneMatchValue = request.headers.get('If-None-Match')
          
          return HttpResponse.json(
            { 
              id: 'test-note-id',
              title: 'Test Note'
            },
            {
              headers: {
                'ETag': mockEtag
              }
            }
          )
        })
      )

      // Make request with etag in options
      await client.getNote('test-note-id', { etag: mockEtag })

      // Verify the If-None-Match header was sent with correct value
      expect(ifNoneMatchValue).toBe(mockEtag)
    })

    test('should preserve 304 status and etag when unwrapData is false and content not modified', async () => {
      // Setup mock server to return 304 when etag matches
      const mockEtag = 'W/"123456789"'
      
      server.use(
        http.get('https://api.hackmd.io/v1/notes/test-note-id', ({ request }) => {
          const ifNoneMatch = request.headers.get('If-None-Match')
          
          // Return 304 when etag matches
          if (ifNoneMatch === mockEtag) {
            return new HttpResponse(null, {
              status: 304,
              headers: {
                'ETag': mockEtag
              }
            })
          }
          
          return HttpResponse.json(
            { 
              id: 'test-note-id',
              title: 'Test Note'
            },
            {
              headers: {
                'ETag': mockEtag
              }
            }
          )
        })
      )

      // Request with unwrapData: false to get full response including status
      const response = await client.getNote('test-note-id', { etag: mockEtag, unwrapData: false })

      // Verify we get a 304 status code
      expect(response.status).toBe(304)
      
      // Verify etag is still available in headers
      expect(response.headers.etag).toBe(mockEtag)
    })
    
    test('should return status and etag only when unwrapData is true and content not modified', async () => {
      // Setup mock server to return 304 when etag matches
      const mockEtag = 'W/"123456789"'
      
      server.use(
        http.get('https://api.hackmd.io/v1/notes/test-note-id', ({ request }) => {
          const ifNoneMatch = request.headers.get('If-None-Match')
          
          // Return 304 when etag matches
          if (ifNoneMatch === mockEtag) {
            return new HttpResponse(null, {
              status: 304,
              headers: {
                'ETag': mockEtag
              }
            })
          }
          
          return HttpResponse.json(
            { 
              id: 'test-note-id',
              title: 'Test Note'
            },
            {
              headers: {
                'ETag': mockEtag
              }
            }
          )
        })
      )

      // Request with default unwrapData: true
      const response = await client.getNote('test-note-id', { etag: mockEtag })

      // With unwrapData: true and a 304 response, we just get the etag
      expect(response).toHaveProperty('etag', mockEtag)
      expect(response).toHaveProperty('status', 304)
      expect(response).not.toHaveProperty('content')
    })

    test('uses the legacy Axios instance for custom base URL and authorization', async () => {
      let authorization: string | null = null
      server.use(
        http.get('https://custom.hackmd.test/v1/notes/test-note-id', ({ request }) => {
          authorization = request.headers.get('Authorization')
          return HttpResponse.json({ id: 'test-note-id', content: 'hello' })
        })
      )

      const customClient = new API('custom-token', 'https://custom.hackmd.test/v1/')
      const response = await customClient.getNote('test-note-id')

      expect(authorization).toBe('Bearer custom-token')
      expect(response.status).toBe(200)
      expect(response.content).toBe('hello')
    })

    test('keeps legacy error wrapping for generated requests', async () => {
      server.use(
        http.get('https://api.hackmd.io/v1/notes/missing-note', () =>
          HttpResponse.json({ error: 'Note not found' }, { status: 404 })
        )
      )

      const customClient = new API('custom-token', undefined, {
        wrapResponseErrors: true,
        retryConfig: undefined,
      })

      await expect(customClient.getNote('missing-note')).rejects.toBeInstanceOf(HttpResponseError)
    })

    test('keeps legacy retry behavior for generated requests', async () => {
      let attempts = 0
      server.use(
        http.get('https://api.hackmd.io/v1/notes/retry-note', () => {
          attempts++
          if (attempts === 1) return HttpResponse.json({}, { status: 503 })
          return HttpResponse.json({ id: 'retry-note', content: 'retried' })
        })
      )

      const retryClient = new API('custom-token', undefined, {
        wrapResponseErrors: true,
        retryConfig: { maxRetries: 1, baseDelay: 0 },
      })
      const response = await retryClient.getNote('retry-note')

      expect(attempts).toBe(2)
      expect(response.content).toBe('retried')
    })
  })

  describe('getTeamNote', () => {
    test('preserves 200/304 ETags, raw responses, authorization and custom base URL', async () => {
      const etag = 'W/"team-note-v1"'
      const conditionalHeaders: Array<string | null> = []
      const authorizationHeaders: Array<string | null> = []
      server.use(
        http.get('https://custom.hackmd.test/v1/teams/my-team/notes/team-note', ({ request }) => {
          const ifNoneMatch = request.headers.get('If-None-Match')
          conditionalHeaders.push(ifNoneMatch)
          authorizationHeaders.push(request.headers.get('Authorization'))
          if (ifNoneMatch === etag) {
            return new HttpResponse(null, { status: 304, headers: { ETag: etag } })
          }
          return HttpResponse.json(
            { id: 'team-note', content: 'Team content' },
            { headers: { ETag: etag } }
          )
        })
      )

      const teamClient = new API('custom-token', 'https://custom.hackmd.test/v1/')
      const first = await teamClient.getTeamNote('my-team', 'team-note')
      expect(first).toEqual({ id: 'team-note', content: 'Team content', status: 200, etag })

      const raw200 = await teamClient.getTeamNote('my-team', 'team-note', { unwrapData: false })
      expect(raw200.status).toBe(200)
      expect(raw200.data.content).toBe('Team content')
      expect(raw200.headers.etag).toBe(etag)

      const notModified = await teamClient.getTeamNote('my-team', 'team-note', { etag })
      expect(notModified).toEqual({ status: 304, etag })

      const raw304 = await teamClient.getTeamNote('my-team', 'team-note', { etag, unwrapData: false })
      expect(raw304.status).toBe(304)
      expect(raw304.headers.etag).toBe(etag)
      expect(conditionalHeaders).toEqual([null, null, etag, etag])
      expect(authorizationHeaders).toEqual(Array(4).fill('Bearer custom-token'))
    })

    test('keeps legacy error wrapping for generated team requests', async () => {
      server.use(
        http.get('https://api.hackmd.io/v1/teams/my-team/notes/missing-note', () =>
          HttpResponse.json({ error: 'Note not found' }, { status: 404 })
        )
      )

      const teamClient = new API('custom-token', undefined, {
        wrapResponseErrors: true,
        retryConfig: undefined,
      })
      await expect(teamClient.getTeamNote('my-team', 'missing-note')).rejects.toBeInstanceOf(HttpResponseError)
    })

    test('uses the existing retry interceptor', async () => {
      let attempts = 0
      server.use(
        http.get('https://api.hackmd.io/v1/teams/my-team/notes/retry-note', () => {
          attempts++
          if (attempts === 1) return HttpResponse.json({}, { status: 503 })
          return HttpResponse.json({ id: 'retry-note', content: 'retried' })
        })
      )

      const teamClient = new API('custom-token', undefined, {
        wrapResponseErrors: true,
        retryConfig: { maxRetries: 1, baseDelay: 0 },
      })
      const note = await teamClient.getTeamNote('my-team', 'retry-note')
      expect(attempts).toBe(2)
      expect(note.content).toBe('retried')
    })
  })
  
  describe('createNote', () => {
    test('should include etag property in response when creating a note', async () => {
      // Setup mock server to return an etag
      const mockEtag = 'W/"abcdef123"'
      
      server.use(
        http.post('https://api.hackmd.io/v1/notes', () => {
          return HttpResponse.json(
            { 
              id: 'new-note-id',
              title: 'New Test Note'
            },
            {
              status: 201,
              headers: {
                'ETag': mockEtag
              }
            }
          )
        })
      )

      // Make request with default unwrapData: true
      const response = await client.createNote({ title: 'New Test Note', content: 'Test content' })

      // Verify response has etag property
      expect(response).toHaveProperty('etag', mockEtag)
      expect(response.status).toBe(201)
      if (response.status !== 201) throw new Error('Expected 201')
      
      // Verify data properties still exist
      expect(response).toHaveProperty('id', 'new-note-id')
      expect(response).toHaveProperty('title', 'New Test Note')
    })
  })

  describe('updateNote', () => {
    test('should include etag property in response when updating note content', async () => {
      // Setup mock server to return an etag
      const mockEtag = 'W/"updated-etag"'
      
      server.use(
        http.patch('https://api.hackmd.io/v1/notes/test-note-id', () => {
          return new HttpResponse(null, { status: 202, headers: { ETag: mockEtag } })
        })
      )

      // Make request with default unwrapData: true
      const response = await client.updateNoteContent('test-note-id', 'Updated content')

      expect(response).toEqual({ status: 202, etag: mockEtag })
    })

    test('should support updating note title and tags metadata', async () => {
      const mockEtag = 'W/"metadata-etag"'
      const updatedTags = ['api', 'metadata']
      let requestBody: unknown

      server.use(
        http.patch('https://api.hackmd.io/v1/notes/test-note-id', async ({ request }) => {
          requestBody = await request.json()

          return new HttpResponse(null, { status: 202, headers: { ETag: mockEtag } })
        })
      )

      const response = await client.updateNote('test-note-id', {
        title: 'Updated Metadata Title',
        tags: updatedTags
      })

      expect(requestBody).toEqual({
        title: 'Updated Metadata Title',
        tags: updatedTags
      })
      expect(response).toEqual({ status: 202, etag: mockEtag })
    })
  })
})
