export type Role = "admin" | "superadmin" | "user" | "auxiliar" | "bodega" | "subadmin"

export interface RouteAccessEntry {
    path: string
    allowedRoles?: Role[]
}

export type RouteAccessConfig = Record<string, RouteAccessEntry>