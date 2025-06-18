import { server } from './mock'
import { API } from '../src'
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
          return HttpResponse.json(
            { 
              id: 'test-note-id',
              title: 'Updated Test Note',
              content: 'Updated content via updateNote'
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
      const response = await client.updateNoteContent('test-note-id', 'Updated content')

      // Verify response has etag property
      expect(response).toHaveProperty('etag', mockEtag)
      
      // Verify data properties still exist
      expect(response).toHaveProperty('id', 'test-note-id')
      expect(response).toHaveProperty('title', 'Updated Test Note')
      expect(response).toHaveProperty('content', 'Updated content via updateNote')
    })
  })
})
