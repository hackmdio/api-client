# HackMD API Clients

## Node.JS

See [README](./nodejs)

## Quick Start

### Install
```
$ npm -i @hackmd/api
```

### Login and Create a note

- Copy following into `index.js`

```
const { default: API } = require('@hackmd/api')

const api = new API()

api.login('your account', 'your password').then(() => {
  api.newNote(`# Untitle Add By API`)
})
```

- execute it by `node index.js`

### Create a note from an example note

```
const { default: API, ExportType } = require('@hackmd/api')

const api = new API()

api.login('your account', 'your password').then(() => {
  api.exportString('your note id', ExportType.MD).then((res) => {
      api.newNote(res)
  })
})
```

## API Reference

### API class

`notice: There are not all the functions. I just write the functions which I am interested in`

- `constructor(config?: APIOptions)`
  - config: optional, [APIOptions](#APIOptions)
- `login(email: string, password: string): Promise<void>` - method to login
  - email: string
  - password: string
- `logout(): Promise<void>` - method to logout
- `newNote(body: string, options?: NewNoteOption): Promise<void>` - method to add a new note
  - body: string - the content you want to add in the new note, for example: `# api test`
  - options: optional, [NewNoteOption](#NewNoteOption)
- `exportString(noteId: string, type: ExportType): Promise<string>` = method to export a note
  - noteId: string - the id in the url. If your url of the example note is `https://hackmd.io/XXXOOO`, your noteId is `XXXOOO`
  - type: [ExportType](#ExportType) 

#### APIOptions

- serverUrl: string - optional, the url of the server, for example: `https://hackmd.io`
- cookiePath: string - optional, the path where the cookies save in
- enterprise: boolean - optional, I don't know what it is

#### NewNoteOption
- team: string - optional, the team id in the url

#### ExportType

- PDF: 0 - export to pdf
- SLIDE: 1 - I don't know what it is
- MD: 2 - export to markdown
- HTML: 3 - export to html

## LICENSE

MIT
