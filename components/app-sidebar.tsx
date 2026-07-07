"use client"

import * as React from "react"
import Link from "next/link"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

import { NavUser } from "./nav-user"
import Image from "next/image"
import { NavMenu } from "./nav-menu"
import { NavSecondary } from "./nav-secondary"
import { User } from "@/lib/types"
import { useFilteredMenu } from "@/hooks/use-filtered-menu"
import { Route as RouteIcon, Radio } from "lucide-react"
import { hasPermission } from "@/lib/access/permissions"

/** Versión de la app (sube con cambios menores/medianos/mayores). */
const APP_VERSION = "v2.0.0"

/** Accesos visibles SOLO en desarrollo (herramientas experimentales). */
const IS_DEV = process.env.NODE_ENV === "development"
const DEV_ITEMS = [{ title: "Optimizador Rutas", url: "/dev/route-optimizer", icon: RouteIcon }]

export function AppSidebar({ user, ...props }: { user: User }) {
  const sidebarMenu: any = useFilteredMenu()
  // Monitoreo de Rutas: experimental, exclusivo superadmin (permiso `monitoreoRutas`).
  // Va justo debajo del Optimizador de Rutas (dev) en el nav secundario.
  const monitoreoRutasItem = hasPermission(user, "monitoreoRutas")
    ? [{ title: "Monitoreo de Rutas", url: "/monitoreo-rutas", icon: Radio }]
    : []
  const secondaryItems = [
    ...(sidebarMenu.secondary ?? []),
    ...(IS_DEV ? DEV_ITEMS : []),
    ...monitoreoRutasItem,
  ]

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className="transition-all duration-300"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* Marca tipo "team switcher" de shadcn, sin flechas. Clic → dashboard. */}
            <SidebarMenuButton asChild size="lg" className="h-16 gap-2.5 group-data-[collapsible=icon]:!h-8">
              <Link href="/dashboard">
                <div className="flex aspect-square size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sidebar-primary/10 group-data-[collapsible=icon]:size-8">
                  <Image src="/logo-app.png" alt="PMY App" width={56} height={56} className="size-full object-contain" />
                </div>
                <div className="grid min-w-0 flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-semibold">PMY App</span>
                  <span className="truncate text-xs text-muted-foreground">{APP_VERSION}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-1 scrollbar-none">
        <NavMenu items={sidebarMenu.items} />
        <NavSecondary items={secondaryItems} className="mt-auto px-1 pb-4 group-data-[collapsible=icon]:px-0" />
      </SidebarContent>

      <SidebarFooter className="p-2">
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}