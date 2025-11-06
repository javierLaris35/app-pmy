"use client"

import {
  ChevronRight,
  type LucideIcon,
} from "lucide-react"
import { usePathname } from "next/navigation"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import type * as React from "react";

type NavItem = {
  title: string
  url: string
  icon?: LucideIcon
  items?: {
    name: string
    url: string
    icon: LucideIcon
  }[]
}

export function NavMenu({
  items,
}: {
  items: NavItem[]
}) {
  const { isMobile } = useSidebar()
  const pathname = usePathname()

  const isItemActive = (item: NavItem) => {
    if (pathname === item.url) return true
    if (item.items?.some(sub => pathname === sub.url)) return true
    return false
  }

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) =>
          item.items && item.items.length > 0 ? (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={isItemActive(item)}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.name}>
                        <SidebarMenuSubButton isActive={pathname === subItem.url} asChild>
                          <a
                            href={subItem.url}
                            className={
                              pathname === subItem.url
                                ? "text-primary font-medium flex items-center gap-2"
                                : "flex items-center gap-2"
                            }
                          >
                            {subItem.icon && <subItem.icon className="w-4 h-4" />}
                            <span>{subItem.name}</span>
                          </a>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton isActive={pathname === item.url} asChild>
                <a
                  href={item.url}
                  className={
                    pathname === item.url
                      ? "text-primary font-medium"
                      : ""
                  }
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}