"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import type * as React from "react"
import { AppSidebar } from "./app-sidebar"
import { SidebarProvider, SidebarTrigger } from "./ui/sidebar"
import { NotificationBell } from "./notifications/notification-bell"
import { NotificationPush } from "./notifications/notification-push"
import { useAuthStore } from "@/store/auth.store"
import { Loader } from "./loader"
import { Toaster } from "./ui/sonner"
import { CommandPalette } from "./search-packages/search-package"
import { AddShipmentDialog } from "./add-shipment/add-shipment-dialog"
import { TooltipProvider } from "./ui/tooltip"
import { ensureClientMeta } from "@/lib/client-meta"
import { initOfflineSync } from "@/lib/offline/sync"
import { useOfflineStore } from "@/lib/offline/offline-store"
import { WifiOff, CloudUpload } from "lucide-react"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isAuthenticated, user, hasHydrated, checkSession } = useAuthStore();
  const router = useRouter();
  const online = useOfflineStore((s) => s.online);
  const pending = useOfflineStore((s) => s.outbox.length);

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
      <main className="flex-1 min-w-0 overflow-auto">
        {/* Barra superior: menú (hamburger) en móvil + campana de notificaciones en todas las resoluciones. */}
        <div className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="h-9 w-9 md:hidden" />
            <span className="text-sm font-semibold md:hidden">Menú</span>
          </div>
          <div className="flex items-center gap-2">
            {!online && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-700">
                <WifiOff className="h-3.5 w-3.5" /> Sin conexión
              </span>
            )}
            {pending > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-[11px] font-medium text-blue-700">
                <CloudUpload className="h-3.5 w-3.5" /> {pending} por enviar
              </span>
            )}
            <NotificationBell />
          </div>
        </div>
        <NotificationPush />
        <div className="p-4 md:p-6">
          <TooltipProvider>
            {children}
          </TooltipProvider>
          <CommandPalette />
          <AddShipmentDialog />
        </div>
      </main>
      <Toaster richColors/>
    </SidebarProvider>
  )
}