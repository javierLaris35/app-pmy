"use client"

import { MainSidebar } from "@/components/main-sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "./ui/badge"
import { Separator } from "./ui/separator"

export function AppLayout({ children }: { children: React.ReactNode }) {
  const user = { name: "Juan", lastName: "Pérez", email: "juan.perez@delyaqui.com.mx", role: "admin" }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-white">
        <MainSidebar user={user} onLogout={() => {}} />
        
        <SidebarInset className="flex flex-col bg-slate-50/50">
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b bg-white/80 px-6 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-slate-500 hover:text-emerald-600 transition-colors" />
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 transition-none capitalize px-3 py-0.5 rounded-full text-[11px] font-bold">
                  Sucursal Obregón
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-4">
               <div className="hidden sm:flex flex-col items-end leading-none">
                  <span className="text-sm font-bold text-slate-900">{user.name}</span>
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{user.role}</span>
               </div>
            </div>
          </header>

          <main className="flex-1 p-0 overflow-y-auto">
             {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}