"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

/*
 * Loader oficial de la app (diseño "Llenado" + "Compacto").
 *
 * - <PmyLoader>  : el venado se pinta de abajo hacia arriba con una barra y
 *                  mensajes en llano que van cambiando. Para esperas de pantalla,
 *                  tarjeta o diálogo (búsquedas, consultas a FedEx, subidas, reportes).
 * - <PmySpinner> : versión chica (anillo + venado) para botones, celdas y buscadores.
 *                  Toma el tamaño y el color de su className, igual que el Loader2 de antes.
 */

const LOGO = "/logo-app.png"
const EMBER = "#e8651c"
const AMBER = "#f6b21a"

export const LOADER_MESSAGES = {
  general: ["Conectando con el servidor", "Consultando base de datos", "Preparando resultados", "Casi listo"],
  search: ["Buscando la guía", "Consultando base de datos", "Armando el expediente"],
  fedex: ["Conectando con FedEx", "Consultando guía por guía", "Leyendo los estatus", "Preparando resultados"],
  ld: ["Consultando base de datos", "Revisando vencimientos", "Separando activas y LD", "Preparando resultados"],
  upload: ["Leyendo el archivo", "Validando guías", "Guardando la información", "Terminando"],
  report: ["Consultando base de datos", "Juntando la información", "Armando el reporte"],
} as const

export type LoaderMessagesKey = keyof typeof LOADER_MESSAGES

type Variant = "block" | "page" | "overlay"
type Size = "sm" | "md" | "lg"

const LOGO_SIZE: Record<Size, number> = { sm: 64, md: 104, lg: 136 }
const BAR_WIDTH: Record<Size, string> = { sm: "w-28", md: "w-40", lg: "w-52" }

interface PmyLoaderProps {
  /** block: dentro de una tarjeta o zona · page: pantalla completa sin fondo · overlay: bloquea la pantalla */
  variant?: Variant
  size?: Size
  /** Avance real 0–100. Si no se manda, la barra avanza sola y no muestra porcentaje. */
  progress?: number
  /** Mensajes que rotan. Puede ser un juego predefinido o una lista propia. */
  messages?: LoaderMessagesKey | readonly string[]
  /** Texto fijo (no rota). Tiene prioridad sobre messages. */
  text?: string
  /** Solo overlay: sin fondo difuminado. */
  transparent?: boolean
  className?: string
}

/** Avance simulado: sube rápido al principio y se frena antes del 92% hasta que termine la carga. */
function useSimulatedProgress(enabled: boolean) {
  const [p, setP] = useState(4)
  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => setP((v) => (v >= 92 ? v : v + Math.max(0.4, (92 - v) * 0.07))), 300)
    return () => clearInterval(id)
  }, [enabled])
  return p
}

function useRotatingMessage(list: readonly string[]) {
  const [i, setI] = useState(0)
  // La llave es el contenido, no el arreglo: el padre puede mandar uno nuevo en cada render.
  const key = list.join("|")
  useEffect(() => {
    if (key.split("|").length < 2) return
    const id = setInterval(() => setI((v) => v + 1), 2200)
    return () => clearInterval(id)
  }, [key])
  return { message: list[i % list.length], index: i }
}

export function PmyLoader({
  variant = "block",
  size,
  progress,
  messages = "general",
  text,
  transparent = false,
  className,
}: PmyLoaderProps) {
  const real = typeof progress === "number"
  const simulated = useSimulatedProgress(!real)
  const pct = Math.round(Math.min(100, Math.max(0, real ? progress! : simulated)))

  const list = typeof messages === "string" ? LOADER_MESSAGES[messages] : messages
  const { message, index } = useRotatingMessage(text ? [text] : list)

  const s = size ?? (variant === "block" ? "md" : "lg")
  const logo = LOGO_SIZE[s]

  const body = (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-3.5">
      <div className="relative" style={{ width: logo, height: logo }}>
        <Image src={LOGO} alt="" width={logo} height={logo} priority className="h-full w-full object-contain opacity-20 grayscale" />
        <Image
          src={LOGO}
          alt=""
          width={logo}
          height={logo}
          priority
          className="absolute inset-0 h-full w-full object-contain transition-[clip-path] duration-300 ease-out"
          style={{ clipPath: `inset(${100 - pct}% 0 0 0)` }}
        />
      </div>
      <div className={cn("h-1 overflow-hidden rounded-full bg-muted", BAR_WIDTH[s])}>
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${EMBER}, ${AMBER})` }}
        />
      </div>
      {real && <span className="font-mono text-xs font-medium tabular-nums text-foreground">{pct}%</span>}
      <p className="min-h-5 max-w-xs text-center text-sm font-medium text-muted-foreground">
        <span key={index} className="inline-block animate-in fade-in slide-in-from-bottom-1 duration-500">
          {text ?? `${message}…`}
        </span>
      </p>
    </div>
  )

  if (variant === "overlay") {
    return (
      <div
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200",
          transparent ? "bg-transparent" : "bg-background/80 backdrop-blur-sm",
          className,
        )}
      >
        <div className="rounded-xl border bg-card px-10 py-7 shadow-lg">{body}</div>
      </div>
    )
  }

  if (variant === "page") {
    return <div className={cn("flex h-screen w-full items-center justify-center", className)}>{body}</div>
  }

  return <div className={cn("flex w-full items-center justify-center py-10", className)}>{body}</div>
}

interface PmySpinnerProps {
  className?: string
}

/** Spinner chico con el venado. Tamaño y color salen del className (h-4 w-4, text-primary, mr-2…). */
export function PmySpinner({ className }: PmySpinnerProps) {
  return (
    <span aria-hidden className={cn("relative inline-flex h-4 w-4 shrink-0 items-center justify-center", className)}>
      <span className="absolute inset-0 rounded-full border-2 border-current opacity-20" />
      <span
        className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-current motion-reduce:[animation-duration:2s]"
        style={{ borderRightColor: AMBER }}
      />
      <Image src={LOGO} alt="" width={32} height={32} className="h-[58%] w-[58%] object-contain" />
    </span>
  )
}
