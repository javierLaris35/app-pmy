"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import type * as React from "react"
import { AppSidebar } from "./app-sidebar"
import { SidebarProvider } from "./ui/sidebar"
import { useAuthStore } from "@/store/auth.store"
import { Loader } from "./loader"
import { Toaster } from "./ui/sonner"
import { CommandPalette } from "./search-packages/search-package"
import { AddShipmentDialog } from "./add-shipment/add-shipment-dialog"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isAuthenticated, user, hasHydrated, checkSession } = useAuthStore();
  const router = useRouter();

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
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        {children}
        <CommandPalette />
        <AddShipmentDialog />
      </main>
      <Toaster richColors/>
    </SidebarProvider>
  )
}