import { server } from './mock'
import { API } from '../src'

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
