"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import type * as React from "react"
import { AppSidebar } from "./app-sidebar"
import { SidebarProvider, SidebarTrigger, SidebarInset } from "./ui/sidebar"
import { NotificationBell } from "./notifications/notification-bell"
import { ApprovalTray } from "./approvals/approval-tray"
import { TasksTray } from "./tareas-del-dia/tasks-tray"
import { PoAuthorizationTray } from "./maintenance/po-authorization-tray"
import { NotificationPush } from "./notifications/notification-push"
import { WhatsNewGate } from "./release-notes/whats-new-gate"
import { useAuthStore } from "@/store/auth.store"
import { usePageHeaderStore } from "@/store/page-header.store"
import { Loader } from "./loader"
import { Toaster } from "./ui/sileo-toaster"
import { CommandPalette } from "./search-packages/search-package"
import { AddShipmentDialog } from "./add-shipment/add-shipment-dialog"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { useUiStore } from "@/store/ui.store"
import { ensureClientMeta } from "@/lib/client-meta"
import { initOfflineSync } from "@/lib/offline/sync"
import { useOfflineStore } from "@/lib/offline/offline-store"
import { WifiOff, CloudUpload, MapPin, Search, Plus, Gauge, HeadsetIcon, Inbox, KanbanSquare, PlusCircle, MoreVertical } from "lucide-react"

/** Roles que pueden ver el Tablero (gestión) de Soporte. */
const SUPPORT_ADMIN_ROLES = ["admin", "superadmin", "superamin", "owner"]

/** Solo en desarrollo se muestra el acceso a la bienvenida. */

/** Títulos por ruta para el header unificado cuando la pantalla no define OperationHeader. */
const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/ingresos": "Ingresos",
  "/gastos": "Gastos",
  "/reportes": "Reportes",
  "/sucursales": "Sucursales",
  "/configuracion": "Configuración",
  "/auditoria": "Auditoría",
  "/operaciones/tareas-del-dia": "Tareas del día",
  "/operaciones/cargas": "Cargas",
  "/operaciones/desembarques": "Desembarques",
  "/operaciones/devoluciones": "Devoluciones y Recolecciones",
  "/operaciones/envios": "Envíos",
  "/operaciones/inventarios": "Inventarios",
  "/operaciones/inventarios/nuevo": "Nuevo inventario",
  "/operaciones/desembarques/nuevo": "Nuevo desembarque",
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isSupportAdmin = SUPPORT_ADMIN_ROLES.includes((user?.role || "").toLowerCase());

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
          {/* Responsive: desde 2xl (1536px) todo va en un renglón. Abajo de 2xl las acciones de la
              pantalla bajan a su propio renglón (antes empujaban el título y los botones fuera de
              la pantalla). En celular los accesos globales se juntan en el menú ⋮. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 md:px-6 md:py-3 2xl:flex-nowrap">
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
                  <div className="mt-0.5 flex min-w-0 items-center gap-x-2 text-xs text-muted-foreground md:text-sm">
                    {hDescription && <span className="hidden truncate sm:inline">{hDescription}</span>}
                    {hDescription && hSubsidiary && (
                      <span aria-hidden className="hidden text-muted-foreground/40 sm:inline">•</span>
                    )}
                    {hSubsidiary && (
                      <span className="inline-flex min-w-0 items-center gap-1 font-medium text-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="truncate">{hSubsidiary}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Acciones de la pantalla: renglón propio abajo de 2xl, en línea desde 2xl. */}
            {hActions && (
              // Abajo de 2xl: renglón propio que se acomoda en varias líneas, alineado a la derecha.
              // Sirve si la pantalla manda sus acciones sueltas (fragmento) o dentro de un div.
              <div className="order-last flex w-full min-w-0 flex-wrap items-center justify-end gap-2 2xl:order-none 2xl:w-auto 2xl:shrink-0 2xl:flex-nowrap [&>div]:flex-wrap [&>div]:justify-end 2xl:[&>div]:flex-nowrap">
                {hActions}
              </div>
            )}

            {/* Utilidades globales */}
            <div className="flex shrink-0 items-center gap-1 md:gap-2">
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

              {hActions && <span className="mx-0.5 hidden h-6 w-px bg-border 2xl:block" aria-hidden />}

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

              {/* Desde tablet: cada acceso visible. */}
              <div className="hidden items-center gap-2 md:flex">
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

                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-full hover:bg-muted text-red-600"
                          aria-label="Soporte"
                        >
                          <HeadsetIcon className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Soporte</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel>Soporte</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push("/support/tickets")}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Nueva solicitud
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/support/my-tickets")}>
                      <Inbox className="h-4 w-4 mr-2" />
                      Mis solicitudes
                    </DropdownMenuItem>
                    {isSupportAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => router.push("/support/admin")}>
                          <KanbanSquare className="h-4 w-4 mr-2" />
                          Tablero
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full text-amber-600 hover:bg-amber-100 hover:text-amber-700 ring-1 ring-amber-200"
                      onClick={() => setWelcomeOpen(true)}
                      aria-label="Ver resumen operativo del día"
                    >
                      <Gauge className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Resumen del día · pendientes y sin escaneo</TooltipContent>
                </Tooltip>

                <TasksTray />
                <ApprovalTray />
                <PoAuthorizationTray />
              </div>

              <NotificationBell />

              {/* Celular: el resto de los accesos en un solo menú. */}
              <Popover open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-muted md:hidden" aria-label="Más accesos">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" sideOffset={8} className="w-64 p-1">
                  <MobileMenuItem icon={Plus} label="Agregar envío" onClick={() => { setMobileMenuOpen(false); setAddShipmentOpen(true) }} />
                  <MobileMenuItem icon={Gauge} label="Resumen del día" onClick={() => { setMobileMenuOpen(false); setWelcomeOpen(true) }} />
                  <div className="my-1 border-t" />
                  <p className="px-2 pb-0.5 pt-1 text-xs font-medium text-muted-foreground">Soporte</p>
                  <MobileMenuItem icon={PlusCircle} label="Nueva solicitud" onClick={() => { setMobileMenuOpen(false); router.push("/support/tickets") }} />
                  <MobileMenuItem icon={Inbox} label="Mis solicitudes" onClick={() => { setMobileMenuOpen(false); router.push("/support/my-tickets") }} />
                  {isSupportAdmin && (
                    <MobileMenuItem icon={KanbanSquare} label="Tablero" onClick={() => { setMobileMenuOpen(false); router.push("/support/admin") }} />
                  )}
                  <div className="my-1 border-t" />
                  <p className="px-2 pb-0.5 pt-1 text-xs font-medium text-muted-foreground">Pendientes</p>
                  <div className="flex items-center gap-1 px-1 pb-1">
                    <TasksTray />
                    <ApprovalTray />
                    <PoAuthorizationTray />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </header>
        <NotificationPush />
        <WhatsNewGate />
        {/* Arriba menos espacio: el contenido queda pegado al encabezado. */}
        <div className="px-4 pb-4 pt-3 md:px-6 md:pb-6 md:pt-4">
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

/** Renglón del menú ⋮ de celular (accesos globales que en tablet/escritorio son iconos). */
function MobileMenuItem({ icon: Icon, label, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" className="h-9 w-full justify-start gap-2 px-2 font-normal" onClick={onClick}>
      <Icon className="h-4 w-4 text-muted-foreground" />
      {label}
    </Button>
  )
}
