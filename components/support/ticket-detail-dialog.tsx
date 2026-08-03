"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Lock, MessageSquare, RotateCcw, Tag, TimerReset, User, X } from "lucide-react"
import {
  type Ticket, type TicketPriority, type TicketStatus,
  KANBAN_COLUMNS, getPriorityLabel, getTicketPriorityColor, formatHours,
} from "@/lib/types/support-ticket"
import { EstadoIcon, TipoIcon, getTipoColor, getTipoLabel } from "./support-ui"

interface Agent { id: string | number; nombre: string; email?: string }

interface Props {
  ticket: Ticket | null
  open: boolean
  onOpenChange: (open: boolean) => void
  agents: Agent[]
  isSubmitting?: boolean
  onUpdateStatus: (id: string | number, estado: TicketStatus) => void
  onUpdatePriority: (id: string | number, prioridad: TicketPriority) => void
  onAssign: (id: string | number, agentId: string | number) => void
  onAddComment: (id: string | number, texto: string, internal: boolean) => void
}

export function TicketDetailDialog({
  ticket, open, onOpenChange, agents, isSubmitting,
  onUpdateStatus, onUpdatePriority, onAssign, onAddComment,
}: Props) {
  const [newComment, setNewComment] = useState("")
  const [internal, setInternal] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)

  if (!ticket) return null

  const isResolved = ticket.estado === "completado" || ticket.estado === "rechazado"
  const slaDue = ticket.slaDueAt ? new Date(ticket.slaDueAt) : null

  const submitComment = () => {
    if (!newComment.trim()) return
    onAddComment(ticket.id, newComment.trim(), internal)
    setNewComment("")
    setInternal(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <div className="dialog-scroll-content space-y-6">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground font-mono">{ticket.folio}</div>
                  <DialogTitle className="text-xl mb-2">{ticket.titulo}</DialogTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={getTipoColor(ticket.tipo)}>
                      <TipoIcon tipo={ticket.tipo} className="h-3.5 w-3.5" />
                      <span className="ml-1">{getTipoLabel(ticket.tipo)}</span>
                    </Badge>
                    <Badge variant="outline">
                      <EstadoIcon estado={ticket.estado} className="h-3 w-3" />
                      <span className="ml-1 capitalize">{ticket.estado.replace("_", " ")}</span>
                    </Badge>
                    {ticket.prioridad && (
                      <Badge variant="outline" className={getTicketPriorityColor(ticket.prioridad)}>
                        <Tag className="h-3 w-3 mr-1" />
                        {getPriorityLabel(ticket.prioridad)}
                      </Badge>
                    )}
                    {ticket.slaBreached && !isResolved && (
                      <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
                        <TimerReset className="h-3 w-3 mr-1" /> SLA vencido
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </DialogHeader>

            <Tabs defaultValue="detalles" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="detalles">Detalles</TabsTrigger>
                <TabsTrigger value="comentarios">
                  Comentarios
                  {ticket.comentarios && ticket.comentarios.length > 0 && (
                    <span className="ml-1">({ticket.comentarios.length})</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="gestion">Gestión</TabsTrigger>
              </TabsList>

              {/* Detalles */}
              <TabsContent value="detalles" className="space-y-4 mt-4">
                <div>
                  <Label className="text-sm font-medium">Descripción</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{ticket.descripcion}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Solicitante</Label>
                    <p className="text-sm mt-1 flex items-center gap-1"><User className="h-3.5 w-3.5" />{ticket.usuario ?? "—"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Creado</Label>
                    <p className="text-sm mt-1 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {ticket.fechaCreacion ? new Date(ticket.fechaCreacion).toLocaleString("es-MX") : ""}
                      <span className="text-muted-foreground">({formatHours(ticket.ageHours)})</span>
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Asignado a</Label>
                    <p className="text-sm mt-1">{ticket.asignadoA ?? "Sin asignar"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">SLA objetivo</Label>
                    <p className={`text-sm mt-1 ${ticket.slaBreached && !isResolved ? "text-red-600 font-medium" : ""}`}>
                      {slaDue ? slaDue.toLocaleString("es-MX") : "—"}
                    </p>
                  </div>
                </div>

                {ticket.seccion && (
                  <div>
                    <Label className="text-sm font-medium">Sección</Label>
                    <p className="text-sm mt-1 capitalize">
                      {ticket.seccion}{ticket.subseccion && ` › ${ticket.subseccion}`}
                    </p>
                  </div>
                )}
                {ticket.menuPrincipal && (
                  <div>
                    <Label className="text-sm font-medium">Ubicación en menú</Label>
                    <p className="text-sm mt-1 capitalize">
                      {ticket.menuPrincipal}{ticket.submenu && ` › ${ticket.submenu}`}
                    </p>
                  </div>
                )}
                {ticket.pasosReplicar && (
                  <div>
                    <Label className="text-sm font-medium">Pasos para replicar</Label>
                    <pre className="text-sm mt-1 whitespace-pre-wrap bg-muted p-3 rounded">{ticket.pasosReplicar}</pre>
                  </div>
                )}

                {ticket.imagenes && ticket.imagenes.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Imágenes adjuntas ({ticket.imagenes.length})</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {ticket.imagenes.map((img, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setLightbox(img)}
                          className="group relative overflow-hidden rounded border hover:ring-2 hover:ring-primary transition"
                        >
                          <img src={img} alt={`Adjunto ${i + 1}`} className="w-full h-32 object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Comentarios */}
              <TabsContent value="comentarios" className="space-y-4 mt-4">
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {ticket.comentarios && ticket.comentarios.length > 0 ? (
                    ticket.comentarios.map((c, i) => (
                      <div key={i} className={`flex gap-3 p-3 rounded-lg ${c.internal ? "bg-amber-500/10 border border-amber-500/20" : "bg-muted"}`}>
                        <Avatar className="h-8 w-8"><AvatarFallback>{(c.usuario ?? "?").charAt(0)}</AvatarFallback></Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <span className="text-sm font-medium flex items-center gap-1">
                              {c.usuario}
                              {c.internal && <Lock className="h-3 w-3 text-amber-600" aria-label="Nota interna" />}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">{new Date(c.fecha).toLocaleString("es-MX")}</span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{c.texto}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay comentarios aún.</p>
                  )}
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <Label>Agregar comentario</Label>
                  <Textarea placeholder="Escribe tu comentario..." value={newComment} onChange={(e) => setNewComment(e.target.value)} rows={3} />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                      <Switch checked={internal} onCheckedChange={setInternal} />
                      Nota interna (no visible al solicitante)
                    </label>
                    <Button onClick={submitComment} disabled={!newComment.trim() || isSubmitting} size="sm">
                      <MessageSquare className="h-4 w-4 mr-2" /> Publicar
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Gestión */}
              <TabsContent value="gestion" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={ticket.estado} onValueChange={(v) => onUpdateStatus(ticket.id, v as TicketStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {KANBAN_COLUMNS.map((c) => <SelectItem key={c.estado} value={c.estado}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Asignar a</Label>
                  <Select
                    value={ticket.asignadoAId != null ? String(ticket.asignadoAId) : ""}
                    onValueChange={(v) => onAssign(ticket.id, v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Seleccionar responsable" /></SelectTrigger>
                    <SelectContent>
                      {agents.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Prioridad</Label>
                  <Select value={ticket.prioridad ?? "media"} onValueChange={(v) => onUpdatePriority(ticket.id, v as TicketPriority)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baja">Baja</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Cambiar la prioridad recalcula el SLA y el orden de urgencia.</p>
                </div>

                {isResolved && (
                  <div className="pt-2 border-t">
                    <Button variant="outline" size="sm" onClick={() => onUpdateStatus(ticket.id, "en_progreso")} disabled={isSubmitting}>
                      <RotateCcw className="h-4 w-4 mr-2" /> Reabrir ticket
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-label="Vista de imagen"
        >
          <Button
            variant="ghost" size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setLightbox(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <img src={lightbox} alt="Adjunto" className="max-h-[90vh] max-w-[90vw] object-contain rounded" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  )
}
