"use client"

import * as React from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

import { NavUser } from "./nav-user"
import Image from "next/image"
import { NavMenu } from "./nav-menu"
import { NavSecondary } from "./nav-secondary"
import { User } from "@/lib/types"
import {useFilteredMenu} from "@/hooks/use-filtered-menu";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: User
  className?: string
  defaultCollapsed?: boolean
  onCollapseChange?: (collapsed: boolean) => void
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const sidebarMenu: any = useFilteredMenu();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarContent>
        <div className="flex justify-center items-center pt-2">
          <Image src="/logo-no-fondo.png" alt="Logo Del Yaqui" width={200} height={200} />
        </div>
        <NavMenu items={sidebarMenu.items} />
        <NavSecondary items={sidebarMenu.secondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}


