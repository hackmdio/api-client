# HackMD Node.js API Client

![npm](https://img.shields.io/npm/v/@hackmd/api)

## About

This is a Node.js client for the [HackMD API](https://hackmd.io/).

You can sign up for an account at [hackmd.io](https://hackmd.io/), and then create access tokens for your projects by following the [HackMD API documentation](https://hackmd.io/@hackmd-api/developer-portal).

For bugs and feature requests, please open an issue or pull request on [GitHub](https://github.com/hackmdio/api-client).

## Installation

```bash
npm install @hackmd/api --save
```

## Example

```javascript
import HackMDAPI from '@hackmd/api'

const client = new HackMDAPI('YOUR_ACCESS_TOKEN' /* required */, 'https://api.hackmd.io/v1' /* optional */)

client.getMe().then(me => {
  console.log(me.email)
})
```

## API

See the [code](./src/index.ts) and [typings](./src/type.ts). The API client is written in TypeScript, so you can get auto-completion and type checking in any TypeScript Language Server powered editor or IDE.

## License

MIT
