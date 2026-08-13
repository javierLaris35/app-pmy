"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, Calendar, Check, Copy, Gavel, Loader2, MessageCircle, Network, Play, RotateCcw, Sparkles, Tag, ThumbsDown, ThumbsUp, Timer, TimerReset, User, X } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import {
  type Ticket, type TicketPriority, type TicketStatus,
  KANBAN_COLUMNS, getPriorityLabel, getTicketPriorityColor, formatHours,
  getApprovalColor, getApprovalLabel,
} from "@/lib/types/support-ticket"
import { EstadoIcon, TipoIcon, getTipoColor, getTipoLabel } from "./support-ui"
import { CommentComposer } from "./comment-composer"
import { CommentThread } from "./comment-thread"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { avatarStyle, initialsFrom } from "@/lib/support/avatar"
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
  onAddComment: (id: string | number, texto: string, internal: boolean, imagenes: File[]) => Promise<void> | void
  onApprove?: (id: string | number) => Promise<void> | void
  onReject?: (id: string | number, note: string) => Promise<void> | void
}

export function TicketDetailDialog({
  ticket, open, onOpenChange, agents, isSubmitting,
  onUpdateStatus, onUpdatePriority, onAssign, onAddComment, onApprove, onReject,
}: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null)

  const { toast } = useToast()
  const role = (useAuthStore((s) => s.user?.role) || "").toString().toLowerCase()
  const isSuper = SUPER_ROLES.includes(role)

  const [myZones, setMyZones] = useState<string[]>([])
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectNote, setRejectNote] = useState("")
  const [approving, setApproving] = useState(false)

  useEffect(() => {
    SupportTicketService.getMyApprovalZones().then(setMyZones).catch(() => setMyZones([]))
  }, [])

  const canApprove = isSuper || (ticket?.zoneId ? myZones.includes(ticket.zoneId) : false)

  const [notifying, setNotifying] = useState(false)
  const notifyStatus = async () => {
    if (!ticket) return
    setNotifying(true)
    try {
      const r = await SupportTicketService.notifyStatus(ticket.id)
      if (r.whatsapp.sent) toast({ title: "Estatus notificado al usuario (WhatsApp + campana)" })
      else if (!r.hasPhone) toast({ title: "El usuario no tiene teléfono registrado", variant: "destructive" })
      else toast({ title: `WhatsApp no enviado: ${r.whatsapp.error ?? "error"}`, variant: "destructive" })
    } catch {
      toast({ title: "No se pudo notificar el estatus", variant: "destructive" })
    } finally {
      setNotifying(false)
    }
  }

  const doApprove = async () => {
    if (!ticket || !onApprove) return
    setApproving(true)
    try { await onApprove(ticket.id) } finally { setApproving(false) }
  }
  const doReject = async () => {
    if (!ticket || !onReject || !rejectNote.trim()) return
    setApproving(true)
    try { await onReject(ticket.id, rejectNote.trim()); setRejectMode(false); setRejectNote("") } finally { setApproving(false) }
  }
  const [prompt, setPrompt] = useState<AiPromptResult | null>(null)
  const [loadingEngine, setLoadingEngine] = useState<null | "deterministico" | "ia">(null)
  const [copied, setCopied] = useState(false)

  // Al cambiar de ticket, descartar el prompt y el modo rechazo del anterior.
  useEffect(() => { setPrompt(null); setCopied(false); setRejectMode(false); setRejectNote("") }, [ticket?.id])

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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl lg:max-w-5xl max-h-[92vh]">
          <div className="dialog-scroll-content min-w-0 space-y-6 overflow-y-auto max-h-[calc(92vh-3rem)]">
            <DialogHeader>
              <div className="flex items-start gap-3">
                <Avatar className="h-11 w-11 shrink-0 ring-2 ring-background">
                  <AvatarFallback style={avatarStyle(ticket.usuario)} className="text-sm font-semibold">
                    {initialsFrom(ticket.usuario)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{ticket.folio}</span>
                    <span className="truncate">{ticket.usuario ?? "—"}</span>
                  </div>
                  <DialogTitle className="mb-2 break-words text-xl leading-snug">{ticket.titulo}</DialogTitle>
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
                    {ticket.approvalStatus && ticket.approvalStatus !== "no_requiere" && (
                      <Badge variant="outline" className={getApprovalColor(ticket.approvalStatus)}>
                        <Gavel className="h-3 w-3 mr-1" /> {getApprovalLabel(ticket.approvalStatus)}
                      </Badge>
                    )}
                    {ticket.confirmedAt && (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                        <Check className="h-3 w-3 mr-1" /> Cerrado
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
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Descripción</p>
                  <div className="mt-1.5 rounded-lg border bg-muted/40 p-3">
                    <p className="whitespace-pre-wrap break-words text-sm">{ticket.descripcion}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border p-3 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><User className="h-3.5 w-3.5" /> Solicitante</div>
                    <div className="mt-1.5 flex items-center gap-1.5 min-w-0">
                      <Avatar className="h-5 w-5 shrink-0">
                        <AvatarFallback style={avatarStyle(ticket.usuario)} className="text-[10px] font-semibold">{initialsFrom(ticket.usuario)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate text-sm font-medium">{ticket.usuario ?? "—"}</span>
                    </div>
                  </div>
                  <div className="rounded-lg border p-3 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><User className="h-3.5 w-3.5" /> Asignado a</div>
                    <div className="mt-1.5 flex items-center gap-1.5 min-w-0">
                      {ticket.asignadoA ? (
                        <>
                          <Avatar className="h-5 w-5 shrink-0">
                            <AvatarFallback style={avatarStyle(ticket.asignadoA)} className="text-[10px] font-semibold">{initialsFrom(ticket.asignadoA)}</AvatarFallback>
                          </Avatar>
                          <span className="truncate text-sm font-medium">{ticket.asignadoA}</span>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sin asignar</span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Calendar className="h-3.5 w-3.5" /> Creado</div>
                    <p className="mt-1.5 truncate text-sm font-medium">
                      {ticket.fechaCreacion ? new Date(ticket.fechaCreacion).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }) : "—"}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">({formatHours(ticket.ageHours)})</span>
                    </p>
                  </div>
                  <div className="rounded-lg border p-3 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Play className="h-3.5 w-3.5" /> Inicio</div>
                    <p className="mt-1.5 truncate text-sm font-medium">
                      {ticket.startedAt ? new Date(ticket.startedAt).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Sin iniciar"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Timer className="h-3.5 w-3.5" /> Tiempo trabajado</div>
                    <p className="mt-1.5 truncate text-sm font-medium">{ticket.workedHours != null ? formatHours(ticket.workedHours) : "—"}</p>
                  </div>
                  <div className="rounded-lg border p-3 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><TimerReset className="h-3.5 w-3.5" /> SLA objetivo</div>
                    <p className={`mt-1.5 truncate text-sm font-medium ${ticket.slaBreached && !isResolved ? "text-red-600" : ""}`}>
                      {slaDue ? slaDue.toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </p>
                  </div>
                </div>

                {(ticket.seccion || ticket.menuPrincipal) && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Ubicación:</span>
                    {ticket.seccion && (
                      <Badge variant="secondary" className="capitalize">{ticket.seccion}{ticket.subseccion && ` › ${ticket.subseccion}`}</Badge>
                    )}
                    {ticket.menuPrincipal && (
                      <Badge variant="secondary" className="capitalize">{ticket.menuPrincipal}{ticket.submenu && ` › ${ticket.submenu}`}</Badge>
                    )}
                  </div>
                )}
                {ticket.pasosReplicar && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pasos para replicar</p>
                    <pre className="mt-1.5 whitespace-pre-wrap break-words rounded-lg border bg-muted/40 p-3 font-mono text-xs">{ticket.pasosReplicar}</pre>
                  </div>
                )}

                {ticket.imagenes && ticket.imagenes.length > 0 && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Imágenes adjuntas ({ticket.imagenes.length})</p>
                    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
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
                <div className="max-h-[360px] overflow-y-auto pr-1">
                  <CommentThread
                    comments={ticket.comentarios}
                    requesterId={ticket.requesterId}
                    requesterName={ticket.usuario}
                    onImageClick={setLightbox}
                  />
                </div>

                <CommentComposer
                  showInternal
                  onSubmit={(texto, isInternal, imgs) => onAddComment(ticket.id, texto, isInternal, imgs)}
                />
              </TabsContent>

              {/* Gestión */}
              <TabsContent value="gestion" className="space-y-4 mt-4">
                {ticket.approvalStatus && ticket.approvalStatus !== "no_requiere" && (
                  <div className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-medium"><Gavel className="h-4 w-4" /> Aprobación</span>
                      <Badge variant="outline" className={getApprovalColor(ticket.approvalStatus)}>
                        {getApprovalLabel(ticket.approvalStatus)}
                      </Badge>
                    </div>

                    {ticket.approvalStatus === "pendiente" && (
                      <>
                        <p className="text-xs text-muted-foreground">
                          Esta mejora requiere aprobación de la zona antes de pasar a desarrollo.
                        </p>
                        {canApprove ? (
                          rejectMode ? (
                            <div className="space-y-2">
                              <Textarea placeholder="Motivo del rechazo…" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={2} />
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => { setRejectMode(false); setRejectNote("") }}>Cancelar</Button>
                                <Button variant="destructive" size="sm" onClick={doReject} disabled={!rejectNote.trim() || approving}>
                                  <ThumbsDown className="h-4 w-4 mr-2" /> Confirmar rechazo
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" className="bg-green-600 text-white hover:bg-green-700" onClick={doApprove} disabled={approving}>
                                {approving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ThumbsUp className="h-4 w-4 mr-2" />} Aprobar
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setRejectMode(true)} disabled={approving}>
                                <ThumbsDown className="h-4 w-4 mr-2" /> Rechazar
                              </Button>
                            </div>
                          )
                        ) : (
                          <p className="text-xs text-muted-foreground">Esperando la aprobación de un autorizador de la zona.</p>
                        )}
                      </>
                    )}
                    {ticket.approvalStatus === "aprobado" && ticket.approvedByName && (
                      <p className="text-xs text-muted-foreground">Aprobado por {ticket.approvedByName}.</p>
                    )}
                    {ticket.approvalStatus === "rechazado" && (
                      <p className="text-xs text-red-600 break-words">
                        Rechazado{ticket.approvedByName ? ` por ${ticket.approvedByName}` : ""}{ticket.approvalNote ? `: ${ticket.approvalNote}` : ""}.
                      </p>
                    )}
                  </div>
                )}

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

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      <MessageCircle className="h-4 w-4 text-green-600" /> Notificar al usuario
                    </p>
                    <p className="text-xs text-muted-foreground">Envía el estatus actual al creador por WhatsApp y campana.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={notifyStatus} disabled={notifying}>
                    {notifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageCircle className="h-4 w-4 mr-2" />}
                    Notificar estatus
                  </Button>
                </div>

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
