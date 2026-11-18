import { useCallback, useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react"
import PageHeader from "../../../components/ui/PageHeader"
import Icon from "../../../components/ui/Icon"
import { EmptyState, ErrorState, Field, LoadingState, Modal, StatusPill } from "../../../components/ui/WorkspaceUI"
import { useWorkspace } from "../../../hooks/useWorkspace"
import { apiRequest } from "../../../plugins/axios"
import { errorFields, errorMessage, formatDate, type ApiRecord, type Paginator } from "../../../utils/ui"

interface ManagedUser extends ApiRecord {
  name: string
  email: string
  is_active: boolean
  employee_id: number | null
  created_at?: string
  roles: { id: number; name: string; permissions?: { id: number; name: string }[] }[]
  employee?: { name: string; department?: { name: string } }
}

interface RoleRecord extends ApiRecord {
  name: string
  permissions: { id: number; name: string }[]
}

interface PermissionRecord extends ApiRecord {
  name: string
}

type UserModal = "create" | "edit" | "password" | null

export default function Users() {
  const { token, user } = useWorkspace()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [roles, setRoles] = useState<RoleRecord[]>([])
  const [permissions, setPermissions] = useState<PermissionRecord[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [tab, setTab] = useState<"people" | "roles">("people")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [mode, setMode] = useState<UserModal>(null)
  const [selected, setSelected] = useState<ManagedUser | null>(null)
  const [roleTarget, setRoleTarget] = useState<RoleRecord | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [rolePermissions, setRolePermissions] = useState<string[]>([])
  const [search, setSearch] = useState("")

  const loadUsers = useCallback(async () => {
    try {
      const result = await apiRequest<Paginator<ManagedUser>>(`/users?page=${page}`, { token })
      setError("")
      setUsers(result.data)
      setLastPage(result.last_page)
      setTotal(result.total)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [page, token])

  const loadAccess = useCallback(async () => {
    try {
      const [roleResult, permissionResult] = await Promise.all([
        apiRequest<RoleRecord[]>("/roles", { token }),
        apiRequest<PermissionRecord[]>("/permissions", { token }),
      ])
      setRoles(roleResult)
      setPermissions(permissionResult)
    } catch (requestError) {
      setError(`Unable to load role permissions: ${errorMessage(requestError)}`)
    }
  }, [token])

  useEffect(() => {
    let active = true
    apiRequest<Paginator<ManagedUser>>(`/users?page=${page}`, { token })
      .then((result) => {
        if (!active) return
        setUsers(result.data)
        setLastPage(result.last_page)
        setTotal(result.total)
      })
      .catch((requestError: unknown) => { if (active) setError(errorMessage(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    Promise.all([
      apiRequest<RoleRecord[]>("/roles", { token }),
      apiRequest<PermissionRecord[]>("/permissions", { token }),
    ])
      .then(([roleResult, permissionResult]) => {
        if (!active) return
        setRoles(roleResult)
        setPermissions(permissionResult)
      })
      .catch((requestError: unknown) => { if (active) setError(`Unable to load role permissions: ${errorMessage(requestError)}`) })
    return () => { active = false }
  }, [page, token])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return users
    return users.filter((item) => `${item.name} ${item.email} ${item.roles.map((role) => role.name).join(" ")}`.toLowerCase().includes(query))
  }, [users, search])

  function openCreate() {
    setSelected(null)
    setForm({ name: "", email: "", password: "", employee_id: "", role: roles[0]?.name ?? "", is_active: "true" })
    setFieldErrors({})
    setMode("create")
  }

  function openEdit(item: ManagedUser) {
    setSelected(item)
    setForm({ name: item.name, email: item.email, employee_id: String(item.employee_id ?? ""), is_active: String(item.is_active) })
    setFieldErrors({})
    setMode("edit")
  }

  async function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setFieldErrors({})
    const payload: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      employee_id: form.employee_id ? Number(form.employee_id) : null,
      is_active: form.is_active === "true",
    }
    if (mode === "create") {
      payload.password = form.password
      payload.role = form.role
    }
    try {
      await apiRequest(selected && mode === "edit" ? `/users/${selected.id}` : "/users", {
        method: selected && mode === "edit" ? "PUT" : "POST",
        token,
        body: JSON.stringify(payload),
      })
      setMode(null)
      setNotice(mode === "create" ? "User created successfully." : "User details updated.")
      await loadUsers()
    } catch (requestError) {
      setFieldErrors(errorFields(requestError))
    } finally {
      setSaving(false)
    }
  }

  async function updateRole(item: ManagedUser, role: string) {
    try {
      await apiRequest(`/users/${item.id}/role`, { method: "POST", token, body: JSON.stringify({ role }) })
      setNotice(`Role updated for ${item.name}.`)
      await loadUsers()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  async function deactivate(item: ManagedUser) {
    if (!window.confirm(`Deactivate ${item.name}? Their active sessions will be revoked.`)) return
    try {
      await apiRequest(`/users/${item.id}`, { method: "DELETE", token })
      setNotice(`${item.name} has been deactivated.`)
      await loadUsers()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return
    setSaving(true)
    setFieldErrors({})
    try {
      await apiRequest(`/users/${selected.id}/password`, { method: "POST", token, body: JSON.stringify({ password: form.password }) })
      setNotice(`Password reset for ${selected.name}. Their sessions have been revoked.`)
      setMode(null)
    } catch (requestError) {
      setFieldErrors(errorFields(requestError))
    } finally {
      setSaving(false)
    }
  }

  function openRoleEditor(role: RoleRecord) {
    setRoleTarget(role)
    setRolePermissions(role.permissions.map((permission) => permission.name))
  }

  async function savePermissions() {
    if (!roleTarget) return
    setSaving(true)
    try {
      const updated = await apiRequest<RoleRecord>(`/roles/${roleTarget.id}/permissions`, {
        method: "PUT",
        token,
        body: JSON.stringify({ permissions: rolePermissions }),
      })
      setRoles((current) => current.map((role) => role.id === updated.id ? updated : role))
      setRoleTarget(updated)
      setNotice(`${updated.name} permissions saved.`)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, PermissionRecord[]> = {}
    for (const permission of permissions) {
      const group = permission.name.split(".")[0] ?? "other"
      groups[group] ??= []
      groups[group].push(permission)
    }
    return groups
  }, [permissions])

  return (
    <>
      <PageHeader eyebrow="ADMINISTRATION" title="Users & access" description="Manage team accounts, role assignments, and what each role can do." />
      {notice && <div className="toast-notice"><Icon name="check" size={16} />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss"><Icon name="close" size={14} /></button></div>}
      {error && <ErrorState message={error} onRetry={() => { void loadUsers(); void loadAccess() }} />}
      <section className="user-overview"><div className="user-overview-intro"><span className="user-overview-icon"><Icon name="users" size={19} /></span><span><small>TEAM ACCOUNTS</small><strong>{total}</strong></span></div><div className="user-overview-stat"><span className="legend-dot green" />Active <b>{users.filter((item) => item.is_active).length}</b></div><div className="user-overview-stat"><span className="legend-dot orange" />Inactive <b>{users.filter((item) => !item.is_active).length}</b></div><div className="user-overview-stat"><span className="legend-dot violet" />Roles <b>{roles.length}</b></div></section>
      <section className="surface-card user-table-card">
        <div className="user-tabs"><button className={tab === "people" ? "user-tab-active" : ""} onClick={() => setTab("people")}><Icon name="users" size={16} /> People</button><button className={tab === "roles" ? "user-tab-active" : ""} onClick={() => setTab("roles")}><Icon name="shield" size={16} /> Roles & permissions</button><span className="user-tabs-spacer" />{tab === "people" && <button className="button button-primary button-small" onClick={openCreate}><Icon name="plus" size={15} /> Add user</button>}</div>
        {tab === "people" ? (
          <>
            <div className="table-toolbar"><div className="table-toolbar-caption"><strong>Team directory</strong><span>Manage access to your asset workspace</span></div><label className="table-search"><Icon name="search" size={16} /><input placeholder="Search users..." value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
            {loading ? <LoadingState label="Loading team members..." /> : filteredUsers.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>TEAM MEMBER</th><th>ROLE</th><th>DEPARTMENT</th><th>STATUS</th><th>ADDED</th><th></th></tr></thead><tbody>{filteredUsers.map((item) => <tr key={item.id}><td><div className="user-cell"><span className="avatar">{initials(item.name)}</span><span><strong>{item.name}</strong><small>{item.email}</small></span></div></td><td><select className="role-select" value={item.roles[0]?.name ?? ""} onChange={(event) => void updateRole(item, event.target.value)} disabled={item.id === user.id && item.roles[0]?.name === "Administrator"} aria-label={`Role for ${item.name}`}>{roles.map((role) => <option key={role.id} value={role.name}>{role.name}</option>)}</select></td><td>{item.employee?.department?.name ?? "—"}</td><td><StatusPill value={item.is_active ? "active" : "inactive"} /></td><td>{formatDate(item.created_at)}</td><td><div className="row-actions"><button className="row-action" title="Edit user" aria-label="Edit user" onClick={() => openEdit(item)}><Icon name="edit" size={15} /></button><button className="row-action" title="Reset password" aria-label="Reset password" onClick={() => { setSelected(item); setForm({ password: "" }); setFieldErrors({}); setMode("password") }}><Icon name="shield" size={15} /></button>{item.id !== user.id && item.is_active && <button className="row-action row-action-danger" title="Deactivate user" aria-label="Deactivate user" onClick={() => void deactivate(item)}><Icon name="trash" size={15} /></button>}</div></td></tr>)}</tbody></table></div> : <EmptyState icon="users" title="No team members found" description="Add a user or change your search." action={<button className="button button-primary button-small" onClick={openCreate}><Icon name="plus" size={15} /> Add user</button>} />}
            {!loading && total > 0 && <div className="table-pagination"><span>Page <strong>{page}</strong> of <strong>{lastPage}</strong></span><div><button className="icon-button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} aria-label="Previous page"><Icon name="chevron-left" size={16} /></button><button className="icon-button" disabled={page >= lastPage} onClick={() => setPage((value) => value + 1)} aria-label="Next page"><Icon name="chevron-right" size={16} /></button></div></div>}
          </>
        ) : (
          <div className="roles-layout"><div className="roles-list"><div className="roles-list-heading"><strong>Workspace roles</strong><small>Choose a role to review its permissions.</small></div>{roles.map((role) => <button key={role.id} className={`role-card ${roleTarget?.id === role.id ? "role-card-active" : ""}`} onClick={() => openRoleEditor(role)}><span className="role-card-icon"><Icon name={role.name === "Administrator" ? "shield" : "users"} size={17} /></span><span><strong>{role.name}</strong><small>{role.permissions.length} permissions</small></span><Icon name="chevron-right" size={16} /></button>)}</div>
            <div className="permission-editor">{roleTarget ? <><div className="permission-editor-header"><div><span className="eyebrow">ROLE ACCESS</span><h2>{roleTarget.name}</h2><p>Select the actions members assigned to this role can perform.</p></div><button className="button button-primary button-small" onClick={() => void savePermissions()} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button></div><div className="permission-groups">{Object.entries(groupedPermissions).map(([group, entries]) => <section className="permission-group" key={group}><h3>{group.replace(/-/g, " ")}</h3>{entries.map((permission) => <label className="permission-row" key={permission.id}><span>{permission.name.split(".").slice(1).map((part) => part.replace(/-/g, " ")).join(" ")}</span><input type="checkbox" checked={rolePermissions.includes(permission.name)} onChange={(event) => setRolePermissions((current) => event.target.checked ? [...current, permission.name] : current.filter((value) => value !== permission.name))} /></label>)}</section>)}</div></> : <EmptyState icon="shield" title="Select a role" description="Choose a role to view and manage its permissions." />}</div>
          </div>
        )}
      </section>

      {mode && <Modal title={mode === "create" ? "Add a team member" : mode === "edit" ? "Edit team member" : "Reset password"} description={mode === "password" && selected ? `Set a new password for ${selected.name}. Existing sessions will be revoked.` : "Manage the account details used to sign in and work with inventory."} onClose={() => setMode(null)}>
        <form className="modal-form" onSubmit={mode === "password" ? submitPassword : submitUser}>
          {mode !== "password" ? <>
            <Field label="Full name" name="name" value={form.name ?? ""} onChange={setFormValue(setForm)} required error={fieldErrors.name} placeholder="Enter a name" />
            <Field label="Email address" name="email" type="email" value={form.email ?? ""} onChange={setFormValue(setForm)} required error={fieldErrors.email} placeholder="name@company.com" />
            <Field label="Employee ID" name="employee_id" type="number" value={form.employee_id ?? ""} onChange={setFormValue(setForm)} error={fieldErrors.employee_id} placeholder="Optional employee record ID" />
            {mode === "create" && <>
              <Field label="Role" name="role" value={form.role ?? ""} onChange={setFormValue(setForm)} required options={roles.map((role) => ({ value: role.name, label: role.name }))} error={fieldErrors.role} />
              <Field label="Temporary password" name="password" type="password" value={form.password ?? ""} onChange={setFormValue(setForm)} required error={fieldErrors.password} placeholder="At least 8 characters" />
            </>}
            {mode === "edit" && <Field label="Account status" name="is_active" value={form.is_active ?? "true"} onChange={setFormValue(setForm)} options={[{ value: "true", label: "Active" }, { value: "false", label: "Inactive" }]} />}
          </> : <Field label="New password" name="password" type="password" value={form.password ?? ""} onChange={setFormValue(setForm)} required error={fieldErrors.password} placeholder="At least 8 characters" />}
          {Object.values(fieldErrors).length > 0 && <div className="form-alert">{Object.values(fieldErrors)[0]}</div>}
          <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setMode(null)}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? "Saving..." : mode === "create" ? "Create account" : mode === "password" ? "Reset password" : "Save changes"}</button></div>
        </form>
      </Modal>}
    </>
  )
}

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase()
}

function setFormValue(setter: Dispatch<SetStateAction<Record<string, string>>>) {
  return (name: string, value: string) => setter((current) => ({ ...current, [name]: value }))
}
