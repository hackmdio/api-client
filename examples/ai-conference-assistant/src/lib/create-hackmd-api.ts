import { API } from "@hackmd/api";

/**
 * Instantiate the official HackMD Node API client (same as examples/book-mode-conference).
 */
export function createHackMDApi(accessToken: string, apiEndpoint?: string): API {
  const base = (apiEndpoint?.trim() || 'https://api.hackmd.io/v1').replace(/\/$/, '')
  return new API(accessToken.trim(), base)
}
