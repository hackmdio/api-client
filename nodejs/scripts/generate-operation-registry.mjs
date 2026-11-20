import { readFile, writeFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const spec = JSON.parse(await readFile(new URL('spec/hackmd-openapi.json', root), 'utf8'))
const raw = await readFile(new URL('src/generated/sdk.gen.ts', root), 'utf8')
const rawFunctions = new Set([...raw.matchAll(/^export const (\w+)\s*=/gm)].map(match => match[1]))
const methods = new Set(['get', 'post', 'put', 'patch', 'delete'])
const operations = []
const ids = new Set()

function resolve (value) {
  if (!value?.$ref) return value
  const prefix = '#/'
  if (!value.$ref.startsWith(prefix)) throw new Error(`Unsupported reference: ${value.$ref}`)
  return value.$ref.slice(prefix.length).split('/').reduce((object, key) => object?.[key.replace(/~1/g, '/').replace(/~0/g, '~')], spec)
}

function parameter (value) {
  const entry = resolve(value)
  const schema = resolve(entry.schema)
  return {
    name: entry.name,
    in: entry.in,
    required: entry.required === true || entry.in === 'path',
    type: schema?.type ?? (schema?.enum ? 'string' : 'unknown'),
    ...(schema?.enum ? { enum: schema.enum } : {}),
    ...(entry.description ? { description: entry.description } : {}),
  }
}

for (const [path, item] of Object.entries(spec.paths)) {
  for (const [method, operation] of Object.entries(item)) {
    if (!methods.has(method)) continue
    const id = operation.operationId
    if (!id || ids.has(id)) throw new Error(`Missing or duplicate operationId: ${id} (${method} ${path})`)
    ids.add(id)
    const functionName = id[0].toLowerCase() + id.slice(1)
    if (!rawFunctions.has(functionName)) throw new Error(`No generated raw function for ${id}: ${functionName}`)
    const parameters = [...(item.parameters ?? []), ...(operation.parameters ?? [])].map(parameter)
    const body = resolve(operation.requestBody)
    const bodyContent = body?.content ?? {}
    const requestBody = body ? {
      required: body.required === true,
      contentTypes: Object.keys(bodyContent),
      binaryFields: Object.values(bodyContent).flatMap(media => {
        const schema = resolve(media.schema)
        return Object.entries(schema?.properties ?? {})
          .filter(([, field]) => { const resolved = resolve(field); return resolved?.type === 'string' && resolved?.format === 'binary' })
          .map(([name]) => ({ name, required: schema.required?.includes(name) === true }))
      }),
    } : undefined
    const responses = Object.fromEntries(Object.entries(operation.responses ?? {}).map(([status, response]) => [
      status,
      Object.keys(resolve(response)?.content ?? {}),
    ]))
    operations.push({ id, functionName, metadata: {
      method: method.toUpperCase(),
      path,
      description: operation.description ?? operation.summary ?? '',
      parameters,
      ...(requestBody ? { requestBody } : {}),
      responses,
    } })
  }
}

operations.sort((a, b) => a.id.localeCompare(b.id))
const lines = [
  '// Generated from spec/hackmd-openapi.json. Do not edit by hand.',
  "import * as sdk from './sdk.gen.js'",
  '',
  'export const operationRegistry = {',
  ...operations.map(({ id, functionName, metadata }) =>
    `  ${JSON.stringify(id)}: { ...${JSON.stringify(metadata)}, call: sdk.${functionName} },`),
  '} as const',
  '',
  'export type OperationId = keyof typeof operationRegistry',
  '',
]
await writeFile(new URL('src/generated/operationRegistry.gen.ts', root), lines.join('\n'))
