"use client"

import * as React from "react"
import { LucideIcon } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
  }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const pathname = usePathname()

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = pathname === item.url
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  isActive={active}
                  asChild
                  className={cn(
                    "h-9 px-2 rounded-lg text-[13.5px] transition-colors [&>svg]:size-[18px] group-data-[collapsible=icon]:!size-9 group-data-[collapsible=icon]:!p-1.5 group-data-[collapsible=icon]:[&>svg]:size-6",
                    active
                      ? "bg-sidebar-primary/10 text-sidebar-primary font-semibold hover:bg-sidebar-primary/10 hover:text-sidebar-primary"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-primary/[0.07] hover:text-sidebar-foreground",
                  )}
                >
                  <a href={item.url}>
                    <item.icon className={cn("size-[18px] shrink-0", active ? "text-sidebar-primary" : "text-sidebar-foreground/50")} />
                    <span className="truncate">{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
