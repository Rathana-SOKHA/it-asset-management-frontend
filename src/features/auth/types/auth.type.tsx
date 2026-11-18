export interface AuthUser {
  id: number
  name: string
  email: string
  employee_id: number | null
  roles: string[]
}

export interface LoginResponse {
  token: string
  user: AuthUser
}