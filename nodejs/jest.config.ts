import type { JestConfigWithTsJest } from "ts-jest"

const customJestConfig: JestConfigWithTsJest = {
  preset: "ts-jest",
  testEnvironment: "node",
  transformIgnorePatterns: ["<rootDir>/node_modules/"],
  extensionsToTreatAsEsm: [".ts"],
  setupFiles: ["dotenv/config"],
}

export default customJestConfig
