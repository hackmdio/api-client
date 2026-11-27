import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { operationRegistry } from '../src/raw'

/**
 * Operations intentionally exposed only through `@hackmd/api/raw`, without a
 * hand-written `API` method in src/index.ts.
 *
 * When a spec sync adds an operation, this test fails until it is either
 * wrapped in src/index.ts or listed here.
 */
const RAW_ONLY: readonly string[] = []

function wrappedOperations (): string[] {
  const source = readFileSync(join(__dirname, '../src/index.ts'), 'utf8')
  return [...source.matchAll(/\b\w+ as generated(\w+)\b/g)].map(match => match[1])
}

describe('operation coverage', () => {
  const operations = Object.keys(operationRegistry).sort()
  const wrapped = new Set(wrappedOperations())

  test('every spec operation is wrapped by API or marked raw-only', () => {
    const uncovered = operations.filter(id => !wrapped.has(id) && !RAW_ONLY.includes(id))
    expect(uncovered).toEqual([])
  })

  test('raw-only list has no stale or wrapped entries', () => {
    expect(RAW_ONLY.filter(id => !operations.includes(id))).toEqual([])
    expect(RAW_ONLY.filter(id => wrapped.has(id))).toEqual([])
  })
})
