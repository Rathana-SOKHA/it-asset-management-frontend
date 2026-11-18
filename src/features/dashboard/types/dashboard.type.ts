export interface DashboardStats {
  total: number
  available: number
  assigned: number
  under_maintenance: number
  damaged: number
  disposed: number
  maintenance_cost_30_days: number
  by_status: Record<string, number>
  by_category: Record<string, number>
  by_location: Record<string, number>
  by_department?: Record<string, number>
  warranty_expiring?: Array<{
    id: number
    end_date: string
    asset?: { id: number; name: string; asset_tag: string }
  }>
  maintenance_due?: Array<{
    id: number
    description?: string | null
    scheduled_at?: string | null
    asset?: { id: number; name: string; asset_tag: string }
  }>
  recent_activities: Array<{
    id: number
    action: string
    description: string
    created_at: string
    user?: { id: number; name: string }
  }>
}
