"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Lock, MessageSquare } from "lucide-react"
import type { TicketComment } from "@/lib/types/support-ticket"
import { avatarStyle, initialsFrom } from "@/lib/support/avatar"

interface Props {
  comments?: TicketComment[]
  /** Id del dueño del ticket, para distinguir sus mensajes de los del equipo. */
  requesterId?: string | number
  /** Fallback por nombre cuando el comentario no trae authorId (datos viejos). */
  requesterName?: string
  onImageClick?: (url: string) => void
  emptyText?: string
}

function isOwnerComment(c: TicketComment, requesterId?: string | number, requesterName?: string): boolean {
  if (c.authorId != null && requesterId != null) return String(c.authorId) === String(requesterId)
  if (requesterName) return c.usuario === requesterName
  return false
}

export function CommentThread({ comments, requesterId, requesterName, onImageClick, emptyText }: Props) {
  if (!comments || comments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
        <MessageSquare className="h-6 w-6 opacity-40" />
        <p className="text-sm">{emptyText ?? "No hay comentarios aún."}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {comments.map((c, i) => {
        const owner = isOwnerComment(c, requesterId, requesterName)
        const internal = !!c.internal
        // Dueño a la izquierda; equipo/interna a la derecha (conversación de dos lados).
        const right = !owner
        const bubble = internal
          ? "bg-amber-500/10 border-amber-500/30"
          : owner
          ? "bg-blue-500/10 border-blue-500/20"
          : "bg-violet-500/10 border-violet-500/20"
        const tag = internal ? "Nota interna" : owner ? "Solicitante" : "Equipo"
        const tagClass = internal
          ? "bg-amber-500/10 text-amber-600"
          : owner
          ? "bg-blue-500/10 text-blue-600"
          : "bg-violet-500/10 text-violet-600"

        return (
          <div key={i} className={`flex gap-2.5 ${right ? "flex-row-reverse" : ""}`}>
            <Avatar className="h-8 w-8 shrink-0 ring-2 ring-background">
              <AvatarFallback style={avatarStyle(c.usuario)} className="text-xs font-semibold">
                {initialsFrom(c.usuario)}
              </AvatarFallback>
            </Avatar>

            <div className={`min-w-0 max-w-[82%] ${right ? "items-end" : "items-start"} flex flex-col`}>
              <div className={`flex items-center gap-1.5 text-xs ${right ? "flex-row-reverse" : ""}`}>
                <span className="font-medium">{c.usuario}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${tagClass}`}>{tag}</span>
                {internal && <Lock className="h-3 w-3 text-amber-600" aria-label="Nota interna" />}
              </div>

              <div className={`mt-1 rounded-2xl border px-3 py-2 ${bubble} ${right ? "rounded-tr-sm" : "rounded-tl-sm"}`}>
                <p className="whitespace-pre-wrap break-words text-sm">{c.texto}</p>
                {c.imagenes && c.imagenes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {c.imagenes.map((img, k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => onImageClick?.(img)}
                        className="overflow-hidden rounded-lg border transition hover:ring-2 hover:ring-primary"
                      >
                        <img src={img} alt={`Adjunto ${k + 1}`} className="h-20 w-20 object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <span className="mt-1 px-1 text-[11px] text-muted-foreground">
                {new Date(c.fecha).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
