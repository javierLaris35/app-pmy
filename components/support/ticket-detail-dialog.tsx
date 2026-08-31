"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertTriangle, Calendar, Check, ChevronDown, Copy, Gavel, Loader2, MapPin, MessageCircle,
  Network, RotateCcw, Sparkles, Tag, ThumbsDown, ThumbsUp, Timer, TimerReset, Wrench, X,
} from "lucide-react"
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
  subsidiaryName?: (id?: string) => string
  onUpdateStatus: (id: string | number, estado: TicketStatus) => void
  onUpdatePriority: (id: string | number, prioridad: TicketPriority) => void
  onAssign: (id: string | number, agentId: string | number) => void
  onAddComment: (id: string | number, texto: string, internal: boolean, imagenes: File[]) => Promise<void> | void
  onApprove?: (id: string | number) => Promise<void> | void
  onReject?: (id: string | number, note: string) => Promise<void> | void
}

const fmtDateTime = (v?: string | null) =>
  v ? new Date(v).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : null
const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—"

/** Etiqueta + valor de una propiedad de solo lectura en el panel lateral. */
function SideRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="flex min-w-0 items-center justify-end gap-1.5 text-right font-medium">{children}</span>
    </div>
  )
}

/** Bloque editable (label arriba, control abajo) del panel lateral. */
function SideField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

