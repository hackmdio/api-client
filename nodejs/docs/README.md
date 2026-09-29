# HackMD API for TypeScript

This reference covers the existing `API` class and every generated operation
and type in `@hackmd/api/raw`.

```sh
npm install @hackmd/api
```

## API client

```ts
import { API } from '@hackmd/api'

const client = new API('YOUR_ACCESS_TOKEN')
const note = await client.getNote('NOTE_ID')
console.log(note.content)
```

Existing applications can keep using `API` and its current method signatures.

## Generated raw API

```ts
import { createClient, getNote } from '@hackmd/api/raw'

const client = createClient({ auth: 'YOUR_ACCESS_TOKEN' })
const response = await getNote({ client, path: { noteId: 'NOTE_ID' }, throwOnError: true })
console.log(response.data.content)
```

Use the raw reference for the full OpenAPI operation and DTO catalog.

## Explore the types

The type-only example makes no requests and requires no real token. Open it to
explore autocomplete and type inspection; run real API calls only with your own
token in a trusted local environment.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/fork/github/hackmdio/api-client/tree/master/nodejs?file=tests/types/playground.mts)
