"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import type * as React from "react"
import { AppSidebar } from "./app-sidebar"
import { SidebarProvider, SidebarTrigger } from "./ui/sidebar"
import { useAuthStore } from "@/store/auth.store"
import { Loader } from "./loader"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isAuthenticated, user, hasHydrated } = useAuthStore();
  const router = useRouter();

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
    return null; // ya está redireccionando
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <SidebarTrigger className="mb-2" />
        {children}
      </main>
    </SidebarProvider>
  )
}
