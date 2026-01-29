"use client"

import * as React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarTriggerChevron,
  useSidebar,
} from "@/components/ui/sidebar"

import { NavUser } from "./nav-user"
import Image from "next/image"
import { NavMenu } from "./nav-menu"
import { NavSecondary } from "./nav-secondary"
import { User } from "@/lib/types"
import { useFilteredMenu } from "@/hooks/use-filtered-menu"
import { cn } from "@/lib/utils"

export function AppSidebar({ user, ...props }: { user: User }) {
  const sidebarMenu: any = useFilteredMenu()
  const { state } = useSidebar()
  const isExpanded = state === "expanded"

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-sidebar-border bg-sidebar-background transition-all duration-300" 
      {...props}
    >
      <SidebarHeader className={cn(
        "flex flex-col items-center justify-center transition-all duration-300",
        isExpanded ? "h-32 px-2" : "h-20 px-0" // Reducimos px-4 a px-2 para ganar ancho
      )}>
        {isExpanded ? (
          <div className="w-full h-full flex items-center justify-center overflow-visible p-1">
            <Image 
              src="/logo-no-fondo.png" 
              alt="Logo Del Yaqui" 
              width={260} // Aumentamos el ancho base
              height={120} 
              className="w-full h-auto max-h-[110px] object-scale-down filter drop-shadow-sm" 
              // Cambiamos object-contain por object-scale-down y subimos la altura máxima
              priority 
            />
          </div>
        ) : (
          <div className="flex size-12 items-center justify-center rounded-xl bg-white border border-sidebar-border shadow-md overflow-hidden p-1">
            {/* En pequeño, le damos un poco más de tamaño (size-12) */}
            <Image 
              src="/pmy_logo.png" 
              alt="Logo" 
              width={40} 
              height={40} 
              className="object-contain scale-125" // Escalamos un poco para que se vea más
            />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-1.5 scrollbar-none">
        <NavMenu items={sidebarMenu.items} />
        <NavSecondary items={sidebarMenu.secondary} className="mt-auto pb-4" />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 p-2">
        <div className="flex items-center justify-between gap-1">
          <NavUser user={user} />
          {isExpanded && (
            <SidebarTriggerChevron className="h-8 w-8 text-sidebar-foreground/40 hover:text-sidebar-primary transition-colors" />
          )}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}