"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, Calendar, Check, Copy, Loader2, Lock, MessageSquare, Network, RotateCcw, Sparkles, Tag, TimerReset, User, X } from "lucide-react"
import {
  type Ticket, type TicketPriority, type TicketStatus,
  KANBAN_COLUMNS, getPriorityLabel, getTicketPriorityColor, formatHours,
} from "@/lib/types/support-ticket"
import { EstadoIcon, TipoIcon, getTipoColor, getTipoLabel } from "./support-ui"
import { SupportTicketService } from "@/lib/services/support-ticket.service"
import { useAuthStore } from "@/store/auth.store"
import { useToast } from "@/hooks/use-toast"

const SUPER_ROLES = ["superadmin", "superamin"]

interface AiPromptResult {
  prompt: string
  context: { repo: string | null; files: string[]; components: string[]; confidence: "alta" | "media" | "ninguna" }
  engine: "deterministico" | "ia"
  aiAvailable: boolean
  warning?: string
}

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

  const { toast } = useToast()
  const role = (useAuthStore((s) => s.user?.role) || "").toString().toLowerCase()
  const isSuper = SUPER_ROLES.includes(role)
  const [prompt, setPrompt] = useState<AiPromptResult | null>(null)
  const [loadingEngine, setLoadingEngine] = useState<null | "deterministico" | "ia">(null)
  const [copied, setCopied] = useState(false)

  // Al cambiar de ticket, descartar el prompt del anterior.
  useEffect(() => { setPrompt(null); setCopied(false) }, [ticket?.id])

  const generatePrompt = async (engine: "deterministico" | "ia") => {
    if (!ticket) return
    setLoadingEngine(engine)
    try {
      const res = await SupportTicketService.getAiPrompt(ticket.id, engine)
      setPrompt(res)
      if (res.warning) toast({ title: res.warning })
    } catch {
      toast({ title: "No se pudo generar el prompt", variant: "destructive" })
    } finally {
      setLoadingEngine(null)
    }
  }

  const copyPrompt = async () => {
    if (!prompt) return
    try {
      await navigator.clipboard.writeText(prompt.prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast({ title: "No se pudo copiar", variant: "destructive" })
    }
  }

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
        <DialogContent className="max-w-4xl lg:max-w-5xl max-h-[92vh]">
          <div className="dialog-scroll-content min-w-0 space-y-6 overflow-y-auto max-h-[calc(92vh-3rem)]">
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2 min-w-0">
                    <Label>Estado</Label>
                    <Select value={ticket.estado} onValueChange={(v) => onUpdateStatus(ticket.id, v as TicketStatus)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KANBAN_COLUMNS.map((c) => <SelectItem key={c.estado} value={c.estado}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 min-w-0">
                    <Label>Asignar a</Label>
                    <Select
                      value={ticket.asignadoAId != null ? String(ticket.asignadoAId) : ""}
                      onValueChange={(v) => onAssign(ticket.id, v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Responsable" /></SelectTrigger>
                      <SelectContent>
                        {agents.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 min-w-0">
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
                  </div>
                </div>
                <p className="-mt-1 text-xs text-muted-foreground">Cambiar la prioridad recalcula el SLA y el orden de urgencia.</p>

                {isResolved && (
                  <div className="pt-2 border-t">
                    <Button variant="outline" size="sm" onClick={() => onUpdateStatus(ticket.id, "en_progreso")} disabled={isSubmitting}>
                      <RotateCcw className="h-4 w-4 mr-2" /> Reabrir ticket
                    </Button>
                  </div>
                )}

                {isSuper && (
                  <div className="pt-4 border-t space-y-3 min-w-0">
                    {/* Encabezado */}
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-500/10 text-violet-600">
                        <Sparkles className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-none">Prompt para IA</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Convierte el ticket en instrucciones para un agente de IA, con archivos y componentes reales del código.
                        </p>
                      </div>
                    </div>

                    {/* Motores */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline" size="sm" className="gap-2"
                        onClick={() => generatePrompt("deterministico")}
                        disabled={loadingEngine !== null}
                      >
                        {loadingEngine === "deterministico"
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Network className="h-4 w-4" />}
                        {prompt ? "Regenerar con grafo" : "Generar con grafo"}
                      </Button>
                      <Button
                        size="sm"
                        className="gap-2 bg-violet-600 text-white hover:bg-violet-700"
                        onClick={() => generatePrompt("ia")}
                        disabled={loadingEngine !== null}
                        title="Mejora el prompt con DeepSeek, conservando los archivos reales"
                      >
                        {loadingEngine === "ia"
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Sparkles className="h-4 w-4" />}
                        {loadingEngine === "ia" ? "Generando con IA…" : "Mejorar con IA"}
                      </Button>
                    </div>

                    {/* Panel de resultado */}
                    {(prompt || loadingEngine) && (
                      <div className="overflow-hidden rounded-lg border">
                        {/* Barra de herramientas */}
                        <div className="flex flex-wrap items-center gap-1.5 border-b bg-muted/60 px-3 py-2 text-xs min-w-0">
                          {prompt ? (
                            <>
                              <Badge
                                variant="outline"
                                className={prompt.engine === "ia"
                                  ? "bg-violet-500/10 text-violet-600 border-violet-500/30"
                                  : "bg-blue-500/10 text-blue-600 border-blue-500/30"}
                              >
                                {prompt.engine === "ia" ? "IA · DeepSeek" : "Grafo"}
                              </Badge>
                              {prompt.context.repo && (
                                <Badge variant="outline" className="font-mono">{prompt.context.repo}</Badge>
                              )}
                              <Badge
                                variant="outline"
                                className={
                                  prompt.context.confidence === "alta"
                                    ? "bg-green-500/10 text-green-600 border-green-500/30"
                                    : prompt.context.confidence === "media"
                                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                    : "bg-muted text-muted-foreground"
                                }
                              >
                                confianza: {prompt.context.confidence}
                              </Badge>
                            </>
                          ) : (
                            <span className="text-muted-foreground">Generando prompt…</span>
                          )}
                          {prompt && (
                            <Button variant="ghost" size="sm" className="ml-auto h-7 gap-1.5" onClick={copyPrompt}>
                              {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                              {copied ? "Copiado" : "Copiar"}
                            </Button>
                          )}
                        </div>

                        {/* Cuerpo: prompt (envuelve, con scroll) o esqueleto de carga */}
                        {loadingEngine ? (
                          <div className="space-y-2 p-4">
                            {["w-3/4", "w-full", "w-5/6", "w-2/3", "w-full", "w-1/2"].map((w, i) => (
                              <div key={i} className={`h-3 animate-pulse rounded bg-muted ${w}`} />
                            ))}
                          </div>
                        ) : (
                          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words px-3 py-3 font-mono text-xs leading-relaxed text-foreground/90">
                            {prompt?.prompt}
                          </pre>
                        )}

                        {/* Pie: componentes candidatos */}
                        {prompt && prompt.context.components.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 border-t bg-muted/30 px-3 py-2 text-xs min-w-0">
                            <span className="shrink-0 text-muted-foreground">Componentes:</span>
                            {prompt.context.components.map((c) => (
                              <Badge key={c} variant="secondary" className="max-w-full break-all font-mono">{c}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Aviso de fallback (IA no disponible / falló) */}
                    {prompt?.warning && (
                      <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{prompt.warning}</span>
                      </div>
                    )}
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
