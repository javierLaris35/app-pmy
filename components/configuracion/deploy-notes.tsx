"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { AlertTriangle, ChevronDown, Eye, EyeOff, Pencil, PenLine, RotateCcw, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { noteTechnicalTerms } from "@/lib/plain-language"
import type { ReleaseNote } from "@/lib/types/deploy"
import { NOTE_KIND } from "@/components/release-notes/note-kind"

/** Una nota se muestra a los usuarios solo si está escrita (no es un commit) y en lenguaje llano. */
export function isPublishable(n: ReleaseNote): boolean {
  return !n.fromCommit && noteTechnicalTerms(n).length === 0
}

interface Props {
  notes: ReleaseNote[]
  removed: ReleaseNote[]
  disabled: boolean
  onEdit: (n: ReleaseNote) => void
  onRemove: (n: ReleaseNote) => void
  onRestore: () => void
  onPreview: () => void
}

export function DeployNotes({ notes, removed, disabled, onEdit, onRemove, onRestore, onPreview }: Props) {
  const ready = notes.filter(isPublishable)
  const technical = notes.filter((n) => !n.fromCommit && !isPublishable(n))
  const drafts = notes.filter((n) => n.fromCommit)
  const [draftsOpen, setDraftsOpen] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Lo que verán los usuarios</p>
          <p className="text-xs text-muted-foreground">Solo novedades escritas en palabras sencillas.</p>
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={!ready.some((n) => n.kind !== "correccion")} onClick={onPreview}>
          <Eye className="h-4 w-4" /> Ver como usuario
        </Button>
      </div>

      {ready.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
          <EyeOff className="h-4 w-4 shrink-0" /> Los usuarios no verán ningún aviso con esta actualización.
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {ready.map((n) => {
            const k = NOTE_KIND[n.kind]
            const Icon = k.icon
            return (
              <li key={n.id} className="flex items-center gap-2.5 px-3 py-2 text-sm">
                <Badge variant="outline" className={cn("shrink-0 gap-1", k.badge)}><Icon className="h-3 w-3" />{k.label}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{n.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{n.summary}</p>
                </div>
                {n.audience === "superadmin" && <span className="hidden shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground sm:inline">Solo superadmin</span>}
                <RowActions disabled={disabled} onEdit={() => onEdit(n)} onRemove={() => onRemove(n)} />
              </li>
            )
          })}
        </ul>
      )}

      {technical.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60">
          <p className="flex items-center gap-2 px-3 pt-2.5 text-xs font-medium text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" /> Tienen palabras técnicas; no se mostrarán hasta corregirlas
          </p>
          <ul className="divide-y divide-amber-200/70">
            {technical.map((n) => (
              <li key={n.id} className="flex items-center gap-2.5 px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-amber-900">{n.title}</p>
                  <p className="truncate text-xs text-amber-700">Cambia: {noteTechnicalTerms(n).join(", ")}</p>
                </div>
                <RowActions disabled={disabled} onEdit={() => onEdit(n)} onRemove={() => onRemove(n)} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {drafts.length > 0 && (
        <Collapsible open={draftsOpen} onOpenChange={setDraftsOpen} className="rounded-lg border">
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm">
            <span>
              <span className="font-medium">{drafts.length} cambios sin nota</span>
              <span className="text-muted-foreground"> · no se mostrarán; escribe una nota si quieres anunciarlos</span>
            </span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", draftsOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="divide-y border-t">
              {drafts.map((n) => (
                <li key={n.id} className="flex items-center gap-2.5 px-3 py-1.5 text-sm">
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{n.title}</span>
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2" disabled={disabled} onClick={() => onEdit(n)}>
                    <PenLine className="h-3.5 w-3.5" /> Escribir nota
                  </Button>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}

      {removed.length > 0 && (
        <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={onRestore}>
          <RotateCcw className="h-3 w-3" /> Quitaste {removed.length}; regresarlas
        </button>
      )}
    </div>
  )
}

function RowActions({ disabled, onEdit, onRemove }: { disabled: boolean; onEdit: () => void; onRemove: () => void }) {
  return (
    <div className="flex shrink-0 items-center">
      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={disabled} onClick={onEdit} aria-label="Editar">
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={disabled} onClick={onRemove} aria-label="Quitar">
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
