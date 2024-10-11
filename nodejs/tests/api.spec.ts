import { server } from './mock'
import { API } from '../src'
import { rest } from 'msw'
import { TooManyRequestsError } from '../src/error'

let client: API

beforeAll(() => {
  client = new API(process.env.HACKMD_ACCESS_TOKEN!)

  return server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  return server.close()
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
    rest.get('https://api.hackmd.io/v1/me', (req: any, res: (arg0: any) => any, ctx: { status: (arg0: number) => any }) => {
      return res(ctx.status(429))
    }),
  )

  try {
    await customCilent.getMe()
  } catch (error: any) {
    expect(error).toHaveProperty('response')
    expect(error.response).toHaveProperty('status', 429)
  }
})

test.only('should throw HackMD error object', async () => {
  server.use(
    rest.get('https://api.hackmd.io/v1/me', (req, res, ctx) => {
      return res(
        ctx.status(429),
        ctx.set({
          'X-RateLimit-UserLimit': '100',
          'x-RateLimit-UserRemaining': '0',
          'x-RateLimit-UserReset': String(
            new Date().getTime() + 1000 * 60 * 60 * 24,
          ),
        }),
      )
    }),
  )

  try {
    await client.getMe()
  } catch (error: any) {
    expect(error).toBeInstanceOf(TooManyRequestsError)

    console.log(JSON.stringify(error))

    expect(error).toHaveProperty('code', 429)
    expect(error).toHaveProperty('statusText', 'Too Many Requests')
    expect(error).toHaveProperty('userLimit', 100)
    expect(error).toHaveProperty('userRemaining', 0)
    expect(error).toHaveProperty('resetAfter')
  }
})
