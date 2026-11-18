import { useEffect, useMemo, useState, type FormEvent } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router"
import { apiRequest } from "../../plugins/axios"
import type { AuthUser } from "../../features/auth/types/auth.type"
import type { Paginator } from "../../utils/ui"
import Icon from "../ui/Icon"
import { getPageTitle } from "../../utils/navigation"
import type { WorkspaceContext } from "../../hooks/useWorkspace"

interface AppLayoutProps {
  token: string
  user: AuthUser
  onLogout: () => void
}

interface Notice {
  id: string
  read_at: string | null
}

interface NavigationItem {
  label: string
  path: string
  icon: "home" | "laptop" | "team" | "tag" | "package" | "archive" | "activity" | "users" | "grid" | "bell" | "file"
  roles?: string[]
}

const staffRoles = ["Administrator", "IT Admin", "IT Staff"]
const inventoryRoles = [...staffRoles, "Department Manager", "Management"]
const dataRoles = [...staffRoles, "Department Manager"]
const buyingRoles = ["Administrator", "IT Admin"]
const insightsRoles = ["Administrator", "IT Admin", "IT Staff", "Department Manager", "Management"]
const adminRoles = ["Administrator"]
const logRoles = ["Administrator", "IT Admin"]

const navigation: { heading: string; items: NavigationItem[] }[] = [
  {
    heading: "Workspace",
    items: [
      { label: "Overview", path: "/", icon: "home" },
      { label: "Asset inventory", path: "/assets", icon: "laptop", roles: inventoryRoles },
      { label: "My assigned assets", path: "/my-assets", icon: "package", roles: ["Employee"] },
      { label: "Inventory audits", path: "/audits", icon: "archive", roles: staffRoles },
      { label: "Maintenance", path: "/resources/maintenances", icon: "activity", roles: staffRoles },
    ],
  },
  {
    heading: "Management",
    items: [
      { label: "People & places", path: "/resources/employees", icon: "team", roles: dataRoles },
      { label: "Asset catalog", path: "/resources/categories", icon: "tag", roles: dataRoles },
      { label: "Procurement", path: "/resources/purchases", icon: "package", roles: buyingRoles },
      { label: "Insights & reports", path: "/reports", icon: "grid", roles: insightsRoles },
      { label: "Activity log", path: "/activity", icon: "activity", roles: logRoles },
      { label: "Users & access", path: "/users", icon: "users", roles: adminRoles },
    ],
  },
]

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase()
}

export default function AppLayout({ token, user, onLogout }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [search, setSearch] = useState("")
  const navigate = useNavigate()
  const location = useLocation()

  const visibleNavigation = useMemo(() => navigation.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || item.roles.some((role) => user.roles.includes(role))),
  })).filter((group) => group.items.length > 0), [user.roles])

  useEffect(() => {
    let active = true
    apiRequest<Paginator<Notice>>("/notifications?page=1", { token })
      .then((result) => {
        if (active) setUnread(result.data.filter((notice) => !notice.read_at).length)
      })
      .catch(() => {
        if (active) setUnread(0)
      })
    return () => { active = false }
  }, [token, location.pathname])

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = search.trim()
    navigate(query ? `/assets?search=${encodeURIComponent(query)}` : "/assets")
  }

  const isEmployee = user.roles.includes("Employee")

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><Icon name="box" size={21} /></div>
          <div>
            <div className="brand-name">Orbit<span>Ops</span></div>
            <div className="brand-caption">ASSET MANAGEMENT</div>
          </div>
          <button className="icon-button mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><Icon name="close" /></button>
        </div>

        <nav className="side-nav" aria-label="Main navigation">
          {visibleNavigation.map((group) => (
            <div className="nav-group" key={group.heading}>
              <p className="nav-heading">{group.heading}</p>
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/"}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `nav-link ${isActive || (item.path !== "/" && location.pathname.startsWith(item.path)) ? "nav-link-active" : ""}`}
                >
                  <Icon name={item.icon} size={18} />
                  <span>{item.label}</span>
                  {item.path === "/audits" && <span className="nav-soon">LIVE</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button className="profile-button" onClick={onLogout} title="Sign out">
            <span className="avatar">{initials(user.name)}</span>
            <span className="profile-meta"><strong>{user.name}</strong><small>Sign out · {user.roles[0] ?? "Team member"}</small></span>
            <Icon name="more" size={18} />
          </button>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Icon name="menu" /></button>
          <div className="breadcrumb"><span>Workspace</span><Icon name="chevron-right" size={14} /><strong>{getPageTitle(location.pathname)}</strong></div>
          <div className="topbar-actions">
            {!isEmployee && (
              <form className="global-search" onSubmit={submitSearch}>
                <Icon name="search" size={17} />
                <input aria-label="Search assets" placeholder="Search assets..." value={search} onChange={(event) => setSearch(event.target.value)} />
                <kbd>/</kbd>
              </form>
            )}
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => navigate("/notifications")}>
              <Icon name="bell" size={19} />
              {unread > 0 && <span className="notification-dot">{unread > 9 ? "9+" : unread}</span>}
            </button>
            <div className="topbar-divider" />
            <span className="topbar-greeting">Good day, <strong>{user.name.split(" ")[0]}</strong></span>
            <span className="avatar avatar-small">{initials(user.name)}</span>
          </div>
        </header>
        <main className="page-main">
          <Outlet context={{ token, user, onLogout } satisfies WorkspaceContext} />
        </main>
        <footer className="app-footer"><span>OrbitOps</span><span>Inventory clarity for every team</span><span>© {new Date().getFullYear()}</span></footer>
      </div>
    </div>
  )
}

