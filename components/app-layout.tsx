"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import type * as React from "react"
import { AppSidebar } from "./app-sidebar"
import { SidebarProvider, SidebarTrigger, SidebarInset } from "./ui/sidebar"
import { NotificationBell } from "./notifications/notification-bell"
import { NotificationPush } from "./notifications/notification-push"
import { useAuthStore } from "@/store/auth.store"
import { usePageHeaderStore } from "@/store/page-header.store"
import { Loader } from "./loader"
import { Toaster } from "./ui/sileo-toaster"
import { CommandPalette } from "./search-packages/search-package"
import { AddShipmentDialog } from "./add-shipment/add-shipment-dialog"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip"
import { Button } from "./ui/button"
import { useUiStore } from "@/store/ui.store"
import { ensureClientMeta } from "@/lib/client-meta"
import { initOfflineSync } from "@/lib/offline/sync"
import { useOfflineStore } from "@/lib/offline/offline-store"
import { WifiOff, CloudUpload, MapPin, Search, Plus, Sparkles, LifeBuoy } from "lucide-react"

/** Solo en desarrollo se muestra el acceso a la bienvenida. */
const IS_DEV = process.env.NODE_ENV === "development"

/** Títulos por ruta para el header unificado cuando la pantalla no define OperationHeader. */
const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/ingresos": "Ingresos",
  "/gastos": "Gastos",
  "/reportes": "Reportes",
  "/sucursales": "Sucursales",
  "/configuracion": "Configuración",
  "/auditoria": "Auditoría",
  "/operaciones/cargas": "Cargas",
  "/operaciones/desembarques": "Desembarques",
  "/operaciones/devoluciones": "Devoluciones y Recolecciones",
  "/operaciones/envios": "Envíos",
  "/operaciones/inventarios": "Inventarios",
  "/operaciones/consolidados": "Consolidados",
  "/operaciones/monitoreo": "Monitoreo",
  "/operaciones/pagos-fedex": "Pagos a FedEx",
  "/operaciones/recepcion-bodega": "Recepción en Bodega",
  "/operaciones/salidas-a-ruta": "Salidas a Ruta",
  "/operaciones/traslados": "Traslados",
  "/bodega/entrada": "Entrada a Bodega",
  "/bodega/salida": "Salida de Bodega",
  "/administracion/choferes": "Choferes",
  "/administracion/rutas": "Rutas",
  "/administracion/vehiculos": "Vehículos",
  "/administracion/zonas": "Zonas",
}

