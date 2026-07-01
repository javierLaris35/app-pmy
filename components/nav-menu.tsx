"use client"

import { ChevronRight } from "lucide-react"
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
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"

/* Estilos coherentes (tokens del tema). El `cn` usa tailwind-merge, así que estas
   clases ganan sobre el amarillo por defecto del SidebarMenuButton. */
// Ítem de nivel superior (link directo o grupo).
// En colapsado: botón un poco más grande y icono 24px (shadcn fuerza 16px por base).
const itemBase =
  "h-9 px-2 rounded-lg text-[13.5px] transition-colors [&>svg]:size-[18px] " +
  "group-data-[collapsible=icon]:!size-9 group-data-[collapsible=icon]:!p-1.5 group-data-[collapsible=icon]:[&>svg]:size-6"
const itemIdle =
  "text-sidebar-foreground/75 hover:bg-sidebar-primary/[0.07] hover:text-sidebar-foreground"
// Activo: pill en tinte rojo + barra lateral (relative + before).
const itemActive =
  "relative bg-sidebar-primary/10 text-sidebar-primary font-semibold hover:bg-sidebar-primary/10 hover:text-sidebar-primary " +
  "before:absolute before:left-0 before:inset-y-0 before:w-1.5 before:rounded-full before:bg-sidebar-primary"
// Grupo cuyo hijo está activo (no es link pero resaltamos suave).
const groupActive = "text-sidebar-foreground font-semibold bg-sidebar-primary/[0.06]"

// El TAMAÑO del icono lo controla el botón (`[&>svg]:size-*`); aquí solo el color.
const iconCls = (active: boolean) =>
  cn("shrink-0", active ? "text-sidebar-primary" : "text-sidebar-foreground/50")

export function NavMenu({ items }: { items: any[] }) {
  const pathname = usePathname()
  const { state, isMobile, setOpenMobile } = useSidebar()
  const isExpanded = isMobile || state === "expanded"
  // En móvil, cerrar el panel al navegar.
  const closeMobile = () => { if (isMobile) setOpenMobile(false) }

  const isGroupActive = (item: any) =>
    pathname === item.url || item.items?.some((s: any) => pathname === s.url)

  return (
    <SidebarGroup className={cn("px-1 transition-all duration-300", !isExpanded && "px-0")}>
      {isExpanded && (
        <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
          Navegación
        </SidebarGroupLabel>
      )}
      <SidebarMenu className="gap-0.5">
        {items.map((item) => {
          const active = isGroupActive(item)
          const Icon = item.icon

          return item.items && item.items.length > 0 ? (
            <Collapsible key={item.title} asChild defaultOpen={active} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    className={cn(itemBase, active ? groupActive : itemIdle)}
                  >
                    {Icon && <Icon className={iconCls(active)} />}
                    <span className="truncate">{item.title}</span>
                    <ChevronRight className="ml-auto size-3.5 text-sidebar-foreground/40 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub className="mx-2.5 my-1 gap-0.5 border-l border-sidebar-border/70 pl-2">
                    {item.items.map((subItem: any) => {
                      const isSubActive = pathname === subItem.url
                      const SubIcon = subItem.icon
                      return (
                        <SidebarMenuSubItem key={subItem.name}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isSubActive}
                            className={cn(
                              "h-8 px-2 rounded-md text-[13px] transition-colors",
                              isSubActive
                                ? "bg-sidebar-primary/10 text-sidebar-primary font-medium hover:bg-sidebar-primary/10 hover:text-sidebar-primary"
                                : "text-sidebar-foreground/65 hover:bg-sidebar-primary/[0.07] hover:text-sidebar-foreground",
                            )}
                          >
                            <Link href={subItem.url} onClick={closeMobile}>
                              {SubIcon && (
                                <SubIcon className={cn("size-4 shrink-0", isSubActive ? "text-sidebar-primary" : "text-sidebar-foreground/45")} />
                              )}
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
                className={cn(itemBase, pathname === item.url ? itemActive : itemIdle)}
              >
                <Link href={item.url} onClick={closeMobile}>
                  {Icon && <Icon className={iconCls(pathname === item.url)} />}
                  <span className="truncate">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
