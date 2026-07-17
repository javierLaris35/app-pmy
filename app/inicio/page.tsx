"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Sparkles, LayoutGrid } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { AppLayout } from "@/components/app-layout"
import { withAuth } from "@/hoc/withAuth"
import { useAuthStore } from "@/store/auth.store"
import { useFilteredMenu } from "@/hooks/use-filtered-menu"
import { cn } from "@/lib/utils"

interface Shortcut {
  label: string
  url: string
  icon: React.ElementType
}

/** Aplana el menú filtrado (ya restringido por permisos) a accesos directos "hoja". */
function flattenShortcuts(nodes: any[]): Shortcut[] {
  const out: Shortcut[] = []
  const walk = (items: any[]) => {
    for (const item of items ?? []) {
      if (!item) continue
      if (Array.isArray(item.items) && item.items.length > 0) {
        walk(item.items)
        continue
      }
      const url: string | undefined = item.url
      if (!url || url === "#" || url === "/dashboard") continue
      out.push({
        label: item.name ?? item.title ?? url,
        url,
        icon: item.icon ?? LayoutGrid,
      })
    }
  }
  walk(nodes)
  return out
}

function greeting(hour: number): string {
  if (hour < 12) return "Buenos días"
  if (hour < 19) return "Buenas tardes"
  return "Buenas noches"
}

function InicioContent() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const { items, secondary } = useFilteredMenu()

  const now = new Date()
  const hello = greeting(now.getHours())
  const firstName = (user?.name ?? "").trim().split(" ")[0] || "Bienvenido"
  const dateLabel = format(now, "EEEE dd 'de' MMMM 'de' yyyy", { locale: es })

  const shortcuts = useMemo(
    () => flattenShortcuts([...(items ?? []), ...(secondary ?? [])]),
    [items, secondary]
  )

  return (
    <AppLayout>
      <div className="space-y-6 md:space-y-8">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative flex flex-col gap-1">
            <p className="text-sm capitalize text-muted-foreground">{dateLabel}</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {hello}, {firstName}
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Bienvenido a Paquetería y Mensajería del Yaqui.
              {user?.subsidiary?.name ? ` Sucursal ${user.subsidiary.name}.` : ""} Desde
              aquí puedes acceder rápidamente a tus módulos.
            </p>
          </div>
        </section>

        {/* Accesos directos */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <LayoutGrid className="h-4 w-4 text-primary" />
            Tus accesos directos
          </h2>

          {shortcuts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-14 text-center">
              <LayoutGrid className="mb-2 h-10 w-10 text-muted-foreground/50" />
              <p className="font-medium">Aún no tienes módulos asignados</p>
              <p className="text-sm text-muted-foreground">
                Contacta a tu administrador para habilitar tus accesos.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shortcuts.map((s) => (
                <button
                  key={s.url}
                  type="button"
                  onClick={() => router.push(s.url)}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all",
                    "hover:border-primary/40 hover:shadow-sm"
                  )}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{s.label}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Placeholder de crecimiento futuro */}
        <section className="flex items-center gap-3 rounded-2xl border border-dashed bg-muted/20 p-5 text-muted-foreground">
          <Sparkles className="h-5 w-5 shrink-0 text-primary/60" />
          <div>
            <p className="text-sm font-medium text-foreground/80">Próximamente</p>
            <p className="text-sm">
              Aquí verás información relevante para tu rol: indicadores, pendientes y
              novedades.
            </p>
          </div>
        </section>
      </div>
    </AppLayout>
  )
}

export default withAuth(InicioContent)
