import {
  AlertCircle, Bug, CheckCircle2, Clock, FileEdit, Loader2, Sparkles, Trash2, XCircle, Eye,
} from "lucide-react"
import type { TicketStatus, TicketType } from "@/lib/types/support-ticket"

/** Icono por tipo de ticket. */
export function TipoIcon({ tipo, className = "h-4 w-4" }: { tipo: string; className?: string }) {
  switch (tipo) {
    case "mejora": return <Sparkles className={className} />
    case "cambio": return <FileEdit className={className} />
    case "eliminar": return <Trash2 className={className} />
    case "error": return <Bug className={className} />
    default: return <AlertCircle className={className} />
  }
}

export const getTipoColor = (tipo: string) =>
  ({
    mejora: "bg-blue-500/10 text-blue-500",
    cambio: "bg-yellow-500/10 text-yellow-600",
    eliminar: "bg-red-500/10 text-red-500",
    error: "bg-orange-500/10 text-orange-500",
  }[tipo] ?? "bg-gray-500/10 text-gray-500")

export const getTipoLabel = (tipo: TicketType | string) =>
  ({ mejora: "Mejora", cambio: "Cambio", eliminar: "Eliminar", error: "Error" }[tipo] ?? tipo)

/** Icono por estado. */
export function EstadoIcon({ estado, className = "h-3 w-3" }: { estado: string; className?: string }) {
  switch (estado) {
    case "pendiente": return <Clock className={className} />
    case "por_hacer": return <AlertCircle className={className} />
    case "en_progreso": return <Loader2 className={className} />
    case "en_revision": return <Eye className={className} />
    case "completado": return <CheckCircle2 className={className} />
    case "rechazado": return <XCircle className={className} />
    default: return <Clock className={className} />
  }
}

/** Color de columna (borde/acento) por estado, para el tablero. */
export const getColumnAccent = (estado: TicketStatus) =>
  ({
    pendiente: "border-t-gray-400",
    por_hacer: "border-t-violet-400",
    en_progreso: "border-t-blue-400",
    en_revision: "border-t-amber-400",
    completado: "border-t-green-400",
    rechazado: "border-t-red-400",
  }[estado] ?? "border-t-gray-400")
