export function getPageTitle(path: string): string {
  if (path === "/") return "Overview"
  if (path === "/assets") return "Asset inventory"
  if (path === "/my-assets") return "My assigned assets"
  if (path === "/audits") return "Inventory audits"
  if (path.startsWith("/resources/")) {
    const resource = path.split("/")[2] ?? ""
    const label: Record<string, string> = {
      employees: "People & places",
      departments: "People & places",
      locations: "People & places",
      categories: "Asset catalog",
      brands: "Asset catalog",
      suppliers: "Procurement",
      purchases: "Procurement",
      warranties: "Procurement",
      maintenances: "Maintenance",
    }
    return label[resource] ?? "Records"
  }
  if (path === "/users") return "Users & access"
  if (path === "/activity") return "Activity log"
  if (path === "/notifications") return "Notifications"
  if (path === "/reports") return "Insights & reports"
  return "Workspace"
}
