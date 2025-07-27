export type Role = "admin" | "superadmin" | "user"

export interface RouteAccessEntry {
    path: string
    allowedRoles?: Role[]
}

export type RouteAccessConfig = Record<string, RouteAccessEntry>