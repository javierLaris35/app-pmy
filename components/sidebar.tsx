"use client"

import type * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import Image from "next/image"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { navItems } from "@/lib/constants"

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    // En una aplicación real, aquí se manejaría el cierre de sesión
    router.push("/login")
  }

  return (
    <Sidebar className="border-none" {...props}>
      <SidebarContent className="bg-white dark:bg-gray-900 p-2">
        <div className="flex justify-center items-center py-6">
          <Image src="/logo.png" alt="Logo Del Yaqui" width={160} height={160} />
        </div>
        <SidebarMenu>
           { navItems.map((item) => {
              const Icon = item.icon;
              
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.title}
                    className={`text-gray-800 dark:text-gray-200 ${pathname === item.href ? "bg-secondary/20 text-primary font-medium" : "hover:bg-secondary/10"}`}
                  >
                    <Link href={item.href} className="flex items-center gap-2">
                      <span className={`${pathname === item.href ? "text-primary" : "text-gray-600 dark:text-gray-400"}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-gray-800 dark:text-gray-200">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