export function TicketDetailDialog({
  ticket, open, onOpenChange, agents, isSubmitting, subsidiaryName,
  onUpdateStatus, onUpdatePriority, onAssign, onAddComment, onApprove, onReject,
}: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [showTools, setShowTools] = useState(false)

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
      if (r.whatsapp.sent) toast({ title: "Estatus enviado al solicitante (WhatsApp + campana)" })
      else if (!r.hasPhone) toast({ title: "El solicitante no tiene teléfono registrado", variant: "destructive" })
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
  useEffect(() => { setPrompt(null); setCopied(false); setRejectMode(false); setRejectNote(""); setShowTools(false) }, [ticket?.id])

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
  const sucursal = subsidiaryName && ticket.subsidiaryId ? subsidiaryName(ticket.subsidiaryId) : null
  const commentCount = ticket.comentarios?.length ?? ticket.commentsCount ?? 0

  // Línea de tiempo derivada de las marcas de tiempo reales del ticket.
  const timeline = [
    { at: ticket.fechaCreacion, label: "Creado", dot: "bg-gray-400" },
    { at: ticket.startedAt, label: "En progreso", dot: "bg-blue-500" },
    { at: ticket.resolvedAt, label: ticket.estado === "rechazado" ? "Rechazado" : "Resuelto", dot: ticket.estado === "rechazado" ? "bg-red-500" : "bg-emerald-500" },
    { at: ticket.confirmedAt, label: "Confirmado por el solicitante", dot: "bg-emerald-600" },
  ].filter((x) => !!x.at)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl gap-0 overflow-hidden p-0 lg:max-w-6xl max-h-[92vh]">
          <div className="grid max-h-[92vh] md:grid-cols-[minmax(0,1fr)_340px]">
            {/* ===================== PANEL PRINCIPAL ===================== */}
            <div className="dialog-scroll-content min-w-0 space-y-5 overflow-y-auto p-6">
              <DialogHeader>
                <div className="flex items-start gap-3 pr-8">
                  <Avatar className="h-11 w-11 shrink-0 ring-2 ring-background">
                    <AvatarFallback style={avatarStyle(ticket.usuario)} className="text-sm font-semibold">
                      {initialsFrom(ticket.usuario)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{ticket.folio ?? `#${ticket.id}`}</span>
                      <span className="truncate">Solicitado por {ticket.usuario ?? "—"}</span>
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
                      {ticket.slaBreached && !isResolved && (
                        <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-600">
                          <TimerReset className="mr-1 h-3 w-3" /> SLA vencido
                        </Badge>
                      )}
                      {ticket.confirmedAt && (
                        <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-600">
                          <Check className="mr-1 h-3 w-3" /> Cerrado
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              {/* Descripción */}
              <section>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Descripción</p>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="whitespace-pre-wrap break-words text-sm">{ticket.descripcion || "Sin descripción."}</p>
                </div>
              </section>

              {/* Pasos para replicar */}
              {ticket.pasosReplicar && (
                <section>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Pasos para replicar</p>
                  <pre className="whitespace-pre-wrap break-words rounded-lg border bg-muted/40 p-3 font-mono text-xs">{ticket.pasosReplicar}</pre>
                </section>
              )}

              {/* Imágenes */}
              {ticket.imagenes && ticket.imagenes.length > 0 && (
                <section>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Adjuntos ({ticket.imagenes.length})</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {ticket.imagenes.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setLightbox(img)}
                        className="group relative overflow-hidden rounded border transition hover:ring-2 hover:ring-primary"
                      >
                        <img src={img} alt={`Adjunto ${i + 1}`} className="h-28 w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <Separator />

              {/* Conversación */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Conversación</h3>
                  {commentCount > 0 && <span className="text-xs text-muted-foreground">({commentCount})</span>}
                </div>
                <CommentThread
                  comments={ticket.comentarios}
                  requesterId={ticket.requesterId}
                  requesterName={ticket.usuario}
                  onImageClick={setLightbox}
                />
                <CommentComposer
                  showInternal
                  onSubmit={(texto, isInternal, imgs) => onAddComment(ticket.id, texto, isInternal, imgs)}
                />
              </section>

              {/* Herramientas de desarrollo (superadmin) — colapsable */}
              {isSuper && (
                <section className="rounded-lg border">
                  <button
                    onClick={() => setShowTools((s) => !s)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Wrench className="h-4 w-4 text-violet-600" /> Herramientas de desarrollo
                    </span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition ${showTools ? "rotate-180" : ""}`} />
                  </button>

                  {showTools && (
                    <div className="space-y-3 border-t p-3">
                      <p className="text-xs text-muted-foreground">
                        Convierte el ticket en instrucciones para un agente de IA, con archivos y componentes reales del código.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline" size="sm" className="gap-2"
                          onClick={() => generatePrompt("deterministico")}
                          disabled={loadingEngine !== null}
                        >
                          {loadingEngine === "deterministico" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Network className="h-4 w-4" />}
                          {prompt ? "Regenerar con grafo" : "Generar con grafo"}
                        </Button>
                        <Button
                          size="sm"
                          className="gap-2 bg-violet-600 text-white hover:bg-violet-700"
                          onClick={() => generatePrompt("ia")}
                          disabled={loadingEngine !== null}
                          title="Mejora el prompt con DeepSeek, conservando los archivos reales"
                        >
                          {loadingEngine === "ia" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                          {loadingEngine === "ia" ? "Generando con IA…" : "Mejorar con IA"}
                        </Button>
                      </div>

                      {(prompt || loadingEngine) && (
                        <div className="overflow-hidden rounded-lg border">
                          <div className="flex min-w-0 flex-wrap items-center gap-1.5 border-b bg-muted/60 px-3 py-2 text-xs">
                            {prompt ? (
                              <>
                                <Badge
                                  variant="outline"
                                  className={prompt.engine === "ia"
                                    ? "border-violet-500/30 bg-violet-500/10 text-violet-600"
                                    : "border-blue-500/30 bg-blue-500/10 text-blue-600"}
                                >
                                  {prompt.engine === "ia" ? "IA · DeepSeek" : "Grafo"}
                                </Badge>
                                {prompt.context.repo && <Badge variant="outline" className="font-mono">{prompt.context.repo}</Badge>}
                                <Badge
                                  variant="outline"
                                  className={
                                    prompt.context.confidence === "alta"
                                      ? "border-green-500/30 bg-green-500/10 text-green-600"
                                      : prompt.context.confidence === "media"
                                      ? "border-amber-500/30 bg-amber-500/10 text-amber-600"
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

                          {prompt && prompt.context.components.length > 0 && (
                            <div className="flex min-w-0 flex-wrap items-center gap-1.5 border-t bg-muted/30 px-3 py-2 text-xs">
                              <span className="shrink-0 text-muted-foreground">Componentes:</span>
                              {prompt.context.components.map((c) => (
                                <Badge key={c} variant="secondary" className="max-w-full break-all font-mono">{c}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {prompt?.warning && (
                        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{prompt.warning}</span>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}
            </div>

            {/* ===================== PANEL LATERAL ===================== */}
            <aside className="flex flex-col gap-4 overflow-y-auto border-t bg-muted/20 p-5 md:border-l md:border-t-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">Propiedades</p>

              <SideField label="Estado">
                <Select value={ticket.estado} onValueChange={(v) => onUpdateStatus(ticket.id, v as TicketStatus)}>
                  <SelectTrigger className="h-9 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {KANBAN_COLUMNS.map((c) => <SelectItem key={c.estado} value={c.estado}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </SideField>

              <SideField label="Prioridad">
                <Select value={ticket.prioridad ?? "media"} onValueChange={(v) => onUpdatePriority(ticket.id, v as TicketPriority)}>
                  <SelectTrigger className="h-9 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baja">Baja</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">Cambiarla recalcula el SLA y la urgencia.</p>
              </SideField>

              <SideField label="Responsable">
                <Select
                  value={ticket.asignadoAId != null ? String(ticket.asignadoAId) : ""}
                  onValueChange={(v) => onAssign(ticket.id, v)}
                >
                  <SelectTrigger className="h-9 bg-background"><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                  <SelectContent>
                    {agents.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </SideField>

              <Separator />

              <div className="space-y-2.5">
                <SideRow label="Solicitante">
                  <Avatar className="h-5 w-5 shrink-0">
                    <AvatarFallback style={avatarStyle(ticket.usuario)} className="text-[9px] font-semibold">{initialsFrom(ticket.usuario)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{ticket.usuario ?? "—"}</span>
                </SideRow>
                <SideRow label="Sucursal">
                  {sucursal ? (<><MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" /><span className="truncate">{sucursal}</span></>)
                    : <span className="text-muted-foreground">Sin sucursal</span>}
                </SideRow>
                <SideRow label="Prioridad">
                  {ticket.prioridad
                    ? <Badge variant="outline" className={`h-5 px-1.5 text-[10px] ${getTicketPriorityColor(ticket.prioridad)}`}><Tag className="mr-1 h-2.5 w-2.5" />{getPriorityLabel(ticket.prioridad)}</Badge>
                    : "—"}
                </SideRow>
                {(ticket.seccion || ticket.menuPrincipal) && (
                  <SideRow label="Ubicación">
                    <span className="truncate capitalize">
                      {(ticket.seccion ?? ticket.menuPrincipal)}{(ticket.subseccion || ticket.submenu) ? ` › ${ticket.subseccion ?? ticket.submenu}` : ""}
                    </span>
                  </SideRow>
                )}
              </div>

              <Separator />

              <div className="space-y-2.5">
                <SideRow label="Creado">{fmtDate(ticket.fechaCreacion)}</SideRow>
                <SideRow label="Inicio">{fmtDateTime(ticket.startedAt) ?? "Sin iniciar"}</SideRow>
                <SideRow label="Trabajado">
                  <span className="flex items-center gap-1"><Timer className="h-3.5 w-3.5 text-muted-foreground" />{ticket.workedHours != null ? formatHours(ticket.workedHours) : "—"}</span>
                </SideRow>
                <SideRow label="SLA objetivo">
                  <span className={ticket.slaBreached && !isResolved ? "text-red-600" : ""}>{fmtDateTime(ticket.slaDueAt) ?? "—"}</span>
                </SideRow>
              </div>

              {/* Aprobación */}
              {ticket.approvalStatus && ticket.approvalStatus !== "no_requiere" && (
                <>
                  <Separator />
                  <div className="space-y-2 rounded-lg border bg-background p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-medium"><Gavel className="h-4 w-4" /> Aprobación</span>
                      <Badge variant="outline" className={getApprovalColor(ticket.approvalStatus)}>{getApprovalLabel(ticket.approvalStatus)}</Badge>
                    </div>
                    {ticket.approvalStatus === "pendiente" && (
                      <>
                        <p className="text-xs text-muted-foreground">Requiere aprobación de la zona antes de pasar a desarrollo.</p>
                        {canApprove ? (
                          rejectMode ? (
                            <div className="space-y-2">
                              <Textarea placeholder="Motivo del rechazo…" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={2} />
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => { setRejectMode(false); setRejectNote("") }}>Cancelar</Button>
                                <Button variant="destructive" size="sm" onClick={doReject} disabled={!rejectNote.trim() || approving}>
                                  <ThumbsDown className="mr-2 h-4 w-4" /> Confirmar rechazo
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" className="bg-green-600 text-white hover:bg-green-700" onClick={doApprove} disabled={approving}>
                                {approving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ThumbsUp className="mr-2 h-4 w-4" />} Aprobar
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setRejectMode(true)} disabled={approving}>
                                <ThumbsDown className="mr-2 h-4 w-4" /> Rechazar
                              </Button>
                            </div>
                          )
                        ) : (
                          <p className="text-xs text-muted-foreground">Esperando a un autorizador de la zona.</p>
                        )}
                      </>
                    )}
                    {ticket.approvalStatus === "aprobado" && ticket.approvedByName && (
                      <p className="text-xs text-muted-foreground">Aprobado por {ticket.approvedByName}.</p>
                    )}
                    {ticket.approvalStatus === "rechazado" && (
                      <p className="break-words text-xs text-red-600">
                        Rechazado{ticket.approvedByName ? ` por ${ticket.approvedByName}` : ""}{ticket.approvalNote ? `: ${ticket.approvalNote}` : ""}.
                      </p>
                    )}
                  </div>
                </>
              )}

              <Separator />

              {/* Acciones */}
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start bg-background" onClick={notifyStatus} disabled={notifying}>
                  {notifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4 text-green-600" />}
                  Notificar estatus al solicitante
                </Button>
                {isResolved && (
                  <Button variant="outline" size="sm" className="w-full justify-start bg-background" onClick={() => onUpdateStatus(ticket.id, "en_progreso")} disabled={isSubmitting}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Reabrir ticket
                  </Button>
                )}
              </div>

              {/* Historial */}
              {timeline.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                      <Calendar className="h-3.5 w-3.5" /> Historial
                    </p>
                    <ol className="space-y-3">
                      {timeline.map((ev, i) => (
                        <li key={i} className="flex gap-2.5">
                          <div className="flex flex-col items-center">
                            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${ev.dot}`} />
                            {i < timeline.length - 1 && <span className="mt-0.5 w-px flex-1 bg-border" />}
                          </div>
                          <div className="min-w-0 pb-0.5">
                            <p className="text-xs font-medium leading-tight">{ev.label}</p>
                            <p className="text-[11px] text-muted-foreground">{fmtDateTime(ev.at)}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                </>
              )}
            </aside>
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
            className="absolute right-4 top-4 text-white hover:bg-white/20"
            onClick={() => setLightbox(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <img src={lightbox} alt="Adjunto" className="max-h-[90vh] max-w-[90vw] rounded object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  )
}
