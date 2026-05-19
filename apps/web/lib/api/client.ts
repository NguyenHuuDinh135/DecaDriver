export const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

class ApiClientError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.name = "ApiClientError"
    this.status = status
    this.detail = detail
  }
}

type TokenGetter = () => string | null
type LogoutFn = () => void

let getToken: TokenGetter = () => null
let logout: LogoutFn = () => {}

export function configureAuth(config: {
  getToken: TokenGetter
  logout: LogoutFn
}) {
  getToken = config.getToken
  logout = config.logout
}

async function request<T>(
  method: string,
  path: string,
  options?: {
    body?: unknown
    formData?: FormData
    headers?: Record<string, string>
  }
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...options?.headers,
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  if (options?.body && !options?.formData) {
    headers["Content-Type"] = "application/json"
  }

  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`

  const response = await fetch(url, {
    method,
    headers,
    body: options?.formData
      ? options.formData
      : options?.body
        ? JSON.stringify(options.body)
        : undefined,
  })

  if (response.status === 401) {
    logout()
    throw new ApiClientError(401, "Unauthorized")
  }

  if (!response.ok) {
    let detail = "Request failed"
    try {
      const errorBody = await response.json()
      detail = errorBody.detail || JSON.stringify(errorBody)
    } catch {
      detail = response.statusText
    }
    throw new ApiClientError(response.status, detail)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export const api = {
  get<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return request<T>("GET", path, { headers })
  },

  post<T>(
    path: string,
    body?: unknown,
    options?: { headers?: Record<string, string>; formData?: FormData }
  ): Promise<T> {
    return request<T>("POST", path, {
      body: options?.formData ? undefined : body,
      formData: options?.formData,
      headers: options?.headers,
    })
  },

  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>("PUT", path, { body })
  },

  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>("PATCH", path, { body })
  },

  delete<T>(path: string): Promise<T> {
    return request<T>("DELETE", path)
  },
}

export { ApiClientError }
