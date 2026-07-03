import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Contenedor tipo "panel con banner": a diferencia de `Card` (que trae `py-6`
 * envolviendo TODO, pensado para headers sin fondo propio), `Panel` no aporta
 * ningún padding/gap propio — cada sección (`PanelHeader`, `PanelContent`)
 * define TODO su espacio. Así el fondo de color de `PanelHeader` llega hasta
 * las esquinas redondeadas del panel (por eso el `overflow-hidden`), sin
 * huecos dobles ni espacio en blanco antes del header.
 */
function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel"
      className={cn(
        "bg-card text-card-foreground flex flex-col overflow-hidden rounded-xl border shadow-sm",
        className
      )}
      {...props}
    />
  )
}

function PanelHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-header"
      className={cn("flex flex-col gap-1 border-b bg-muted/30 px-4 py-3 sm:px-6", className)}
      {...props}
    />
  )
}

function PanelTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-title"
      className={cn("flex items-center gap-2 text-base font-semibold leading-none", className)}
      {...props}
    />
  )
}

function PanelDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function PanelContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-content"
      className={cn("p-4 sm:p-6", className)}
      {...props}
    />
  )
}

export { Panel, PanelHeader, PanelTitle, PanelDescription, PanelContent }
