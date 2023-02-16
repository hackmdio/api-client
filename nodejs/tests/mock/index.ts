import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { faker } from '@faker-js/faker'

const checkBearerToken = (req: any) => {
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.split(' ')[1]

  return token === process.env.HACKMD_ACCESS_TOKEN
}

type RestGetParameters = Parameters<typeof rest['get']>;
type RestResponseResolver = RestGetParameters[1];

const withAuthorization = (resolver: RestResponseResolver) => {
  return (req: any, res: any, ctx: any) => {
    if (!checkBearerToken(req)) {
      return res(
        ctx.status(401),
        ctx.json({
          error: 'Unauthorized',
        }),
      )
    } else {
      return resolver(req, res, ctx)
    }
  }
}

export const server = setupServer(
  rest.get(
    'https://api.hackmd.io/v1/me',
    withAuthorization((req, res, ctx) => {
      return res(
        ctx.json({
          id: faker.datatype.uuid(),
          name: faker.name.fullName(),
          email: faker.internet.email(),
          userPath: faker.internet.userName(),
          photo: faker.image.avatar(),
          teams: []
        }),
      )
    }),
  ),
)
