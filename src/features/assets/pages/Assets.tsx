import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { useSearchParams } from "react-router"
import PageHeader from "../../../components/ui/PageHeader"
import Icon from "../../../components/ui/Icon"
import { EmptyState, ErrorState, Field, LoadingState, Modal, StatusPill } from "../../../components/ui/WorkspaceUI"
import { useWorkspace } from "../../../hooks/useWorkspace"
import { apiDownload, apiRequest } from "../../../plugins/axios"
import { displayValue, errorFields, errorMessage, formatCurrency, formatDate, type ApiRecord, type Paginator } from "../../../utils/ui"

interface AssetRecord extends ApiRecord {
  asset_tag: string
  name: string
  status: string
  category_id: number
  category?: { name: string }
  location?: { name: string }
  brand?: { name: string } | string
  current_assignment?: { employee?: { name: string }; department?: { name: string }; assigned_at?: string }
  assignments?: AssignmentRecord[]
  maintenances?: ApiRecord[]
  attachments?: ApiRecord[]
  serial_no?: string
  model?: string
  purchase_cost?: number | string
  purchase_date?: string
}

interface AssignmentRecord extends ApiRecord {
  returned_at?: string | null
  assigned_at?: string
  employee?: { name: string }
  department?: { name: string }
}

interface Lookups {
  categories: ApiRecord[]
  locations: ApiRecord[]
  brands: ApiRecord[]
  suppliers: ApiRecord[]
  purchases: ApiRecord[]
  employees: ApiRecord[]
  departments: ApiRecord[]
}

type ModalMode = "create" | "edit" | "detail" | "assign" | "return" | null

const blankAsset = {
  asset_tag: "", name: "", category_id: "", brand_id: "", brand: "", supplier_id: "",
  purchase_id: "", model: "", serial_no: "", status: "active", location_id: "",
  purchase_date: "", purchase_cost: "",
}

const statuses = ["active", "damaged", "in_repair", "retired"]

