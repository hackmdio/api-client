/**
 * @module @hackmd/api/raw
 *
 * Generated, one-to-one HackMD API operations and their wire types.
 *
 * This surface is regenerated from `spec/hackmd-openapi.json`. Use the
 * hand-written `API` class from the package root when you need its compatibility
 * helpers such as response unwrapping, retries, and ETag handling.
 */
export * from './generated/index.js'
export { client } from './generated/client.gen.js'
export {
  createClient,
  createConfig,
} from './generated/client/index.js'
export type {
  Client,
  Config,
  RequestOptions as RawRequestOptions,
  RequestResult as RawRequestResult,
} from './generated/client/index.js'
