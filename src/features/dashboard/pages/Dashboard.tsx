import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router"
import Icon from "../../../components/ui/Icon"
import { ErrorState, LoadingState, StatusPill } from "../../../components/ui/WorkspaceUI"
import { useWorkspace } from "../../../hooks/useWorkspace"
import { apiRequest } from "../../../plugins/axios"
import { displayValue, errorMessage, formatCurrency, formatDate, type ApiRecord } from "../../../utils/ui"
import type { DashboardStats } from "../types/dashboard.type"
import type { AuthUser } from "../../auth/types/auth.type"

interface DashboardAsset extends ApiRecord {
  asset_tag: string
  name: string
  status: string
  category?: { name: string }
  location?: { name: string }
  warranty?: { end_date: string }
}

function canSeeInsights(user: AuthUser): boolean {
  return ["Administrator", "IT Admin", "Department Manager", "Management"].some((role) => user.roles.includes(role))
}

export default function Dashboard() {
  const { token, user } = useWorkspace()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [myAssets, setMyAssets] = useState<DashboardAsset[] | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(() => user.roles.includes("Employee") || canSeeInsights(user))

  const loadDashboard = useCallback(async () => {
    try {
      if (user.roles.includes("Employee")) {
        setMyAssets(await apiRequest<DashboardAsset[]>("/me/assets", { token }))
      } else if (canSeeInsights(user)) {
        setStats(await apiRequest<DashboardStats>("/dashboard/stats", { token }))
      } else {
        setStats(null)
        setMyAssets(null)
      }
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [token, user])

  useEffect(() => {
    let active = true
    const request = user.roles.includes("Employee")
      ? apiRequest<DashboardAsset[]>("/me/assets", { token }).then((result) => { if (active) setMyAssets(result) })
      : canSeeInsights(user)
        ? apiRequest<DashboardStats>("/dashboard/stats", { token }).then((result) => { if (active) setStats(result) })
        : Promise.resolve()
    request
      .catch((requestError: unknown) => { if (active) setError(errorMessage(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, user])

  const breakdown = useMemo(() => {
    if (!stats) return []
    return Object.entries(stats.by_category ?? {})
      .sort((left, right) => Number(right[1]) - Number(left[1]))
      .slice(0, 5)
  }, [stats])
  const maxCategory = Math.max(1, ...breakdown.map(([, value]) => Number(value)))
  const healthPercent = stats?.total
    ? Math.round(Math.max(0, stats.total - stats.under_maintenance - stats.damaged - stats.disposed) / stats.total * 100)
    : 0
  const healthSlices = stats ? [
    { label: "Available", value: stats.available, color: "#41a787", tone: "green" },
    { label: "Assigned", value: stats.assigned, color: "#438bd4", tone: "violet" },
    { label: "In repair", value: stats.under_maintenance, color: "#e0a13d", tone: "orange" },
    { label: "Damaged", value: stats.damaged, color: "#dd7280", tone: "red" },
  ] : []
  const healthSliceTotal = healthSlices.reduce((total, slice) => total + slice.value, 0)
  let healthOffset = 0
  const healthGradient = healthSliceTotal
    ? `conic-gradient(${healthSlices.map((slice) => {
      const start = healthOffset
      healthOffset += slice.value / healthSliceTotal * 100
      return `${slice.color} ${start}% ${healthOffset}%`
    }).join(", ")})`
    : "conic-gradient(#e8ebf1 0% 100%)"

  if (loading) return <LoadingState label="Preparing your overview..." />
  if (error) return <ErrorState message={error} onRetry={() => void loadDashboard()} />

  if (myAssets) {
    return (
      <>
        <div className="welcome-banner welcome-employee">
          <div className="welcome-copy">
            <span className="banner-kicker"><Icon name="sparkles" size={15} /> YOUR WORKSPACE</span>
            <h1>Everything you need,<br />all in one place.</h1>
            <p>Keep track of the equipment checked out to you.</p>
            <Link className="button button-light" to="/my-assets">View my equipment <Icon name="arrow-right" size={16} /></Link>
          </div>
          <div className="banner-illustration"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="banner-device"><Icon name="laptop" size={56} /></div><div className="floating-chip chip-one"><Icon name="check" size={16} /></div><div className="floating-chip chip-two"><Icon name="shield" size={16} /></div></div>
        </div>
        <div className="page-heading compact-heading"><div><div className="eyebrow">YOUR EQUIPMENT</div><h2>Assigned to you</h2><p>{myAssets.length} {myAssets.length === 1 ? "asset" : "assets"} currently in your care</p></div><Link className="text-link" to="/my-assets">See all <Icon name="arrow-right" size={15} /></Link></div>
        <div className="asset-preview-grid">
          {myAssets.slice(0, 3).map((asset) => (
            <article className="asset-preview-card" key={asset.id}>
              <div className="asset-preview-icon"><Icon name="laptop" size={22} /></div>
              <div className="asset-preview-top"><span className="asset-code">{asset.asset_tag}</span><StatusPill value={asset.status} /></div>
              <h3>{asset.name}</h3>
              <p>{displayValue(asset.category?.name)} · {displayValue(asset.location?.name)}</p>
            </article>
          ))}
          {myAssets.length === 0 && <div className="surface-card full-span"><div className="empty-state"><div className="empty-icon"><Icon name="package" /></div><strong>No equipment assigned yet</strong><p>When equipment is assigned to you, it will show up here.</p></div></div>}
        </div>
        <div className="employee-help-row"><Icon name="shield" size={18} /><span>Need help with your equipment?</span><span className="help-muted">Contact your IT support team for assistance.</span></div>
      </>
    )
  }

  return (
    <>
      <div className="page-heading dashboard-heading">
        <div><div className="eyebrow">{new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date()).toUpperCase()}</div><h1>{greeting()}, {user.name.split(" ")[0]}</h1><p>Here’s what’s happening across your asset workspace today.</p></div>
        <div className="heading-actions"><Link className="button button-secondary" to="/reports"><Icon name="file" size={16} /> View reports</Link>{user.roles.some((role) => ["Administrator", "IT Admin", "IT Staff"].includes(role)) &&         <Link className="button button-primary" to="/assets"><Icon name="plus" size={16} /> Add asset</Link>}</div>
      </div>

      {stats ? (
        <>
          <section className="metric-grid">
            <MetricCard icon="box" label="Total assets" value={stats.total} foot="Across your workspace" tone="blue" />
            <MetricCard icon="sparkles" label="Available" value={stats.available} foot="Ready to be assigned" tone="green" />
            <MetricCard icon="users" label="Currently assigned" value={stats.assigned} foot="In use by your team" tone="purple" />
            <MetricCard icon="activity" label="Needs attention" value={stats.under_maintenance + stats.damaged} foot={`${stats.under_maintenance} in repair · ${stats.damaged} damaged`} tone="amber" />
          </section>

          <section className="dashboard-main-grid">
            <div className="surface-card category-card">
              <div className="card-heading"><div><span className="eyebrow">YOUR INVENTORY</span><h2>Assets by category</h2></div><Link className="quiet-link" to="/assets">View inventory <Icon name="arrow-right" size={14} /></Link></div>
              {breakdown.length ? (
                <div className="category-bars">
                  {breakdown.map(([label, amount], index) => (
                    <div className="category-row" key={label}>
                      <div className="category-label"><span className={`category-dot category-dot-${index}`} />{label}<strong>{amount}</strong></div>
                      <div className="bar-track"><span className={`bar-fill bar-fill-${index}`} style={{ width: `${Math.max(4, Number(amount) / maxCategory * 100)}%` }} /></div>
                    </div>
                  ))}
                </div>
              ) : <div className="chart-empty">Category insights will appear as inventory is added.</div>}
              <div className="category-summary">
                <div><span className="summary-icon summary-indigo"><Icon name="laptop" size={16} /></span><span><small>Active</small><strong>{stats.available + stats.assigned}</strong></span></div>
                <div><span className="summary-icon summary-orange"><Icon name="clock" size={16} /></span><span><small>Maintenance cost · 30 days</small><strong>{formatCurrency(stats.maintenance_cost_30_days)}</strong></span></div>
              </div>
            </div>
            <div className="surface-card status-card">
              <div className="card-heading"><div><span className="eyebrow">AT A GLANCE</span><h2>Asset health</h2></div><span className="health-mark"><Icon name="activity" size={16} /></span></div>
              <div className="health-visual">
                <div className="health-chart-wrap">
                  <div className="health-chart" style={{ background: healthGradient }} role="img" aria-label={`Asset health: ${healthPercent}% in good standing`}>
                    <div className="health-chart-center"><div className="health-score">{healthPercent}<span>%</span></div></div>
                  </div>
                  <p className="health-caption">of tracked assets are in good standing</p>
                </div>
                <div className="health-legend">{healthSlices.map((slice) => <span key={slice.label}><i className={`legend-dot ${slice.tone}`} />{slice.label}<b>{slice.value}</b></span>)}</div>
              </div>
            </div>
          </section>

          <section className="dashboard-lower-grid">
            <div className="surface-card table-card">
              <div className="card-heading"><div><span className="eyebrow">STAY AHEAD</span><h2>Coming up soon</h2></div><Link className="quiet-link" to="/resources/warranties">Manage warranties <Icon name="arrow-right" size={14} /></Link></div>
              {stats.warranty_expiring?.length || stats.maintenance_due?.length ? (
                <div className="upcoming-list">
                  {stats.warranty_expiring?.slice(0, 3).map((item) => (
                    <div className="upcoming-row" key={`w-${item.id}`}><span className="upcoming-icon warranty-icon"><Icon name="shield" size={16} /></span><span className="upcoming-copy"><strong>{item.asset?.name ?? "Asset warranty"}</strong><small>Warranty expires {formatDate(item.end_date)}</small></span><span className="upcoming-kind">Warranty</span></div>
                  ))}
                  {stats.maintenance_due?.slice(0, 2).map((item) => (
                    <div className="upcoming-row" key={`m-${item.id}`}><span className="upcoming-icon maintenance-icon"><Icon name="calendar" size={16} /></span><span className="upcoming-copy"><strong>{item.asset?.name ?? "Maintenance"}</strong><small>{item.description || "Scheduled maintenance"} · {formatDate(item.scheduled_at)}</small></span><span className="upcoming-kind">Service</span></div>
                  ))}
                </div>
              ) : <div className="chart-empty">You’re all caught up — no warranties or service due soon.</div>}
            </div>
            <div className="surface-card activity-card">
              <div className="card-heading"><div><span className="eyebrow">THE LATEST</span><h2>Recent activity</h2></div><Link className="icon-link" to="/activity" aria-label="View all activity"><Icon name="arrow-right" size={17} /></Link></div>
              {stats.recent_activities?.length ? (
                <div className="recent-list">{stats.recent_activities.slice(0, 5).map((item, index) => (
                  <div className="recent-row" key={item.id}><span className={`timeline-dot timeline-dot-${index}`} /><div><strong>{item.description || item.action}</strong><small>{formatDate(item.created_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</small></div></div>
                ))}</div>
              ) : <div className="chart-empty">Your team's activity will show up here.</div>}
            </div>
          </section>
          <section className="quick-strip"><div className="quick-strip-title"><span className="quick-strip-icon"><Icon name="sparkles" size={17} /></span><div><strong>Make your next move</strong><small>Shortcuts for a smoother workday.</small></div></div><Link to="/audits"><Icon name="archive" size={16} /> Start an audit <Icon name="arrow-right" size={14} /></Link><Link to="/resources/maintenances"><Icon name="activity" size={16} /> Log maintenance <Icon name="arrow-right" size={14} /></Link><Link to="/resources/employees"><Icon name="team" size={16} /> Manage people <Icon name="arrow-right" size={14} /></Link></section>
        </>
      ) : (
        <div className="welcome-banner staff-banner">
          <div className="welcome-copy"><span className="banner-kicker"><Icon name="sparkles" size={15} /> YOUR OPERATIONS HUB</span><h1>Welcome back,<br />{user.name.split(" ")[0]}.</h1><p>Your tools for keeping equipment moving, maintained, and accounted for.</p><Link className="button button-light" to="/assets">Open asset inventory <Icon name="arrow-right" size={16} /></Link></div>
          <div className="banner-illustration"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="banner-device"><Icon name="box" size={54} /></div><div className="floating-chip chip-one"><Icon name="check" size={16} /></div><div className="floating-chip chip-two"><Icon name="activity" size={16} /></div></div>
        </div>
      )}
    </>
  )
}

function MetricCard({ icon, label, value, foot, tone }: { icon: "box" | "sparkles" | "users" | "activity"; label: string; value: number; foot: string; tone: string }) {
  return <article className="metric-card"><div className={`metric-icon metric-${tone}`}><Icon name={icon} size={19} /></div><div className="metric-label">{label}</div><div className="metric-value">{value.toLocaleString()}</div><div className="metric-foot">{foot}</div><div className={`metric-decoration decoration-${tone}`} /></article>
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}
