import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router"
import PageHeader from "../../../components/ui/PageHeader"
import Icon from "../../../components/ui/Icon"
import { ErrorState, LoadingState, StatusPill } from "../../../components/ui/WorkspaceUI"
import { useWorkspace } from "../../../hooks/useWorkspace"
import { apiRequest, apiDownload } from "../../../plugins/axios"
import { errorMessage, formatCurrency } from "../../../utils/ui"
import type { DashboardStats } from "../../dashboard/types/dashboard.type"

export default function Reports() {
  const { token, user } = useWorkspace()
  const canSeeInsights = user.roles.some((role) => ["Administrator", "IT Admin", "Department Manager", "Management"].includes(role))
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(canSeeInsights)
  const [error, setError] = useState("")
  const [exporting, setExporting] = useState(false)

  const loadReport = useCallback(async () => {
    try {
      setStats(await apiRequest<DashboardStats>("/dashboard/stats", { token }))
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!canSeeInsights) return
    let active = true
    apiRequest<DashboardStats>("/dashboard/stats", { token })
      .then((result) => { if (active) setStats(result) })
      .catch((requestError: unknown) => { if (active) setError(errorMessage(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [canSeeInsights, token])

  const statusItems = useMemo(() => stats ? Object.entries(stats.by_status ?? {}).sort((left, right) => Number(right[1]) - Number(left[1])) : [], [stats])
  const categoryItems = useMemo(() => stats ? Object.entries(stats.by_category ?? {}).sort((left, right) => Number(right[1]) - Number(left[1])) : [], [stats])
  const locationItems = useMemo(() => stats ? Object.entries(stats.by_location ?? {}).sort((left, right) => Number(right[1]) - Number(left[1])).slice(0, 6) : [], [stats])
  const healthPercent = stats?.total
    ? Math.round(Math.max(0, stats.total - stats.under_maintenance - stats.damaged - stats.disposed) / stats.total * 100)
    : 0

  async function exportCsv() {
    setExporting(true)
    setError("")
    try {
      await apiDownload("/reports/assets.csv", token, "assets-report.csv")
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <PageHeader eyebrow="INSIGHTS & REPORTS" title="Your inventory, at a glance" description="Make confident decisions with a live view of assets, health, and upcoming work." action={<button className="button button-primary" onClick={() => void exportCsv()} disabled={exporting}><Icon name="download" size={16} /> {exporting ? "Preparing export..." : "Export asset CSV"}</button>} />
      {error && <ErrorState message={error} onRetry={() => void loadReport()} />}
      {!canSeeInsights && <section className="surface-card report-export-only"><span className="report-export-icon"><Icon name="file" size={23} /></span><div><span className="eyebrow">ASSET REPORT</span><h2>Take your inventory with you.</h2><p>Download a CSV of the assets available to your account, including status, category, location, supplier, purchase date, and cost.</p><button className="button button-primary" onClick={() => void exportCsv()} disabled={exporting}><Icon name="download" size={16} /> {exporting ? "Preparing export..." : "Download asset CSV"}</button></div></section>}
      {loading ? <LoadingState label="Gathering your inventory insights..." /> : stats && <>
        <section className="report-hero"><div><span className="banner-kicker"><Icon name="sparkles" size={15} /> INVENTORY SNAPSHOT</span><h2>A healthier inventory<br />starts with visibility.</h2><p>Use your workspace insights to keep devices ready, teams equipped, and costs in view.</p><div className="report-hero-link"><span><Icon name="calendar" size={15} /> Updated just now</span><button onClick={() => void loadReport()}><Icon name="refresh" size={14} /> Refresh data</button></div></div><div className="report-hero-art"><div className="report-ring ring-a" /><div className="report-ring ring-b" /><div className="report-art-card"><span className="report-art-icon"><Icon name="box" size={22} /></span><small>TOTAL ASSETS</small><strong>{stats.total.toLocaleString()}</strong><div><span className="legend-dot green" />{healthPercent}% healthy</div></div><span className="report-float float-1"><Icon name="check" size={15} /></span><span className="report-float float-2"><Icon name="activity" size={15} /></span></div></section>
        <section className="report-metrics"><article><div className="report-metric-icon report-metric-blue"><Icon name="laptop" size={18} /></div><small>Tracked assets</small><strong>{stats.total.toLocaleString()}</strong><span>Across all categories</span></article><article><div className="report-metric-icon report-metric-green"><Icon name="check" size={18} /></div><small>Available to assign</small><strong>{stats.available.toLocaleString()}</strong><span>Ready for a new owner</span></article><article><div className="report-metric-icon report-metric-purple"><Icon name="users" size={18} /></div><small>In circulation</small><strong>{stats.assigned.toLocaleString()}</strong><span>Currently assigned</span></article><article><div className="report-metric-icon report-metric-orange"><Icon name="activity" size={18} /></div><small>Maintenance · 30 days</small><strong>{formatCurrency(stats.maintenance_cost_30_days)}</strong><span>Completed service costs</span></article></section>
        <section className="report-grid">
          <div className="surface-card report-card"><div className="card-heading"><div><span className="eyebrow">CURRENT STATE</span><h2>By status</h2></div><Icon className="report-card-icon" name="activity" size={17} /></div><div className="report-status-list">{statusItems.length ? statusItems.map(([label, amount]) => <div className="report-status-row" key={label}><span><StatusPill value={label} /></span><div className="report-progress"><span style={{ width: `${stats.total ? Number(amount) / stats.total * 100 : 0}%` }} /></div><strong>{amount}</strong></div>) : <p className="report-empty">Status data will appear when assets are added.</p>}</div></div>
          <div className="surface-card report-card"><div className="card-heading"><div><span className="eyebrow">EQUIPMENT MIX</span><h2>Top categories</h2></div><Icon className="report-card-icon" name="tag" size={17} /></div><div className="report-category-list">{categoryItems.length ? categoryItems.slice(0, 6).map(([label, amount], index) => <div className="report-category-row" key={label}><span className={`category-dot category-dot-${index % 5}`} /><span>{label}</span><strong>{amount}</strong><div className="report-category-track"><i style={{ width: `${Math.max(3, Number(amount) / Math.max(1, ...categoryItems.map(([, value]) => Number(value))) * 100)}%` }} /></div></div>) : <p className="report-empty">Category data will appear when assets are added.</p>}</div></div>
          <div className="surface-card report-card report-wide-card"><div className="card-heading"><div><span className="eyebrow">WHERE IT LIVES</span><h2>Assets by location</h2></div><Link className="quiet-link" to="/resources/locations">Manage locations <Icon name="arrow-right" size={14} /></Link></div>{locationItems.length ? <div className="location-report-list">{locationItems.map(([location, amount], index) => <div className="location-report-row" key={location}><span className={`location-report-icon location-icon-${index % 4}`}><Icon name="map" size={16} /></span><span><strong>{location}</strong><small>Equipment at this location</small></span><strong>{amount}<small>assets</small></strong></div>)}</div> : <p className="report-empty">Location data will appear when assets are assigned to a location.</p>}</div>
          <div className="surface-card report-card report-wide-card"><div className="card-heading"><div><span className="eyebrow">UP NEXT</span><h2>Warranties & maintenance</h2></div><Link className="quiet-link" to="/resources/maintenances">Open maintenance <Icon name="arrow-right" size={14} /></Link></div><div className="report-attention-grid"><div className="attention-tile"><span className="attention-icon attention-warranty"><Icon name="shield" size={18} /></span><div><strong>{stats.warranty_expiring?.length ?? 0}</strong><span>Warranties expiring in 30 days</span></div><Link to="/resources/warranties" aria-label="View warranties"><Icon name="arrow-right" size={16} /></Link></div><div className="attention-tile"><span className="attention-icon attention-service"><Icon name="calendar" size={18} /></span><div><strong>{stats.maintenance_due?.length ?? 0}</strong><span>Maintenance items due soon</span></div><Link to="/resources/maintenances" aria-label="View maintenance"><Icon name="arrow-right" size={16} /></Link></div></div></div>
        </section>
        <div className="report-footnote"><Icon name="shield" size={15} /> Reports respect your role-based access and show the inventory available to your account.</div>
      </>}
    </>
  )
}
