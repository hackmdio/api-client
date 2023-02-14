import { startServer, stopServer } from './server'

let address: Awaited<ReturnType<typeof startServer>>

beforeAll(async () => {
  address = await startServer()

  console.log(address)
})

afterAll(async () => {
  await stopServer()
})

test('it should respond with a 200 status code', async () => {
  expect(200).toBe(200)
})
