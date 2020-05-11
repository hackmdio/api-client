import cheerio from 'cheerio'
import * as fs from 'fs-extra'
import {homedir} from 'os'
import * as path from 'path'
import nodeFetch from 'node-fetch'
import tough = require('tough-cookie')
import FileCookieStore from 'tough-cookie-filestore'
import * as url from 'url'

import { defaults } from './utils'

let version = ''
try {
  version = require('../package.json').version
} catch (err) {}

const defaultCookiePath = path.join(homedir(), '.hackmd', 'cookies.json')

const defaultConfig = {
  cookiePath: defaultCookiePath,
  serverUrl: 'https://hackmd.io',
  enterprise: true
}

interface APIOptions {
  serverUrl: string
  cookiePath: string,
  enterprise: boolean
}

type nodeFetchType = (url: RequestInfo, init?: RequestInit | undefined) => Promise<Response>

function encodeFormComponent(form: object) {
  return Object.entries(form).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')
}

export enum ExportType {
  PDF,
  SLIDE,
  MD,
  HTML
}

export type HistoryItem = {
  id: string
  text: string
  time: number | string
  tags: string[]
}

/**
 * codimd API Client
 */
class API {
  public readonly serverUrl: string
  public readonly enterprise: boolean
  private readonly _fetch: nodeFetchType

  constructor(config: Partial<APIOptions> = {}) {
    const {serverUrl, cookiePath, enterprise} = defaults(config, defaultConfig)

    fs.ensureFileSync(cookiePath)

    const jar = new FileCookieStore(cookiePath)
    const fetch: nodeFetchType = require('fetch-cookie')(nodeFetch, new tough.CookieJar(jar as any))

    this._fetch = fetch
    this.serverUrl = serverUrl
    this.enterprise = enterprise
  }

  async login(email: string, password: string) {
    const response = await this.fetch(`${this.serverUrl}/login`, {
      method: 'post',
      body: encodeFormComponent({email, password}),
      headers: await this.wrapHeaders({
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      })
    })

    return response.status === 200
  }

  async loginLdap(username: string, password: string) {
    const response = await this.fetch(`${this.serverUrl}/auth/ldap`, {
      method: 'post',
      body: encodeFormComponent({username, password}),
      headers: await this.wrapHeaders({
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      })
    })
    return response.status === 200
  }

  async logout() {
    const response = await this.fetch(`${this.serverUrl}/logout`, {
      method: this.enterprise ? 'POST' : 'GET',
      headers: await this.wrapHeaders({
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      })
    })
    return response.status === 200
  }

  async isLogin() {
    try {
      const data = await this.getMe()
      return data.status === 'ok'
    } catch (err) {
      return false
    }
  }

  async getMe() {
    const response = await this.fetch(`${this.serverUrl}/me`, this.defaultFetchOptions)
    return response.json()
  }

  async getHistory(): Promise<{ history: HistoryItem[] }> {
    const response = await this.fetch(`${this.serverUrl}/history`, this.defaultFetchOptions)
    return response.json()
  }

  async newNote(body: string) {
    let response
    if (this.enterprise) {
      response = await this.fetch(`${this.serverUrl}/new`, {
        method: 'POST',
        body: encodeFormComponent({content: body}),
        headers: await this.wrapHeaders({
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        })
      })
    } else {
      const contentType = 'text/markdown;charset=UTF-8'
      response = await this.fetch(`${this.serverUrl}/new`, {
        method: 'POST',
        body,
        headers:  await this.wrapHeaders({
          'Content-Type': contentType
        })
      })
    }

    if (response.status === 200) {
      return response.url
    } else {
      throw new Error('Create note failed')
    }
  }

  private async exportRes(noteId: string, type: ExportType) {
    let res: Response
    switch (type) {
    case ExportType.PDF:
      res = await this.fetch(`${this.serverUrl}/${noteId}/pdf`, this.defaultFetchOptions)
      break
    case ExportType.HTML:
      res = await this.fetch(`${this.serverUrl}/s/${noteId}`, this.defaultFetchOptions)
      break
    case ExportType.SLIDE:
      res = await this.fetch(`${this.serverUrl}/${noteId}/slide`, this.defaultFetchOptions)
      break
    case ExportType.MD:
    default:
      res = await this.fetch(`${this.serverUrl}/${noteId}/download`, this.defaultFetchOptions)
    }

    return res
  }

  async exportString(noteId: string, type: ExportType) {
    const res = await this.exportRes(noteId, type)

    return res.text()
  }

  async exportStream (noteId: string, type: ExportType) {
    const res = await this.exportRes(noteId, type)

    return res.body
  }

  async getTeams () {
    let data
    try {
      data = await this.getMe()
    } catch (err) {
      return []
    }
  
    return data.teams || []
  }

  get fetch() {
    return this._fetch
  }

  get domain() {
    return url.parse(this.serverUrl).host
  }

  get defaultFetchOptions () {
    return {
      headers: {
        'User-Agent': `HackMD API Client ${version} Node.js`
      }
    }
  }

  private async wrapHeaders(headers: any) {
    if (this.enterprise) {
      const csrf = await this.loadCSRFToken()
      return {
        ...headers,
        'User-Agent': `HackMD API Client ${version} Node.js`,
        'X-XSRF-Token': csrf
      }
    } else {
      return {
        ...headers,
        'User-Agent': `HackMD API Client ${version} Node.js`
      }
    }
  }

  private async loadCSRFToken() {
    const html = await this.fetch(`${this.serverUrl}`).then(r => r.text())
    const $ = cheerio.load(html)

    return $('meta[name="csrf-token"]').attr('content') || ''
  }
}

export default API
