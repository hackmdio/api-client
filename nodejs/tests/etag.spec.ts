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
  
  test('response includes etag when server provides it (unwrapData: true)', async () => {
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
  
  test('response includes etag in headers when unwrapData is false', async () => {
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

  test('sends If-None-Match header when etag is provided', async () => {
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

  test('handles 304 Not Modified responses correctly (unwrapData: false)', async () => {
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
  
  test('handles 304 Not Modified responses correctly (unwrapData: true)', async () => {
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