function routeTitle(pathname: string | null): string {
  if (!pathname) return "Bachoco Analytics"
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]
  const seg = pathname.split("/").filter(Boolean).pop() ?? ""
  if (!seg) return "Bachoco Analytics"
  return seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isAuthenticated, user, hasHydrated, checkSession } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const online = useOfflineStore((s) => s.online);
  const pending = useOfflineStore((s) => s.outbox.length);

  // Acciones globales que antes eran botones flotantes, ahora viven en el header.
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const setAddShipmentOpen = useUiStore((s) => s.setAddShipmentOpen);
  const setWelcomeOpen = useUiStore((s) => s.setWelcomeOpen);

  // Header unificado: datos publicados por la pantalla activa vía OperationHeader.
  const hIcon = usePageHeaderStore((s) => s.icon);
  const hTitle = usePageHeaderStore((s) => s.title);
  const hDescription = usePageHeaderStore((s) => s.description);
  const hSubsidiary = usePageHeaderStore((s) => s.subsidiaryName);
  const hOffline = usePageHeaderStore((s) => s.isOffline);
  const hTitleAccessory = usePageHeaderStore((s) => s.titleAccessory);
  const hActions = usePageHeaderStore((s) => s.actions);

  // Metadatos de cliente (IP/ciudad/equipo) + sincronización offline.
  useEffect(() => {
    ensureClientMeta();
    initOfflineSync();
  }, []);

  // 🔥 validar sesión al cargar
  useEffect(() => {
    if (hasHydrated) {
      checkSession();
    }
  }, [hasHydrated]);

  // 🔁 validar cada cierto tiempo (opcional pero recomendado)
  useEffect(() => {
    if (!hasHydrated) return;

    const interval = setInterval(() => {
      checkSession();
    }, 60000); // cada 1 min

    return () => clearInterval(interval);
  }, [hasHydrated]);

  // 🔒 protección de rutas
  useEffect(() => {
    if (hasHydrated && (!isAuthenticated || !user)) {
      router.replace("/login");
    }
  }, [isAuthenticated, user, hasHydrated]);

  if (!hasHydrated) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset className="min-w-0 overflow-auto">
       <TooltipProvider delayDuration={200}>
        {/* HEADER ÚNICO: identidad de la pantalla (icono/título/sucursal/acciones,
            publicada por OperationHeader) + utilidades globales (offline, campana,
            menú móvil). No hay segunda barra. */}
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/65">
          <div className="flex items-center gap-3 px-3 py-2.5 md:px-6 md:py-3">
            {/* Solo móvil: abre el panel. En desktop el colapso es por el rail
                (clic en la unión del sidebar con el main). */}
            <SidebarTrigger className="h-9 w-9 shrink-0 rounded-full hover:bg-muted md:hidden" />

            {/* Identidad de la pantalla */}
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {hIcon && (
                <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm ring-1 ring-primary/20 sm:grid">
                  {(() => {
                    const Icon = hIcon
                    return <Icon className="h-5 w-5" />
                  })()}
                </span>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-base font-semibold tracking-tight md:text-lg">
                    {hTitle ?? routeTitle(pathname)}
                  </h1>
                  {hTitleAccessory}
                </div>
                {(hDescription || hSubsidiary || hOffline) && (
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground md:text-sm">
                    {hDescription && <span className="truncate">{hDescription}</span>}
                    {hDescription && hSubsidiary && (
                      <span aria-hidden className="text-muted-foreground/40">•</span>
                    )}
                    {hSubsidiary && (
                      <span className="inline-flex items-center gap-1 font-medium text-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="truncate">{hSubsidiary}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Acciones de la pantalla + utilidades globales */}
            <div className="flex shrink-0 items-center gap-2">
              {hActions}

              {(!online || pending > 0) && (
                <div className="hidden items-center gap-2 sm:flex">
                  {!online && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-700">
                      <WifiOff className="h-3.5 w-3.5" /> Sin conexión
                    </span>
                  )}
                  {pending > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-[11px] font-medium text-blue-700">
                      <CloudUpload className="h-3.5 w-3.5" /> {pending}
                    </span>
                  )}
                </div>
              )}

              {(hActions || !online || pending > 0) && (
                <span className="mx-0.5 hidden h-6 w-px bg-border sm:block" aria-hidden />
              )}

              {/* Accesos globales (antes flotantes): búsqueda, alta de envío y
                  bienvenida (solo dev). Cada uno con tooltip. */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-muted text-red-600"
                    onClick={() => setSearchOpen(true)}
                    aria-label="Buscar envíos"
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Buscar envíos</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-muted"
                    onClick={() => setAddShipmentOpen(true)}
                    aria-label="Agregar envío"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Agregar envío</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-muted"
                    onClick={() => router.push("/support/tickets")}
                    aria-label="Soporte"
                  >
                    <LifeBuoy className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Soporte</TooltipContent>
              </Tooltip>

              {IS_DEV && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full text-purple-600 hover:bg-purple-100 hover:text-purple-700"
                      onClick={() => setWelcomeOpen(true)}
                      aria-label="Ver bienvenida"
                    >
                      <Sparkles className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Ver bienvenida (solo dev)</TooltipContent>
                </Tooltip>
              )}

              <NotificationBell />
            </div>
          </div>
        </header>
        <NotificationPush />
        <div className="p-4 md:p-6">
          {children}
          <CommandPalette />
          <AddShipmentDialog />
        </div>
       </TooltipProvider>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  )
}