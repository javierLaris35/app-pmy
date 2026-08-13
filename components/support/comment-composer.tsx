"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ImagePlus, Loader2, MessageSquare, X } from "lucide-react"

interface Props {
  /** Envía el comentario. Debe resolver para que el composer se limpie. */
  onSubmit: (texto: string, internal: boolean, imagenes: File[]) => Promise<void> | void
  /** Muestra el switch de "nota interna" (solo para el equipo, no el solicitante). */
  showInternal?: boolean
  label?: string
  placeholder?: string
}

const MAX_IMAGES = 6

export function CommentComposer({ onSubmit, showInternal = false, label = "Agregar comentario", placeholder = "Escribe tu comentario…" }: Props) {
  const [texto, setTexto] = useState("")
  const [internal, setInternal] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const picked = Array.from(list).filter((f) => f.type.startsWith("image/"))
    setImages((prev) => [...prev, ...picked].slice(0, MAX_IMAGES))
    if (fileRef.current) fileRef.current.value = ""
  }

  const removeImage = (i: number) => setImages((prev) => prev.filter((_, idx) => idx !== i))

  const submit = async () => {
    if (!texto.trim() || submitting) return
    setSubmitting(true)
    try {
      await onSubmit(texto.trim(), internal, images)
      setTexto(""); setInternal(false); setImages([])
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-2 pt-4 border-t min-w-0">
      <Label>{label}</Label>
      <Textarea placeholder={placeholder} value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} />

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((f, i) => (
            <div key={i} className="relative">
              <img src={URL.createObjectURL(f)} alt={f.name} className="h-16 w-16 rounded border object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                aria-label="Quitar imagen"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button
            type="button" variant="outline" size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={images.length >= MAX_IMAGES}
          >
            <ImagePlus className="h-4 w-4 mr-2" /> Imagen
          </Button>
          {showInternal && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <Switch checked={internal} onCheckedChange={setInternal} />
              Nota interna
            </label>
          )}
        </div>
        <Button onClick={submit} disabled={!texto.trim() || submitting} size="sm">
          {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-2" />}
          Publicar
        </Button>
      </div>
    </div>
  )
}
