import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  input: './spec/hackmd-openapi.json',
  output: {
    path: './src/generated',
    module: { extension: '.js' },
    postProcess: [],
  },
  plugins: [
    '@hey-api/client-axios',
    '@hey-api/typescript',
    '@hey-api/sdk',
  ],
})
