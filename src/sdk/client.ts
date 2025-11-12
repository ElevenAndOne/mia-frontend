export type QueryValue = string | number | boolean | null | undefined
export type QueryParams = Record<string, QueryValue | QueryValue[]>

export interface ApiClientConfig {
  baseUrl: string
  apiKey?: string
  apiKeyHeader?: string
  apiKeyPrefix?: string
  defaultHeaders?: Record<string, string>
  defaultSessionId?: string
  fetchFn?: typeof fetch
}

export interface ApiRequestOptions {
  path: string
  method?: string
  headers?: Record<string, string>
  query?: QueryParams
  body?: BodyInit | Record<string, unknown> | unknown
  sessionId?: string
  apiKey?: string
  signal?: AbortSignal
  responseType?: 'json' | 'text' | 'blob'
}

const BODY_INIT_TYPES = ['[object FormData]', '[object URLSearchParams]', '[object Blob]', '[object ArrayBuffer]', '[object Uint8Array]']

export class ApiError<T = unknown> extends Error {
  readonly status: number
  readonly data?: T
  readonly response: Response
  readonly request: ApiRequestOptions

  constructor(message: string, status: number, data: T | undefined, request: ApiRequestOptions, response: Response) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
    this.request = request
    this.response = response
  }
}

export class ApiClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch
  private apiKey?: string
  private apiKeyHeader: string
  private apiKeyPrefix: string
  private defaultSessionId?: string
  private defaultHeaders: Record<string, string>

  constructor(config: ApiClientConfig) {
    if (!config.baseUrl) {
      throw new Error('ApiClient requires a baseUrl')
    }

    this.baseUrl = config.baseUrl.replace(/\/+$/, '')
    this.apiKey = config.apiKey
    this.apiKeyHeader = config.apiKeyHeader ?? 'X-API-Key'
    this.apiKeyPrefix = config.apiKeyPrefix ?? ''
    this.defaultSessionId = config.defaultSessionId
    this.defaultHeaders = {
      Accept: 'application/json',
      ...config.defaultHeaders
    }

    const resolvedFetch = config.fetchFn ?? globalThis.fetch?.bind(globalThis)
    if (!resolvedFetch) {
      throw new Error('No fetch implementation available for ApiClient')
    }

    this.fetchImpl = resolvedFetch
  }

  setApiKey(apiKey?: string): void {
    this.apiKey = apiKey
  }

  setSessionId(sessionId?: string): void {
    this.defaultSessionId = sessionId
  }

  get sessionId(): string | undefined {
    return this.defaultSessionId
  }

  async request<T = unknown>(options: ApiRequestOptions): Promise<T> {
    const method = options.method ?? 'GET'
    const url = this.buildUrl(options.path, options.query)
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...options.headers
    }

    const sessionId = options.sessionId ?? this.defaultSessionId
    if (sessionId) {
      headers['X-Session-ID'] = sessionId
    }

    const apiKey = options.apiKey ?? this.apiKey
    if (apiKey) {
      headers[this.apiKeyHeader] = this.apiKeyPrefix
        ? `${this.apiKeyPrefix}${apiKey}`
        : apiKey
    }

    const body = this.prepareBody(options.body, headers)

    const response = await this.fetchImpl(url, {
      method,
      headers,
      body,
      signal: options.signal
    })

    if (!response.ok) {
      const errorData = await this.parseErrorBody(response)
      throw new ApiError(
        `Request failed with status ${response.status}`,
        response.status,
        errorData,
        options,
        response
      )
    }

    return this.parseResponse<T>(response, options.responseType)
  }

  get<T = unknown>(path: string, options?: Omit<ApiRequestOptions, 'path' | 'method'>): Promise<T> {
    return this.request<T>({
      ...(options || {}),
      path,
      method: 'GET'
    })
  }

  post<T = unknown>(path: string, body?: ApiRequestOptions['body'], options?: Omit<ApiRequestOptions, 'path' | 'method' | 'body'>): Promise<T> {
    return this.request<T>({
      ...(options || {}),
      path,
      method: 'POST',
      body
    })
  }

  private buildUrl(path: string, query?: QueryParams): string {
    const isAbsolute = /^https?:/i.test(path)
    const normalizedPath = isAbsolute ? path : `${this.baseUrl}/${path.replace(/^\/+/, '')}`

    if (!query) {
      return normalizedPath
    }

    const searchParams = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return
      }

      const values = Array.isArray(value) ? value : [value]
      values.forEach(entry => {
        if (entry === undefined || entry === null) {
          return
        }
        searchParams.append(key, String(entry))
      })
    })

    const queryString = searchParams.toString()
    if (!queryString) {
      return normalizedPath
    }

    const separator = normalizedPath.includes('?') ? '&' : '?'
    return `${normalizedPath}${separator}${queryString}`
  }

  private prepareBody(body: ApiRequestOptions['body'], headers: Record<string, string>): BodyInit | undefined {
    if (body === undefined || body === null) {
      return undefined
    }

    if (typeof body === 'string') {
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json'
      }
      return body
    }

    if (isBodyInit(body)) {
      return body
    }

    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }

    return JSON.stringify(body)
  }

  private async parseResponse<T>(response: Response, forcedType?: 'json' | 'text' | 'blob'): Promise<T> {
    if (response.status === 204) {
      return undefined as T
    }

    const responseType = forcedType ?? this.detectResponseType(response)

    if (responseType === 'text') {
      return (await response.text()) as unknown as T
    }

    if (responseType === 'blob') {
      return (await response.blob()) as unknown as T
    }

    if (response.headers.get('Content-Length') === '0') {
      return undefined as T
    }

    return (await response.json()) as T
  }

  private async parseErrorBody(response: Response): Promise<unknown> {
    try {
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        return await response.json()
      }
      return await response.text()
    } catch {
      return undefined
    }
  }

  private detectResponseType(response: Response): 'json' | 'text' | 'blob' {
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json') || contentType.includes('+json')) {
      return 'json'
    }
    if (contentType.startsWith('text/')) {
      return 'text'
    }
    return 'blob'
  }
}

function isBodyInit(value: unknown): value is BodyInit {
  if (!value) {
    return false
  }

  if (typeof Blob !== 'undefined' && value instanceof Blob) return true
  if (typeof FormData !== 'undefined' && value instanceof FormData) return true
  if (typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams) return true
  if (typeof ArrayBuffer !== 'undefined' && (value instanceof ArrayBuffer || ArrayBuffer.isView(value))) return true

  const tag = Object.prototype.toString.call(value)
  return BODY_INIT_TYPES.includes(tag)
}
