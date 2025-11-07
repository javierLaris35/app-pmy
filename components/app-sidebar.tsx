"use client"

import * as React from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
  SidebarTriggerChevron,
  useSidebar,
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
  const { state } = useSidebar()

  return (
      <Sidebar collapsible="icon" {...props}>
        <SidebarContent>
          <div className="flex justify-center items-center pt-2">
            <Image src="/logo-no-fondo.png" alt="Logo Del Yaqui" width={200} height={200} />
          </div>
          <NavMenu items={sidebarMenu.items} />
          <NavSecondary items={sidebarMenu.secondary} className="mt-auto" />
          {state !== "expanded" && (
              <div className="flex justify-center items-center py-2">
                <SidebarTriggerChevron />
              </div>
          )}
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center justify-between gap-2">
            <NavUser user={user} />
            {state === "expanded" && <SidebarTriggerChevron className="h-12 w-12" />}
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
  )
}


