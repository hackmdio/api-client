// import { startServer, stopServer } from './server'
import { API } from '../src'

// let address: Awaited<ReturnType<typeof startServer>>
let client: API

beforeAll(async () => {
  // address = await startServer()

  client = new API(process.env.HACKMD_ACCESS_TOKEN!, 'http://localhost:3000/api/openAPI/v1/')

  // console.log(address)
})

afterAll(async () => {
  // await stopServer()
})

test('getMe', async () => {
  const response = await client.getMe({ unwrapData: false })

  expect(response).toHaveProperty('status', 200)
  expect(response).toHaveProperty('headers')
})

test('getMe unwrapped', async () => {
  const response = await client.getMe()

  expect(typeof response).toBe('object')
})