export default function Assets() {
  const { token, user } = useWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get("search") ?? ""
  const [records, setRecords] = useState<AssetRecord[]>([])
  const [lookups, setLookups] = useState<Lookups>({ categories: [], locations: [], brands: [], suppliers: [], purchases: [], employees: [], departments: [] })
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [locationFilter, setLocationFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [mode, setMode] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<AssetRecord | null>(null)
  const [form, setForm] = useState<Record<string, string>>(blankAsset)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState("")

  const canEdit = user.roles.some((role) => ["Administrator", "IT Admin", "IT Staff"].includes(role))
  const canAssign = user.roles.some((role) => ["Administrator", "IT Admin"].includes(role))
  const canDelete = user.roles.includes("Administrator") || user.roles.includes("IT Admin")
  const activeAssignment = selected?.current_assignment ?? selected?.assignments?.find((assignment) => !assignment.returned_at)

  const loadAssets = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page) })
    if (search.trim()) params.set("search", search.trim())
    if (statusFilter) params.set("status", statusFilter)
    if (categoryFilter) params.set("category_id", categoryFilter)
    if (locationFilter) params.set("location_id", locationFilter)
    try {
      const result = await apiRequest<Paginator<AssetRecord>>(`/assets?${params}`, { token })
      setError("")
      setRecords(result.data)
      setLastPage(result.last_page)
      setTotal(result.total)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, locationFilter, page, search, statusFilter, token])

  useEffect(() => {
    let active = true
    const requests: Array<[keyof Lookups, string]> = [
      ["categories", "/categories?page=1"],
      ["locations", "/locations?page=1"],
      ["brands", "/brands?page=1"],
      ["employees", "/employees?page=1"],
      ["departments", "/departments?page=1"],
    ]
    if (user.roles.some((role) => ["Administrator", "IT Admin"].includes(role))) {
      requests.push(["suppliers", "/suppliers?page=1"], ["purchases", "/purchases?page=1"])
    }
    Promise.all(requests.map(async ([key, path]) => {
        const response = await apiRequest<Paginator<ApiRecord> | ApiRecord[]>(path, { token })
        return [key, Array.isArray(response) ? response : response.data] as const
      }))
      .then((results) => { if (active) setLookups((current) => ({ ...current, ...Object.fromEntries(results) })) })
      .catch((requestError: unknown) => { if (active) setError(`Unable to load asset form options: ${errorMessage(requestError)}`) })
    return () => { active = false }
  }, [token, user.roles])

  useEffect(() => {
    let active = true
    const params = new URLSearchParams({ page: String(page) })
    if (search.trim()) params.set("search", search.trim())
    if (statusFilter) params.set("status", statusFilter)
    if (categoryFilter) params.set("category_id", categoryFilter)
    if (locationFilter) params.set("location_id", locationFilter)
    apiRequest<Paginator<AssetRecord>>(`/assets?${params}`, { token })
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
  }, [categoryFilter, locationFilter, page, search, statusFilter, token])

  const statCounts = useMemo(() => ({
    active: records.filter((asset) => asset.status === "active").length,
    assigned: records.filter((asset) => Boolean(asset.current_assignment)).length,
    attention: records.filter((asset) => ["damaged", "in_repair"].includes(asset.status)).length,
  }), [records])

  function openCreate() {
    setSelected(null)
    setForm(blankAsset)
    setErrors({})
    setNotice("")
    setMode("create")
  }

  function openEdit(asset: AssetRecord) {
    setSelected(asset)
    setForm({
      ...blankAsset,
      ...Object.fromEntries(Object.keys(blankAsset).map((field) => [field, String(asset[field] ?? "")])),
      category_id: String(asset.category_id ?? ""),
      location_id: String(asset.location_id ?? ""),
      purchase_cost: String(asset.purchase_cost ?? ""),
      purchase_date: String(asset.purchase_date ?? "").slice(0, 10),
    })
    setErrors({})
    setMode("edit")
  }

  async function submitAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrors({})
    const payload: Record<string, unknown> = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ""))
    for (const key of ["category_id", "brand_id", "supplier_id", "purchase_id", "location_id", "purchase_cost"]) {
      if (payload[key]) payload[key] = Number(payload[key])
    }
    try {
      const updated = await apiRequest<AssetRecord>(selected && mode === "edit" ? `/assets/${selected.id}` : "/assets", {
        method: selected && mode === "edit" ? "PUT" : "POST",
        token,
        body: JSON.stringify(payload),
      })
      setMode(null)
      setNotice(selected ? "Asset details updated." : "Asset added to your inventory.")
      if (selected) setSelected(updated)
      await loadAssets()
    } catch (requestError) {
      setErrors(errorFields(requestError))
      setError(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  async function openDetail(asset: AssetRecord) {
    setSelected(asset)
    setMode("detail")
    setNotice("")
    try {
      const detail = await apiRequest<AssetRecord>(`/assets/${asset.id}`, { token })
      setSelected(detail)
    } catch (requestError) {
      setNotice(errorMessage(requestError))
    }
  }

  async function submitAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return
    setSaving(true)
    setErrors({})
    const payload: Record<string, unknown> = {
      notes: form.notes || undefined,
      expected_return_at: form.expected_return_at || undefined,
      handover_confirmed: form.handover_confirmed === "true",
    }
    if (form.employee_id) payload.employee_id = Number(form.employee_id)
    if (form.department_id) payload.department_id = Number(form.department_id)
    try {
      await apiRequest(`/assets/${selected.id}/assign`, { method: "POST", token, body: JSON.stringify(payload) })
      setMode(null)
      setNotice("Asset assignment saved.")
      await loadAssets()
    } catch (requestError) {
      setErrors(errorFields(requestError))
    } finally {
      setSaving(false)
    }
  }

  async function submitReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return
    setSaving(true)
    setErrors({})
    try {
      await apiRequest(`/assets/${selected.id}/return`, {
        method: "POST",
        token,
        body: JSON.stringify({ condition: form.condition || undefined, notes: form.notes || undefined }),
      })
      setMode(null)
      setNotice("Asset returned to inventory.")
      await loadAssets()
    } catch (requestError) {
      setErrors(errorFields(requestError))
      setError(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  async function deleteAsset(asset: AssetRecord) {
    if (!window.confirm(`Delete ${asset.asset_tag} — ${asset.name}? This cannot be undone.`)) return
    setError("")
    try {
      await apiRequest(`/assets/${asset.id}`, { method: "DELETE", token })
      setSelected(null)
      setMode(null)
      setNotice("Asset deleted.")
      await loadAssets()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  async function uploadAttachment(file: File) {
    if (!selected) return
    setSaving(true)
    setNotice("")
    const body = new FormData()
    body.append("file", file)
    try {
      const uploaded = await apiRequest<ApiRecord>(`/assets/${selected.id}/attachments`, { method: "POST", token, body })
      setSelected((current) => current ? { ...current, attachments: [...(current.attachments ?? []), uploaded] } : current)
      setNotice("File uploaded successfully.")
    } catch (requestError) {
      setNotice(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  async function deleteAttachment(file: ApiRecord) {
    if (!selected || !window.confirm(`Delete "${displayValue(file.original_name)}"?`)) return
    try {
      await apiRequest(`/attachments/${file.id}`, { method: "DELETE", token })
      setSelected((current) => current
        ? { ...current, attachments: current.attachments?.filter((attachment) => attachment.id !== file.id) }
        : current)
      setNotice("Document deleted.")
    } catch (requestError) {
      setNotice(errorMessage(requestError))
    }
  }

  async function downloadAttachment(file: ApiRecord) {
    try {
      await apiDownload(`/attachments/${file.id}/download`, token, String(file.original_name ?? "asset-document"))
    } catch (requestError) {
      setNotice(errorMessage(requestError))
    }
  }

  function setField(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  const lookupOptions = (items: ApiRecord[]) => items.map((item) => ({
    value: String(item.id),
    label: String(item.name ?? item.title ?? item.purchase_order_number ?? item.id),
  }))

  return (
    <>
      <PageHeader
        eyebrow="EQUIPMENT & DEVICES"
        title="Asset inventory"
        description="A clear view of every device, where it is, and who it supports."
        action={canEdit ? <button className="button button-primary" onClick={openCreate}><Icon name="plus" size={16} /> Add asset</button> : undefined}
      />
      {notice && <div className="toast-notice"><Icon name="check" size={16} />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss"><Icon name="close" size={14} /></button></div>}
      {error && <ErrorState message={error} onRetry={() => void loadAssets()} />}
      <section className="asset-summary">
        <div className="asset-summary-main"><span className="summary-icon summary-indigo"><Icon name="box" size={18} /></span><span><small>Assets in inventory</small><strong>{total.toLocaleString()}</strong></span></div>
        <div className="asset-summary-stat"><span className="legend-dot green" />Active on this page <b>{statCounts.active}</b></div>
        <div className="asset-summary-stat"><span className="legend-dot violet" />Assigned <b>{statCounts.assigned}</b></div>
        <div className="asset-summary-stat"><span className="legend-dot orange" />Needs attention <b>{statCounts.attention}</b></div>
      </section>

      <section className="surface-card asset-table-card">
        <div className="table-toolbar">
          <div className="table-tabs"><button className={!statusFilter ? "table-tab tab-active" : "table-tab"} onClick={() => { setStatusFilter(""); setPage(1) }}>All assets</button><button className={statusFilter === "active" ? "table-tab tab-active" : "table-tab"} onClick={() => { setStatusFilter("active"); setPage(1) }}>Active</button><button className={statusFilter === "in_repair" ? "table-tab tab-active" : "table-tab"} onClick={() => { setStatusFilter("in_repair"); setPage(1) }}>In repair</button><button className={statusFilter === "damaged" ? "table-tab tab-active" : "table-tab"} onClick={() => { setStatusFilter("damaged"); setPage(1) }}>Damaged</button></div>
          <div className="table-tools">
            <label className="table-search"><Icon name="search" size={16} /><input placeholder="Search by name, tag, serial..." value={search} onChange={(event) => { const value = event.target.value; setSearchParams((current) => { const next = new URLSearchParams(current); if (value) next.set("search", value); else next.delete("search"); return next }, { replace: true }); setPage(1); setLoading(true) }} /></label>
            <select className="filter-select" aria-label="Filter by category" value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(1); setLoading(true) }}><option value="">All categories</option>{lookupOptions(lookups.categories).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            <select className="filter-select" aria-label="Filter by location" value={locationFilter} onChange={(event) => { setLocationFilter(event.target.value); setPage(1); setLoading(true) }}><option value="">All locations</option>{lookupOptions(lookups.locations).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            <button className="button button-secondary button-small" onClick={() => { setLoading(true); void loadAssets() }}><Icon name="refresh" size={15} /> Refresh</button>
          </div>
        </div>
        {loading ? <LoadingState label="Loading inventory..." /> : records.length === 0 ? (
          <EmptyState icon="search" title="No assets found" description={search ? "Try a different search or clear the selected filters." : "Add your first asset to start building an accurate inventory."} action={canEdit && !search ? <button className="button button-primary button-small" onClick={openCreate}><Icon name="plus" size={15} /> Add your first asset</button> : undefined} />
        ) : (
          <div className="table-scroll"><table className="data-table asset-table">
            <thead><tr><th>ASSET</th><th>TAG / SERIAL</th><th>CATEGORY</th><th>LOCATION</th><th>ASSIGNED TO</th><th>STATUS</th><th>VALUE</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{records.map((asset) => {
              const assignedTo = asset.current_assignment?.employee?.name ?? asset.current_assignment?.department?.name ?? "Unassigned"
              return <tr key={asset.id} onClick={() => void openDetail(asset)} className="clickable-row">
                <td><div className="asset-cell"><span className="asset-mini-icon"><Icon name="laptop" size={17} /></span><span><strong>{asset.name}</strong><small>{asset.model || "Equipment"}</small></span></div></td>
                <td><strong className="mono-text">{asset.asset_tag}</strong><small className="table-subtext">{asset.serial_no || "No serial number"}</small></td>
                <td>{displayValue(asset.category?.name)}</td>
                <td>{displayValue(asset.location?.name)}</td>
                <td><span className="assigned-person">{assignedTo}</span></td>
                <td><StatusPill value={asset.status} /></td>
                <td>{formatCurrency(asset.purchase_cost)}</td>
                <td><button className="row-action" aria-label={`View ${asset.name}`} onClick={(event) => { event.stopPropagation(); void openDetail(asset) }}><Icon name="chevron-right" size={16} /></button></td>
              </tr>
            })}</tbody>
          </table></div>
        )}
        {!loading && total > 0 && <div className="table-pagination"><span>Showing <strong>{(page - 1) * 20 + 1}–{Math.min(page * 20, total)}</strong> of <strong>{total}</strong> assets</span><div><button className="icon-button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} aria-label="Previous page"><Icon name="chevron-left" size={16} /></button><span className="page-number">{page} <span>of</span> {lastPage}</span><button className="icon-button" disabled={page >= lastPage} onClick={() => setPage((value) => value + 1)} aria-label="Next page"><Icon name="chevron-right" size={16} /></button></div></div>}
      </section>

      {(mode === "create" || mode === "edit") && (
        <Modal title={mode === "create" ? "Add a new asset" : "Edit asset"} description="Add the details your team needs to keep this item accounted for." onClose={() => setMode(null)} wide>
          <form className="modal-form" onSubmit={submitAsset}>
            {error && <div className="form-alert">{error}</div>}
            <div className="form-section-label">IDENTIFICATION</div>
            <div className="form-grid">
              <Field label="Asset name" name="name" value={form.name} onChange={setField} required error={errors.name} placeholder="e.g. MacBook Pro 14-inch" />
              <Field label="Asset tag" name="asset_tag" value={form.asset_tag} onChange={setField} required error={errors.asset_tag} placeholder="e.g. IT-2026-001" />
              <Field label="Category" name="category_id" value={form.category_id} onChange={setField} required error={errors.category_id} options={lookupOptions(lookups.categories)} />
              <Field label="Model" name="model" value={form.model} onChange={setField} placeholder="e.g. MacBook Pro" />
              <Field label="Brand" name="brand_id" value={form.brand_id} onChange={(name, value) => { setField(name, value); setField("brand", "") }} options={lookupOptions(lookups.brands)} placeholder="Choose a brand" />
              <Field label="Serial number" name="serial_no" value={form.serial_no} onChange={setField} placeholder="Enter serial number" />
              <Field label="Status" name="status" value={form.status} onChange={setField} options={statuses.map((status) => ({ value: status, label: status.replace("_", " ") }))} />
              <Field label="Location" name="location_id" value={form.location_id} onChange={setField} options={lookupOptions(lookups.locations)} placeholder="Choose a location" />
            </div>
            <div className="form-section-label">PURCHASE DETAILS</div>
            <div className="form-grid">
              {user.roles.some((role) => ["Administrator", "IT Admin"].includes(role)) && <>
                <Field label="Supplier" name="supplier_id" value={form.supplier_id} onChange={setField} options={lookupOptions(lookups.suppliers)} placeholder="Select supplier" />
                <Field label="Purchase order" name="purchase_id" value={form.purchase_id} onChange={setField} options={lookupOptions(lookups.purchases)} placeholder="Select purchase order" />
              </>}
              <Field label="Purchase date" name="purchase_date" value={form.purchase_date} onChange={setField} type="date" />
              <Field label="Purchase cost" name="purchase_cost" value={form.purchase_cost} onChange={setField} type="number" placeholder="0.00" />
            </div>
            <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setMode(null)}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? "Saving..." : mode === "create" ? "Add asset" : "Save changes"}</button></div>
          </form>
        </Modal>
      )}

      {mode === "detail" && selected && (
        <Modal title={selected.name} description={`${selected.asset_tag} · ${displayValue(selected.category?.name)}`} onClose={() => { setMode(null); void loadAssets() }} wide>
          <div className="asset-detail">
            {notice && <div className="form-alert">{notice}</div>}
            <div className="detail-hero"><span className="detail-device-icon"><Icon name="laptop" size={29} /></span><div><StatusPill value={selected.status} /><h3>{selected.name}</h3><p>{selected.model || "Model not specified"} · {selected.serial_no || "No serial number"}</p></div><div className="detail-price">{formatCurrency(selected.purchase_cost)}<small>Purchase value</small></div></div>
            <div className="detail-grid">
              <Detail label="Asset tag" value={selected.asset_tag} />
              <Detail label="Category" value={selected.category?.name} />
              <Detail label="Brand" value={typeof selected.brand === "string" ? selected.brand : selected.brand?.name} />
              <Detail label="Location" value={selected.location?.name} />
              <Detail label="Purchase date" value={formatDate(selected.purchase_date)} />
              <Detail label="Warranty ends" value={formatDate((selected.warranty as ApiRecord | undefined)?.end_date)} />
              <Detail label="Current assignment" value={activeAssignment?.employee?.name ?? activeAssignment?.department?.name ?? "Available"} />
              <Detail label="Supplier" value={(selected.supplier as ApiRecord | undefined)?.name} />
            </div>
            <div className="detail-section"><div className="detail-section-heading"><div><strong>Assignment history</strong><small>Recent handovers and returns</small></div></div>
              {selected.assignments?.length ? <div className="history-list">{selected.assignments.slice(0, 5).map((assignment) => <div className="history-row" key={assignment.id}><span className="timeline-dot" /><span><strong>{displayValue(assignment.employee ?? assignment.department)}</strong><small>{formatDate(assignment.assigned_at)}{assignment.returned_at ? ` · returned ${formatDate(assignment.returned_at)}` : " · currently assigned"}</small></span></div>)}</div> : <p className="detail-empty">No assignment history yet.</p>}
            </div>
            <div className="detail-section"><div className="detail-section-heading"><div><strong>Documents</strong><small>Invoices, receipts, and supporting files</small></div>{canEdit && <label className="button button-secondary button-small"><Icon name="upload" size={14} /> Upload file<input type="file" className="sr-only" accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv" disabled={saving} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAttachment(file); event.currentTarget.value = "" }} /></label>}</div>
              {selected.attachments?.length ? <div className="attachment-list">{selected.attachments.map((file) => <div className="attachment-row" key={String(file.id)}><Icon name="file" size={17} /><span><strong>{displayValue(file.original_name)}</strong><small>{formatDate(file.created_at)}</small></span><span className="attachment-meta">{file.size ? `${Math.round(Number(file.size) / 1024)} KB` : ""}</span><button className="button button-secondary button-small" onClick={() => void downloadAttachment(file)}>Download</button>{canDelete && <button className="row-action row-action-danger" aria-label="Delete attachment" onClick={() => void deleteAttachment(file)}><Icon name="trash" size={14} /></button>}</div>)}</div> : <p className="detail-empty">{notice || "No documents have been added to this asset yet."}</p>}
            </div>
            <div className="modal-actions detail-actions">
              {canDelete && <button className="button button-danger-ghost" onClick={() => void deleteAsset(selected)}><Icon name="trash" size={15} /> Delete</button>}
              <span className="action-spacer" />
              {activeAssignment && canEdit && <button className="button button-secondary" onClick={() => { setForm({ condition: "", notes: "" }); setErrors({}); setMode("return") }}>Return asset</button>}
              {canAssign && <button className="button button-secondary" onClick={() => { setForm({ employee_id: "", department_id: "", expected_return_at: "", handover_confirmed: "false", notes: "" }); setErrors({}); setMode("assign") }}><Icon name="users" size={15} /> {activeAssignment ? "Reassign" : "Assign"}</button>}
              {canEdit && <button className="button button-primary" onClick={() => openEdit(selected)}><Icon name="edit" size={15} /> Edit details</button>}
            </div>
          </div>
        </Modal>
      )}

      {mode === "assign" && selected && (
        <Modal title="Assign this asset" description={`${selected.asset_tag} · ${selected.name}`} onClose={() => setMode("detail")}>
          <form className="modal-form" onSubmit={submitAssignment}>
            <p className="form-hint">Choose either a person or a department. Any current assignment will be closed automatically.</p>
            <Field label="Employee" name="employee_id" value={form.employee_id} onChange={(name, value) => { setField(name, value); if (value) setField("department_id", "") }} options={lookupOptions(lookups.employees)} placeholder="Assign to an employee" error={errors.employee_id} />
            <div className="field-or">OR</div>
            <Field label="Department" name="department_id" value={form.department_id} onChange={(name, value) => { setField(name, value); if (value) setField("employee_id", "") }} options={lookupOptions(lookups.departments)} placeholder="Assign to a department" error={errors.department_id} />
            <Field label="Expected return date" name="expected_return_at" value={form.expected_return_at} onChange={setField} type="date" error={errors.expected_return_at} />
            <label className="checkbox-field"><input type="checkbox" checked={form.handover_confirmed === "true"} onChange={(event) => setField("handover_confirmed", String(event.target.checked))} /> The recipient has confirmed the handover</label>
            <Field label="Handover notes" name="notes" value={form.notes} onChange={setField} rows={3} placeholder="Optional notes about this assignment" />
            {Object.values(errors).length > 0 && <div className="form-alert">{Object.values(errors)[0]}</div>}
            <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setMode("detail")}>Cancel</button><button className="button button-primary" disabled={saving || (!form.employee_id && !form.department_id)}>{saving ? "Saving..." : "Confirm assignment"}</button></div>
          </form>
        </Modal>
      )}

      {mode === "return" && selected && (
        <Modal title="Return asset to inventory" description={`${selected.asset_tag} · ${selected.name}`} onClose={() => setMode("detail")}>
          <form className="modal-form" onSubmit={submitReturn}>
            <p className="form-hint">Record the item's condition to help your IT team prepare it for its next assignment.</p>
            <Field label="Condition on return" name="condition" value={form.condition} onChange={setField} options={["good", "fair", "poor", "damaged"].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} placeholder="Select condition" />
            <Field label="Return notes" name="notes" value={form.notes} onChange={setField} rows={3} placeholder="Optional notes about this return" />
            {error && <div className="form-alert">{error}</div>}
            <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setMode("detail")}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? "Saving..." : "Confirm return"}</button></div>
          </form>
        </Modal>
      )}
    </>
  )
}

function Detail({ label, value }: { label: string; value: unknown }) {
  return <div className="detail-cell"><small>{label}</small><strong>{displayValue(value)}</strong></div>
}
