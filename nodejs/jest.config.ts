import type { JestConfigWithTsJest } from "ts-jest"

const customJestConfig: JestConfigWithTsJest = {
  preset: "ts-jest",
  testEnvironment: "node",
  transformIgnorePatterns: ["<rootDir>/node_modules/"],
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  setupFiles: ["dotenv/config"],
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/tests/e2e/"],
}

export default customJestConfig
