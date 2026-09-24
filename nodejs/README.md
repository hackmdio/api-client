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
    maxRetries: 3, // Maximum number of retry attempts
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

The client can send an ETag to check whether a note changed. The server
generates the ETag and decides whether to return 304; the client does not cache
the note body for you:

```javascript
const first = await client.getNote('note-id', { unwrapData: false })
const response = await client.getNote('note-id', {
  etag: first.headers.etag,
  unwrapData: false,
})
// 304 has no body; keep first.data. Otherwise, use response.data.
const note = response.status === 304 ? first.data : response.data
```

Team notes work the same way through the existing client:

```javascript
const teamFirst = await client.getTeamNote('team-path', 'note-id')
const teamResponse = await client.getTeamNote('team-path', 'note-id', {
  etag: teamFirst.etag,
})
const teamNote = teamResponse.status === 304 ? teamFirst : teamResponse
```

### Image Upload

Upload an image to a note with `uploadNoteImage`. The API returns the uploaded image link in `data.link`.

```javascript
// Browser: pass a File from an <input type="file">
const uploaded = await client.uploadNoteImage('note-id', file)
console.log(uploaded.data.link)

// Node.js 18+: pass a Blob and optional filename
const image = new Blob([imageBuffer], { type: 'image/png' })
const uploadedFromNode = await client.uploadNoteImage('note-id', image, {
  filename: 'diagram.png'
})
console.log(uploadedFromNode.data.link)
```

### Webhooks

Manage personal or team webhooks through the same `API` client. Save the secret
returned by `createWebhook` when you create a webhook; later reads do not return it.

```javascript
const webhook = await client.createWebhook({
  scope: { type: 'workspace' },
  url: 'https://example.com/webhook',
})
console.log(webhook.secret)

const teamWebhooks = await client.listTeamWebhooks('team-path')
```

`listWebhookDeliveries('hook-id', { page: 1, limit: 20 })` returns delivery data
and pagination metadata. `exportWebhookDeliveries('hook-id')` returns
newline-delimited JSON as a string; parse the lines yourself if needed.

### Generated Raw API

The `@hackmd/api/raw` entry point exposes every OpenAPI operation as a generated,
one-to-one function. Create a client to share authentication and the API endpoint:

```typescript
import { createClient, getNote } from '@hackmd/api/raw'

const client = createClient({
  auth: 'YOUR_ACCESS_TOKEN',
  baseURL: 'https://api.hackmd.io/v1',
})

const response = await getNote({
  client,
  path: { noteId: 'NOTE_ID' },
  throwOnError: true,
})

console.log(response.data.content)
```

The package root retains the existing `API` class. Files under
`src/generated` are generated from the vendored OpenAPI document and must not
be edited manually.

## API

The [API reference](https://hackmdio.github.io/api-client/) covers the existing
`API` class and every raw operation and DTO. To explore autocomplete
without a real token, open the [type-only StackBlitz example](https://stackblitz.com/fork/github/hackmdio/api-client/tree/master/nodejs?file=tests/types/playground.mts).
The Pages site is deployed from `master` only.

Run `pnpm docs:dev` from `nodejs` and open `http://127.0.0.1:3000` to preview
the reference locally. It builds the HTML once before serving; rerun the
command after changing source or docs. The output in `.docs-dist` is not
committed.

## Regenerating the raw client

Generation requires Node.js 22.18 or newer.

```bash
pnpm spec:pull
pnpm generate
pnpm check:generated
```

The OpenAPI document is committed at `spec/hackmd-openapi.json`, and generated
sources are committed under `src/generated` so package builds remain offline and
deterministic.

## E2E tests (live API)

Integration tests call a real HackMD API (staging or production). They are **not** run by `pnpm test` or the default CI job.

**Requirements**

- `HACKMD_ACCESS_TOKEN` — a valid personal access token for the environment you target.
- Optional: `HACKMD_API_ENDPOINT` — defaults to `https://api.hackmd.io/v1`. For staging, use `https://api-stage.hackmd.io/v1`.

**Read-only (default e2e)**

```bash
cd nodejs
export HACKMD_ACCESS_TOKEN=your_token
export HACKMD_API_ENDPOINT=https://api-stage.hackmd.io/v1   # optional
pnpm test:e2e
```

**With CRUD / mutations**

Set `HACKMD_E2E_MUTATIONS=1` to run write tests against your account:

- **Notes:** create → get → update (title, content, tags) → upload fixture image → list → delete.
- **Folders:** one integration test runs create (root + nested) → get → update → list → folder-order round-trip (skipped if that API returns 404) → delete. If **POST `/folders`** returns 404 (common before full production rollout), the test exits early with a warning; use staging or `HACKMD_E2E_FOLDERS=0`.

```bash
HACKMD_E2E_MUTATIONS=1 pnpm test:e2e
```

Folder CRUD touches folder display order briefly, then restores the previous order in an `afterAll` hook. To skip folder mutations (e.g. production without `/folders`), set `HACKMD_E2E_FOLDERS=0`.

The read-only `getFolderList` test still treats HTTP 404 as “folders not available on this host yet” and passes without failing the suite.

## License

MIT
