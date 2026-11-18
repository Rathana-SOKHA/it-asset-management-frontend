import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router"
import PageHeader from "../../../components/ui/PageHeader"
import Icon from "../../../components/ui/Icon"
import { EmptyState, ErrorState, Field, LoadingState, Modal, StatusPill } from "../../../components/ui/WorkspaceUI"
import { useWorkspace } from "../../../hooks/useWorkspace"
import { apiDownload, apiRequest } from "../../../plugins/axios"
import { displayValue, errorFields, errorMessage, formatDate, type ApiRecord, type Paginator } from "../../../utils/ui"

type FieldConfig = {
  key: string
  label: string
  type?: string
  required?: boolean
  options?: string[]
  lookup?: string
  lookupLabel?: string
  textarea?: boolean
}

type ResourceConfig = {
  label: string
  description: string
  path: string
  columns: { key: string; label: string }[]
  fields: FieldConfig[]
  canReadRoles: string[]
  canWriteRoles: string[]
  removable?: boolean
}

const staffRoles = ["Administrator", "IT Admin", "IT Staff"]
const adminRoles = ["Administrator", "IT Admin"]
const managerRoles = ["Administrator", "IT Admin", "Department Manager"]

const resources: Record<string, ResourceConfig> = {
  employees: {
    label: "Employees", description: "Manage employee records and their team assignments.", path: "employees",
    canReadRoles: managerRoles, canWriteRoles: adminRoles,
    columns: [{ key: "employee_number", label: "Employee ID" }, { key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "department.name", label: "Department" }, { key: "status", label: "Status" }],
    fields: [
      { key: "employee_number", label: "Employee ID" }, { key: "name", label: "Full name", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "phone", label: "Phone" }, { key: "department_id", label: "Department", lookup: "departments", lookupLabel: "name" },
      { key: "position", label: "Position" }, { key: "status", label: "Status", options: ["active", "inactive", "terminated"] },
    ],
  },
  departments: {
    label: "Departments", description: "Keep departments and team ownership up to date.", path: "departments",
    canReadRoles: managerRoles, canWriteRoles: adminRoles,
    columns: [{ key: "name", label: "Department" }, { key: "manager.name", label: "Manager" }, { key: "created_at", label: "Created" }],
    fields: [{ key: "name", label: "Department name", required: true }, { key: "manager_id", label: "Manager user ID", type: "number" }],
  },
  locations: {
    label: "Locations", description: "Organize devices by office, building, floor, and room.", path: "locations",
    canReadRoles: managerRoles, canWriteRoles: adminRoles,
    columns: [{ key: "name", label: "Location" }, { key: "type", label: "Type" }, { key: "parent.name", label: "Parent location" }],
    fields: [
      { key: "name", label: "Location name", required: true },
      { key: "type", label: "Location type", required: true, options: ["office", "building", "floor", "room"] },
      { key: "parent_id", label: "Parent location", lookup: "locations", lookupLabel: "name" },
    ],
  },
  categories: {
    label: "Categories", description: "Group assets into meaningful equipment categories.", path: "categories",
    canReadRoles: managerRoles, canWriteRoles: adminRoles,
    columns: [{ key: "name", label: "Category" }, { key: "assets_count", label: "Assets" }, { key: "created_at", label: "Created" }],
    fields: [{ key: "name", label: "Category name", required: true }],
  },
  brands: {
    label: "Brands", description: "Keep the manufacturers used across your inventory consistent.", path: "brands",
    canReadRoles: managerRoles, canWriteRoles: adminRoles,
    columns: [{ key: "name", label: "Brand" }, { key: "assets_count", label: "Assets" }, { key: "created_at", label: "Created" }],
    fields: [{ key: "name", label: "Brand name", required: true }],
  },
  suppliers: {
    label: "Suppliers", description: "Track vendor relationships and contact details.", path: "suppliers",
    canReadRoles: adminRoles, canWriteRoles: adminRoles,
    columns: [{ key: "name", label: "Supplier" }, { key: "contact_person", label: "Contact" }, { key: "email", label: "Email" }, { key: "phone", label: "Phone" }, { key: "status", label: "Status" }],
    fields: [
      { key: "name", label: "Supplier name", required: true }, { key: "contact_person", label: "Contact person" },
      { key: "email", label: "Email", type: "email" }, { key: "phone", label: "Phone" },
      { key: "status", label: "Status", options: ["active", "inactive"] }, { key: "address", label: "Address", textarea: true },
    ],
  },
  purchases: {
    label: "Purchases", description: "Follow purchase orders, supplier details, and received equipment.", path: "purchases",
    canReadRoles: adminRoles, canWriteRoles: adminRoles,
    columns: [{ key: "purchase_order_number", label: "Purchase order" }, { key: "supplier.name", label: "Supplier" }, { key: "purchase_date", label: "Order date" }, { key: "total_amount", label: "Total" }, { key: "status", label: "Status" }, { key: "attachments", label: "Documents" }],
    fields: [
      { key: "purchase_order_number", label: "Purchase order number" },
      { key: "supplier_id", label: "Supplier", lookup: "suppliers", lookupLabel: "name" },
      { key: "purchase_date", label: "Purchase date", type: "date" },
      { key: "total_amount", label: "Total amount", type: "number" },
      { key: "status", label: "Status", options: ["ordered", "received", "cancelled"] },
      { key: "notes", label: "Notes", textarea: true },
    ],
  },
  warranties: {
    label: "Warranties", description: "Keep coverage dates and supplier details close to each device.", path: "warranties",
    canReadRoles: staffRoles, canWriteRoles: adminRoles,
    columns: [{ key: "asset.asset_tag", label: "Asset tag" }, { key: "asset.name", label: "Asset" }, { key: "vendor", label: "Vendor" }, { key: "start_date", label: "Starts" }, { key: "end_date", label: "Ends" }],
    fields: [
      { key: "asset_id", label: "Asset", lookup: "assets", lookupLabel: "asset_tag", required: true },
      { key: "supplier_id", label: "Supplier", lookup: "suppliers", lookupLabel: "name" },
      { key: "vendor", label: "Vendor name" },
      { key: "start_date", label: "Start date", type: "date", required: true },
      { key: "end_date", label: "End date", type: "date", required: true },
    ],
  },
  maintenances: {
    label: "Maintenance", description: "Record service work and upcoming maintenance for equipment.", path: "maintenances",
    canReadRoles: staffRoles, canWriteRoles: staffRoles, removable: true,
    columns: [{ key: "asset.asset_tag", label: "Asset tag" }, { key: "asset.name", label: "Asset" }, { key: "type", label: "Type" }, { key: "scheduled_at", label: "Scheduled" }, { key: "status", label: "Status" }, { key: "cost", label: "Cost" }],
    fields: [
      { key: "asset_id", label: "Asset", lookup: "assets", lookupLabel: "asset_tag", required: true },
      { key: "type", label: "Maintenance type", required: true, options: ["repair", "scheduled"] },
      { key: "status", label: "Status", options: ["reported", "pending", "in_progress", "completed", "cancelled"] },
      { key: "description", label: "Description", textarea: true },
      { key: "cost", label: "Cost", type: "number" },
      { key: "scheduled_at", label: "Scheduled date", type: "date" },
      { key: "completed_at", label: "Completed date", type: "date" },
      { key: "performed_by", label: "Performed by user ID", type: "number" },
    ],
  },
}

