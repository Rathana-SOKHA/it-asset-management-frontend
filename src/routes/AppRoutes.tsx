import { useEffect, useState } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router"
import AppLayout from "../components/layouts/AppLayout"
import Login from "../features/auth/pages/Login"
import { logout } from "../features/auth/services/authService"
import type { AuthUser } from "../features/auth/types/auth.type"
import Dashboard from "../features/dashboard/pages/Dashboard"
import Assets from "../features/assets/pages/Assets"
import MyAssets from "../features/assets/pages/MyAssets"
import Resources from "../features/resources/pages/Resources"
import Audits from "../features/audits/pages/Audits"
import Users from "../features/users/pages/Users"
import Activity from "../features/activity/pages/Activity"
import Notifications from "../features/notifications/pages/Notifications"
import Reports from "../features/reports/pages/Reports"
import { ApiError, apiRequest } from "../plugins/axios"
import NotFound from "../components/ui/NotFound"

const TOKEN_KEY = "it_asset_token"
const USER_KEY = "it_asset_user"

function readStoredUser(): AuthUser | null {
  const value = localStorage.getItem(USER_KEY)
  if (!value) return null
  try {
    return JSON.parse(value) as AuthUser
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

function AppRoutes() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<AuthUser | null>(readStoredUser)

  useEffect(() => {
    if (!token) return
    let active = true
    apiRequest<AuthUser>("/me", { token })
      .then((freshUser) => {
        if (!active) return
        localStorage.setItem(USER_KEY, JSON.stringify(freshUser))
        setUser(freshUser)
      })
      .catch((error: unknown) => {
        if (!active || !(error instanceof ApiError) || error.status !== 401) return
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        setToken(null)
        setUser(null)
      })
    return () => { active = false }
  }, [token])

  async function handleLogout() {
    if (token) await logout(token).catch(() => undefined)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }

  function handleLogin(nextToken: string, nextUser: AuthUser) {
    localStorage.setItem(TOKEN_KEY, nextToken)
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    setToken(nextToken)
    setUser(nextUser)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={token && user ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />} />
        <Route path="/" element={token && user ? <AppLayout token={token} user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />}>
          <Route index element={<Dashboard />} />
          <Route path="assets" element={<Assets />} />
          <Route path="my-assets" element={<MyAssets />} />
          <Route path="resources/:resource" element={<Resources />} />
          <Route path="audits" element={<Audits />} />
          <Route path="users" element={<Users />} />
          <Route path="activity" element={<Activity />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="reports" element={<Reports />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes
