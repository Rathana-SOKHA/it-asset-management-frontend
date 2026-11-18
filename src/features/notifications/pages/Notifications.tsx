import { useCallback, useEffect, useState } from "react"
import PageHeader from "../../../components/ui/PageHeader"
import Icon from "../../../components/ui/Icon"
import { EmptyState, ErrorState, LoadingState } from "../../../components/ui/WorkspaceUI"
import { useWorkspace } from "../../../hooks/useWorkspace"
import { apiRequest } from "../../../plugins/axios"
import { errorMessage, formatDate, type ApiRecord, type Paginator } from "../../../utils/ui"

interface NotificationRecord extends ApiRecord {
  id: number
  read_at: string | null
  data: Record<string, unknown>
  created_at: string
}

export default function Notifications() {
  const { token } = useWorkspace()
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadNotifications = useCallback(async () => {
    try {
      const result = await apiRequest<Paginator<NotificationRecord>>(`/notifications?page=${page}`, { token })
      setNotifications(result.data)
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
    apiRequest<Paginator<NotificationRecord>>(`/notifications?page=${page}`, { token })
      .then((result) => {
        if (!active) return
        setNotifications(result.data)
        setLastPage(result.last_page)
        setTotal(result.total)
      })
      .catch((requestError: unknown) => { if (active) setError(errorMessage(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, token])

  async function markRead(notification: NotificationRecord) {
    try {
      await apiRequest(`/notifications/${notification.id}`, { method: "PATCH", token })
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item))
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  const unread = notifications.filter((notification) => !notification.read_at).length

  return (
    <>
      <PageHeader eyebrow="YOUR UPDATES" title="Notifications" description="Important changes and reminders about equipment you care about." />
      {error && <ErrorState message={error} onRetry={() => void loadNotifications()} />}
      <section className="surface-card notifications-card">
        <div className="notifications-toolbar"><div><span className="eyebrow">INBOX</span><h2>Recent updates <span>{unread} unread</span></h2></div><button className="button button-secondary button-small" onClick={() => void loadNotifications()}><Icon name="refresh" size={15} /> Refresh</button></div>
        {loading ? <LoadingState label="Loading notifications..." /> : notifications.length ? <div className="notification-list">{notifications.map((notification) => {
          const message = String(notification.data.message ?? notification.data.title ?? "There’s an update on your account.")
          const title = String(notification.data.title ?? (message.includes("assigned") ? "Asset assignment" : "Asset update"))
          return <article className={`notification-row ${notification.read_at ? "" : "notification-unread"}`} key={notification.id}>
            <span className={`notification-icon ${notification.read_at ? "" : "notification-icon-new"}`}><Icon name={message.toLowerCase().includes("return") ? "arrow-left" : "box"} size={18} /></span>
            <div className="notification-copy"><div><strong>{title}</strong>{!notification.read_at && <span className="unread-label">NEW</span>}</div><p>{message}</p><small><Icon name="clock" size={13} />{formatDate(notification.created_at, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</small></div>
            {!notification.read_at && <button className="button button-secondary button-small notification-mark" onClick={() => void markRead(notification)}>Mark as read</button>}
          </article>
        })}</div> : <EmptyState icon="bell" title="You’re all caught up" description="When something changes with your equipment, you’ll see it here." />}
        {!loading && total > 0 && <div className="table-pagination"><span>Page <strong>{page}</strong> of <strong>{lastPage}</strong></span><div><button className="icon-button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} aria-label="Previous page"><Icon name="chevron-left" size={16} /></button><button className="icon-button" disabled={page >= lastPage} onClick={() => setPage((value) => value + 1)} aria-label="Next page"><Icon name="chevron-right" size={16} /></button></div></div>}
      </section>
    </>
  )
}
