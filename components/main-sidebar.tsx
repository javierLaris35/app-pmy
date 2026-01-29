"use client"

import React, { useState, useEffect } from "react"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { LogOut, User as UserIcon, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { navItems } from "@/lib/constants"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

interface MainSidebarProps {
  user: {
    name: string
    lastName?: string
    email: string
    role: string
  }
  onLogout: () => void
}

export function MainSidebar({ user, onLogout }: MainSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => { setIsMounted(true) }, [])
  if (!isMounted) return null

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-200 bg-white">
      <SidebarHeader className="h-20 flex items-center justify-center border-b border-slate-50">
        <div className="relative flex items-center justify-center w-full px-4 group-data-[collapsible=icon]:px-0">
          <Image 
            src="/logo.png" 
            alt="Logo Del Yaqui" 
            width={140} 
            height={40} 
            className="group-data-[collapsible=icon]:hidden transition-all"
          />
          <div className="hidden group-data-[collapsible=icon]:flex size-10 items-center justify-center bg-emerald-600 rounded-xl shadow-lg shadow-emerald-200">
             <span className="text-white font-black text-sm">DY</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0 pt-4 px-2">
        <SidebarGroup>
          <SidebarMenu className="gap-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={isActive}
                    onClick={() => router.push(item.href)}
                    className={cn(
                      "group relative flex items-center h-11 px-3 rounded-lg transition-all duration-300",
                      isActive 
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-100" 
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <Icon className={cn("size-5 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-slate-400")} />
                    <span className="font-semibold text-sm ml-3 group-data-[collapsible=icon]:hidden">
                      {item.title}
                    </span>
                    
                    {/* Indicador visual de activo */}
                    {isActive && (
                      <ChevronRight className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-slate-50 bg-slate-50/50">
        <div className="flex flex-col gap-4">
          {/* User Card */}
          <div className="flex items-center gap-3 px-2 group-data-[collapsible=icon]:hidden bg-white p-2 rounded-xl border border-slate-200/50 shadow-sm">
            <div className="size-9 rounded-lg bg-emerald-100 flex items-center justify-center border border-emerald-200">
              <UserIcon className="size-5 text-emerald-700" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-800 truncate leading-none mb-1">
                {user.name} {user.lastName}
              </span>
              <span className="text-[10px] text-slate-500 truncate">
                {user.email}
              </span>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onLogout}
            className="w-full justify-start text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg group-data-[collapsible=icon]:justify-center transition-colors"
          >
            <LogOut className="size-4 mr-3 group-data-[collapsible=icon]:mr-0" />
            <span className="font-semibold text-xs group-data-[collapsible=icon]:hidden">Cerrar Sesión</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}