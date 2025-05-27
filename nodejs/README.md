# HackMD Node.js API Client

![npm](https://img.shields.io/npm/v/@hackmd/api)

## About

This is a Node.js client for the [HackMD API](https://hackmd.io/).

You can sign up for an account at [hackmd.io](https://hackmd.io/), and then create access tokens for your projects by following the [HackMD API documentation](https://hackmd.io/@hackmd-api/developer-portal).

For bugs and feature requests, please open an issue or pull request on [GitHub](https://github.com/hackmdio/api-client).

## **v2.0.0 Update Note**

`v2.0.0` is a completely rewrite and is incompatible with `v1.x.x`. But the best of all, it does not require Node.JS runtime anymore, which means you can use it in a browser. We recommend you to upgrade to `v2.0.0` if you are using the old one.

## Installation

```bash
npm install @hackmd/api --save
```

## Example

### ES Modules (ESM)

```javascript
// Default import
import HackMDAPI from '@hackmd/api'

// Or named import
import { API } from '@hackmd/api'

const client = new HackMDAPI('YOUR_ACCESS_TOKEN' /* required */, 'https://api.hackmd.io/v1' /* optional */)

client.getMe().then(me => {
  console.log(me.email)
})
```

### CommonJS

```javascript
// Default import
const HackMDAPI = require('@hackmd/api').default

// Or named import
const { API } = require('@hackmd/api')

const client = new HackMDAPI('YOUR_ACCESS_TOKEN', 'https://api.hackmd.io/v1')

client.getMe().then(me => {
  console.log(me.email)
})
```

### Legacy Import Support

For backward compatibility, the package also supports legacy import paths:

```javascript
// ESM
import HackMDAPI from '@hackmd/api/dist'
import { API } from '@hackmd/api/dist'

// CommonJS
const HackMDAPI = require('@hackmd/api/dist').default
const { API } = require('@hackmd/api/dist')

// Direct file imports
import { API } from '@hackmd/api/dist/index.js'
```

## Advanced Features

### Retry Configuration

The client supports automatic retry for failed requests with exponential backoff. You can configure retry behavior when creating the client:

```javascript
const client = new HackMDAPI('YOUR_ACCESS_TOKEN', 'https://api.hackmd.io/v1', {
  retryConfig: {
    maxRetries: 3,    // Maximum number of retry attempts
    baseDelay: 100    // Base delay in milliseconds for exponential backoff
  }
})
```

The client will automatically retry requests that fail with:
- 5xx server errors
- 429 Too Many Requests errors
- Network errors

### Response Data Handling

By default, the client automatically unwraps the response data from the Axios response object. You can control this behavior using the `unwrapData` option:

```javascript
// Get raw Axios response (includes headers, status, etc.)
const response = await client.getMe({ unwrapData: false })

// Get only the data (default behavior)
const data = await client.getMe({ unwrapData: true })
```

### ETag Support

The client supports ETag-based caching for note retrieval. You can pass an ETag to check if the content has changed:

```javascript
// First request
const note = await client.getNote('note-id')
const etag = note.etag

// Subsequent request with ETag
const updatedNote = await client.getNote('note-id', { etag })
// If the note hasn't changed, the response will have status 304
```

## API

See the [code](./src/index.ts) and [typings](./src/type.ts). The API client is written in TypeScript, so you can get auto-completion and type checking in any TypeScript Language Server powered editor or IDE.

## License

MIT
