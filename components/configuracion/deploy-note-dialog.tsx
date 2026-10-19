"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { NoteKind, ReleaseNote } from "@/lib/types/deploy"
import { NOTE_KIND } from "@/components/release-notes/note-kind"
import { noteTechnicalTerms } from "@/lib/plain-language"
import { AlertTriangle } from "lucide-react"

interface Props {
  note: ReleaseNote | null
  onClose: () => void
  onSave: (note: ReleaseNote) => void
}

/** Editar una nota de novedades antes de publicarla. */
export function DeployNoteDialog({ note, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<ReleaseNote | null>(note)
  const [steps, setSteps] = useState("")
  const [errors, setErrors] = useState<{ title?: string; summary?: string }>({})

  useEffect(() => {
    setDraft(note)
    setSteps((note?.steps ?? []).join("\n"))
    setErrors({})
  }, [note])

  if (!draft) return null
  const set = (patch: Partial<ReleaseNote>) => setDraft((d) => (d ? { ...d, ...patch } : d))

  const save = () => {
    const e: typeof errors = {}
    if (!draft.title.trim()) e.title = "Escribe qué cambió, en pocas palabras."
    if (!draft.summary.trim()) e.summary = "Explica qué puede hacer ahora la gente."
    setErrors(e)
    if (Object.keys(e).length) return
    const cleanSteps = steps.split("\n").map((s) => s.trim()).filter(Boolean)
    onSave({
      ...draft,
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      where: draft.where?.trim() || undefined,
      route: draft.route?.trim() || undefined,
      steps: cleanSteps.length ? cleanSteps : undefined,
      fromCommit: false,
    })
  }

  return (
    <Dialog open={!!note} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar novedad</DialogTitle>
          <DialogDescription>Así lo leerán los usuarios. Sin palabras técnicas.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={draft.kind} onValueChange={(v) => set({ kind: v as NoteKind })}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(NOTE_KIND) as NoteKind[]).map((k) => (
                    <SelectItem key={k} value={k}>{NOTE_KIND[k].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Quién lo ve</Label>
              <Select value={draft.audience ?? "todos"} onValueChange={(v) => set({ audience: v as "todos" | "superadmin" })}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="superadmin">Solo superadmin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note-title">Qué cambió</Label>
            <Input id="note-title" className="h-12" value={draft.title} onChange={(e) => { set({ title: e.target.value }); setErrors((x) => ({ ...x, title: undefined })) }} />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note-summary">Qué puede hacer ahora</Label>
            <Textarea id="note-summary" rows={2} value={draft.summary} onChange={(e) => { set({ summary: e.target.value }); setErrors((x) => ({ ...x, summary: undefined })) }} />
            {errors.summary && <p className="text-xs text-destructive">{errors.summary}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="note-where">Dónde está</Label>
              <Input id="note-where" className="h-12" placeholder="Operaciones → Devoluciones" value={draft.where ?? ""} onChange={(e) => set({ where: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note-route">Pantalla (botón "Ir a verlo")</Label>
              <Input id="note-route" className="h-12" placeholder="/operaciones/devoluciones" value={draft.route ?? ""} onChange={(e) => set({ route: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note-steps">Mini tutorial (un paso por renglón)</Label>
            <Textarea id="note-steps" rows={3} placeholder={"Abre la devolución.\nElige el registro.\nConfirma."} value={steps} onChange={(e) => setSteps(e.target.value)} />
          </div>
        </div>

        {(() => {
          const terms = noteTechnicalTerms({ ...draft, steps: steps.split("\n") })
          return terms.length > 0 ? (
            <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Cambia estas palabras técnicas para que los usuarios la vean: {terms.join(", ")}
            </p>
          ) : null
        })()}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
