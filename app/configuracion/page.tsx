"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { AppLayout } from "@/components/app-layout"
import { OperationHeader } from "@/components/shared/operation-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, Building2, Users, Shield, ChevronRight, Tags } from "lucide-react"
import { cn } from "@/lib/utils"
import { withAuth } from "@/hoc/withAuth"
import { CompanyPanel } from "@/components/configuracion/company-panel"
import { PermissionsPanel } from "@/components/configuracion/permissions-panel"
import { UsersPanel } from "@/components/configuracion/users-panel"
import { SubsidiaryConfigPanel } from "@/components/configuracion/subsidiary-config-panel"
import { SeventeenTrackQuotaCard } from "@/components/configuracion/seventeen-track-quota-card"
import { CatalogPanel } from "@/components/configuracion/catalog-panel"

const SECTIONS = [
  { id: "empresa", label: "Empresa", icon: Building2, description: "Datos de la empresa" },
  { id: "usuarios", label: "Usuarios", icon: Users, description: "Cuentas y accesos" },
  { id: "permisos", label: "Roles y Permisos", icon: Shield, description: "Control de acceso (RBAC)" },
  { id: "sucursales", label: "Sucursales", icon: Building2, description: "Config. operativa (FedEx)" },
  { id: "catalogos", label: "Catálogos", icon: Tags, description: "Valores de los enums" },
  { id: "general", label: "General", icon: Settings, description: "Preferencias" },
] as const

type SectionId = (typeof SECTIONS)[number]["id"]

function ConfiguracionPage() {
  const [section, setSection] = useState<SectionId>("empresa")
  const { theme, setTheme } = useTheme()

  return (
    <AppLayout>
      <div className="space-y-4">
        <OperationHeader
          icon={Settings}
          title="Configuración"
          description="Administra el sistema: empresa, usuarios y control de acceso."
        />

        {/* Selector móvil */}
        <div className="md:hidden">
          <Select value={section} onValueChange={(v) => setSection(v as SectionId)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SECTIONS.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[230px_1fr] gap-6">
          {/* Sub-sidebar */}
          <nav className="hidden md:flex flex-col gap-1">
            {SECTIONS.map((s) => {
              const Icon = s.icon
              const active = section === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-left transition-colors",
                    active ? "bg-primary/10 text-primary font-medium ring-1 ring-primary/20" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate">{s.label}</span>
                    <span className="block text-[11px] text-muted-foreground/80 truncate">{s.description}</span>
                  </span>
                  {active && <ChevronRight className="h-4 w-4" />}
                </button>
              )
            })}
          </nav>

          {/* Contenido */}
          <div className="min-w-0">
            {section === "empresa" && <CompanyPanel />}

            {section === "permisos" && <PermissionsPanel />}

            {section === "usuarios" && <UsersPanel />}

            {section === "sucursales" && <SubsidiaryConfigPanel />}

            {section === "catalogos" && <CatalogPanel />}

            {section === "general" && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Preferencias</CardTitle>
                    <CardDescription>Opciones de visualización.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="darkMode">Modo Oscuro</Label>
                        <p className="text-sm text-muted-foreground">Reduce la fatiga visual en ambientes con poca luz.</p>
                      </div>
                      <Switch
                        id="darkMode"
                        checked={theme === "dark"}
                        onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
                      />
                    </div>
                  </CardContent>
                </Card>

                <SeventeenTrackQuotaCard />
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default withAuth(ConfiguracionPage, 'configuracion')
