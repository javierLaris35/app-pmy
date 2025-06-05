"use client"

import type * as React from "react"
import { AppSidebar } from "./app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "./ui/sidebar"
import { User } from "@/lib/types"

interface AppLayoutProps {
  children: React.ReactNode
}



const user: User = {
  name: "Juan",
  lastName: "Pérez",
  email: "juan.perez@delyaqui.com.mx",
  role: "admin",
  avatar: "/avatar.jpg",
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar user={user}/>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <SidebarTrigger className="mb-2"/>
          {children}
        </main>
    </SidebarProvider>
  )
}
