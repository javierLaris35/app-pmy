"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, ArrowRight, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { groupNews } from "@/lib/release-news"
import type { PublishedRelease } from "@/lib/types/deploy"
import { NOTE_KIND } from "./note-kind"

interface Props {
  releases: PublishedRelease[]
  open: boolean
  onClose: () => void
}

/** Aviso de novedades: izquierda la lista, derecha qué cambió, dónde está y pasos. */
export function WhatsNewDialog({ releases, open, onClose }: Props) {
  const router = useRouter()
  const { version, highlights, fixesCount } = useMemo(() => groupNews(releases), [releases])
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (open) setIdx(0)
  }, [open])

  const current = highlights[idx]
  const isLast = idx >= highlights.length - 1
  if (!current) return null
  const kind = NOTE_KIND[current.kind]
  const KindIcon = kind.icon

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
        <div className="grid md:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="border-b bg-muted/40 p-4 md:border-b-0 md:border-r">
            <p className="text-xs text-muted-foreground">Novedades</p>
            <DialogTitle className="mb-3 text-lg">Versión {version}</DialogTitle>
            <div className="hidden space-y-1 md:block">
              {highlights.map((n, i) => {
                const Icon = NOTE_KIND[n.kind].icon
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setIdx(i)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                      i === idx ? "border bg-background font-medium shadow-sm" : "text-muted-foreground hover:bg-background/60",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{n.title}</span>
                  </button>
                )
              })}
            </div>
            {fixesCount > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                También corregimos {fixesCount} {fixesCount === 1 ? "detalle pequeño" : "detalles pequeños"}.
              </p>
            )}
          </aside>

          <section className="flex min-h-[320px] flex-col p-5">
            <Badge variant="outline" className={cn("w-fit gap-1", kind.badge)}>
              <KindIcon className="h-3 w-3" /> {kind.label}
            </Badge>
            <h3 className="mt-3 text-lg font-semibold">{current.title}</h3>
            <DialogDescription className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {current.summary}
            </DialogDescription>
            {current.where && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary" /> {current.where}
              </p>
            )}
            {current.steps && current.steps.length > 0 && (
              <ol className="mt-4 space-y-2 rounded-xl border p-3 text-sm">
                {current.steps.map((s, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            )}

            <div className="mt-auto flex items-center justify-between pt-5">
              <span className="text-xs text-muted-foreground">
                {idx + 1} de {highlights.length}
              </span>
              <div className="flex gap-2">
                {current.route && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose()
                      router.push(current.route!)
                    }}
                  >
                    Ir a verlo
                  </Button>
                )}
                {isLast ? (
                  <Button size="sm" onClick={onClose} className="gap-1.5">
                    <Check className="h-4 w-4" /> Entendido
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setIdx((i) => i + 1)} className="gap-1.5">
                    Siguiente <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
