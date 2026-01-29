"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"

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

export function NavMenu({ items }: { items: any[] }) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const isExpanded = state === "expanded"

  const isGroupActive = (item: any) => {
    return pathname === item.url || item.items?.some((s: any) => pathname === s.url)
  }

  // Estilo común para el ítem activo (Fondo amarillo claro + Borde rojo izquierdo)
  const activeStyle = "bg-sidebar-accent/20 text-sidebar-primary font-bold shadow-sm border-l-4 border-l-sidebar-primary rounded-l-none"

  return (
    <SidebarGroup className={cn("transition-all duration-300", !isExpanded && "px-0")}>
      <SidebarMenu className="gap-1">
        {items.map((item) => {
          const active = isGroupActive(item)
          const Icon = item.icon

          return item.items && item.items.length > 0 ? (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={active}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton 
                    tooltip={item.title}
                    className={cn(
                      "h-10 transition-colors px-3",
                      active 
                        ? "text-sidebar-foreground font-semibold bg-white/50" 
                        : "text-sidebar-foreground/70 hover:bg-white/80"
                    )}
                  >
                    {Icon && <Icon className={cn("size-5 shrink-0", active ? "text-sidebar-primary" : "text-sidebar-foreground/40")} />}
                    <span className="text-[13.5px] truncate">{item.title}</span>
                    <ChevronRight className="ml-auto size-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub className="ml-4 border-l border-sidebar-border/60 pl-0 space-y-1 mt-1 overflow-hidden">
                    {item.items.map((subItem: any) => {
                      const isSubActive = pathname === subItem.url
                      const SubIcon = subItem.icon

                      return (
                        <SidebarMenuSubItem key={subItem.name}>
                          <SidebarMenuSubButton 
                            asChild 
                            isActive={isSubActive}
                            className={cn(
                              "w-full transition-all text-[13px] h-9 px-3",
                              isSubActive 
                                ? activeStyle 
                                : "text-sidebar-foreground/60 hover:text-sidebar-primary hover:bg-white/40"
                            )}
                          >
                            <Link href={subItem.url}>
                              {SubIcon && <SubIcon className="size-4 shrink-0" />}
                              <span className="truncate">{subItem.name}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton 
                asChild
                isActive={pathname === item.url} 
                tooltip={item.title}
                className={cn(
                  "h-10 transition-all px-3",
                  pathname === item.url 
                    ? activeStyle 
                    : "text-sidebar-foreground/70 hover:bg-white/80 hover:text-sidebar-primary"
                )}
              >
                <Link href={item.url}>
                  {Icon && <Icon className={cn("size-5 shrink-0", pathname === item.url ? "text-sidebar-primary" : "text-sidebar-foreground/40")} />}
                  <span className="text-[13.5px] truncate">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}