import { useOutletContext } from "react-router"
import type { AuthUser } from "../features/auth/types/auth.type"

export interface WorkspaceContext {
  token: string
  user: AuthUser
  onLogout: () => void
}

export function useWorkspace(): WorkspaceContext {
  return useOutletContext<WorkspaceContext>()
}