const groups = [
  { title: "People & places", paths: ["employees", "departments", "locations"] },
  { title: "Asset catalog", paths: ["categories", "brands"] },
  { title: "Procurement", paths: ["suppliers", "purchases", "warranties"] },
  { title: "Maintenance", paths: ["maintenances"] },
]

export default function Resources() {
  const { token, user } = useWorkspace()
  const { resource = "" } = useParams()
  const navigate = useNavigate()
  const config = resources[resource]
  const canWrite = Boolean(config?.canWriteRoles.some((role) => user.roles.includes(role)))
  const canDelete = config?.removable ? user.roles.some((role) => ["Administrator", "IT Admin"].includes(role)) : canWrite
  const [records, setRecords] = useState<ApiRecord[]>([])
  const [lookups, setLookups] = useState<Record<string, ApiRecord[]>>({})
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [mode, setMode] = useState<"create" | "edit" | null>(null)
  const [selected, setSelected] = useState<ApiRecord | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState("")
  const [uploadingId, setUploadingId] = useState<number | null>(null)

  const loadRecords = useCallback(async () => {
    if (!config) return
    try {
      const result = await apiRequest<Paginator<ApiRecord>>(`/${config.path}?page=${page}`, { token })
      setError("")
      setRecords(result.data)
      setLastPage(result.last_page)
      setTotal(result.total)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [config, page, token])

  useEffect(() => {
    let active = true
    if (!config) return () => { active = false }
    const lookupPaths = [...new Set(config.fields.flatMap((field) => field.lookup ? [field.lookup] : []))]
    Promise.all(lookupPaths.map(async (path) => {
      const result = await apiRequest<Paginator<ApiRecord>>(`/${path}?page=1`, { token })
      return [path, result.data] as const
    }))
      .then((results) => { if (active) setLookups(Object.fromEntries(results)) })
      .catch((requestError: unknown) => { if (active) setError(`Unable to load form options: ${errorMessage(requestError)}`) })
    return () => { active = false }
  }, [config, token])

  useEffect(() => {
    let active = true
    if (!config) return () => { active = false }
    apiRequest<Paginator<ApiRecord>>(`/${config.path}?page=${page}`, { token })
      .then((result) => {
        if (!active) return
        setError("")
        setRecords(result.data)
        setLastPage(result.last_page)
        setTotal(result.total)
      })
      .catch((requestError: unknown) => { if (active) setError(errorMessage(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [config, page, token])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term || !config) return records
    return records.filter((record) => config.columns.some((column) => displayValue(recordValue(record, column.key)).toLowerCase().includes(term)))
  }, [records, config, query])

  function recordValue(record: ApiRecord, path: string): unknown {
    return path.split(".").reduce<unknown>((current, key) => {
      if (current && typeof current === "object") return (current as Record<string, unknown>)[key]
      return undefined
    }, record)
  }

  function openCreate() {
    setSelected(null)
    setForm(Object.fromEntries((config?.fields ?? []).map((field) => [field.key, field.options?.[0] ?? ""])))
    setErrors({})
    setMode("create")
  }

  function openEdit(record: ApiRecord) {
    setSelected(record)
    setForm(Object.fromEntries((config?.fields ?? []).map((field) => {
      const value = record[field.key]
      return [field.key, value == null ? "" : field.type === "date" ? String(value).slice(0, 10) : String(value)]
    })))
    setErrors({})
    setMode("edit")
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!config) return
    setSaving(true)
    setErrors({})
    const payload: Record<string, unknown> = {}
    for (const field of config.fields) {
      const value = form[field.key] ?? ""
      if (!value) continue
      payload[field.key] = field.type === "number" || field.lookup ? Number(value) : value
    }
    try {
      await apiRequest(selected && mode === "edit" ? `/${config.path}/${selected.id}` : `/${config.path}`, {
        method: selected && mode === "edit" ? "PUT" : "POST",
        token,
        body: JSON.stringify(payload),
      })
      setMode(null)
      setNotice(`${config.label.slice(0, -1)} ${selected ? "updated" : "created"} successfully.`)
      await loadRecords()
    } catch (requestError) {
      setErrors(errorFields(requestError))
      setError(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  async function remove(record: ApiRecord) {
    if (!config || !window.confirm(`Delete this ${config.label.toLowerCase().replace(/s$/, "")} record?`)) return
    try {
      await apiRequest(`/${config.path}/${record.id}`, { method: "DELETE", token })
      setNotice("Record deleted.")
      await loadRecords()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  async function uploadPurchaseFile(purchaseId: number, file: File) {
    const body = new FormData()
    body.append("file", file)
    setUploadingId(purchaseId)
    try {
      const attachment = await apiRequest<ApiRecord>(`/purchases/${purchaseId}/attachments`, { method: "POST", token, body })
      setRecords((current) => current.map((record) => record.id === purchaseId
        ? { ...record, attachments: [...(Array.isArray(record.attachments) ? record.attachments : []), attachment] }
        : record))
      setNotice(`File uploaded to purchase #${purchaseId}.`)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setUploadingId(null)
    }
  }

  async function downloadPurchaseFile(file: ApiRecord) {
    try {
      await apiDownload(`/attachments/${file.id}/download`, token, String(file.original_name ?? "purchase-document"))
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  async function deletePurchaseFile(purchaseId: number, file: ApiRecord) {
    if (!window.confirm(`Delete "${displayValue(file.original_name)}"?`)) return
    try {
      await apiRequest(`/attachments/${file.id}`, { method: "DELETE", token })
      setRecords((current) => current.map((record) => record.id === purchaseId
        ? { ...record, attachments: (Array.isArray(record.attachments) ? record.attachments : []).filter((item) => item.id !== file.id) }
        : record))
      setNotice("Purchase document deleted.")
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  if (!config) return <div className="surface-card"><EmptyState icon="search" title="Section not found" description="Choose one of the available sections from the navigation." action={<button className="button button-secondary button-small" onClick={() => navigate("/resources/employees")}>Go to people</button>} /></div>

  const canRead = config.canReadRoles.some((role) => user.roles.includes(role))
  if (!canRead) return <div className="surface-card"><EmptyState icon="shield" title="You don’t have access to this section" description="Your account doesn’t have permission to view these records." /></div>

  return (
    <>
      <PageHeader eyebrow={getGroupTitle(resource)} title={config.label} description={config.description} action={canWrite ? <button className="button button-primary" onClick={openCreate}><Icon name="plus" size={16} /> Add {config.label.slice(0, -1).toLowerCase()}</button> : undefined} />
      <section className="resource-tabs">
        {groups.filter((group) => group.paths.some((path) => resources[path].canReadRoles.some((role) => user.roles.includes(role)))).map((group) => (
          <div className="resource-tab-group" key={group.title}><span>{group.title}</span>{group.paths.filter((path) => resources[path].canReadRoles.some((role) => user.roles.includes(role))).map((path) => <Link key={path} to={`/resources/${path}`} onClick={() => { setPage(1); setQuery("") }} className={resource === path ? "resource-tab-active" : ""}>{resources[path].label}</Link>)}</div>
        ))}
      </section>
      {notice && <div className="toast-notice"><Icon name="check" size={16} />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss"><Icon name="close" size={14} /></button></div>}
      {error && <ErrorState message={error} onRetry={() => void loadRecords()} />}
      <section className="surface-card resource-table-card">
        <div className="table-toolbar">
          <div className="table-toolbar-caption"><strong>{config.label}</strong><span>{total} total records</span></div>
          <div className="table-tools"><label className="table-search"><Icon name="search" size={16} /><input placeholder={`Search ${config.label.toLowerCase()}...`} value={query} onChange={(event) => setQuery(event.target.value)} /></label><button className="button button-secondary button-small" onClick={() => void loadRecords()}><Icon name="refresh" size={15} /> Refresh</button></div>
        </div>
        {loading ? <LoadingState label={`Loading ${config.label.toLowerCase()}...`} /> : filtered.length ? (
          <div className="table-scroll"><table className="data-table">
            <thead><tr>{config.columns.map((column) => <th key={column.key}>{column.label.toUpperCase()}</th>)}<th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{filtered.map((record) => <tr key={record.id}>
              {config.columns.map((column) => {
                const value = recordValue(record, column.key)
                if (column.key === "attachments") {
                  const files = Array.isArray(value) ? value : []
                  return <td key={column.key}>{files.length ? `${files.length} ${files.length === 1 ? "file" : "files"}` : "—"}</td>
                }
                return <td key={column.key}>{column.key === "status" ? <StatusPill value={value} /> : column.key.includes("_date") || column.key.endsWith("_at") || column.key === "created_at" ? formatDate(value) : displayValue(value)}</td>
              })}
              <td><div className="row-actions">
                {config.path === "purchases" && Array.isArray(record.attachments) && record.attachments.map((file) => <span className="purchase-file-actions" key={String(file.id)}><button className="row-action" title={`Download ${displayValue(file.original_name)}`} aria-label={`Download ${displayValue(file.original_name)}`} onClick={() => void downloadPurchaseFile(file)}><Icon name="download" size={15} /></button><button className="row-action row-action-danger" title="Delete purchase document" aria-label="Delete purchase document" onClick={() => void deletePurchaseFile(record.id, file)}><Icon name="trash" size={15} /></button></span>)}
                {config.path === "purchases" && canWrite && <label className="row-action" title="Upload purchase document"><Icon name="upload" size={15} /><input type="file" className="sr-only" accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv" disabled={uploadingId === record.id} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadPurchaseFile(record.id, file); event.currentTarget.value = "" }} /></label>}
                {canWrite && <button className="row-action" onClick={() => openEdit(record)} aria-label="Edit record"><Icon name="edit" size={15} /></button>}
                {canDelete && <button className="row-action row-action-danger" onClick={() => void remove(record)} aria-label="Delete record"><Icon name="trash" size={15} /></button>}
              </div></td>
            </tr>)}</tbody>
          </table></div>
        ) : <EmptyState icon="search" title={query ? "No matching records" : `No ${config.label.toLowerCase()} yet`} description={query ? "Try another search term." : "Create your first record to keep this part of your inventory organized."} action={canWrite && !query ? <button className="button button-primary button-small" onClick={openCreate}><Icon name="plus" size={15} /> Add record</button> : undefined} />}
        {!loading && total > 0 && <div className="table-pagination"><span>Page <strong>{page}</strong> of <strong>{lastPage}</strong></span><div><button className="icon-button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} aria-label="Previous page"><Icon name="chevron-left" size={16} /></button><button className="icon-button" disabled={page >= lastPage} onClick={() => setPage((value) => value + 1)} aria-label="Next page"><Icon name="chevron-right" size={16} /></button></div></div>}
      </section>

      {mode && <Modal title={`${mode === "create" ? "Add" : "Edit"} ${config.label.slice(0, -1).toLowerCase()}`} description={config.description} onClose={() => setMode(null)}>
        <form className="modal-form" onSubmit={submit}>
          {error && <div className="form-alert">{error}</div>}
          <div className="form-grid">
            {config.fields.map((field) => (
              <Field
                key={field.key}
                label={field.label}
                name={field.key}
                value={form[field.key] ?? ""}
                onChange={(name, value) => setForm((current) => ({ ...current, [name]: value }))}
                type={field.type ?? "text"}
                required={field.required && mode === "create"}
                error={errors[field.key]}
                rows={field.textarea ? 3 : undefined}
                options={field.lookup
                  ? (lookups[field.lookup] ?? []).map((item) => ({ value: String(item.id), label: String(item[field.lookupLabel ?? "name"] ?? item.id) }))
                  : field.options?.map((value) => ({ value, label: value.replace(/_/g, " ") }))}
                placeholder={field.lookup ? "Choose an option" : undefined}
              />
            ))}
          </div>
          <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setMode(null)}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? "Saving..." : mode === "create" ? "Create record" : "Save changes"}</button></div>
        </form>
      </Modal>}
    </>
  )
}

function getGroupTitle(resource: string): string {
  return groups.find((group) => group.paths.includes(resource))?.title ?? "MANAGEMENT"
}
