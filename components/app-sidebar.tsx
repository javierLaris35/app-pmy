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

import { sidebarMenu } from "@/lib/constants"
import { NavUser } from "./nav-user"
import Image from "next/image"
import { NavMenu } from "./nav-menu"
import { NavSecondary } from "./nav-secondary"
import { User } from "@/lib/types"


export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user: User }) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarContent>
        <div className="flex justify-center items-center pt-2">
            <Image src="/logo.png" alt="Logo Del Yaqui" width={100} height={100} />
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
