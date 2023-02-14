import jsonServer from 'json-server'
import type { AddressInfo, Server } from 'net'

const server = jsonServer.create()
const router = jsonServer.router('db.json')
const middlewares = jsonServer.defaults()

server.use(middlewares)
server.use(router)

let srv: Server | undefined

const unwrapAddress = (address: string | AddressInfo | null): number => {
  if (typeof address === 'string') {
    throw new Error('Server address is a string')
  } else if (address) {
    return address.port
  } else {
    throw new Error('Server address is undefined')
  }
}


export function startServer (): Promise<number> {
  return new Promise((resolve) => {
    if (srv) {
      const address = srv.address()

      return resolve(unwrapAddress(address))
    } else {
      srv = server.listen(0, () => {
        console.debug(`JSON Server is running at ${srv!.address()}`)

        const address = srv!.address()

        resolve(unwrapAddress(address))
      })
    }
  })
}

export function stopServer (): Promise<void> {
  return new Promise((resolve) => {
    if (!srv) {
      return resolve()
    }

    srv.close(() => {
      console.debug('JSON Server stopped')

      srv = undefined

      resolve()
    })
  })
}

