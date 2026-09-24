import { http, HttpResponse } from 'msw'

import { API, CommentPermissionType, NotePermissionRole, NotePublishType, TeamVisibilityType } from '../src'
import * as generatedSdk from '../src/generated/sdk.gen'
import { createClient, getMe } from '../src/raw'
import * as openApiDocument from '../spec/hackmd-openapi.json'
import { server } from './mock'

const EXPECTED_OPERATIONS = [
  'batchRestore',
  'compareVersions',
  'createFolder',
  'createNote',
  'createTeamFolder',
  'createTeamNote',
  'createTeamWebhook',
  'createVersion',
  'createWebhook',
  'deleteFolder',
  'deleteNote',
  'deleteTeamFolder',
  'deleteTeamNote',
  'deleteTeamWebhook',
  'deleteWebhook',
  'exportTeamWebhookDeliveries',
  'exportWebhookDeliveries',
  'getMe',
  'getFolder',
  'getFolderOrder',
  'getHistory',
  'getNote',
  'getNoteComment',
  'getTeamFolder',
  'getTeamFolderOrder',
  'getTeamNote',
  'getTeamWebhook',
  'getTeamWebhookDelivery',
  'getVersion',
  'getWebhook',
  'getWebhookDelivery',
  'listFolders',
  'listNoteComments',
  'listNotes',
  'listTrash',
  'listTeamFolders',
  'listTeamNotes',
  'listTeams',
  'listTeamTrash',
  'listTeamWebhookDeliveries',
  'listTeamWebhooks',
  'listVersions',
  'listWebhookDeliveries',
  'listWebhooks',
  'pingTeamWebhook',
  'pingWebhook',
  'resolveNoteComment',
  'restoreNote',
  'unresolveNoteComment',
  'updateFolder',
  'updateFolderOrder',
  'updateNote',
  'updateTeamFolder',
  'updateTeamFolderOrder',
  'updateTeamNote',
  'updateTeamWebhook',
  'updateVersion',
  'updateWebhook',
  'uploadNoteImage',
] as const

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const

type OpenApiOperation = {
  operationId?: string
  responses?: Record<string, unknown>
}
type OpenApiPath = Partial<Record<typeof HTTP_METHODS[number], OpenApiOperation>>

function operationNamesFromSpec (): string[] {
  const paths = openApiDocument.paths as Record<string, OpenApiPath>
  return Object.values(paths)
    .flatMap(path => HTTP_METHODS.flatMap(method => {
      const operationId = path[method]?.operationId
      if (!operationId) return []
      return [operationId.charAt(0).toLowerCase() + operationId.slice(1)]
    }))
    .sort()
}

describe('generated raw API', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  test('covers every reviewed v1 operation', () => {
    const expected = [...EXPECTED_OPERATIONS].sort()

    expect(expected).toHaveLength(59)
    expect(operationNamesFromSpec()).toEqual(expected)
    expect(Object.keys(generatedSdk).sort()).toEqual(expected)
  })

  test('keeps the existing runtime enum values', () => {
    expect(TeamVisibilityType).toEqual({ PUBLIC: 'public', PRIVATE: 'private' })
    expect(NotePublishType).toEqual({ EDIT: 'edit', VIEW: 'view', SLIDE: 'slide', BOOK: 'book' })
    expect(CommentPermissionType).toEqual({
      DISABLED: 'disabled', FORBIDDEN: 'forbidden', OWNERS: 'owners',
      SIGNED_IN_USERS: 'signed_in_users', EVERYONE: 'everyone',
    })
    expect(NotePermissionRole).toEqual({ OWNER: 'owner', SIGNED_IN: 'signed_in', GUEST: 'guest' })
  })

  test('the compatibility API covers every raw operation', () => {
    const apiMethods = new Set(Object.getOwnPropertyNames(API.prototype))
    const missing = operationNamesFromSpec().filter(name => !apiMethods.has(name))
    expect(missing).toEqual([])
  })

  test('detail GETs have only the documented 200 success response', () => {
    const paths = openApiDocument.paths as Record<string, OpenApiPath>
    for (const path of [
      '/notes/{noteId}',
      '/teams/{teampath}/notes/{noteId}',
      '/folders/{folderId}',
      '/teams/{teampath}/folders/{folderId}',
    ]) {
      const responses = paths[path]?.get?.responses ?? {}
      const successStatuses = Object.keys(responses).filter(status => /^2\d\d$/.test(status))
      expect(successStatuses).toEqual(['200'])
    }
  })

  test('note detail GETs document a bodyless 304 and ETag headers', () => {
    const paths = openApiDocument.paths as Record<string, OpenApiPath>
    for (const path of ['/notes/{noteId}', '/teams/{teampath}/notes/{noteId}']) {
      const responses = paths[path]?.get?.responses as Record<string, {
        content?: unknown
        headers?: Record<string, unknown>
      }>
      expect(responses['200'].headers).toHaveProperty('ETag')
      expect(responses['304'].headers).toHaveProperty('ETag')
      expect(responses['304']).not.toHaveProperty('content')
    }
  })

  test('supports an authenticated custom Axios client', async () => {
    let authorization: string | null = null
    server.use(
      http.get('https://api.hackmd.io/v1/me', ({ request }) => {
        authorization = request.headers.get('authorization')
        return HttpResponse.json({ id: 'user-id', name: 'Test User' })
      }),
    )
    const client = createClient({
      auth: 'test-token',
      baseURL: 'https://api.hackmd.io/v1',
    })

    const response = await getMe({ client, throwOnError: true })

    expect(authorization).toBe('Bearer test-token')
    expect(response.status).toBe(200)
    expect(response.data).toMatchObject({ id: 'user-id', name: 'Test User' })
  })
})
