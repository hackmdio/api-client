import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'

export default [
  // ESM build
  {
    input: {
      index: 'src/index.ts',
      raw: 'src/raw.ts',
    },
    output: {
      dir: 'dist',
      entryFileNames: '[name].js',
      format: 'esm',
      sourcemap: true,
    },
    plugins: [
      resolve({
        extensions: ['.ts', '.js']
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.build.json',
        declaration: true,
        declarationDir: './dist',
        rootDir: './src'
      })
    ],
    external: ['axios']
  },
  // CJS build
  {
    input: {
      index: 'src/index.ts',
      raw: 'src/raw.ts',
    },
    output: {
      dir: 'dist',
      entryFileNames: '[name].cjs',
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    plugins: [
      resolve({
        extensions: ['.ts', '.js']
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.build.json',
        declaration: false // Only generate declarations once
      })
    ],
    external: ['axios']
  }
]
