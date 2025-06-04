"use client"

import type * as React from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { AppSidebar } from "./app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "./ui/sidebar"

interface AppLayoutProps {
  children: React.ReactNode
}

const user = {
  name: "Juan",
  lastName: "Pérez",
  email: "juan.perez@delyaqui.com.mx",
  role: "admin",
  avatar: "/avatar.jpg",
}

export function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const { toast } = useToast()

  const handleLogout = async () => { 
    try {
      //await logout()
      router.push("/login")
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
      toast({
        title: "Error",
        description: "No se pudo cerrar sesión correctamente",
        variant: "destructive",
      })
    }
  }
  
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
