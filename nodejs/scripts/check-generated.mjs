import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = fileURLToPath(new URL('../', import.meta.url))
const generatedRoot = fileURLToPath(new URL('../src/generated/', import.meta.url))

async function filesIn (directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await filesIn(path))
    else files.push(path)
  }
  return files.sort()
}

async function manifest () {
  const result = new Map()
  for (const path of await filesIn(generatedRoot)) {
    const content = await readFile(path)
    result.set(
      relative(generatedRoot, path),
      createHash('sha256').update(content).digest('hex'),
    )
  }
  return result
}

const before = await manifest()
const generation = spawnSync('pnpm', ['run', 'generate'], {
  cwd: packageRoot,
  stdio: 'inherit',
})
if (generation.error) throw generation.error
if (generation.status !== 0) process.exit(generation.status ?? 1)

const after = await manifest()
const changed = [...new Set([...before.keys(), ...after.keys()])]
  .filter(path => before.get(path) !== after.get(path))

if (changed.length > 0) {
  console.error(`Generated files changed: ${changed.join(', ')}`)
  process.exitCode = 1
} else {
  console.log('Generated files match the vendored OpenAPI spec.')
}
