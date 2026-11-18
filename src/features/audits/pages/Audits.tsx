import { useCallback, useEffect, useState, type FormEvent } from "react"
import PageHeader from "../../../components/ui/PageHeader"
import Icon from "../../../components/ui/Icon"
import { EmptyState, ErrorState, Field, LoadingState, Modal, StatusPill } from "../../../components/ui/WorkspaceUI"
import { useWorkspace } from "../../../hooks/useWorkspace"
import { apiRequest } from "../../../plugins/axios"
import { errorFields, errorMessage, formatDate, type ApiRecord, type Paginator } from "../../../utils/ui"

interface AuditRecord extends ApiRecord {
  audit_number: string
  status: string
  location_id?: number | null
  notes?: string
  started_at?: string
  finished_at?: string
  location?: { name: string }
  starter?: { name: string }
  items?: AuditItem[]
}

interface AuditItem extends ApiRecord {
  status: string
  asset?: { asset_tag: string; name: string; category?: { name: string }; location?: { name: string }; status?: string }
  actual_location?: { name: string }
  verifier?: { name: string }
  notes?: string
  condition?: string
}

interface ChoiceAsset extends ApiRecord {
  asset_tag: string
  name: string
  location_id?: number
  location?: { name: string }
  status: string
}

export default function Audits() {
  const { token, user } = useWorkspace()
  const [audits, setAudits] = useState<AuditRecord[]>([])
  const [locations, setLocations] = useState<ApiRecord[]>([])
  const [assets, setAssets] = useState<ChoiceAsset[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState<AuditRecord | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [addItemsOpen, setAddItemsOpen] = useState(false)
  const [form, setForm] = useState({ audit_number: "", location_id: "", notes: "" })
  const [chosenAssets, setChosenAssets] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState("")

  const loadAudits = useCallback(async () => {
    try {
      const result = await apiRequest<Paginator<AuditRecord>>(`/inventory-audits?page=${page}`, { token })
      setAudits(result.data)
      setLastPage(result.last_page)
      setTotal(result.total)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [page, token])

  useEffect(() => {
    let active = true
    Promise.all([
      apiRequest<Paginator<AuditRecord>>(`/inventory-audits?page=${page}`, { token }),
      apiRequest<Paginator<ApiRecord>>("/locations?page=1", { token }),
      apiRequest<Paginator<ChoiceAsset>>("/assets?page=1", { token }),
    ])
      .then(([auditResult, locationResult, assetResult]) => {
        if (!active) return
        setAudits(auditResult.data)
        setLastPage(auditResult.last_page)
        setTotal(auditResult.total)
        setLocations(locationResult.data)
        setAssets(assetResult.data)
      })
      .catch((requestError: unknown) => { if (active) setError(errorMessage(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, token])

  async function openAudit(audit: AuditRecord) {
    setSelected(audit)
    setNotice("")
    try {
      setSelected(await apiRequest<AuditRecord>(`/inventory-audits/${audit.id}`, { token }))
    } catch (requestError) {
      setNotice(errorMessage(requestError))
    }
  }

  async function createAudit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      await apiRequest("/inventory-audits", {
        method: "POST",
        token,
        body: JSON.stringify({
          audit_number: form.audit_number,
          location_id: form.location_id ? Number(form.location_id) : undefined,
          notes: form.notes || undefined,
        }),
      })
      setCreateOpen(false)
      setForm({ audit_number: "", location_id: "", notes: "" })
      setNotice("Inventory audit started.")
      await loadAudits()
    } catch (requestError) {
      setErrors(errorFields(requestError))
    } finally {
      setSaving(false)
    }
  }

  async function changeAuditStatus(status: string) {
    if (!selected) return
    setSaving(true)
    setNotice("")
    try {
      const updated = await apiRequest<AuditRecord>(`/inventory-audits/${selected.id}`, {
        method: "PUT",
        token,
        body: JSON.stringify({ status, notes: selected.notes ?? "" }),
      })
      setSelected(updated)
      setNotice(`Audit marked ${status.replace("_", " ")}.`)
      await loadAudits()
    } catch (requestError) {
      setNotice(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  async function deleteAudit(audit: AuditRecord) {
    if (!window.confirm(`Delete audit ${audit.audit_number} and its checklist?`)) return
    try {
      await apiRequest(`/inventory-audits/${audit.id}`, { method: "DELETE", token })
      setSelected(null)
      setNotice("Audit deleted.")
      await loadAudits()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  async function addAssets(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || !chosenAssets.length) return
    setSaving(true)
    setErrors({})
    try {
      const updated = await apiRequest<AuditRecord>(`/inventory-audits/${selected.id}/items`, {
        method: "POST",
        token,
        body: JSON.stringify({ asset_ids: chosenAssets }),
      })
      setSelected(updated)
      setAddItemsOpen(false)
      setChosenAssets([])
      setNotice("Assets added to the audit checklist.")
      await loadAudits()
    } catch (requestError) {
      setErrors(errorFields(requestError))
      setNotice(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  async function verifyItem(item: AuditItem, status: string) {
    const condition = status === "verified" ? "good" : status === "damaged" ? "damaged" : "unknown"
    try {
      const updated = await apiRequest<AuditItem>(`/inventory-audit-items/${item.id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ status, condition }),
      })
      setSelected((current) => current ? { ...current, items: current.items?.map((row) => row.id === updated.id ? updated : row) } : current)
    } catch (requestError) {
      setNotice(errorMessage(requestError))
    }
  }

  async function saveNotes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return
    try {
      const updated = await apiRequest<AuditRecord>(`/inventory-audits/${selected.id}`, {
        method: "PUT",
        token,
        body: JSON.stringify({ status: selected.status, notes: selected.notes ?? "" }),
      })
      setSelected(updated)
      setNotice("Audit notes saved.")
    } catch (requestError) {
      setNotice(errorMessage(requestError))
    }
  }

  const isManager = user.roles.some((role) => ["Administrator", "IT Admin", "IT Staff"].includes(role))

  return (
    <>
      <PageHeader eyebrow="INVENTORY CONTROL" title="Inventory audits" description="Verify what you have, where it is, and what needs attention." action={<button className="button button-primary" onClick={() => { setErrors({}); setCreateOpen(true) }}><Icon name="plus" size={16} /> Start an audit</button>} />
      {notice && !selected && <div className="toast-notice"><Icon name="check" size={16} />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss"><Icon name="close" size={14} /></button></div>}
      {error && <ErrorState message={error} onRetry={() => void loadAudits()} />}
      <div className="audit-stats"><div><span className="audit-stat-icon"><Icon name="archive" size={18} /></span><small>Total audits</small><strong>{total}</strong></div><div><span className="audit-stat-icon audit-stat-purple"><Icon name="activity" size={18} /></span><small>In progress</small><strong>{audits.filter((audit) => audit.status === "in_progress").length}</strong></div><div><span className="audit-stat-icon audit-stat-green"><Icon name="check" size={18} /></span><small>Completed on this page</small><strong>{audits.filter((audit) => audit.status === "completed").length}</strong></div></div>
      <section className="surface-card asset-table-card">
        <div className="table-toolbar"><div className="table-toolbar-caption"><strong>Audit history</strong><span>Review active and completed stock takes</span></div><button className="button button-secondary button-small" onClick={() => void loadAudits()}><Icon name="refresh" size={15} /> Refresh</button></div>
        {loading ? <LoadingState label="Loading audits..." /> : audits.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>AUDIT</th><th>LOCATION</th><th>STARTED BY</th><th>STARTED</th><th>ITEMS</th><th>STATUS</th><th></th></tr></thead><tbody>{audits.map((audit) => <tr key={audit.id} className="clickable-row" onClick={() => void openAudit(audit)}><td><strong className="mono-text">{audit.audit_number}</strong></td><td>{audit.location?.name ?? "All locations"}</td><td>{audit.starter?.name ?? "—"}</td><td>{formatDate(audit.started_at)}</td><td>{audit.items?.length ?? 0}</td><td><StatusPill value={audit.status} /></td><td><button className="row-action" aria-label="Open audit"><Icon name="chevron-right" size={16} /></button></td></tr>)}</tbody></table></div> : <EmptyState icon="archive" title="No audits yet" description="Start an audit to verify assets at a location or across your inventory." action={<button className="button button-primary button-small" onClick={() => setCreateOpen(true)}><Icon name="plus" size={15} /> Start an audit</button>} />}
        {!loading && total > 0 && <div className="table-pagination"><span>Page <strong>{page}</strong> of <strong>{lastPage}</strong></span><div><button className="icon-button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} aria-label="Previous page"><Icon name="chevron-left" size={16} /></button><button className="icon-button" disabled={page >= lastPage} onClick={() => setPage((value) => value + 1)} aria-label="Next page"><Icon name="chevron-right" size={16} /></button></div></div>}
      </section>

      {createOpen && <Modal title="Start a new inventory audit" description="Create a checklist to verify your asset records." onClose={() => setCreateOpen(false)}>
        <form className="modal-form" onSubmit={createAudit}>
          <Field label="Audit reference" name="audit_number" value={form.audit_number} onChange={(name, value) => setForm((current) => ({ ...current, [name]: value }))} required error={errors.audit_number} placeholder="e.g. Q4-2026-HQ" />
          <Field label="Location" name="location_id" value={form.location_id} onChange={(name, value) => setForm((current) => ({ ...current, [name]: value }))} options={locations.map((item) => ({ value: String(item.id), label: String(item.name) }))} placeholder="All locations" />
          <Field label="Notes" name="notes" value={form.notes} onChange={(name, value) => setForm((current) => ({ ...current, [name]: value }))} rows={3} placeholder="Add context for the audit team" />
          {Object.values(errors).length > 0 && <div className="form-alert">{Object.values(errors)[0]}</div>}
          <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setCreateOpen(false)}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? "Starting..." : "Start audit"}</button></div>
        </form>
      </Modal>}

      {selected && !addItemsOpen && <Modal title={selected.audit_number} description={`Started ${formatDate(selected.started_at)} · ${selected.location?.name ?? "All locations"}`} onClose={() => { setSelected(null); setNotice(""); void loadAudits() }} wide>
        <div className="audit-detail">
          {notice && <div className="form-alert">{notice}</div>}
          <div className="audit-detail-summary"><div><small>AUDIT STATUS</small><StatusPill value={selected.status} /></div><div><small>STARTED BY</small><strong>{selected.starter?.name ?? "—"}</strong></div><div><small>CHECKLIST ITEMS</small><strong>{selected.items?.length ?? 0}</strong></div><div><small>COMPLETED</small><strong>{formatDate(selected.finished_at)}</strong></div></div>
          <div className="audit-detail-toolbar"><div><h3>Checklist</h3><p>Confirm each item and note discrepancies.</p></div><div className="row-actions">{isManager && selected.status !== "completed" && <button className="button button-secondary button-small" onClick={() => { setChosenAssets([]); setErrors({}); setAddItemsOpen(true) }}><Icon name="plus" size={14} /> Add assets</button>}{selected.status === "in_progress" && <button className="button button-primary button-small" disabled={saving} onClick={() => void changeAuditStatus("completed")}><Icon name="check" size={14} /> Complete audit</button>}</div></div>
          {selected.items?.length ? <div className="audit-items-list">{selected.items.map((item) => <div className="audit-item-row" key={item.id}><span className={`audit-item-mark ${item.status === "verified" ? "mark-verified" : item.status === "damaged" ? "mark-damaged" : item.status === "missing" ? "mark-missing" : ""}`}><Icon name={item.status === "verified" ? "check" : item.status === "damaged" ? "activity" : item.status === "missing" ? "close" : "box"} size={16} /></span><span className="audit-item-copy"><strong>{item.asset?.name ?? "Asset"}</strong><small>{item.asset?.asset_tag ?? "—"} · {item.actual_location?.name ?? item.asset?.location?.name ?? "Location not recorded"}</small></span><StatusPill value={item.status} /><div className="audit-item-actions">{selected.status === "in_progress" && <><button className="audit-action-good" onClick={() => void verifyItem(item, "verified")} title="Mark verified" aria-label="Mark as verified"><Icon name="check" size={15} /></button><button className="audit-action-warn" onClick={() => void verifyItem(item, "damaged")} title="Mark damaged" aria-label="Mark as damaged"><Icon name="activity" size={15} /></button><button className="audit-action-bad" onClick={() => void verifyItem(item, "missing")} title="Mark missing" aria-label="Mark as missing"><Icon name="close" size={15} /></button></>}</div></div>)}</div> : <EmptyState icon="archive" title="Your checklist is empty" description="Add assets to begin verifying them." action={isManager && selected.status === "in_progress" ? <button className="button button-secondary button-small" onClick={() => { setChosenAssets([]); setAddItemsOpen(true) }}><Icon name="plus" size={14} /> Add assets</button> : undefined} />}
          <form className="audit-notes" onSubmit={saveNotes}><Field label="Audit notes" name="audit_notes" value={selected.notes ?? ""} onChange={(_, value) => setSelected((current) => current ? { ...current, notes: value } : current)} rows={2} placeholder="Notes about this audit" /><button className="button button-secondary button-small">Save notes</button></form>
          <div className="modal-actions"><button className="button button-danger-ghost" onClick={() => void deleteAudit(selected)}><Icon name="trash" size={15} /> Delete audit</button><span className="action-spacer" />{selected.status === "in_progress" && <button className="button button-secondary" onClick={() => void changeAuditStatus("cancelled")}>Cancel audit</button>}{selected.status === "cancelled" && <button className="button button-secondary" onClick={() => void changeAuditStatus("in_progress")}>Resume audit</button>}<button className="button button-secondary" onClick={() => setSelected(null)}>Done</button></div>
        </div>
      </Modal>}

      {selected && addItemsOpen && <Modal title="Add items to checklist" description="Select the assets your team will verify." onClose={() => setAddItemsOpen(false)} wide>
        <form className="modal-form" onSubmit={addAssets}>
          {selected.location_id && <div className="form-hint">Only assets assigned to {selected.location?.name ?? "this location"} can be added.</div>}
          <div className="asset-picker">{assets.filter((asset) => !selected.location_id || asset.location_id === selected.location_id).map((asset) => {
            const existing = selected.items?.some((item) => item.asset?.asset_tag === asset.asset_tag)
            const checked = chosenAssets.includes(asset.id)
            return <label key={asset.id} className={`asset-picker-row ${existing ? "asset-picker-disabled" : ""}`}><input type="checkbox" checked={checked} disabled={existing} onChange={(event) => setChosenAssets((current) => event.target.checked ? [...current, asset.id] : current.filter((id) => id !== asset.id))} /><span><strong>{asset.name}</strong><small>{asset.asset_tag} · {asset.location?.name ?? "No location"}</small></span><StatusPill value={asset.status} /></label>
          })}{!assets.length && <p className="detail-empty">No assets are available on this page. Add assets to your inventory first.</p>}</div>
          {notice && <div className="form-alert">{notice}</div>}
          <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setAddItemsOpen(false)}>Cancel</button><button className="button button-primary" disabled={saving || !chosenAssets.length}>{saving ? "Adding..." : `Add ${chosenAssets.length || ""} ${chosenAssets.length === 1 ? "asset" : "assets"}`}</button></div>
        </form>
      </Modal>}
    </>
  )
}
