import { useCallback, useEffect, useState } from "react"
import PageHeader from "../../../components/ui/PageHeader"
import Icon from "../../../components/ui/Icon"
import { EmptyState, ErrorState, LoadingState } from "../../../components/ui/WorkspaceUI"
import { useWorkspace } from "../../../hooks/useWorkspace"
import { apiRequest } from "../../../plugins/axios"
import { displayValue, errorMessage, formatDate, type ApiRecord, type Paginator } from "../../../utils/ui"

interface ActivityRecord extends ApiRecord {
  action: string
  description?: string
  created_at: string
  user?: { name: string; email: string }
  subject_type?: string
  subject_id?: number
  subject?: Record<string, unknown> | null
}

export default function Activity() {
  const { token } = useWorkspace()
  const [records, setRecords] = useState<ActivityRecord[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [action, setAction] = useState("")
  const [userId, setUserId] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadActivity = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page) })
    if (action.trim()) params.set("action", action.trim())
    if (userId.trim()) params.set("user_id", userId.trim())
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    try {
      const result = await apiRequest<Paginator<ActivityRecord>>(`/activity-logs?${params}`, { token })
      setRecords(result.data)
      setLastPage(result.last_page)
      setTotal(result.total)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [action, from, page, to, token, userId])

  useEffect(() => {
    let active = true
    const params = new URLSearchParams({ page: String(page) })
    if (action.trim()) params.set("action", action.trim())
    if (userId.trim()) params.set("user_id", userId.trim())
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    apiRequest<Paginator<ActivityRecord>>(`/activity-logs?${params}`, { token })
      .then((result) => {
        if (!active) return
        setRecords(result.data)
        setLastPage(result.last_page)
        setTotal(result.total)
      })
      .catch((requestError: unknown) => { if (active) setError(errorMessage(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [action, from, page, to, token, userId])

  function clearFilters() {
    setAction("")
    setUserId("")
    setFrom("")
    setTo("")
    setPage(1)
  }

  return (
    <>
      <PageHeader eyebrow="AUDIT TRAIL" title="Activity log" description="A transparent record of actions and changes across your workspace." />
      {error && <ErrorState message={error} onRetry={() => void loadActivity()} />}
      <section className="surface-card activity-log-card">
        <div className="log-toolbar"><div><div className="log-toolbar-title"><span className="log-icon"><Icon name="activity" size={17} /></span><div><strong>Workspace activity</strong><small>{total.toLocaleString()} recorded events</small></div></div></div><div className="log-filters">
          <label><span>ACTION</span><input value={action} onChange={(event) => { setAction(event.target.value); setPage(1) }} placeholder="Filter action" /></label>
          <label><span>USER ID</span><input type="number" value={userId} onChange={(event) => { setUserId(event.target.value); setPage(1) }} placeholder="Any user" /></label>
          <label><span>FROM</span><input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1) }} /></label>
          <label><span>TO</span><input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1) }} /></label>
          <button className="button button-secondary button-small" onClick={clearFilters}><Icon name="refresh" size={14} /> Clear</button>
        </div></div>
        {loading ? <LoadingState label="Loading the activity log..." /> : records.length ? <div className="activity-feed">{records.map((record, index) => <article className="activity-feed-row" key={record.id}><div className="activity-feed-rail"><span className={`activity-feed-dot activity-feed-dot-${index % 4}`} />{index < records.length - 1 && <span className="activity-feed-line" />}</div><div className="activity-feed-content"><div className="activity-feed-top"><strong>{record.description || record.action}</strong><span>{formatDate(record.created_at, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</span></div><p><span className="activity-actor">{record.user?.name ?? "System"}</span><span className="activity-separator">·</span>{record.action}{record.subject_type && <><span className="activity-separator">·</span>{record.subject_type.split("\\").pop()} {record.subject?.name ? `“${displayValue(record.subject.name)}”` : record.subject_id ? `#${record.subject_id}` : ""}</>}</p></div></article>)}</div> : <EmptyState icon="activity" title="No activity matches those filters" description="Try widening your date range or clearing a filter." />}
        {!loading && total > 0 && <div className="table-pagination"><span>Page <strong>{page}</strong> of <strong>{lastPage}</strong></span><div><button className="icon-button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} aria-label="Previous page"><Icon name="chevron-left" size={16} /></button><button className="icon-button" disabled={page >= lastPage} onClick={() => setPage((value) => value + 1)} aria-label="Next page"><Icon name="chevron-right" size={16} /></button></div></div>}
      </section>
    </>
  )
}
