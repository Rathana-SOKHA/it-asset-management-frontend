export type ApiRecord = Record<string, unknown> & { id: number }

export interface Paginator<T> {
  data: T[]
  current_page: number
  last_page: number
  total: number
  per_page: number
}

export function recordValue(record: ApiRecord, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object") {
      return (value as Record<string, unknown>)[key]
    }
    return undefined
  }, record)
}

export function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (Array.isArray(value)) return value.join(", ")
  if (typeof value === "object") {
    const item = value as Record<string, unknown>
    return String(item.name ?? item.title ?? item.asset_tag ?? item.id ?? "—")
  }
  return String(value)
}

export function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function formatDate(value: unknown, options?: Intl.DateTimeFormatOptions): string {
  if (typeof value !== "string" || !value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, options ?? {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

export function formatCurrency(value: unknown): string {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return "$0"
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return "Something went wrong. Please try again."
}

export function errorFields(error: unknown): Record<string, string> {
  const errors = (error as { errors?: Record<string, string[]> } | null)?.errors
  if (!errors) return {}
  return Object.fromEntries(
    Object.entries(errors).map(([field, messages]) => [field, messages[0] ?? "Invalid value"]),
  )
}
