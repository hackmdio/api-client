import type { JestConfigWithTsJest } from "ts-jest"

/** Live API tests; run with `npm run test:e2e` (see nodejs/README.md). */
const e2eJestConfig: JestConfigWithTsJest = {
  preset: "ts-jest",
  testEnvironment: "node",
  transformIgnorePatterns: ["<rootDir>/node_modules/"],
  extensionsToTreatAsEsm: [".ts"],
  setupFiles: ["dotenv/config"],
  testMatch: ["<rootDir>/tests/e2e/**/*.spec.ts"],
  testTimeout: 60_000,
}

export default e2eJestConfig
