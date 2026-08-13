"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  Clock,
  FileEdit,
  MessageSquare,
  Sparkles,
  Trash2,
  XCircle,
  Calendar,
  User,
  RefreshCw,
  Plus,
  Loader2,
} from "lucide-react"
import { Inbox } from "lucide-react"
import Link from "next/link"
import {
  type Ticket,
  type TicketStatus,
  getTicketTypeColor,
  getTicketStatusColor,
  getStatusLabel,
  getApprovalColor,
  getApprovalLabel,
} from "@/lib/types/support-ticket"
import { SupportTicketService } from "@/lib/services/support-ticket.service"
import { AppLayout } from "@/components/app-layout"
import { OperationHeader } from "@/components/shared/operation-header"
import { CommentComposer } from "@/components/support/comment-composer"
import { CommentThread } from "@/components/support/comment-thread"

export default function MyTicketsPage() {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [filter, setFilter] = useState<"todos" | TicketStatus>("todos")
  const [isLoading, setIsLoading] = useState(true)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [resolutionRejectMode, setResolutionRejectMode] = useState(false)
  const [resolutionNote, setResolutionNote] = useState("")
  const [confirming, setConfirming] = useState(false)

  // El dueño del ticket responde/comenta (sin notas internas).
  const onAddComment = async (texto: string, _internal: boolean, imagenes: File[]) => {
    if (!selectedTicket) return
    const updated = await SupportTicketService.addComment({ ticketId: selectedTicket.id, texto, imagenes })
    setSelectedTicket(updated)
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
  }

  // Al cambiar de ticket, descartar el modo "no resuelto".
  useEffect(() => { setResolutionRejectMode(false); setResolutionNote("") }, [selectedTicket?.id])

  // El creador confirma si su ticket quedó resuelto (cierra) o no (regresa a Por hacer).
  const doConfirmResolution = async (resolved: boolean, note?: string) => {
    if (!selectedTicket) return
    setConfirming(true)
    try {
      const updated = await SupportTicketService.confirmResolution(selectedTicket.id, resolved, note)
      setSelectedTicket(updated)
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      setResolutionRejectMode(false)
      setResolutionNote("")
    } catch (e) {
      console.error("Error al confirmar resolución:", e)
    } finally {
      setConfirming(false)
    }
  }

  // Cargar tickets del usuario al montar el componente
  useEffect(() => {
    loadMyTickets()
  }, [])

  const loadMyTickets = async () => {
    setIsLoading(true)
    try {
      const response = await SupportTicketService.getMyTickets()
      setTickets(response.tickets)
    } catch (error) {
      console.error("Error al cargar tickets:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    loadMyTickets()
  }

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "mejora":
        return <Sparkles className="h-4 w-4" />
      case "cambio":
        return <FileEdit className="h-4 w-4" />
      case "eliminar":
        return <Trash2 className="h-4 w-4" />
      case "error":
        return <Bug className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case "mejora":
        return "bg-blue-500/10 text-blue-500"
      case "cambio":
        return "bg-yellow-500/10 text-yellow-600"
      case "eliminar":
        return "bg-red-500/10 text-red-500"
      case "error":
        return "bg-orange-500/10 text-orange-500"
      default:
        return "bg-gray-500/10 text-gray-500"
    }
  }

  const getEstadoColor = (estado: TicketStatus) => {
    switch (estado) {
      case "pendiente":
        return "bg-gray-500/10 text-gray-600"
      case "en_progreso":
        return "bg-blue-500/10 text-blue-600"
      case "completado":
        return "bg-green-500/10 text-green-600"
      case "rechazado":
        return "bg-red-500/10 text-red-600"
      default:
        return "bg-gray-500/10 text-gray-600"
    }
  }

  const getEstadoIcon = (estado: TicketStatus) => {
    switch (estado) {
      case "pendiente":
        return <Clock className="h-4 w-4" />
      case "en_progreso":
        return <AlertCircle className="h-4 w-4" />
      case "completado":
        return <CheckCircle2 className="h-4 w-4" />
      case "rechazado":
        return <XCircle className="h-4 w-4" />
    }
  }

  const getEstadoLabel = (estado: TicketStatus) => {
    switch (estado) {
      case "pendiente":
        return "Pendiente"
      case "en_progreso":
        return "En Progreso"
      case "completado":
        return "Completado"
      case "rechazado":
        return "Rechazado"
    }
  }

  const filteredTickets = filter === "todos" ? tickets : tickets.filter((t) => t.estado === filter)

  const statusCounts = {
    todos: tickets.length,
    pendiente: tickets.filter((t) => t.estado === "pendiente").length,
    en_progreso: tickets.filter((t) => t.estado === "en_progreso").length,
    completado: tickets.filter((t) => t.estado === "completado").length,
    rechazado: tickets.filter((t) => t.estado === "rechazado").length,
  }

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleRefresh}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Actualizar
      </Button>
      <Link href="/support/tickets">
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Solicitud
        </Button>
      </Link>
    </div>
  )

  if (isLoading) {
    return (
      <AppLayout>
        <OperationHeader icon={Inbox} title="Mis Solicitudes" description="Estado y seguimiento de tus solicitudes de soporte" />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Cargando tus solicitudes...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <OperationHeader
        icon={Inbox}
        title="Mis Solicitudes"
        description="Estado y seguimiento de tus solicitudes de soporte"
        actions={headerActions}
      />
      <div className="w-full">
      {/* Filtros por Estado */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mb-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="todos">
            Todos
            {statusCounts.todos > 0 && <span className="ml-1">({statusCounts.todos})</span>}
          </TabsTrigger>
          <TabsTrigger value="pendiente">
            Pendiente
            {statusCounts.pendiente > 0 && <span className="ml-1">({statusCounts.pendiente})</span>}
          </TabsTrigger>
          <TabsTrigger value="en_progreso">
            En Progreso
            {statusCounts.en_progreso > 0 && <span className="ml-1">({statusCounts.en_progreso})</span>}
          </TabsTrigger>
          <TabsTrigger value="completado">
            Completado
            {statusCounts.completado > 0 && <span className="ml-1">({statusCounts.completado})</span>}
          </TabsTrigger>
          <TabsTrigger value="rechazado">
            Rechazado
            {statusCounts.rechazado > 0 && <span className="ml-1">({statusCounts.rechazado})</span>}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Lista de Tickets */}
      <div className="space-y-3">
        {filteredTickets.map((ticket) => (
          <Card
            key={ticket.id}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setSelectedTicket(ticket)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className={getTipoColor(ticket.tipo)}>
                      {getTipoIcon(ticket.tipo)}
                      <span className="ml-1 capitalize">{ticket.tipo}</span>
                    </Badge>
                    <Badge variant="outline" className={getEstadoColor(ticket.estado)}>
                      {getEstadoIcon(ticket.estado)}
                      <span className="ml-1">{getEstadoLabel(ticket.estado)}</span>
                    </Badge>
                  </div>

                  <h3 className="font-semibold mb-1">{ticket.titulo}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{ticket.descripcion}</p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(ticket.fechaCreacion).toLocaleDateString("es-MX")}
                    </div>
                    {ticket.asignadoA && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Atendido por: {ticket.asignadoA}
                      </div>
                    )}
                    {ticket.comentarios && ticket.comentarios.length > 0 && (
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {ticket.comentarios.length} comentario{ticket.comentarios.length !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredTickets.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No tienes solicitudes en este estado</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de Detalles del Ticket */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <div className="dialog-scroll-content space-y-6">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <DialogTitle className="text-xl mb-3">{selectedTicket?.titulo}</DialogTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={getTipoColor(selectedTicket?.tipo || "")}>
                      {getTipoIcon(selectedTicket?.tipo || "")}
                      <span className="ml-1 capitalize">{selectedTicket?.tipo}</span>
                    </Badge>
                    <Badge variant="outline" className={getEstadoColor(selectedTicket?.estado || "pendiente")}>
                      {getEstadoIcon(selectedTicket?.estado || "pendiente")}
                      <span className="ml-1">{getEstadoLabel(selectedTicket?.estado || "pendiente")}</span>
                    </Badge>
                    {selectedTicket?.approvalStatus && selectedTicket.approvalStatus !== "no_requiere" && (
                      <Badge variant="outline" className={getApprovalColor(selectedTicket.approvalStatus)}>
                        {getApprovalLabel(selectedTicket.approvalStatus)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {selectedTicket?.approvalStatus === "pendiente" && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                  Tu solicitud está esperando la aprobación de la zona antes de pasar a desarrollo.
                </div>
              )}
              {selectedTicket?.approvalStatus === "rechazado" && (
                <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-400 break-words">
                  Tu solicitud fue rechazada{selectedTicket.approvalNote ? `: ${selectedTicket.approvalNote}` : "."}
                </div>
              )}

              {/* Confirmación del creador cuando el ticket está en "Hecho" */}
              {selectedTicket?.estado === "completado" && !selectedTicket?.confirmedAt && (
                <div className="space-y-2 rounded-lg border border-green-500/30 bg-green-500/5 p-3">
                  <p className="text-sm font-medium">Tu solicitud se marcó como resuelta. ¿Quedó bien?</p>
                  {resolutionRejectMode ? (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="¿Qué faltó o qué sigue fallando?"
                        value={resolutionNote}
                        onChange={(e) => setResolutionNote(e.target.value)}
                        rows={2}
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setResolutionRejectMode(false); setResolutionNote("") }}>
                          Cancelar
                        </Button>
                        <Button
                          variant="destructive" size="sm"
                          onClick={() => doConfirmResolution(false, resolutionNote)}
                          disabled={!resolutionNote.trim() || confirming}
                        >
                          Reabrir solicitud
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm" className="bg-green-600 text-white hover:bg-green-700"
                        onClick={() => doConfirmResolution(true)} disabled={confirming}
                      >
                        Sí, quedó resuelto (cerrar)
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setResolutionRejectMode(true)} disabled={confirming}>
                        No quedó resuelto
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {selectedTicket?.confirmedAt && (
                <div className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-700 dark:text-green-400">
                  Confirmaste que quedó resuelto. Ticket cerrado. ✓
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium mb-2">Descripción</h4>
                <p className="text-sm text-muted-foreground">{selectedTicket?.descripcion}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Fecha de Creación</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedTicket?.fechaCreacion
                      ? new Date(selectedTicket.fechaCreacion).toLocaleString("es-MX")
                      : ""}
                  </p>
                </div>
                {selectedTicket?.asignadoA && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Asignado a</h4>
                    <p className="text-sm text-muted-foreground">{selectedTicket.asignadoA}</p>
                  </div>
                )}
              </div>

              {/* Timeline de Comentarios + responder */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Actualizaciones y Comentarios
                </h4>
                <CommentThread
                  comments={selectedTicket?.comentarios}
                  requesterId={selectedTicket?.requesterId}
                  requesterName={selectedTicket?.usuario}
                  onImageClick={setLightbox}
                  emptyText="Aún no hay comentarios. Escribe abajo para dar seguimiento."
                />

                {selectedTicket && (
                  <CommentComposer
                    onSubmit={onAddComment}
                    label="Responder"
                    placeholder="Escribe una respuesta o agrega imágenes…"
                  />
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-label="Vista de imagen"
        >
          <img src={lightbox} alt="Adjunto" className="max-h-[90vh] max-w-[90vw] rounded object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
      </div>
    </AppLayout>
  )
}
