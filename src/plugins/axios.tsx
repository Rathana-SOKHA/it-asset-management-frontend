export class ApiError extends Error {
  status: number
  errors: Record<string, string[]> | undefined

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api"

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, body, headers, ...requestOptions } = options
  const isFormData = body instanceof FormData

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    body,
    headers: {
      Accept: "application/json",
      ...(!isFormData && body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as {
      message?: string
      errors?: Record<string, string[]>
    }
    throw new ApiError(
      error.message || `HTTP ${response.status}`,
      response.status,
      error.errors,
    )
  }

  if (response.status === 204) return null as T
  return response.json() as Promise<T>
}

export async function apiDownload(path: string, token: string, fallbackFilename: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: "text/csv,application/octet-stream",
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { message?: string }
    throw new ApiError(error.message || `HTTP ${response.status}`, response.status)
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement("a")
  const disposition = response.headers.get("Content-Disposition")
  const filename = disposition?.match(/filename="?([^";]+)"?/i)?.[1] ?? fallbackFilename
  link.href = objectUrl
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}