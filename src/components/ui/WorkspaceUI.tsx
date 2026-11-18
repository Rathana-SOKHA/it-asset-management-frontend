import type { ReactNode } from "react"
import Icon from "./Icon"
import { titleCase } from "../../utils/ui"

export function StatusPill({ value }: { value: unknown }) {
  const status = String(value ?? "unknown").toLowerCase()
  const tone = ["active", "available", "verified", "completed", "received", "good"].includes(status)
    ? "positive"
    : ["in_progress", "pending", "ordered", "fair", "reported"].includes(status)
      ? "warning"
      : ["damaged", "missing", "cancelled", "retired", "inactive", "terminated"].includes(status)
        ? "negative"
        : "neutral"
  return <span className={`status-pill status-${tone}`}><span />{titleCase(status)}</span>
}

export function LoadingState({ label = "Loading your workspace..." }: { label?: string }) {
  return <div className="loading-state"><span className="spinner" /><span>{label}</span></div>
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-state" role="alert">
      <div className="error-symbol">!</div>
      <div><strong>We couldn’t load this view</strong><p>{message}</p></div>
      {onRetry && <button className="button button-secondary button-small" onClick={onRetry}><Icon name="refresh" size={15} /> Try again</button>}
    </div>
  )
}

export function EmptyState({
  icon = "box",
  title,
  description,
  action,
}: {
  icon?: "box" | "search" | "bell" | "archive" | "file" | "activity" | "package" | "shield" | "users" | "team"
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon name={icon} size={22} /></div>
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  )
}

export function Modal({
  title,
  description,
  onClose,
  children,
  wide = false,
}: {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className={`modal-panel ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-heading">
          <div><h2 id="modal-title">{title}</h2>{description && <p>{description}</p>}</div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog"><Icon name="close" /></button>
        </div>
        {children}
      </section>
    </div>
  )
}

export function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  error,
  options,
  rows,
}: {
  label: string
  name: string
  value: string
  onChange: (name: string, value: string) => void
  type?: string
  placeholder?: string
  required?: boolean
  error?: string
  options?: { label: string; value: string }[]
  rows?: number
}) {
  return (
    <label className="form-field">
      <span>{label}{required && <b> *</b>}</span>
      {options ? (
        <select name={name} value={value} required={required} onChange={(event) => onChange(name, event.target.value)}>
          <option value="">{placeholder ?? "Select an option"}</option>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      ) : rows ? (
        <textarea name={name} value={value} rows={rows} placeholder={placeholder} required={required} onChange={(event) => onChange(name, event.target.value)} />
      ) : (
        <input name={name} type={type} value={value} placeholder={placeholder} required={required} onChange={(event) => onChange(name, event.target.value)} />
      )}
      {error && <small className="field-error">{error}</small>}
    </label>
  )
}

export function InlineNotice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "success" | "danger" }) {
  return <div className={`inline-notice notice-${tone}`} role={tone === "danger" ? "alert" : "status"}>{children}</div>
}
