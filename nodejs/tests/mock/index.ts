import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { faker } from '@faker-js/faker'

const checkBearerToken = (request: Request) => {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.split(' ')[1]

  return token === process.env.HACKMD_ACCESS_TOKEN
}

// In MSW v2, we don't need the withAuthorization wrapper - we can handle auth directly in the handler
export const server = setupServer(
  http.get('https://api.hackmd.io/v1/me', ({ request }) => {
    // Check authorization
    if (!checkBearerToken(request)) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Return successful response with mock user data
    return HttpResponse.json({
      id: faker.datatype.uuid(),
      name: faker.name.fullName(),
      email: faker.internet.email(),
      userPath: faker.internet.userName(),
      photo: faker.image.avatar(),
      teams: []
    })
  }),
)
