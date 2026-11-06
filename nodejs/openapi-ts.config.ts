import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  input: './spec/hackmd-openapi.json',
  output: {
    path: './src/generated',
    module: { extension: '.js' },
    postProcess: [{ command: 'node', args: ['scripts/generate-operation-registry.mjs'] }],
  },
  plugins: [
    { name: '@hey-api/client-axios', baseUrl: 'https://api.hackmd.io/v1' },
    '@hey-api/typescript',
    '@hey-api/sdk',
  ],
})
