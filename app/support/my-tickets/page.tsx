"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link"
import {
  type Ticket,
  type TicketStatus,
  getTicketTypeColor,
  getTicketStatusColor,
  getStatusLabel,
} from "@/lib/types/support-ticket"
import { SupportTicketService } from "@/lib/services/support-ticket.service"

export default function MyTicketsPage() {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [filter, setFilter] = useState<"todos" | TicketStatus>("todos")
  const [isLoading, setIsLoading] = useState(true)
  const [tickets, setTickets] = useState<Ticket[]>([])

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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-5xl flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Cargando tus solicitudes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Mis Solicitudes de Soporte</h1>
          <p className="text-muted-foreground">Revisa el estado y seguimiento de tus solicitudes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Link href="/support/tickets">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Solicitud
            </Button>
          </Link>
        </div>
      </div>

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
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
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

              {/* Timeline de Comentarios */}
              {selectedTicket?.comentarios && selectedTicket.comentarios.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Actualizaciones y Comentarios
                  </h4>
                  <div className="space-y-3">
                    {selectedTicket.comentarios.map((comment, index) => (
                      <div key={index} className="flex gap-3 p-3 bg-muted rounded-lg">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{comment.usuario.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{comment.usuario}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.fecha).toLocaleString("es-MX", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </span>
                          </div>
                          <p className="text-sm">{comment.texto}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
