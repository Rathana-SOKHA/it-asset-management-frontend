import { apiRequest } from "../../../plugins/axios"
import type { AuthUser, LoginResponse } from "../types/auth.type"

export interface LoginCredentials {
  email: string
  password: string
}

export function login(credentials: LoginCredentials) {
  return apiRequest<LoginResponse>("/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  })
}

export function getMe(token: string) {
  return apiRequest<AuthUser>("/me", { token })
}

export function logout(token: string) {
  return apiRequest<null>("/logout", { method: "POST", token })
}