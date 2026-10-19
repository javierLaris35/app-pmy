"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

export interface ConsoleLine {
  type: string
  line: string
}

/** Colores iguales a la consola del respaldo prod→local (server-backup-panel). */
const COLOR: Record<string, string> = {
  phase: "text-sky-300",
  skip: "text-cyan-300",
  warn: "text-amber-300",
  error: "text-red-400",
  heartbeat: "text-zinc-500",
  done: "text-emerald-300",
}

/** Consola negra con autoscroll (máx. 500 líneas en pantalla). */
export function DeployConsole({ lines, className }: { lines: ConsoleLine[]; className?: string }) {
  const endRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [lines])

  if (!lines.length) return null
  return (
    <div className={cn("max-h-72 overflow-auto rounded-xl border bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed", className)}>
      {lines.slice(-500).map((l, i) => (
        <div key={i} className={cn("whitespace-pre-wrap break-all", COLOR[l.type] ?? "text-zinc-300")}>
          {l.line}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  )
}
