import { Sparkles, Wand2, Zap, Wrench, type LucideIcon } from "lucide-react"
import type { NoteKind } from "@/lib/types/deploy"

/** Etiqueta, ícono y color de cada tipo de novedad (lenguaje llano). */
export const NOTE_KIND: Record<NoteKind, { label: string; icon: LucideIcon; badge: string }> = {
  nuevo: { label: "Nuevo", icon: Sparkles, badge: "border-blue-200 bg-blue-50 text-blue-700" },
  mejora: { label: "Mejora", icon: Wand2, badge: "border-violet-200 bg-violet-50 text-violet-700" },
  rapido: { label: "Más rápido", icon: Zap, badge: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  correccion: { label: "Corrección", icon: Wrench, badge: "border-slate-200 bg-slate-50 text-slate-700" },
}
