import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/posts', () => {
    return HttpResponse.json(null)
  }),
]
